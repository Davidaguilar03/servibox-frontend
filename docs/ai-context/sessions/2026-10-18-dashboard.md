# 2026-10-18: Panel de control (Inicio)

Objetivo: el panel de `/inicio` segun la captura del manual, mas dos ajustes pendientes del
scaffold ([2026-10-18-scaffold.md](2026-10-18-scaffold.md)). Rama `feat/2-dashboard-home`.

## Hecho

* **Inter 600** cargado con `@fontsource/inter/600.css`. El tamano `button` lleva peso 600 en
  los tokens y Label ya lo tenia: ya no hay negrita sintetizada.
* **Tokens nuevos** leidos de la captura de fundamentos: `brand-hover` EB3629, `nav-hover`
  2D3748, `text-subtle` 9CA3AF, `text-inverse` FFFFFF, `row-alt` FAFBFC, `overlay` 111827.
  Todos se leyeron con certeza. Hover del boton primario con `brand-hover` y del oscuro con
  `nav-hover`, en lugar de `color-mix`. Siguen con `color-mix` los estados activos y el hover
  de peligro, que no tienen token en el manual. `color-action` no cambio. Tambien se usan
  `nav-hover` en los items de la barra lateral, `text-inverse` en texto sobre fondo oscuro,
  `text-subtle` en textos tenues y `overlay` en el fondo del menu movil.
* **Componentes**: `IndicatorCard`, `StatusBadge`, `DataTable` y los estados `Skeleton`,
  `EmptyState` y `ErrorState`. `buttonStyles.ts` comparte las clases de boton con los
  enlaces que se ven como boton.
* **Formatos** en `src/lib/format.ts`: moneda `$ 180.000` sin decimales (es-CO), fecha
  dd/mm/aaaa, raya cuando no hay valor.
* **Estado de stock** replicado de Autollantas en `src/lib/stock.ts`. Regla en
  [03-DECISIONS.md](../03-DECISIONS.md).
* **Panel**: cuatro indicadores del mes, etiqueta fija "Este mes", "Registrar venta" hacia
  `/ventas/nueva` (placeholder), stock bajo, saldos de cuentas con total disponible y
  ultimas 5 ventas. Cada bloque tiene su consulta, su skeleton, su vacio y su error con
  reintentar.
* **Barra superior**: usuario (`sub`) y slug de la serviteca. El backend aun no devuelve el
  nombre del tenant, ver [03-DECISIONS.md](../03-DECISIONS.md).
* Las consultas reintentan una vez (`retry: 1`); el bloque con error ofrece reintentar.

## Contratos verificados en el backend

* `GET /api/reporting/kpis?desde&hasta`: `LocalDate` con `@DateTimeFormat(iso = DATE)`, es
  decir `AAAA-MM-DD`. Sin los dos parametros devuelve los KPIs globales. Responde
  `desde`, `hasta`, `totalSales`, `totalPurchases`, `grossProfit`, `operatingExpenses`,
  `netProfit`.
* `GET /api/sales`: lista de `SaleResponse` (`invoiceNumber`, `customer.name`,
  `invoiceDate`, `paymentType` CONTADO o CREDITO, `status`, `total`...), sin orden
  garantizado: el panel ordena en el cliente.
* `GET /api/treasury/accounts`: `id`, `name`, `initialBalance`, `currentBalance`, `type`.
* `GET /api/treasury/balance`: `{total}`.
* `GET /api/inventory/products`: `code`, `description`, `quantity`, `categoryId`...
* `GET /api/inventory/categories`: `id`, `name`, `yellowStockMin`, `redStockMin`...

## Verificacion

* `npm run build` y `npm run lint` sin errores ni advertencias.
* 29 pruebas: las 12 anteriores, formatos (7), estado de stock (7) y panel con la API
  simulada (3: con datos, vacio, y error en un bloque con reintento).
* Prueba real con el backend en perfil dev, por el proxy: categoria con amarillo 10 y rojo
  3, producto con stock 5 (bajo), producto con stock 50 y venta de contado de 2 unidades a
  30.000. KPIs del mes 60.000 / 0 / 60.000 / 60.000; Caja General 60.000 y balance 60.000;
  stock bajo solo el producto de 5; ultima venta FV-0001 Pagada. Coincide con la logica de
  las pruebas. En el navegador, `/inicio` muestra esos mismos valores.

## Pendiente

* Nombre del tenant en la barra superior cuando el backend lo exponga.
* Variacion contra el mes anterior, buscador, campana y selector de periodo (fuera de esta
  tarea, ver [03-DECISIONS.md](../03-DECISIONS.md)).
* Formulario de venta en `/ventas/nueva`.
