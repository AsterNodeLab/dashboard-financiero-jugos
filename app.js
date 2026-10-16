const $ = id => document.getElementById(id);
const NOMBRES_CORTOS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const NOMBRES_LARGOS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const TIPOS = {ingreso:'Ingreso', costo:'Costo', gasto:'Gasto'};
const CLAVE = 'dashboard-jugos-datos';
const CLAVE_TEMA = 'dashboard-jugos-tema';

/* Gráficas: blanco y azul cielo sobre grafito; grafito y azul cielo sobre blanco hueso */
const TEMAS = {
  dark: {
    c1: '#f6f4ee', c2: '#86cdf5', c3: '#7f8d99',
    pal: ['#f6f4ee','#86cdf5','#c9d3da','#4fa6d9','#9aa6b0','#b9e0f7','#6f7c87','#2f82b3','#e3e8ec','#5f6b75']
  },
  light: {
    c1: '#25272a', c2: '#5bb5e8', c3: '#8695a2',
    pal: ['#25272a','#5bb5e8','#5a5f64','#a7d7f3','#8b9096','#2f82b3','#b9bdc0','#7cc2ee','#3d4146','#d3e9f7']
  }
};

const MENOS = '−';
const fmt = n => (n < 0 ? MENOS : '') + '$' + Math.abs(n).toLocaleString('es-419', {maximumFractionDigits: 0});
const fmtCorto = n => Math.abs(n) >= 1000 ? (n < 0 ? MENOS : '') + '$' + (Math.abs(n) / 1000).toFixed(0) + 'k' : fmt(n);
const pct = (a, b) => b ? (a / b * 100).toFixed(1) + '%' : '—';
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normal = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
const etiquetaMes = m => NOMBRES_CORTOS[+m.slice(5, 7) - 1] + ' ' + m.slice(0, 4);
const alfa = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };

const ICONO_LUNA = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
const ICONO_SOL = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';

