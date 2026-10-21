# 2026-10-19: Pantalla Reportes

Rama `feat/6-reports-screen`.

## Hecho

* `apiDownload` en `lib/api.ts`, con `fileNameFrom` para `Content-Disposition`.
* `ReportsPage` en `/reportes` (reemplaza el placeholder) y su logica en
  `src/reports/reports.ts`: tipos con Proximamente, rango por defecto en Bogota,
  validacion de 366 dias, vista previa del Estado de resultados desde `/kpis`, variacion
  contra el periodo anterior de igual duracion, titulo de mes calendario, ruta exacta de
  exportacion, texto de Movimientos de cuentas.
* `IndicatorCard` acepta la variacion (`trend`).
* Detalle de factura: total de linea sin IVA y Anular como boton secundario; se elimina
  `dangerSecondary`.
* Decisiones en [03-DECISIONS.md](../03-DECISIONS.md); estructura en
  [01-ARCHITECTURE.md](../01-ARCHITECTURE.md).

## Verificado en el backend

`GET /api/reporting/export`: `type` (`ESTADO_RESULTADOS`, `MOVIMIENTOS`), `format` (`PDF`,
`XLSX`), `desde` y `hasta` ISO, `accountId` opcional solo para `MOVIMIENTOS`. Respuesta
`application/pdf` o el tipo de xlsx, con `attachment; filename="<tipo>_<desde>_<hasta>.<ext>"`.
Errores 400 `{"error", "status"}`: rango invertido ("La fecha desde no puede ser posterior a
la fecha hasta"), mas de 366 dias ("El rango de un reporte no puede pasar de 366 dias"),
cuenta ("Cuenta no encontrada: <id>"), tope ("El reporte tiene mas de 20000 movimientos:
acota el rango de fechas"), `accountId` con Estado de resultados ("accountId solo aplica al
reporte MOVIMIENTOS"). `GET /api/reporting/kpis`: `desde` y `hasta` opcionales (sin los dos,
KPIs globales); responde `desde`, `hasta`, `totalSales`, `totalPurchases`, `grossProfit`,
`operatingExpenses`, `netProfit`.

## Prueba real

Backend en perfil dev y frontend con `npm run dev`; datos creados por el proxy (cuenta con
saldo inicial, ingresos ocasionales, gastos operativos, transferencia, venta de contado,
venta a credito con abono, compras de contado y una venta anulada) en octubre y en el
periodo anterior. La extension del navegador no estaba conectada: el flujo se replico por
la API a traves del proxy y con la logica de la pantalla sobre los datos reales.

* `/kpis` del 01/10 al 19/10: ventas 2.380.000, compras 892.500, bruta 1.487.500, gastos
  150.000, neta 1.337.500. Periodo anterior 12/09 a 30/09: 476.000 y 78.500. Variacion
  calculada a mano y por la pantalla: ventas 400, utilidad 1604.
* PDF y xlsx del Estado de resultados con las mismas cinco cifras y el nombre
  `estado-resultados_2026-10-01_2026-10-19.<ext>`; la venta anulada no entra.
* Movimientos con Bancolombia (saldo inicial y final) y con Todas las cuentas; julio da
  "Sin movimientos en el periodo".
* Detalle: FV-0002 8 x 200.000 da 1.600.000 en la linea, total de la factura 1.904.000.
* Al terminar no quedo nada escuchando en 8080 ni en 5173.

## Pendiente

* Cuentas con Exportar a Excel (reutiliza `apiDownload`).
* Reportes de Ventas y Compras cuando el backend los exporte.
