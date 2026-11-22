# 2026-11-21: Reportes en vivo, primera tanda (feat/61-live-reports)

Rama feat/61-live-reports desde main en 9430a29 (merge del PR #62), al dia con origin/main. Sin commit, push ni PR: quedan
para el prompt de cierre. Backend usado: servibox-backend main en f3cff50 (merge de feat/61-reports-inventory-cashflow),
perfil dev. Decision en [03-DECISIONS](../03-DECISIONS.md); arquitectura en [01-ARCHITECTURE](../01-ARCHITECTURE.md),
Reportes.

## Que cambio

* `reports/liveReports.ts` (nuevo): definiciones de los cinco reportes, filtros, URL, parametros de API y exportacion,
  totales y orden. `reports/LiveReportView.tsx`, `reports/ReportChart.tsx` y `reports/ReportTable.tsx` (nuevos).
* `pages/ReportsPage.tsx`: encabezado y pestanas; la vista anterior pasa a `FileReports` en la pestana `archivos`.
* `lib/format.ts`: `formatPercent` y `formatInteger`.
* `inventory/inventoryApi.ts` y `inventory/productForm.ts`: `vatApplies` en la respuesta y en la carga del servicio.
* `api/errorMessages.ts`: mensajes nuevos de reportes (abajo).
* `CHANGELOG.md`: Agregado y Cambiado de 1.1.0.

Mensajes del backend agregados al mapa (texto del backend a texto de la interfaz):

* `Cliente no encontrado: <id>` y `Proveedor no encontrado: <id>`: "No encontramos ese cliente/proveedor. Puede que ya no exista."
* `Valor invalido '<x>' en el parametro antiguedad...`: "Elige una antigüedad válida: 0 a 30, 31 a 60, 61 a 90 o más de 90 días."
* `Valor invalido '<x>' en el parametro estado...`: "Elige un estado válido: Pagada, Pendiente o Anulada."
* `El parametro <p> no aplica al reporte <TYPE>`: "Uno de los filtros no aplica a este reporte. Recarga la página e inténtalo de nuevo."
* `El reporte tiene mas de <n> facturas: acota el rango de fechas`: "El reporte tiene más de 20.000 facturas: acorta el período."
* `El reporte tiene mas de <n> facturas pendientes: filtra por cliente|proveedor`: igual, con tildes y punto.
* `Falta el parametro type: ...` (lista nueva) sigue en el texto generico del 400.

## Pruebas

Suite: 78 archivos, 1885/1885 (base 1838 mas 47: liveReports.test 11, LiveReportsPage.test 17, format.test 1,
errorMessages.test 9, ProductFormPage.test 1 y 8 casos automaticos de designSystem y copy por los archivos nuevos).
npm run lint y npm run build sin hallazgos; dist borrado.

Ajustadas:

* ReportsPage.test (25 pruebas): entran por `/reportes?reporte=archivos`, porque `/reportes` abre ahora Ventas. Ninguna
  expectativa cambio.
* productForm.test: el servicio guardado se carga con `vatApplies` (antes `taxAmount`), mas el caso de IVA del tenant
  en 0 %. Fixtures tipados de productForm.test, productList.test y newPurchase.test llevan `vatApplies: true` (campo
  obligatorio). ProductFormPage.test: el servicio de prueba trae `vatApplies: false`.

## Verificacion en Edge sin ventana (CDP), contra Vite y el backend dev

Script y perfil en `%TEMP%\servibox-scratch`, fuera del repo. Cifras de pantalla frente al JSON de la API (mismos
parametros), noviembre de 2026 hasta el 21:

| Reporte | Pantalla | API |
|-|-|-|
| Ventas | $ 24.730.469, 16 facturas, ticket $ 1.545.654, contado $ 12.828.273, credito $ 11.902.197, 1 anulada | 24730469.33, 16, 1545654.33, 12828272.59, 11902196.74, 1 |
| Productos y servicios | 89 unidades, $ 20.781.907, costo $ 14.055.000, utilidad $ 6.726.907, 32,4 % | 89, 20781907, 14055000, 6726907, 32.37 |
| Compras | $ 7.097.160, 2, IVA $ 1.133.160, por pagar $ 1.670.160 | iguales |
| Cartera por cobrar | $ 18.838.228, 7 facturas, todo en 0 a 30 | 18838227.56, 7 |
| Cartera por pagar | $ 4.315.520, 2 facturas, todo en 0 a 30 | 4315520, 2 |

Un filtro por reporte (Forma de pago Credito, Tipo Productos, Estado Pendiente, Antiguedad 0 a 30, Antiguedad mas de 90):
indicadores iguales a la API, URL con el filtro (`antiguedad=90%2B`) y, tras recargar, mismo filtro y mismas cifras.
Ventas a credito: 5 facturas, $ 11.902.197.

Descargas de Ventas a credito: `ventas_2026-11-01_2026-11-21.pdf` (3317 bytes, %PDF-2.0) y `.xlsx` (5059 bytes). El
Excel trae Total vendido 11902196.74, 5 facturas y ticket 2380439.35, igual al JSON. El texto del PDF no se extrajo (sin
herramienta en la maquina).

Fila de totales de Ventas del mes: $ 20.781.907 / $ 3.948.562 / $ 24.730.469 / $ 11.402.197, las cifras del PDF que
reporta la nota del backend.

Anchos: 1440 sin desborde de la pagina (la tabla de Ventas se desplaza un poco dentro de su contenedor); 390 sin
desborde, indicadores en una columna y tabla desplazable (340 de ancho, 1144 de contenido). Capturas en
`%TEMP%\servibox-scratch\shots-live-reports`. Backend, Vite y Edge detenidos.

## Limitaciones

* La siembra dev no tiene cartera de mas de 30 dias ni servicios vendidos: esos casos los cubren las pruebas automaticas.
* La tabla pagina en el cliente sobre el conjunto completo (hasta 20000 filas del backend).
* El orden de la tabla no va en la URL: no es un filtro.
* Excepcion documentada a las tarjetas bajo md y a la regla de Responsive que dice que el agente no abre navegadores;
  el prompt pidio ambas cosas.
