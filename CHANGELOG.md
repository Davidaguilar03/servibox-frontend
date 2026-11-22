# Registro de cambios

Todos los cambios relevantes del frontend de ServiBox se registran en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa
[versionado semántico](https://semver.org/lang/es/). MAJOR y MINOR coinciden con los del backend; PATCH puede diferir.

## [1.1.1] - 2026-11-22

### Corregido

- La forma de pago Crédito se veía como "CrÃ©dito" en la tabla del reporte de Ventas; una prueba detecta texto mal codificado en todo el código.
- El Estado de Resultados de un mes completo se compara con el mes completo anterior (octubre con septiembre, no con el 31 de agosto al 30 de septiembre).
- Las tablas de Reportes caben completas a 1440 px: encabezados en dos líneas, fecha corta, cifras en tamaño pequeño y nombres largos truncados con el nombre completo al pasar el puntero.
- Un valor cero con signo se muestra "$ 0", sin "+" ni "-", en Flujo de caja, Movimientos y Tesorería.
- El pie del listado de Inventario dice "ítems" con los filtros Todos y Servicios, y "productos" solo con Productos.

## [1.1.0] - 2026-11-21

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