function temaActual() {
  const t = document.documentElement.dataset.theme;
  if (t === 'light' || t === 'dark') return t;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

let datos = [];
let fuente = '';
let ultimoAnalisisIA = ''; // última respuesta del gestor IA (se puede incluir en los reportes)
let origenDatos = 'base'; // 'base' (cifras base) o 'importado' (CSV propio)
const FUENTE_BASE = 'Datos base · ventas anuales confirmadas (2025: $500,000 · 2026: $1,000,000); costos, gastos y detalle mensual estimados';
const graficas = {};

/* ---------- Datos de ejemplo (generados de forma determinista) ---------- */
function rng(semilla) {
  return function () {
    semilla |= 0; semilla = semilla + 0x6D2B79F5 | 0;
    let t = Math.imul(semilla ^ semilla >>> 15, 1 | semilla);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* Datos base: las ventas anuales son las cifras confirmadas (2025: $500,000; 2026 ene-sep: $1,000,000).
   El reparto por mes y producto, y los costos y gastos, son estimaciones coherentes con esas ventas. */
const VENTAS_BASE = {
  2025: {total: 500000, pesos: [0.055, 0.058, 0.065, 0.072, 0.08, 0.088, 0.092, 0.094, 0.09, 0.088, 0.09, 0.128]},
  2026: {total: 1000000, pesos: [0.075, 0.085, 0.098, 0.108, 0.118, 0.125, 0.128, 0.122, 0.141]}
};

function generarEjemplo() {
  const azar = rng(42);
  const filas = [];
  const productos = [
    {n: 'Jugo de naranja 1 L', parte: 0.31},
    {n: 'Jugo de mango 1 L', parte: 0.22},
    {n: 'Jugo de piña 1 L', parte: 0.17},
    {n: 'Limonada natural 1 L', parte: 0.18},
    {n: 'Verde detox 500 ml', parte: 0.12}
  ];
  const fila = (y, m, d, tipo, categoria, concepto, monto) => {
    const fecha = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    filas.push({fecha, mes: fecha.slice(0, 7), tipo, categoria, concepto, monto: Math.round(monto)});
  };
  const ruido = (amp = 0.06) => 1 + (azar() * 2 - 1) * amp;

  for (const anio of Object.keys(VENTAS_BASE).map(Number)) {
    const {total, pesos} = VENTAS_BASE[anio];
    // Ventas por mes: se reparte el total anual y el último mes absorbe el redondeo, para que la suma sea exacta
    const ventasMes = pesos.map(p => Math.round(total * p));
    ventasMes[ventasMes.length - 1] += total - ventasMes.reduce((a, b) => a + b, 0);

    ventasMes.forEach((ventas, i) => {
      const m = i + 1;
      // Ventas por producto: reparto con algo de variación; el último producto absorbe el redondeo
      const partes = productos.map(p => p.parte * ruido(0.08));
      const suma = partes.reduce((a, b) => a + b, 0);
      let acumulado = 0;
      productos.forEach((p, j) => {
        const monto = j === productos.length - 1 ? ventas - acumulado : Math.round(ventas * partes[j] / suma);
        acumulado += monto;
        fila(anio, m, 28, 'Ingreso', 'Ventas', p.n, monto);
      });

      const nuevo = anio === 2026;
      const nomina = !nuevo ? (m <= 6 ? 11500 : 13500) : (m <= 5 ? 19500 : 23000);
      fila(anio, m, 15, 'Costo', 'Materia prima', 'Fruta y pulpa', ventas * 0.29 * ruido());
      fila(anio, m, 10, 'Costo', 'Envases', 'Botellas, tapas y etiquetas', ventas * 0.115 * ruido());
      fila(anio, m, 1, 'Gasto', 'Nómina', 'Sueldos y salarios', nomina);
      fila(anio, m, 1, 'Gasto', 'Renta', 'Renta de planta', nuevo ? 5500 : 4000);
      fila(anio, m, 12, 'Gasto', 'Servicios', 'Luz, agua y gas', (nuevo ? 2200 : 1500) + azar() * (nuevo ? 800 : 600));
      fila(anio, m, 20, 'Gasto', 'Distribución', 'Transporte y entregas', ventas * 0.05 * ruido());
      fila(anio, m, 18, 'Gasto', 'Marketing', 'Redes sociales y eventos', (nuevo ? 2500 : 1000) + azar() * (nuevo ? 2500 : 1500));
      if (azar() < 0.3) fila(anio, m, 22, 'Gasto', 'Mantenimiento', 'Equipos y refrigeración', 1500 + azar() * 3000);
    });
  }
  return filas;
}

/* ---------- Carga, guardado e importación ---------- */
function cargarInicial() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    if (Array.isArray(guardado) && guardado.length) {
      datos = guardado;
      origenDatos = 'importado';
      fuente = `Datos importados guardados en este navegador · ${datos.length} movimientos`;
      return;
    }
  } catch (e) { /* almacenamiento no disponible: se usan los datos de ejemplo */ }
  datos = generarEjemplo();
  fuente = FUENTE_BASE;
  origenDatos = 'base';
}

function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify(datos)); } catch (e) { /* sin almacenamiento */ }
}

function dividir(linea, sep) {
  const salida = [];
  let actual = '', comillas = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (comillas) {
      if (c === '"' && linea[i + 1] === '"') { actual += '"'; i++; }
      else if (c === '"') comillas = false;
      else actual += c;
    } else if (c === '"') comillas = true;
    else if (c === sep) { salida.push(actual); actual = ''; }
    else actual += c;
  }
  salida.push(actual);
  return salida.map(s => s.trim());
}

