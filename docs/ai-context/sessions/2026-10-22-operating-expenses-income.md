# 2026-10-22: Gastos operativos e Ingresos ocasionales

Rama `feat/14-operating-expenses-income`.

## Hecho

* `src/manualMovements/`: API (`fetchManualMovements`, crear, `PUT`, `DELETE`), logica
  (filtros en la URL, periodos, indicadores, formulario, avisos de saldo, texto de
  eliminar), `ManualMovementsPage` y los modales de alta, edicion y eliminar.
* `OperationalExpensesPage` (`/compras/gastos`) y `OccasionalIncomePage`
  (`/ventas/ingresos`); botones en los encabezados de Facturas de compra y de venta.
* `DiscardableModal` sale de `AccountModals` a `src/components`.
* Pruebas: 417 a 457. Las de los listados de facturas no cambiaron.
* Decisiones en [03-DECISIONS.md](../03-DECISIONS.md).

## Prueba real

Backend dev y Vite con la extension de Chrome, tenant demo. Gasto de 120.000 desde Caja
General: saldo 1.946.250 a 1.826.250 y gastos operativos del mes 450.000 a 570.000. Gasto
de 2.000.000 con el aviso: el backend lo acepto y la caja quedo en -173.750. Ingreso de
300.000 en Bancolombia: 2.230.650 a 2.530.650, KPIs sin cambio. Editar el gasto de energia
a 200.000 en Bancolombia: caja -53.750 y Bancolombia 2.330.650. Eliminar el gasto de
2.000.000: caja 1.946.250. Eliminar un ingreso que dejaba la caja en negativo: permitido,
-53.750. Cuentas muestra GASTO OPERATIVO e INGRESO OCASIONAL; panel, Reportes y `/kpis`
coinciden (gastos 2.650.000, utilidad neta -2.382.250).

## Hallazgo corregido en la prueba

El aviso de saldo marcaba la cuenta de la que salia un gasto editado si ya estaba en
negativo ("necesitas $ 0"). Ahora solo avisa una cuenta a la que la operacion le resta.
