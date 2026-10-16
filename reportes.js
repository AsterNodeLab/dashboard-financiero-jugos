/* Reportes: impresión directa (HTML optimizado para papel) y descarga de PDF */
const CLAVE_EMPRESA = 'dashboard-jugos-empresa';
const fmtPdf = n => (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('es-419', {maximumFractionDigits: 0});
const pctVacio = (a, b, vacio) => b ? (a / b * 100).toFixed(1) + '%' : vacio;
const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();

function nombreEmpresa() { return $('repEmpresa').value.trim() || 'Empresa de jugos'; }

function guardarEmpresa() {
  try { localStorage.setItem(CLAVE_EMPRESA, $('repEmpresa').value.trim()); } catch (e) { /* sin almacenamiento */ }
}

function leerOpcionesReporte() {
  const on = id => $(id).checked;
  return {
    empresa: nombreEmpresa(), resumen: on('repResumen'), graficas: on('repGraficas'), pyg: on('repPyg'),
    categorias: on('repCategorias'), movimientos: on('repMovs'), analisis: on('repAnalisis') && !!ultimoAnalisisIA
  };
}

function textoPeriodo(res, separador = '–') {
  return res.length ? `${etiquetaMes(res[0].mes)} ${separador} ${etiquetaMes(res[res.length - 1].mes)}` : 'Sin movimientos';
}

function notaDatos() {
  return origenDatos === 'base'
    ? 'Nota: las ventas anuales son cifras confirmadas por la empresa; los costos, gastos y el desglose mensual y por producto son estimaciones.'
    : 'Datos importados desde un archivo CSV de la empresa.';
}

/* Gráficas para papel: se dibujan fuera de pantalla con la paleta clara, sin importar el tema activo. */
function imagenesGraficas(rows, res) {
  if (typeof Chart === 'undefined') return {};
  const colores = {muted: '#5f6368', line: '#e2e2e2', text: '#25272a', bg: '#ffffff', card: '#ffffff'};
  const tamanos = {cMes: [1000, 380], cProd: [480, 380], cGasto: [480, 380], cAcum: [1000, 320]};
  const contenedor = document.createElement('div');
  contenedor.style.cssText = 'position:fixed;left:-10000px;top:0;width:1000px;pointer-events:none';
  document.body.appendChild(contenedor);
  const imagenes = {};
  try {
    aplicarDefaultsChart(colores);
    const configs = configsGraficas(rows, res, TEMAS.light, colores);
    for (const id of Object.keys(configs)) {
      const [ancho, alto] = tamanos[id];
      const canvas = document.createElement('canvas');
      canvas.width = ancho; canvas.height = alto;
      contenedor.appendChild(canvas);
      const cfg = configs[id];
      cfg.options.responsive = false;
      cfg.options.animation = false;
      cfg.options.devicePixelRatio = 2;
      const grafica = new Chart(canvas, cfg);
      imagenes[id] = grafica.toBase64Image('image/png', 1);
      grafica.destroy();
    }
  } finally {
    aplicarDefaultsChart(coloresTema());
    contenedor.remove();
  }
  return imagenes;
}

function prepararReporte(op) {
  const rows = filtrar();
  const res = resumen(rows);
  return {rows, res, t: totales(res), imgs: op.graficas ? imagenesGraficas(rows, res) : {}, periodo: textoPeriodo(res)};
}

function kpisReporte(t, f, vacio) {
  return [
    ['Ingresos', f(t.ingresos), ''],
    ['Costo de ventas', f(t.costos), pctVacio(t.costos, t.ingresos, vacio) + ' de ingresos'],
    ['Utilidad bruta', f(t.bruta), 'Margen ' + pctVacio(t.bruta, t.ingresos, vacio)],
    ['Gastos operativos', f(t.gastos), pctVacio(t.gastos, t.ingresos, vacio) + ' de ingresos'],
    ['Utilidad neta', f(t.neta), 'Margen ' + pctVacio(t.neta, t.ingresos, vacio)]
  ];
}

function tablasReporte(r, f, vacio) {
  const pc = (a, b) => pctVacio(a, b, vacio);
  const pyg = r.res.map(m => [etiquetaMes(m.mes), f(m.ingresos), f(m.costos), f(m.bruta), pc(m.bruta, m.ingresos),
    f(m.gastos), f(m.neta), pc(m.neta, m.ingresos)]);
  const total = ['Total', f(r.t.ingresos), f(r.t.costos), f(r.t.bruta), pc(r.t.bruta, r.t.ingresos),
    f(r.t.gastos), f(r.t.neta), pc(r.t.neta, r.t.ingresos)];
  const prod = agrupar(r.rows.filter(x => x.tipo === 'Ingreso'), 'concepto');
  const totalProd = prod.reduce((a, p) => a + p[1], 0);
  const cat = agrupar(r.rows.filter(x => x.tipo !== 'Ingreso'), 'categoria');
  const maxMovs = 500;
  const movs = [...r.rows].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, maxMovs)
    .map(x => [x.fecha, x.tipo, x.categoria, x.concepto, f(x.monto)]);
  return {
    pyg, total,
    productos: prod.map(p => [p[0], f(p[1]), pc(p[1], totalProd)]),
    categorias: cat.map(c => [c[0], f(c[1]), pc(c[1], r.t.ingresos)]),
    movs, truncado: r.rows.length > maxMovs
  };
}

