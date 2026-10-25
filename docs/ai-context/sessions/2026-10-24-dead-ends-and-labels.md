# 2026-10-24: Promesas muertas, rotulos y consistencia de alertas

Rama `fix/22-dead-ends-and-labels`. Revisa un reporte externo de criticas a la interfaz
(capturas posiblemente anteriores a fix/17 a fix/21) y corrige lo vigente. Regla y motivo en
[03-DECISIONS.md](../03-DECISIONS.md) y [02-CONVENTIONS.md](../02-CONVENTIONS.md).

## Hallazgos

| Id | Hallazgo | Estado | Evidencia (antes del cambio) |
|-|-|-|-|
| H1 | Login ofrece "Olvidaste tu contrasena" | VIGENTE, corregido | `LoginPage.tsx:110`, `routes.tsx:51` (`ComingSoonPage`) |
| H2 | Configuracion con pestana Usuarios Proximamente | VIGENTE, corregido | `settingsForms.ts:11`, `SettingsPage.tsx:83-90` |
| H3 | Reportes lista Ventas y Compras Proximamente | VIGENTE, corregido | `reports.ts:26-27`, `ReportsPage.tsx:149-151` |
| H4 | Otras promesas en landing, login, registro o menu | VIGENTE solo por H1 a H3 | Landing: los modulos y "reportes para descargar" existen; menu sin entradas muertas; registro sin promesas. `/terminos` es "Proximamente" pero el registro lo enlaza: queda |
| H5 | Compras dice "Nueva factura" igual que Ventas | VIGENTE, corregido | `PurchaseInvoicesPage.tsx:113,209`, `SalesInvoicesPage.tsx:123,219`, `CounterpartiesPage.tsx:151-152` |
| H6 | "Volver a Productos" rojo junto al primario | VIGENTE, corregido | `CategoriesPage.tsx:166` (`text-brand-ink`) |
| H7 | Inventario cuenta menos alertas que Inicio | VIGENTE, corregido | Inicio: `lowStockProducts` (sin stock + critico + bajo, max 5, sin cifra). Inventario: `belowMinimum` (solo critico + bajo) |
| H8 | Productos y Categorias no avisan configuracion en 0 | VIGENTE, corregido | Ninguna de las dos consultaba `financial-settings` |
| H9 | Ayuda del costo menciona centavos | VIGENTE, corregido | `ProductFormPage.tsx:236` |
| H10 | "DIAN (%)" en Configuracion financiera | VIGENTE, corregido | `FinancialSettingsTab.tsx:29,161`; no habia otro texto de interfaz con DIAN |

## Hecho

* Borrados: `src/pages/ComingSoonPage.tsx` y su prueba, la ruta `/recuperar-contrasena`, la
  pestana `usuarios`, `VENTAS`/`COMPRAS` y `available` de Reportes, `belowMinimum` y su
  aserto.
* Rotulos: primario y estado vacio de Facturas de venta (`Registrar venta`, "Registra tu
  primera venta.") y de compra (`Registrar compra`, "Registra tu primera compra."); icono de
  Clientes ("Registrar venta para X") y Proveedores ("Registrar compra para X"). Inicio ya
  decia `Registrar venta`. Titulos y migas "Nueva factura" sin cambio.
* `stockAlerts` y `stockAlertCounts` en `src/lib/stock.ts`; tarjeta "Con alerta de stock"
  en Inventario y la misma linea en Inicio.
* Aviso de configuracion financiera en 0 % en Productos y Categorias.
* Ayuda del costo y rotulo de renta.
* Pruebas: 616 (base 604; se borro la de `ComingSoonPage` y se agregaron 13).

## Prueba real

Backend en perfil dev (H2 en memoria, 8080) y Vite en 5173.

* Tenant demo: la API da 27 productos; con alerta BA-007 (0), LL-010 (2, rojo 3), BA-004 (1,
  rojo 2), LL-007 (6, amarillo 8) y LU-010 (9, amarillo 12). Inicio dice "Con alerta de
  stock: 5 · 1 sin stock" e Inventario 5 con "1 sin stock". La configuracion financiera del
  demo esta en 0, asi que el aviso aparece en Productos y Categorias.
* Login sin enlace de recuperacion; Configuracion con dos pestanas; Reportes con dos
  opciones habilitadas; con 60 en gastos y renta (sin guardar) la advertencia dice "Gastos,
  impuesto de renta deducible, ICA y el margen..."; Nuevo producto sin centavos.
* Tenant recien registrado: listados de venta y compra vacios con "Registrar venta" /
  "Registrar compra" en primario y en el estado vacio (secundario); aviso visible en
  Productos y Categorias; Inventario 0 con alerta e Inicio "No hay productos con stock
  bajo."; `?tab=usuarios` cae en Datos.
