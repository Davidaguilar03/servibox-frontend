# 2026-10-24: Otros ingresos en la utilidad neta y textos del costo en compras

Rama `feat/21-other-income-and-texts`. Refleja en el frontend dos cambios del backend ya
mergeados: `feat/34-other-income-in-kpis` (los ingresos ocasionales suman a la utilidad neta)
y `fix/35-cost-revert-on-annulment` (anular y recuperar una compra ajustan el costo). Regla y
motivo en [03-DECISIONS.md](../03-DECISIONS.md).

## Hallazgos

* `KpisResponse`: `desde`, `hasta`, `totalSales`, `totalPurchases`, `grossProfit`,
  `operatingExpenses`, `otherIncome`, `netProfit`; `netProfit = grossProfit + otherIncome -
  operatingExpenses`.
* Textos que cambiaban: el secundario del modal de anular en `PurchaseDetailPage` ("El costo
  de los productos no vuelve al anterior...") y `restoreText` de `PurchasesTrashPage` ("El
  costo de los productos queda como esta."). Ventas no menciona el costo.
* No habia texto de ayuda ni definicion de la utilidad en el panel ni en los listados. La
  descripcion de la opcion Estado de resultados de Reportes no describe la formula.

## Hecho

* `Kpis` con `otherIncome`; `incomeStatementRows` con seis filas; skeleton de seis filas.
* Textos nuevos de anular y recuperar compra.
* Pruebas: seis filas en orden con otros ingresos en cero y distinto de cero, Otros ingresos
  sin tono de exito ni de error, utilidad neta de kpis (267750 + 50000 - 450000 = -132250),
  variacion con `netProfit`, textos nuevos de compras y que los de ventas no mencionan costo.
  Fixtures completas de kpis con `otherIncome` (Reportes, panel, listados de venta y compra).
  Total: 604 (base 602).

## Prueba real

Backend en perfil dev (H2 en memoria) y Vite en 5173. Reportes del 01/10/2026 al 24/10/2026:
Ventas $ 267.750, Compras $ 0, Utilidad bruta $ 267.750, Otros ingresos $ 50.000 (texto
normal), Gastos -$ 450.000 (rojo) y Utilidad neta -$ 132.250 (fondo de error). El PDF y el
xlsx del mismo rango traen las mismas seis filas y cifras. Tras registrar un ingreso de
10.000 el 24/10 desde Ingresos ocasionales, la vista previa muestra Otros ingresos $ 60.000 y
Utilidad neta -$ 122.250; el panel muestra la misma utilidad neta. Los modales de anular
(PROV-1001) y de recuperar muestran el texto nuevo; la compra se anulo y se recupero para ver
el segundo.
