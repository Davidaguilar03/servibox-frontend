# 2026-10-18: Facturas de venta (listado) y correcciones del panel

Objetivo: la pantalla Facturas de venta de `/ventas` segun la captura del manual, mas las
correcciones pendientes del panel y del shell
([2026-10-18-dashboard.md](2026-10-18-dashboard.md)). Rama `feat/3-sales-invoices-list`.

## Hecho

* **Estado de stock**: "Sin stock" solo en 0; "Stock critico" de 1 al umbral rojo; "Bajo
  stock" hasta el amarillo. Umbrales por defecto de Autollantas sin cambios. **Stock
  critico es una variante de `StatusBadge` que el manual no define: debe validarla el
  disenador.** Regla en [03-DECISIONS.md](../03-DECISIONS.md).
* **Identidad de sesion**: el login guarda `username`, `role`, `tenantName` y `tenantSlug`
  en `servibox.identity`; sin ella se usa el `sub` del JWT y el slug recordado.
* **Shell** segun la captura del panel: bloque de usuario abajo en la barra lateral
  (iniciales, username, rol y Salir), miga de pan a la izquierda de la barra superior
  (desde el `handle` de cada ruta) y nombre del tenant a la derecha. Sin buscador ni
  campana. El menu movil se conserva.
* **Raya**: `EMPTY_VALUE` definida una vez con el escape unicode.
* **Componentes nuevos**: `SearchField`, `SelectField`, `Pagination`. `IndicatorCard` gana
  texto secundario y error con reintentar; `EmptyState`, una accion opcional.
* **Facturas de venta** (`SalesInvoicesPage`): tres indicadores (Ventas del mes, Por
  cobrar, Abonos del mes), filtros en el cliente guardados en la URL, tabla de 25 filas
  con paginacion, tarjetas bajo 768 px, y estados de carga, vacio, vacio por filtros y
  error. Papelera, Nueva factura y Ver detalle llevan a placeholders.

## Contratos verificados en el backend

* `POST /api/auth/login`: `LoginResponse(token, user{username, role}, tenant{name, slug})`.
* `GET /api/sales`: `SaleResponse` con `id`, `invoiceNumber`, `customer` (tercero; una
  venta sin cliente es el tercero "Consumidor final"), `invoiceDate`, `dueDate`,
  `paymentType` (CONTADO, CREDITO), `status` (PAGADA, PENDIENTE, ANULADA), `total`,
  `pendingBalance` (0 en una ANULADA). Incluye las anuladas.
* `GET /api/treasury/movements`: filtros opcionales `accountId`, `category`, `desde`,
  `hasta`, `saleId`, `purchaseId`. `MovementResponse` trae `saleId` en un RECAUDO_VENTA. Los
  movimientos de una factura anulada no salen.
* Zona de negocio del backend: America/Bogota (`servibox.business.time-zone`).

## Verificacion

* `npm run build` y `npm run lint` sin errores ni advertencias.
* 61 pruebas (29 anteriores, 32 nuevas o ampliadas): estado de stock con limites exactos,
  sesion con y sin identidad, filtros, periodos, busqueda sin tildes, URL, indicadores,
  paginacion, shell, y la pantalla con la API simulada (datos, vacio, vacio por filtros,
  error en un indicador y en el listado, URL y paginas).
* Prueba real con el backend en perfil dev, por el proxy: dos clientes, un producto,
  FV-0001 contado (15/10, 59.500), FV-0002 credito (05/10, 238.000) con abono de 60.000,
  FV-0003 contado de septiembre anulada, FV-0004 credito de septiembre sin abonos
  (95.200) y 24 ventas de contado de 1.190 en octubre. API y pantalla coinciden: Ventas
  del mes 326.060, Por cobrar 273.200 (2 facturas), Abonos del mes 60.000; Este mes 26
  facturas en dos paginas; Pendiente FV-0002 y FV-0004; Anulada FV-0003; Credito FV-0002
  y FV-0004; busqueda "JOSE PEREZ" en Este mes FV-0001. Filtros conservados al recargar y
  al volver atras. En el navegador, tarjetas bajo 768 px y, en `/inicio`, bloque de
  usuario, miga de pan y "ServiBox Demo".

## Pendiente

* Validar "Stock critico" con el disenador.
* Nueva factura, detalle, abonos, anular, papelera real, exportar y ordenar por columnas.
* Variacion contra el mes anterior en los indicadores.
