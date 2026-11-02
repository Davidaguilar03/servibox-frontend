# 2026-11-01: Limpieza de navegacion antigua

Rama feat/57-legacy-navigation-cleanup desde main en 4da7a62. Sin commit, push ni PR: quedan para el prompt de cierre,
tras la aprobacion de David.

Lectura previa: 00, 02, las secciones de shell de 01, parte de 05 y 06, la nota anterior y las entradas recientes de
03-DECISIONS, con busqueda del resto. Guardas: designSystem.test.ts y copy.test.ts completas (leidas despues de editar, no
antes); de tokens.test.ts y errorMessages.test.ts solo el inicio, porque no se tocan colores ni mensajes. No se modificaron.

## Que cambio

| Pantalla | Ruta | Boton quitado | Encabezado despues |
|-|-|-|-|
| Facturas de venta | `/ventas` | Clientes, Otros ingresos | Papelera y Registrar venta |
| Facturas de compra | `/compras` | Proveedores, Gastos operativos | Papelera y Registrar compra |
| Clientes | `/ventas/clientes` | Volver a Facturas de venta | Nuevo cliente |
| Otros ingresos | `/ventas/ingresos` | Volver a Facturas de venta | Nuevo ingreso |
| Proveedores | `/compras/proveedores` | Volver a Facturas de compra | Nuevo proveedor |
| Gastos operativos | `/compras/gastos` | Volver a Facturas de compra | Nuevo gasto |

* Bajo lg, los dos listados de facturas ya no muestran el menu Mas: con una sola secundaria, Papelera queda a la vista.
* Categorias: `/inventario/categorias` entra en `headerInPage` y su encabezado copia la composicion de Productos. Sin barra
  ni miga, el h1 sube 64 px. Boton, textos, rutas y modal sin cambios.
* `listPath` y `listLabel` salen de las configuraciones de movimientos manuales y terceros. El acento del indicador sale
  de `category`.

Sin cambios: rutas, guardas, textos, tokens, API. Sin textos nuevos.

## Verificacion en Edge sin ventana

Con API simulada en el navegador (CDP), no con el backend de demo: entrar a la demo exige la clave de DevDataInitializer, y
leer el backend no estaba en el prompt. Se arranco el backend y se detuvo sin usarlo. Los datos son de prueba y no hubo
guardados: la tarea no toca datos ni llamadas a la API.

Medido en el navegador, a 1440 y 390 (esperado igual a obtenido en todas las filas):

| Ruta | Sidebar activo | h1 arriba, antes a despues (1440) | h1 arriba, antes a despues (390) |
|-|-|-|-|
| `/ventas` | Facturas de venta | 32 a 32 | 24 a 24 |
| `/compras` | Facturas de compra | 32 a 32 | 24 a 24 |
| `/ventas/clientes` | Clientes | 32 a 32 | 24 a 24 |
| `/ventas/ingresos` | Otros ingresos | 32 a 32 | 24 a 24 |
| `/compras/proveedores` | Proveedores | 32 a 32 | 24 a 24 |
| `/compras/gastos` | Gastos operativos | 32 a 32 | 24 a 24 |
| `/inventario/categorias` | Inventario | 96 a 32 | 88 a 24 |

Sin desborde horizontal ni errores de consola, antes y despues. Categorias queda con h1 en la misma posicion que Productos
(izquierda 272 a 1440 y 80 a 390). Capturas de antes (desde main, sin cambios de codigo) y despues revisadas por el agente en
las siete pantallas y los dos anchos. Scripts y capturas fuera del repo y ya borrados.

No se probo en el navegador el modal de Categorias, ni un telefono real, ni con datos reales.

## Pruebas

Suite: 75 archivos, 1797/1797 (base 1797 mas 0 nuevas: los casos se ajustaron y ampliaron dentro de las pruebas existentes).
npm run lint, npm run build y git diff --check sin hallazgos. Guardas sin cambios.

Ajustadas:

* ManualMovementsPage.test, Gastos y Otros ingresos: el enlace Volver ya no esta. Se quita una linea repetida.
* ManualMovementsPage.test, listados de facturas (2): ya no hay boton en el contenido; se llega desde el menu lateral.
* CounterpartiesPage.test, Clientes y Proveedores: el enlace Volver ya no esta.
* CounterpartiesPage.test, botones de encabezado: igual que los listados, desde el menu lateral.
* SalesInvoicesPage.test y PurchaseInvoicesPage.test, indicadores: agregan que los botones quitados no estan y Papelera sigue.
* CategoriesPage.test, listado: sin barra ni miga, y el menu lateral resalta Inventario.
* AppShell.test, Productos y su modal: Categorias pasa de conservar la miga a no tener barra, con menu movil y titulo de pestana.

El resaltado de las seis pantallas ya lo comprobaba AppShell.test (la entrada directa abre el grupo con un solo hijo activo);
pasa sin cambios.

## Barrido en lectura, sin tocar

Botones Volver que repiten el menu lateral:

* Papelera de venta, `/ventas/papelera`: Volver a Facturas de venta. Papelera no esta en el menu, pero Facturas de venta si.
* Papelera de compra, `/compras/papelera`: Volver a Facturas de compra. Igual.
* Categorias, `/inventario/categorias`: Volver a Productos, el mismo destino que Inventario en el menu.

Volver legitimos, de un formulario o detalle a su lista: Nueva factura y detalle de factura, de venta y de compra; Producto no
encontrado; detalle de solicitud y de serviteca en plataforma, que conservan los filtros. Volver al inicio y Volver a la pagina
principal son de paginas publicas.

Barras antiguas: no queda ninguna. Todas las rutas de `AppShell` entran en `headerInPage`, asi que el `header` con la miga y
`crumbLinks` de `routes.tsx` ya no se ven en ninguna pantalla. `useBreadcrumb` sigue dando el titulo de pestana. No se retiro por
estar fuera del alcance.

## Limitaciones

* `TrashConfig` conserva `listPath` y `listLabel`: Papelera los usa para su regreso y para el enlace al detalle.
* Las notas de sesion anteriores siguen nombrando los botones quitados; son historicas y no se editan.
