# Dashboard financiero · Jugos

Dashboard de contabilidad para una empresa de jugos. Es una página estática (HTML, CSS y JavaScript) que no necesita servidor ni instalación: se abre en el navegador.

## Qué incluye

- **KPIs**: ingresos, costo de ventas, utilidad bruta, gastos operativos y utilidad neta, con márgenes y variación contra el mes anterior.
- **Gráficas**: ingresos, costos y utilidad por mes; ventas por producto; costos y gastos por categoría; utilidad neta acumulada.
- **Estado de resultados** mensual y **movimientos** con búsqueda.
- Filtros por año y mes. Tema grafito o blanco hueso.
- **Reportes** para imprimir o descargar en PDF.
- **Gestor IA**: un asesor financiero que responde solo con los datos de la contabilidad cargada.

## Datos

Al abrir el dashboard se cargan datos base:

| Dato | Estado |
|------|--------|
| Ventas de 2025: **$500,000** (año completo) | Confirmado |
| Ventas de 2026: **$1,000,000** (enero a septiembre) | Confirmado |
| Reparto por mes y por producto, costos y gastos | **Estimado** (coherente con las ventas) |

Para usar la contabilidad completa, importa un CSV (botón **Importar CSV**). Descarga la **Plantilla** para ver el formato:

| Columna     | Descripción                                                                 | Ejemplo                 |
|-------------|-----------------------------------------------------------------------------|-------------------------|
| `fecha`     | `AAAA-MM-DD` o `DD/MM/AAAA`                                                 | `2026-01-31`            |
| `tipo`      | `Ingreso` (ventas), `Costo` (costo de ventas) o `Gasto` (gastos operativos) | `Costo`                 |
| `categoria` | Agrupa los movimientos en las gráficas                                      | `Materia prima`         |
| `concepto`  | Descripción libre                                                           | `Compra de naranja`     |
| `monto`     | Número sin símbolo de moneda                                                | `8000` o `25.000,50`    |

Se aceptan separadores `,` o `;`. Los datos importados se guardan solo en el navegador donde los importaste.

## Reportes: imprimir y PDF

El botón **Reportes** abre un diálogo para elegir qué incluir (resumen, gráficas, estado de resultados, ventas por producto y costos por categoría, detalle de movimientos y, opcionalmente, el último análisis del gestor IA). Usa el año y mes seleccionados en los filtros.

- **Imprimir**: abre la impresión del navegador con una maqueta A4 pensada para papel (las gráficas se redibujan en colores claros). Desde ahí también puedes elegir *Guardar como PDF*. Los navegadores no permiten imprimir sin mostrar el diálogo de impresión.
- **Descargar PDF**: genera el archivo directamente con texto seleccionable, tablas paginadas y numeración de páginas.

## Gestor IA

Un panel lateral con un asesor financiero (CFO virtual) que usa modelos gratuitos de [OpenRouter](https://openrouter.ai) con respaldo automático entre varios modelos.

- Responde **solo** con los datos de la contabilidad cargada. Si algo no está en los datos, lo dice. Distingue las cifras confirmadas de las estimadas.
- Recibe los resúmenes calculados por año y mes, las ventas por producto, los costos por categoría, el comparativo del mismo periodo y, si son pocos, los movimientos.
- Trata el contenido de los movimientos como datos, no como instrucciones.

**Configuración**: abre el panel, pulsa el engrane (⚙) y pega tu API key de OpenRouter. La clave se guarda solo en tu navegador: **no está en el código ni en el repositorio**. Al preguntar, los datos de la contabilidad se envían a OpenRouter para generar la respuesta; no uses el gestor con datos que no quieras compartir con ese servicio.

> Las respuestas son orientativas. Verifica las cifras antes de tomar decisiones y consulta a tu contador para temas fiscales.

## Estructura

| Archivo | Contenido |
|---------|-----------|
| `index.html` | Estructura de la página, diálogo de reportes y panel del gestor IA |
| `styles.css` | Estilos (tema grafito/blanco hueso, panel, maqueta de impresión) |
| `app.js` | Datos, importación/exportación CSV, KPIs, gráficas y tablas |
| `reportes.js` | Impresión y descarga de PDF |
| `asistente.js` | Gestor IA: prompt, contexto contable, cliente de OpenRouter y chat |

## Publicación

El sitio se sirve con GitHub Pages desde la rama `main` (raíz del repositorio). Como el repositorio es público, **no subas datos reales de la empresa ni claves de API a este repositorio**.

## Tecnología

Sin compilación. Librerías desde cdnjs: [Chart.js](https://www.chartjs.org/) 4.4.1, [jsPDF](https://github.com/parallax/jsPDF) 2.5.1 y [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable) 3.8.2. Tipografía Inter (Google Fonts).