const CAB_PYG = ['Mes', 'Ingresos', 'Costo de ventas', 'Utilidad bruta', 'Margen bruto', 'Gastos operativos', 'Utilidad neta', 'Margen neto'];

/* ---------- Impresión directa ---------- */
function tablaHtml(cab, filas, ultimaEsTotal = false) {
  return '<table><thead><tr>' + cab.map(c => `<th>${esc(c)}</th>`).join('') + '</tr></thead><tbody>' +
    filas.map((f, i) => `<tr${ultimaEsTotal && i === filas.length - 1 ? ' class="total"' : ''}>` +
      f.map(c => `<td>${esc(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table>';
}

function htmlReporte(r, op) {
  const tb = tablasReporte(r, fmt, '—');
  const emitido = new Date().toLocaleDateString('es-419', {day: 'numeric', month: 'long', year: 'numeric'});
  let h = `<header class="rep-cab"><div><h1>Reporte financiero</h1><p>${esc(op.empresa)}</p></div>` +
    `<div class="rep-meta">Periodo: ${esc(r.periodo)}<br>Emitido: ${esc(emitido)}</div></header>` +
    `<p class="rep-nota">${esc(notaDatos())}</p>`;

  if (op.resumen) {
    h += '<section class="rep-sec"><h2>Resumen</h2><div class="rep-kpis">' +
      kpisReporte(r.t, fmt, '—').map(([l, v, s]) =>
        `<div><span>${esc(l)}</span><strong>${esc(v)}</strong><em>${esc(s)}</em></div>`).join('') + '</div></section>';
  }
  if (op.graficas && r.imgs.cMes) {
    h += '<section class="rep-sec rep-graficas"><h2>Gráficas</h2>' +
      `<img src="${r.imgs.cMes}" alt="Ingresos, costos y utilidad por mes">` +
      `<div class="rep-grid2"><img src="${r.imgs.cProd}" alt="Ventas por producto"><img src="${r.imgs.cGasto}" alt="Costos y gastos por categoría"></div>` +
      `<img src="${r.imgs.cAcum}" alt="Utilidad neta acumulada"></section>`;
  }
  if (op.pyg) h += `<section class="rep-sec"><h2>Estado de resultados por mes</h2>${tablaHtml(CAB_PYG, [...tb.pyg, tb.total], true)}</section>`;
  if (op.categorias) {
    h += '<section class="rep-sec"><h2>Ventas por producto</h2>' + tablaHtml(['Producto', 'Ventas', '% del total'], tb.productos) + '</section>' +
      '<section class="rep-sec"><h2>Costos y gastos por categoría</h2>' + tablaHtml(['Categoría', 'Monto', '% de ingresos'], tb.categorias) + '</section>';
  }
  if (op.movimientos) {
    h += `<section class="rep-sec rep-largo"><h2>Movimientos</h2>${tablaHtml(['Fecha', 'Tipo', 'Categoría', 'Concepto', 'Monto'], tb.movs)}` +
      (tb.truncado ? '<p class="rep-nota">Se muestran los 500 movimientos más recientes.</p>' : '') + '</section>';
  }
  if (op.analisis) {
    h += `<section class="rep-sec"><h2>Análisis del gestor financiero (IA)</h2><div class="rep-ia">${mdAHtml(ultimoAnalisisIA)}</div>` +
      '<p class="rep-nota">Generado por un modelo de IA a partir de los datos del dashboard. Verifica las cifras antes de tomar decisiones.</p></section>';
  }
  return h + '<footer class="rep-pie">Dashboard financiero</footer>';
}

let tituloOriginal = document.title;

async function imprimirReporte() {
  const op = leerOpcionesReporte();
  guardarEmpresa();
  const r = prepararReporte(op);
  if (!r.rows.length) { alert('No hay movimientos en el periodo seleccionado.'); return; }
  $('dlgReporte').close();
  $('reporte').innerHTML = htmlReporte(r, op);
  await Promise.all([...$('reporte').querySelectorAll('img')].map(i => i.decode().catch(() => {})));
  tituloOriginal = document.title;
  document.title = `Reporte financiero - ${op.empresa} - ${r.periodo}`; // nombre sugerido al guardar como PDF
  document.body.classList.add('imprimiendo');
  window.print();
}

window.addEventListener('afterprint', () => {
  document.body.classList.remove('imprimiendo');
  document.title = tituloOriginal;
  $('reporte').innerHTML = '';
});

/* ---------- Descarga de PDF ---------- */
function descargarPDF() {
  const lib = window.jspdf;
  if (!lib || !lib.jsPDF) { alert('No se pudo cargar el generador de PDF. Revisa tu conexión a internet e inténtalo de nuevo.'); return; }
  const op = leerOpcionesReporte();
  guardarEmpresa();
  const r = prepararReporte(op);
  if (!r.rows.length) { alert('No hay movimientos en el periodo seleccionado.'); return; }

  const periodo = textoPeriodo(r.res, '-');
  const tb = tablasReporte(r, fmtPdf, '-');
  const doc = new lib.jsPDF({unit: 'mm', format: 'a4'});
  const W = 210, H = 297, M = 14, A = W - 2 * M;
  const GRAFITO = [37, 39, 42], CIELO = [91, 181, 232], GRIS = [110, 114, 118], LINEA = [223, 219, 208];
  let y = M;
  const asegurar = h => { if (y + h > H - 18) { doc.addPage(); y = M; } };
  const titulo = txt => {
    asegurar(16);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...GRIS);
    doc.text(txt.toUpperCase(), M, y + 4);
    doc.setDrawColor(...LINEA); doc.line(M, y + 6, W - M, y + 6);
    y += 10;
  };
  const tabla = opciones => {
    doc.autoTable({startY: y, margin: {left: M, right: M, bottom: 18}, theme: 'plain',
      styles: {font: 'helvetica', fontSize: 8, cellPadding: 1.8, textColor: GRAFITO, lineColor: LINEA, lineWidth: {bottom: 0.2}},
      headStyles: {fillColor: GRAFITO, textColor: [255, 255, 255], fontStyle: 'bold'},
      ...opciones});
    y = doc.lastAutoTable.finalY + 7;
  };

  // Encabezado
  doc.setFillColor(...CIELO); doc.rect(M, y, 14, 1.4, 'F');
  y += 7;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(...GRAFITO);
  doc.text('Reporte financiero', M, y + 6);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...GRIS);
  doc.text(op.empresa, M, y + 13);
  const emitido = new Date().toLocaleDateString('es-419', {day: 'numeric', month: 'long', year: 'numeric'});
  doc.text(`Periodo: ${periodo}`, W - M, y + 6, {align: 'right'});
  doc.text(`Emitido: ${emitido}`, W - M, y + 13, {align: 'right'});
  y += 20;
  doc.setFont('helvetica', 'italic'); doc.setFontSize(8);
  const nota = doc.splitTextToSize(notaDatos(), A);
  doc.text(nota, M, y);
  y += nota.length * 4 + 4;

  if (op.resumen) {
    titulo('Resumen');
    const k = kpisReporte(r.t, fmtPdf, '-');
    tabla({
      head: [k.map(x => x[0])], body: [k.map(x => x[1]), k.map(x => x[2])],
      styles: {halign: 'center', fontSize: 7.5, cellPadding: 2, textColor: GRAFITO, lineWidth: 0},
      didParseCell: d => { if (d.section === 'body' && d.row.index === 0) { d.cell.styles.fontSize = 11; d.cell.styles.fontStyle = 'bold'; } }
    });
  }

  if (op.graficas && r.imgs.cMes) {
    titulo('Gráficas');
    const imagen = (id, ancho, alto, x = M) => { doc.addImage(r.imgs[id], 'PNG', x, y, ancho, alto); };
    const altoMes = A * 380 / 1000;
    asegurar(altoMes + 4); imagen('cMes', A, altoMes); y += altoMes + 4;
    const anchoMitad = (A - 4) / 2, altoMitad = anchoMitad * 380 / 480;
    asegurar(altoMitad + 4);
    imagen('cProd', anchoMitad, altoMitad); imagen('cGasto', anchoMitad, altoMitad, M + anchoMitad + 4);
    y += altoMitad + 4;
    const altoAcum = A * 320 / 1000;
    asegurar(altoAcum + 4); imagen('cAcum', A, altoAcum); y += altoAcum + 6;
  }

  if (op.pyg) {
    titulo('Estado de resultados por mes');
    const ultima = tb.pyg.length;
    tabla({
      head: [CAB_PYG], body: [...tb.pyg, tb.total],
      columnStyles: Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map(i => [i, {halign: 'right'}])),
      didParseCell: d => {
        if (d.section === 'head' && d.column.index > 0) d.cell.styles.halign = 'right';
        if (d.section === 'body' && d.row.index === ultima) d.cell.styles.fontStyle = 'bold';
      }
    });
  }

  if (op.categorias) {
    titulo('Ventas por producto');
    tabla({head: [['Producto', 'Ventas', '% del total']], body: tb.productos, pageBreak: 'avoid',
      columnStyles: {1: {halign: 'right'}, 2: {halign: 'right'}},
      didParseCell: d => { if (d.section === 'head' && d.column.index > 0) d.cell.styles.halign = 'right'; }});
    titulo('Costos y gastos por categoría');
    tabla({head: [['Categoría', 'Monto', '% de ingresos']], body: tb.categorias, pageBreak: 'avoid',
      columnStyles: {1: {halign: 'right'}, 2: {halign: 'right'}},
      didParseCell: d => { if (d.section === 'head' && d.column.index > 0) d.cell.styles.halign = 'right'; }});
  }

  if (op.movimientos) {
    titulo('Movimientos');
    tabla({head: [['Fecha', 'Tipo', 'Categoría', 'Concepto', 'Monto']], body: tb.movs,
      styles: {fontSize: 7.5, cellPadding: 1.5, textColor: GRAFITO, lineColor: LINEA, lineWidth: {bottom: 0.2}},
      columnStyles: {4: {halign: 'right'}},
      didParseCell: d => { if (d.section === 'head' && d.column.index === 4) d.cell.styles.halign = 'right'; }});
    if (tb.truncado) {
      doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(...GRIS);
      doc.text('Se muestran los 500 movimientos más recientes.', M, y - 3);
    }
  }

  if (op.analisis) {
    titulo('Análisis del gestor financiero (IA)');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...GRAFITO);
    for (const linea of doc.splitTextToSize(mdATexto(ultimoAnalisisIA), A)) {
      asegurar(5); doc.text(linea, M, y + 3); y += 4.6;
    }
    y += 3;
    doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(...GRIS);
    asegurar(6);
    doc.text('Generado por un modelo de IA a partir de los datos del dashboard. Verifica las cifras antes de decidir.', M, y + 3);
  }

  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRIS);
    doc.text(`${op.empresa} · ${periodo}`, M, H - 8);
    doc.text(`Página ${i} de ${paginas}`, W - M, H - 8, {align: 'right'});
  }
  doc.save(`reporte-financiero-${slug(op.empresa)}-${slug(periodo)}.pdf`);
}

/* ---------- Diálogo de reportes ---------- */
function abrirReportes() {
  try { if (!$('repEmpresa').value) $('repEmpresa').value = localStorage.getItem(CLAVE_EMPRESA) || ''; } catch (e) { /* sin almacenamiento */ }
  const hayIA = !!ultimoAnalisisIA;
  $('repAnalisis').disabled = !hayIA;
  if (!hayIA) $('repAnalisis').checked = false;
  $('repAnalisisNota').textContent = hayIA ? 'Se incluye la última respuesta del gestor IA.' : 'Pídele un análisis al gestor IA para poder incluirlo.';
  $('repPeriodo').textContent = textoPeriodo(resumen(filtrar()));
  $('dlgReporte').showModal();
}

$('btnReporte').onclick = abrirReportes;
$('repCerrar').onclick = () => $('dlgReporte').close();
$('repImprimir').onclick = imprimirReporte;
$('repPdf').onclick = descargarPDF;
