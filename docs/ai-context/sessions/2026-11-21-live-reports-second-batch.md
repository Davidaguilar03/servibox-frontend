# 2026-11-21: Reportes en vivo, segunda tanda (feat/62-live-reports-second-batch)

Rama feat/62-live-reports-second-batch desde main en 6f8c9ab (merge del PR #63), al dia con origin/main. Sin commit,
push ni PR: quedan para el prompt de cierre. Backend usado: servibox-backend main en f3cff50, perfil dev. Decision en
[03-DECISIONS](../03-DECISIONS.md); arquitectura en [01-ARCHITECTURE](../01-ARCHITECTURE.md), Reportes. Primera tanda en
[2026-11-21-live-reports](2026-11-21-live-reports.md).

## Que cambio

* `reports/liveReports.ts`: cinco definiciones nuevas (Inventario y rotacion, Flujo de caja, Estado de resultados, IVA y
  Movimientos), filtros `stock`, `cuenta` y `movimiento`, formatos `stockStatus`, `direction` y `signedAmount`, graficas
  de varias series, notas, filas resaltadas, orden fijo y `REPORT_GROUPS`.
* `reports/ReportChart.tsx`: varias series con leyenda, negativos bajo el eje, unidades. `reports/ReportTable.tsx`: los
  formatos nuevos, filas resaltadas y orden fijo. `reports/LiveReportView.tsx`: selector de cuenta, notas, indicadores con
  signo y margen, puntos de la grafica desde la definicion.
* `pages/ReportsPage.tsx`: navegacion por areas y redireccion de `?reporte=archivos`; sin la vista anterior.
* `components/StatusBadge.tsx`: variantes ENTRADA y SALIDA.
* `api/errorMessages.ts`: `Valor invalido '<x>' en el parametro estadoStock...` ("Elige un estado de stock válido:
  Disponible, Stock bajo, Stock crítico o Sin stock.") y `... en el parametro tipo...` ("Elige un tipo válido: Ingreso o
  Egreso."). `Cuenta no encontrada: <id>` ya estaba mapeado; se agrego su caso a la prueba.

Borrado:

* `pages/ReportsPage.test.tsx` (29 pruebas de la pestana `archivos`: formulario, vista previa, variacion, movimientos).
* De `reports/reports.ts`: `REPORT_OPTIONS`, `ReportOption`, `incomeStatementRows` y `StatementRow`, con sus 2 pruebas.
  `previousPeriod`, `variation`, `isFullCalendarMonth` y `periodTitle` se borraron y despues se recuperaron de main sin
  cambios, con sus 9 pruebas (ver Ajustes previos al cierre).
* De `accounts/accountsApi.ts`: el parametro `accountId` de `fetchPeriodMovements`, que solo usaba la vista anterior.

## Pruebas

Suite final: 77 archivos, 1881/1881. Desde la base 1885: menos 31 borradas (29 de ReportsPage.test y 2 de
incomeStatementRows) y mas 27 nuevas (liveReports.test 5, LiveReportsPage.test 17, errorMessages.test 3 y 2 casos
automaticos de las guardas por `Variation.tsx`). npm run lint y npm run build sin hallazgos; dist borrado.

Ajustadas:

* LiveReportsPage.test: "el periodo sigue al cambiar de reporte" pulsa el area "Compras y proveedores" (antes la pestana
  Compras); la prueba de la pestana `archivos` se reemplazo por la de la redireccion.
* liveReports.test: la lista de rutas y tipos tiene los diez reportes.
* controls.test: ReportsPage ya no tiene radios propios ni `SegmentedControl` (se quito de las excepciones y de las
  pantallas migradas). lists.test: el `PeriodPicker` de Reportes se busca en `reports/LiveReportView.tsx`.
* errorMessages.test: la lista de `type` permitidos suma INVENTARIO, FLUJO_CAJA e IVA.

## Verificacion en Edge sin ventana (CDP), contra Vite y el backend dev

Script y perfil en `%TEMP%\servibox-scratch`, fuera del repo. Los diez reportes abren con sus pestanas (area y reporte).
Indicadores frente a la API, noviembre de 2026 hasta el 21:

| Reporte | Pantalla | API |
|-|-|-|
| Inventario | 27 productos, 276 unidades, $ 49.285.000, $ 65.152.627, bajos 2, criticos 2, sin stock 1, 89 vendidas | iguales |
| Estado de resultados | $ 20.781.907, $ 14.055.000, $ 6.726.907, $ 5.192.200, $ 1.534.707 | iguales |
| Flujo de caja | $ 22.072.859, $ 16.724.657, $ 10.619.200, $ 6.105.457, $ 28.178.316 | 22072858.96, 16724656.59, 10619200, 6105456.59, 28178315.55 |
| IVA | $ 3.948.562, $ 2.670.450, $ 1.278.112 | 3948562.33, 2670450, 1278112.33 |
| Movimientos | $ 16.724.657, $ 10.619.200, $ 6.105.457 | iguales al flujo sin cuenta |

Un filtro por reporte nuevo, igual a la API antes y despues de recargar: estado de stock Critico (2 productos,
$ 1.940.000), cuenta Bancolombia en Flujo de caja (final $ 16.963.933, sin la nota de transferencias), Este ano en Estado
de resultados ($ 64.041.969 de ingresos), Mes anterior en IVA (generado $ 4.388.981) y Egreso en Movimientos (neto
-$ 10.619.200). `?reporte=archivos&periodo=mes-anterior` lleva a `?reporte=estado-resultados&periodo=mes-anterior`.

Descargas: `estado-resultados_2026-11-01_2026-11-21` (PDF 2191 bytes, XLSX 4153) y `flujo-caja_2026-11-01_2026-11-21`
(PDF 2678, XLSX 4583). Los Excel traen las cifras del JSON (20781907, -14055000, 6726907, -5192200, 1534707;
22072858.96, 16724656.59, -10619200, 6105456.59, 28178315.55). Del PDF solo se comprobo la cabecera %PDF-2.0.

Anchos: 1440 y 390 sin desborde de la pagina en Inventario, Estado de resultados y Flujo de caja. Capturas en
`%TEMP%\servibox-scratch\shots-live-reports-2`. Backend, Vite y Edge detenidos.

## Limitaciones

* El eje de las columnas rotula maximo, punto medio y minimo; con negativos el cero no lleva rotulo propio (lo marca la
  linea del eje).
* La siembra dev no tiene transferencias ni servicios en noviembre: las transferencias en Flujo de caja con cuenta solo
  las cubren las pruebas del backend.

## Ajustes previos al cierre

* Variacion contra el periodo anterior en el Estado de resultados en vivo: `previousPeriod`, `variation`,
  `isFullCalendarMonth` y `periodTitle` restaurados tal cual desde main (6f8c9ab) con sus 9 pruebas; `Variation.tsx`
  adapta el componente de la vista previa 1.0.0 (flecha, texto para lector de pantalla, signo explicito y "vs. <periodo>";
  `lowerIsBetter` en costo de ventas y gastos). Segunda consulta a `/reporting/income-statement` con el periodo anterior;
  si falla o el anterior es 0, sin variacion y sin toast.
* El calculo es el de la 1.0.0 (igual duracion): Este mes del 1 al 21 de noviembre se compara con el 11 al 31 de octubre,
  no con octubre completo. "vs. octubre de 2026" solo aparece cuando el periodo anterior es un mes completo (por ejemplo,
  agosto completo frente a julio).
* `TabList` con `centerSelected` (solo Reportes): centra la pestana activa al cargar y otra vez cuando terminan de cargar
  las fuentes (`document.fonts.ready`); sin eso, el ancho final de las pestanas la dejaba bajo el difuminado.
* Pruebas nuevas (6): periodo anterior con mes completo, Mes anterior y rango personalizado; variacion con signo y tono;
  fallo del periodo anterior; centrado de las pestanas. Ajustadas: el it.each de rutas y la redireccion comparan la primera
  llamada, porque Estado de resultados ahora hace dos.

Verificacion en Edge (backend main f3cff50): Este mes del 1 al 21 de noviembre frente al 11 al 31 de octubre. Ingresos
20781907 frente a 12133581 (+71 %), costo 14055000 frente a 8098000 (+74 %), utilidad bruta +67 %, gastos 5192200 frente a
4131100 (+26 %), utilidad neta 1534707 frente a 214481 (+616 %): pantalla igual al calculo sobre la API. A 390,
`?reporte=movimientos` y `?reporte=estado-resultados` dejan Finanzas y la pestana del reporte completas (borde derecho de
la pestana igual al de su fila, sin difuminado). Capturas en `%TEMP%\servibox-scratch\shots-live-reports-3`.
