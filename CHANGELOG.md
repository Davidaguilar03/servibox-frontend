# Registro de cambios

Todos los cambios relevantes del frontend de ServiBox se registran en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa
[versionado semántico](https://semver.org/lang/es/). La versión coincide con la del backend.

## [1.1.0] - En desarrollo

### Agregado

- Versionado semántico; la versión se muestra en el menú lateral, el inicio de sesión y el pie de la landing.
- Servicios: registro con precio fijo e IVA opcional, filtro por tipo en inventario, venta junto con productos y exclusión de alertas y valorización de inventario.
- Reportes en vivo de Ventas, Productos y servicios vendidos, Compras, Cartera por cobrar y Cartera por pagar, con filtros, indicadores, gráfica y tabla, y descarga en PDF y Excel con los mismos filtros.
- Reportes en vivo de Inventario y rotación, Flujo de caja, Estado de Resultados, IVA y Movimientos, agrupados por área.
- Variación frente al periodo anterior en el Estado de Resultados en vivo.

### Cambiado

- El IVA de un servicio se lee de vatApplies.
- Las descargas de Estado de Resultados y Movimientos se hacen desde su reporte en vivo, con los mismos filtros.
- Los indicadores de Reportes usan el mismo diseño que los del Inicio.
- Nuevo diseño del selector de áreas y reportes.
- La exportación a Excel se hace solo desde Reportes; se retira el botón de Tesorería.

## [1.0.0] - 2026-11-01

Primera versión en producción (servibox.co).

### Agregado

- Landing pública, solicitud de cuenta para servitecas, activación de la cuenta desde el correo e inicio de sesión con el código de la serviteca.
- Panel de inicio con indicadores del periodo, productos con stock bajo, saldos de cuentas y últimas ventas.
- Inventario de productos con categorías, costo, precio sugerido y alertas de stock.
- Ventas de contado y a crédito con abonos, clientes, otros ingresos y papelera de facturas.
- Compras a proveedores con sus pagos, gastos operativos y papelera de facturas.
- Tesorería con cuentas, movimientos y transferencias entre cuentas.
- Reportes con estado de resultados y movimientos de cuentas en PDF y Excel.
- Configuración de la serviteca y panel de administración de la plataforma para solicitudes y servitecas.