function parseFecha(s) {
  const iso = (y, m, d) => (+m < 1 || +m > 12 || +d < 1 || +d > 31) ? null
    : `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const a = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (a) return iso(a[1], a[2], a[3]);
  const b = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (b) return iso(b[3], b[2], b[1]);
  return null;
}

function parseMonto(s) {
  let t = s.replace(/[$\s]/g, '');
  const ultimaComa = t.lastIndexOf(','), ultimoPunto = t.lastIndexOf('.');
  if (ultimoPunto < 0 && /,\d{3}$/.test(t)) t = t.replace(/,/g, '');          // 25,000 (miles)
  else if (ultimaComa > ultimoPunto) t = t.replace(/\./g, '').replace(',', '.'); // 25.000,50 (coma decimal)
  else t = t.replace(/,/g, '');                                               // 25,000.50 o 25000.50
  if (t === '' || isNaN(Number(t))) return null;
  return Number(t);
}

function parseCSV(texto) {
  const lineas = texto.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
  if (lineas.length < 2) throw new Error('El archivo no tiene movimientos.');
  const sep = lineas[0].split(';').length > lineas[0].split(',').length ? ';' : ',';
  const cab = dividir(lineas[0], sep).map(normal);
  const col = {fecha: cab.indexOf('fecha'), tipo: cab.indexOf('tipo'), categoria: cab.indexOf('categoria'),
    concepto: cab.indexOf('concepto'), monto: cab.indexOf('monto')};
  if (Object.values(col).some(i => i < 0)) throw new Error('Faltan columnas: fecha, tipo, categoria, concepto, monto.');
  const filas = [];
  let omitidas = 0;
  for (const linea of lineas.slice(1)) {
    const c = dividir(linea, sep);
    const fecha = parseFecha(c[col.fecha] || '');
    const tipo = TIPOS[normal(c[col.tipo] || '')];
    const monto = parseMonto(c[col.monto] || '');
    if (!fecha || !tipo || monto === null) { omitidas++; continue; }
    filas.push({fecha, mes: fecha.slice(0, 7), tipo, categoria: c[col.categoria] || 'Sin categoría',
      concepto: c[col.concepto] || '', monto: Math.abs(monto)});
  }
  return {filas, omitidas};
}

function descargar(nombre, texto) {
  const blob = new Blob(['﻿' + texto], {type: 'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function exportar() {
  const enc = v => { const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const lineas = ['fecha,tipo,categoria,concepto,monto', ...datos.map(r => [r.fecha, r.tipo, r.categoria, r.concepto, r.monto].map(enc).join(','))];
  descargar('movimientos-jugos.csv', lineas.join('\n'));
}

function plantilla() {
  descargar('plantilla-movimientos.csv', [
    'fecha,tipo,categoria,concepto,monto',
    '2026-01-28,Ingreso,Ventas,Jugo de naranja 1 L,25000',
    '2026-01-15,Costo,Materia prima,Compra de naranja,8000',
    '2026-01-01,Gasto,Nómina,Sueldos de enero,32000'
  ].join('\n'));
}

/* ---------- Filtros y cálculos ---------- */
function initFiltros() {
  const anios = [...new Set(datos.map(r => r.mes.slice(0, 4)))].sort();
  const previo = $('fAnio').value;
  $('fAnio').innerHTML = '<option value="todos">Todos</option>' + anios.map(a => `<option value="${a}">${a}</option>`).join('');
  $('fAnio').value = anios.includes(previo) ? previo : 'todos';
  if (!$('fMes').options.length) {
    $('fMes').innerHTML = '<option value="todos">Todos</option>' + NOMBRES_LARGOS.map((n, i) =>
      `<option value="${String(i + 1).padStart(2, '0')}">${n}</option>`).join('');
  }
}

function filtrar() {
  const anio = $('fAnio').value, mes = $('fMes').value;
  return datos.filter(r => (anio === 'todos' || r.mes.startsWith(anio)) && (mes === 'todos' || r.mes.slice(5) === mes));
}

function resumen(rows) {
  const porMes = {};
  for (const r of rows) {
    porMes[r.mes] = porMes[r.mes] || {Ingreso: 0, Costo: 0, Gasto: 0};
    porMes[r.mes][r.tipo] += r.monto;
  }
  return Object.keys(porMes).sort().map(mes => {
    const x = porMes[mes];
    const bruta = x.Ingreso - x.Costo;
    return {mes, ingresos: x.Ingreso, costos: x.Costo, bruta, gastos: x.Gasto, neta: bruta - x.Gasto};
  });
}

function totales(res) {
  return res.reduce((a, m) => ({
    ingresos: a.ingresos + m.ingresos, costos: a.costos + m.costos, bruta: a.bruta + m.bruta,
    gastos: a.gastos + m.gastos, neta: a.neta + m.neta
  }), {ingresos: 0, costos: 0, bruta: 0, gastos: 0, neta: 0});
}

function agrupar(rows, campo) {
  const m = {};
  for (const r of rows) m[r[campo]] = (m[r[campo]] || 0) + r.monto;
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}

/* ---------- Render ---------- */
function variacion(res, campo) {
  if (res.length < 2) return '';
  const actual = res[res.length - 1][campo], previo = res[res.length - 2][campo];
  if (!previo) return '';
  const d = (actual - previo) / Math.abs(previo) * 100;
  const contra = $('fMes').value === 'todos' ? 'vs mes anterior' : 'vs periodo anterior';
  return `<div class="delta">${d >= 0 ? '↑' : '↓'} ${Math.abs(d).toFixed(1)}% <span>${contra}</span></div>`;
}

function renderKpis(t, res) {
  const kpis = [
    ['Ingresos', 'ingresos', t.ingresos, `${res.length} mes(es) con datos`],
    ['Costo de ventas', 'costos', t.costos, pct(t.costos, t.ingresos) + ' de los ingresos'],
    ['Utilidad bruta', 'bruta', t.bruta, 'Margen bruto ' + pct(t.bruta, t.ingresos)],
    ['Gastos operativos', 'gastos', t.gastos, pct(t.gastos, t.ingresos) + ' de los ingresos'],
    ['Utilidad neta', 'neta', t.neta, 'Margen neto ' + pct(t.neta, t.ingresos)]
  ];
  $('kpis').innerHTML = kpis.map(([label, campo, val, sub]) =>
    `<div class="kpi${campo === 'neta' ? ' destacado' : ''}${val < 0 ? ' neg' : ''}"><div class="label">${label}</div>` +
    `<div class="val">${fmt(val)}</div><div class="sub2">${sub}</div>${variacion(res, campo)}</div>`).join('');
}

function dibujar(id, config) {
  if (typeof Chart === 'undefined') return;
  if (graficas[id]) graficas[id].destroy();
  graficas[id] = new Chart($(id), config);
}

function coloresTema() {
  const css = getComputedStyle(document.documentElement);
  const v = n => css.getPropertyValue(n).trim();
  return {muted: v('--muted'), line: v('--line'), text: v('--text'), bg: v('--bg'), card: v('--card')};
}

function aplicarDefaultsChart(c) {
  Chart.defaults.color = c.muted;
  Chart.defaults.borderColor = c.line;
  Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
  Chart.defaults.font.size = 12;
}

/* Configuración de las 4 gráficas. `t` es la paleta (TEMAS.*) y `c` los colores de texto/ejes/fondo. */
function configsGraficas(rows, res, t, c) {
  const etiquetas = res.map(m => etiquetaMes(m.mes));
  const porSerie = x => ` ${x.dataset.label}: ${fmt(x.raw)}`;
  const porEtiqueta = x => ` ${x.label}: ${fmt(x.raw)}`;
  const tooltip = label => ({
    backgroundColor: c.text, titleColor: c.bg, bodyColor: c.bg,
    padding: 10, cornerRadius: 8, boxPadding: 4, callbacks: {label}
  });
  const leyenda = {position: 'top', align: 'end',
    labels: {usePointStyle: true, pointStyle: 'circle', boxWidth: 7, boxHeight: 7, padding: 16}};
  const ejeY = {grid: {color: c.line, drawTicks: false}, border: {display: false}, ticks: {callback: fmtCorto, padding: 8}};
  const ejeX = {grid: {display: false}, border: {color: c.line}, ticks: {maxRotation: 0, autoSkipPadding: 12}};

  const productos = agrupar(rows.filter(r => r.tipo === 'Ingreso'), 'concepto');
  const costos = agrupar(rows.filter(r => r.tipo !== 'Ingreso'), 'categoria');
  let acumulado = 0;
  const serie = res.map(m => (acumulado += m.neta));

  return {
    cMes: {
      type: 'bar',
      data: {
        labels: etiquetas,
        datasets: [
          {label: 'Ingresos', data: res.map(m => m.ingresos), backgroundColor: t.c1, borderRadius: 4, maxBarThickness: 18},
          {label: 'Costos y gastos', data: res.map(m => m.costos + m.gastos), backgroundColor: t.c2, borderRadius: 4, maxBarThickness: 18},
          {type: 'line', label: 'Utilidad neta', data: res.map(m => m.neta), borderColor: t.c3, backgroundColor: t.c3,
            borderDash: [5, 4], borderWidth: 2, pointRadius: 2.5, pointHoverRadius: 4, tension: 0.35}
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false, interaction: {mode: 'index', intersect: false},
        plugins: {legend: leyenda, tooltip: tooltip(porSerie)},
        scales: {x: ejeX, y: ejeY}
      }
    },
    cProd: {
      type: 'doughnut',
      data: {
        labels: productos.map(p => p[0]),
        datasets: [{label: 'Ventas', data: productos.map(p => p[1]), backgroundColor: t.pal,
          borderColor: c.card, borderWidth: 3, hoverOffset: 4}]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '72%',
        plugins: {legend: {position: 'bottom', labels: {usePointStyle: true, pointStyle: 'circle', boxWidth: 7, boxHeight: 7, padding: 14}},
          tooltip: tooltip(porEtiqueta)}
      }
    },
    cGasto: {
      type: 'bar',
      data: {
        labels: costos.map(x => x[0]),
        datasets: [{label: 'Costos y gastos', data: costos.map(x => x[1]), backgroundColor: t.c2, borderRadius: 4, maxBarThickness: 16}]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: {legend: {display: false}, tooltip: tooltip(porEtiqueta)},
        scales: {
          x: {grid: {color: c.line, drawTicks: false}, border: {display: false}, ticks: {callback: fmtCorto, padding: 8, maxTicksLimit: 6}},
          y: {grid: {display: false}, border: {display: false}}
        }
      }
    },
    cAcum: {
      type: 'line',
      data: {
        labels: etiquetas,
        datasets: [{label: 'Utilidad neta acumulada', data: serie, borderColor: t.c2, backgroundColor: alfa(t.c2, 0.16),
          fill: true, tension: 0.3, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4}]
      },
      options: {
        responsive: true, maintainAspectRatio: false, interaction: {mode: 'index', intersect: false},
        plugins: {legend: {display: false}, tooltip: tooltip(porSerie)},
        scales: {x: ejeX, y: ejeY}
      }
    }
  };
}

function renderGraficas(rows, res) {
  if (typeof Chart === 'undefined') return;
  const c = coloresTema();
  aplicarDefaultsChart(c);
  const configs = configsGraficas(rows, res, TEMAS[temaActual()], c);
  for (const id of Object.keys(configs)) dibujar(id, configs[id]);
}

function renderPyG(res, t) {
  if (!res.length) { $('pyg').innerHTML = '<tbody><tr><td>Sin datos en este periodo</td></tr></tbody>'; return; }
  const celda = (v, cls = '') => `<td class="${cls}${v < 0 ? ' neg' : ''}">${fmt(v)}</td>`;
  const fila = (titulo, campo, cls = '') =>
    `<tr class="${cls}"><td>${titulo}</td>${res.map(m => celda(m[campo])).join('')}${celda(t[campo])}</tr>`;
  const filaPct = (titulo, campo) =>
    `<tr class="pct"><td>${titulo}</td>${res.map(m => `<td>${pct(m[campo], m.ingresos)}</td>`).join('')}` +
    `<td>${pct(t[campo], t.ingresos)}</td></tr>`;
  $('pyg').innerHTML =
    `<thead><tr><th>Concepto</th>${res.map(m => `<th>${etiquetaMes(m.mes)}</th>`).join('')}<th>Total</th></tr></thead>` +
    `<tbody>${fila('Ingresos', 'ingresos')}${fila('Costo de ventas', 'costos')}` +
    `${fila('Utilidad bruta', 'bruta', 'total')}${filaPct('Margen bruto', 'bruta')}` +
    `${fila('Gastos operativos', 'gastos')}${fila('Utilidad neta', 'neta', 'total')}` +
    `${filaPct('Margen neto', 'neta')}</tbody>`;
}

function renderMovs(rows) {
  const q = $('buscar').value.trim().toLowerCase();
  const lista = rows
    .filter(r => !q || `${r.categoria} ${r.concepto} ${r.tipo}`.toLowerCase().includes(q))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const max = 200;
  $('movs').innerHTML =
    '<thead><tr><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Concepto</th><th>Monto</th></tr></thead><tbody>' +
    lista.slice(0, max).map(r =>
      `<tr><td>${r.fecha}</td><td><span class="tag ${r.tipo}">${r.tipo}</span></td>` +
      `<td>${esc(r.categoria)}</td><td class="td-text">${esc(r.concepto)}</td>` +
      `<td class="${r.tipo === 'Ingreso' ? 'pos' : ''}">${fmt(r.monto)}</td></tr>`).join('') +
    '</tbody>';
  $('conteo').textContent = `${lista.length} movimiento(s)` + (lista.length > max ? ` · mostrando los primeros ${max}` : '');
}

function render() {
  const rows = filtrar();
  const res = resumen(rows);
  const t = totales(res);
  $('periodo').textContent = res.length
    ? `${etiquetaMes(res[0].mes)} – ${etiquetaMes(res[res.length - 1].mes)}`
    : 'Sin movimientos en este periodo';
  $('fuente').textContent = fuente;
  $('btnTema').innerHTML = temaActual() === 'dark' ? ICONO_SOL : ICONO_LUNA;
  renderKpis(t, res);
  renderGraficas(rows, res);
  renderPyG(res, t);
  renderMovs(rows);
}

/* ---------- Eventos ---------- */
$('fAnio').onchange = render;
$('fMes').onchange = render;
$('buscar').oninput = render;
$('btnTema').onclick = () => {
  const nuevo = temaActual() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = nuevo;
  try { localStorage.setItem(CLAVE_TEMA, nuevo); } catch (e) { /* sin almacenamiento */ }
  render();
};
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', render);
$('btnImportar').onclick = () => $('archivo').click();
$('btnExportar').onclick = exportar;
$('btnPlantilla').onclick = plantilla;
$('btnEjemplo').onclick = () => {
  try { localStorage.removeItem(CLAVE); } catch (e) { /* sin almacenamiento */ }
  datos = generarEjemplo();
  fuente = FUENTE_BASE;
  origenDatos = 'base';
  initFiltros();
  render();
};
$('archivo').onchange = async e => {
  const archivo = e.target.files[0];
  if (!archivo) return;
  try {
    const {filas, omitidas} = parseCSV(await archivo.text());
    if (!filas.length) throw new Error('No encontré movimientos válidos en el archivo.');
    datos = filas;
    guardar();
    origenDatos = 'importado';
    fuente = `Datos importados de "${archivo.name}" · ${filas.length} movimientos` +
      (omitidas ? ` (${omitidas} filas omitidas por formato inválido)` : '');
    initFiltros();
    render();
  } catch (err) {
    alert('No se pudo importar: ' + err.message);
  } finally {
    e.target.value = '';
  }
};

cargarInicial();
initFiltros();
render();
// Las gráficas miden el texto al dibujarse: se redibujan cuando la fuente ya cargó.
if (document.fonts && document.fonts.ready) document.fonts.ready.then(render);
