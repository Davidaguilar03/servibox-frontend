# 2026-11-21: Pulido de diseno de Reportes (feat/63-reports-design-polish)

Rama feat/63-reports-design-polish desde main en a43ae56 (merge del PR #64), al dia con origin/main. Sin commit, push ni
PR: quedan para el prompt de cierre. Backend usado: servibox-backend main en f3cff50, perfil dev. Decision en
[03-DECISIONS](../03-DECISIONS.md); arquitectura en [01-ARCHITECTURE](../01-ARCHITECTURE.md), Reportes; variantes de
`TabList` en [05-DESIGN-SYSTEM](../05-DESIGN-SYSTEM.md).

## Que cambio

* `components/IndicatorCard.tsx`: acentos `error` y `neutral`, tipo `IndicatorAccent` y prop `className`. El camino
  `dense` (KPI de Inicio) no cambia.
* `reports/liveReports.ts`: `LOOKS` (icono y acento por concepto) y `description` en los indicadores de los diez
  reportes; las carteras usan `portfolioIndicators('cobrar' | 'pagar')` por su descripcion.
* `reports/LiveReportView.tsx`: indicadores con `IndicatorCard dense`, margen en `note`, descripcion en `detail`,
  variacion en `trend`; rejilla segun la cantidad y la ultima tarjeta a todo el ancho con numero impar en dos columnas.
* `components/SegmentedControl.tsx`: `TabList` con `variant` (`underline`, `pill`, `subtle`); la base sin `-mb-px` y con
  `rounded-t-control`. `pages/ReportsPage.tsx`: areas `pill`, reportes `subtle`, separacion de 8 px.
* `pages/AccountsPage.tsx`: sin el boton Exportar a Excel, su mutacion, el `Alert` de error ni la ayuda "Para exportar".
* `styles/designSystem.test.ts`: `-mb-px` de `SegmentedControl.tsx` fuera de `ONE_PX_OFFSETS`.

Borrado: de `reports/reports.ts`, `exportPath`, `ExportRequest` y `ReportType` (solo los usaba Tesoreria).

## Criterio de colores

Ventas e ingresos verde, costos y compras ambar, utilidades y saldos azul, gastos, anuladas, salidas, cartera vieja y
stock critico rojo, conteos gris. Ajuste previo al cierre: los indicadores que tambien estan en Inicio usan su aspecto;
solo cambio Utilidad neta (de info a brand-strong, icono Wallet). Ventas sin IVA, costo de lo vendido y utilidad bruta
ya coincidian. En Estado de resultados, Utilidad neta (brand) y Gastos operativos (error) son rojos distintos.

## Causa de los bordes en las esquinas

Medido en Edge a 1440 en main: la fila de pestanas mide 39 px por dentro y la pestana 40 (`-mb-px`); la fila desplazable
recorta en vertical, asi que el subrayado de 2 px perdia su mitad inferior, y en posiciones de medio pixel (la fila
empieza en y 111,5) o con escalado de Windows se perdia entero. Como la pestana tenia `rounded-control`, su borde
inferior subia en curva hacia las esquinas, por encima del recorte: eso eran los dos trazos rojos. Las lineas grises
eran el `border-b border-border` de cada fila.

## Pruebas

Suite: 77 archivos, 1887/1887 (base 1881, menos 4 borradas y mas 10 nuevas). npm run lint y npm run build sin
hallazgos; dist borrado.

Nuevas: liveReports.test 3 (icono, color y descripcion en todos; mismo concepto mismo aspecto; mismo aspecto que los
KPI de Inicio), LiveReportsPage.test 3
(tarjeta de Inicio en Ventas; variacion con margen y descripcion en Estado de resultados; selector en pildoras sin
lineas grises), DashboardPage.test 1 (KPI de Inicio con sus acentos, iconos, relleno y rejilla), controls.test 2
(subrayado sin `-mb-px` ni esquinas curvas; variantes `pill` y `subtle`), AccountsPage.test 1 (sin boton de exportar
ni llamada a `/reporting/export`).

Borradas o ajustadas:

* reports.test: las 2 pruebas de `exportPath`.
* AccountsPage.test: "exporta a Excel con accountId..." y "un error al exportar va en un toast..." borradas; la ruta
  simulada de `/reporting/export` quitada; la prueba del rango invalido ya no espera el boton deshabilitado.

## Verificacion en Edge sin ventana (CDP), contra Vite y el backend dev

Script en `%TEMP%\servibox-scratch` (verify-polish.mjs, inicio.mjs, diag-tabs.mjs), fuera del repo. Noviembre de 2026
hasta el 21, indicadores frente a la API:

| Reporte | Pantalla | API |
|-|-|-|
| Ventas | $ 24.730.469, 16, $ 1.545.654, $ 12.828.273, $ 11.902.197, 1 | 24730469.33, 16, 1545654.33, 12828272.59, 11902196.74, 1 |
| Inventario | 27, 276, $ 49.285.000, $ 65.152.627, 2, 2, 1, 89 | iguales |
| Estado de resultados | $ 20.781.907, $ 14.055.000, $ 6.726.907 (32,4 %), $ 5.192.200, $ 1.534.707 (7,4 %) | iguales, 32.37 y 7.38 |
| Flujo de caja | $ 22.072.859, $ 16.724.657, $ 10.619.200, $ 6.105.457, $ 28.178.316 | 22072858.96, 16724656.59, 10619200, 6105456.59, 28178315.55 |

Variacion en el Estado de resultados: +71 %, +74 %, +67 %, +26 %, +616 % frente al 11 al 31 de octubre, igual que en la
nota de feat/62. Filas de tarjetas a 1440: Ventas 3+3, Inventario 4+4, Estado de resultados y Flujo 3+2, Compras 4,
IVA y Movimientos 3. A 768 las impares dejan la ultima a todo el ancho. A 390 una columna, sin desborde.

Selector: la pestana activa queda entera dentro de su fila en las dos filas y anchos; sin borde inferior en las filas.
Inicio: capturas de la rama y de main (con stash) identicas pixel a pixel a 1440 y 390. Tesoreria: botones Nueva
cuenta, Nueva transferencia y Ver todas las cuentas; ningun texto "Exportar".

Capturas en `%TEMP%\servibox-scratch\shots-design-polish`. Backend, Vite y Edge detenidos.

## Limitaciones

* Con 5 indicadores en escritorio la segunda fila tiene 2 tarjetas y un hueco (3+2); no se estira para no romper el
  ancho comun de las tarjetas.
* Las filas `pill` y `subtle` tienen 4 px de relleno: quedan 4 px hacia adentro del borde izquierdo del titulo.
