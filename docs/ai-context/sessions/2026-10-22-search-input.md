# 2026-10-22: Campos de texto atados a la URL sin perder letras

Rama `fix/12-search-input`.

## Hecho

* `src/lib/useUrlTextParam.ts`: estado local, espera de 300 ms, Enter y salida inmediatos,
  `replace`, sincronizacion con cambios externos de la URL, IME y cancelacion al desmontar.
* Lo usan los buscadores de `SalesInvoicesPage`, `PurchaseInvoicesPage`, `ProductsPage` y
  `TrashPage` (las dos papeleras), y Desde y Hasta de `AccountsPage`. `update` de Cuentas
  acepta `replace` como `updateFilters` de los listados.
* `typeWithoutPause` en `src/test/utils.tsx`: teclas sin pausa fuera de `act`.
* Pruebas: las del hook, la reproduccion en Facturas de venta, una de integracion por listado
  (venta, compra, productos, papelera de ventas) y una de las fechas de Cuentas. Cuatro pruebas
  existentes esperaban la URL justo despues de `user.type`; ahora avanzan la espera con el
  reloj simulado (`shouldAdvanceTime` para que userEvent siga funcionando).
* Decision en [03-DECISIONS.md](../03-DECISIONS.md) y regla en
  [02-CONVENTIONS.md](../02-CONVENTIONS.md).

## Causa

`RouterProvider` aplica la navegacion en `React.startTransition` tras una promesa; el campo
controlado volvia al valor viejo de la URL antes de la siguiente tecla. Resuelve el hallazgo
de [2026-10-22-trash.md](2026-10-22-trash.md).
