# Dashboard financiero · Jugos

Dashboard de contabilidad para una empresa de jugos. Es una sola página (`index.html`) que no necesita servidor ni instalación: se abre en el navegador.

## Qué muestra

- **KPIs**: ingresos, costo de ventas, utilidad bruta, gastos operativos y utilidad neta, con márgenes.
- **Ingresos, costos y utilidad por mes**.
- **Ventas por producto** (jugos y bebidas).
- **Costos y gastos por categoría**.
- **Utilidad neta acumulada**.
- **Estado de resultados por mes** (con márgenes).
- **Movimientos**, con búsqueda.
- Filtros por año y por mes.

## Cómo usarlo con los datos de la empresa

1. Abre `index.html` en el navegador.
2. Pulsa **Plantilla** para descargar un CSV de ejemplo.
3. Llena la plantilla con tus movimientos. Columnas:

| Columna     | Descripción                                                                 | Ejemplo                 |
|-------------|-----------------------------------------------------------------------------|-------------------------|
| `fecha`     | `AAAA-MM-DD` o `DD/MM/AAAA`                                                 | `2026-01-31`            |
| `tipo`      | `Ingreso` (ventas), `Costo` (costo de ventas) o `Gasto` (gastos operativos) | `Costo`                 |
| `categoria` | Agrupa los movimientos en las gráficas                                      | `Materia prima`         |
| `concepto`  | Descripción libre                                                           | `Compra de naranja`     |
| `monto`     | Número sin símbolo de moneda                                                | `8000` o `25.000,50`    |

Se aceptan separadores `,` o `;`.

4. Pulsa **Importar CSV** y elige tu archivo.

Los datos importados se guardan en el navegador donde los importaste. Para compartirlos, usa **Exportar CSV** o vuelve a importar el archivo en otro equipo. **Datos de ejemplo** regresa a los datos ficticios.

> Los datos incluidos son ficticios. El dashboard es de apoyo para el análisis y no sustituye los estados financieros oficiales.

## Publicarlo con GitHub Pages

En el repositorio: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`**. GitHub te dará una URL pública.

Si el repositorio es privado, GitHub Pages requiere un plan de pago. Con un repositorio público, cualquiera con la URL puede ver lo que haya en la página, así que no subas datos reales de la empresa al repositorio público.

## Tecnología

HTML, CSS y JavaScript sin dependencias de compilación. Las gráficas usan [Chart.js](https://www.chartjs.org/) (4.4.1) desde cdnjs.
