# 2026-10-24: Ninguna pantalla desborda en ancho

Rama `fix/20-invoice-lines-responsive`. Corrige RESP-01 a RESP-04 de la auditoria visual del
2026-10-24 (reporte fuera del repo, en el escritorio).

## Hallazgos

* Lineas de factura: rejilla `110px / minmax(0,1fr) / 96px / 128px / 104px / 112px / 44px` con
  `gap` de 12 desde `md`: 594 px de columnas mas 72 de espacios, 666 px fijos. La seccion
  Productos ocupa todo el ancho; descontando el padding de la pagina, de la tarjeta (24 + 24) y
  de la fila (12 + 12), la columna Producto queda en 0 px por debajo de 786 px entre md y lg, y
  por debajo de 1042 px con la barra abierta desde lg (874 px con la barra contraida). Medido
  en Chrome: 0 px a 768 y 1024, 221 px a 1280. Con 0 px el combobox (50 px minimo) se monta 50
  px sobre la columna Cantidad; la pagina no se desplaza, pero la linea no se puede usar.
* Panel a 360 y 390 px: desplazamiento horizontal de 80 y 50 px. Lo causa la rejilla
  `lg:grid-cols-5` de Stock bajo y Saldos: sus celdas tienen `min-width: auto` y la tabla de
  Stock bajo (dentro de su propio `overflow-x-auto`) fija 401 px de ancho minimo a toda la
  columna, asi que Stock bajo y Saldos se salen de la pantalla.
* Toasts: a 360 y 390 px el aviso se sale 16 px por la izquierda.
* Landing a 360 px: "Iniciar sesion" y "Crear cuenta" se veian (el `inline-flex` de
  `buttonClasses` le ganaba a `hidden`), el boton de menu quedaba en 27 px y el grupo se salia
  13 px del encabezado (recortado por el `overflow-x-hidden` de la landing).

## Hecho

* Lineas de venta y de compra: rejilla, encabezado de columnas y etiquetas ocultas desde `xl`;
  resumen lateral de 320 px desde `xl`. Por debajo, tarjetas apiladas y resumen debajo.
  `ComboboxField` con `compactLabel` oculta la etiqueta desde `xl`.
* `DataTable` con `card` y `cardsLabel`; tarjetas en Stock bajo, Ultimas ventas y Categorias.
* Toaster con `left-4 right-4` bajo sm.
* Encabezados: Productos con `flex-wrap`; Cuentas con el primario al final segun el estado.
* Landing: `max-sm:hidden` en los dos enlaces del encabezado.
* Pruebas nuevas (5): tabla y tarjetas del panel, tabla y tarjetas de Categorias (con Editar
  desde la tarjeta), campos accesibles de las lineas de venta y de compra con la rejilla solo
  desde xl, y clases del Toaster. Pruebas ajustadas en `CategoriesPage.test.tsx`: la espera
  inicial, el clic en Editar y la fila de REPUESTOS DEMO se buscan en la tabla, y el reintento
  cuenta dos botones Editar. Pruebas: 597 a 602.

## Auditoria de desbordes

Script del scratchpad (fuera del repo): carga cada ruta en un iframe de 360, 390, 768, 1024,
1280 y 1536 px y mide el desborde del documento, los elementos que salen de la ventana (si su
contenedor tiene desplazamiento propio cuentan como contenidos) y los desbordes internos (un
hijo que sale de la caja de su padre). Rutas publicas, privadas con el tenant demo y con un
tenant recien registrado, mas variantes: Nueva factura con 2 lineas, barra contraida en 1024 y
1280, un toast en 360, 390 y 768, y los modales Nuevo gasto, Nuevo cliente y Registrar abono en
360.

Antes (solo filas con hallazgos; el resto, ok):

| Ruta | 360 | 390 | 768 | 1024 | 1280 | 1536 |
|-|-|-|-|-|-|-|
| publica / | interno +13 | ok | ok | ok | ok | ok |
| demo /inicio | desborda 80 | desborda 50 | ok | ok | ok | ok |
| demo /ventas/nueva +2 lineas | ok | ok | interno +50 | interno +50 | ok | ok |
| demo /compras/nueva +2 lineas | ok | ok | interno +50 | interno +50 | ok | ok |
| demo /inicio con toast | desborda 80 | desborda 50 | ok | | | |
| vacio /inicio con toast | toast -16 | toast -16 | ok | | | |
| modales (5 casos) | interno +8 | | | | | |

Despues: 61 filas, ningun desborde. Quedan 5 internos de +8 px en los modales: es el `-mr-2`
del boton Cerrar, que lo alinea opticamente con el borde. Los desplazamientos contenidos
(tablas de muchas columnas entre 768 y 1023 px, carrusel de cuentas, pestanas de categorias y
de configuracion, vista previa de la landing) son intencionales.

## Verificacion

* Chrome con el backend en perfil dev (8080) y Vite (5173), en iframes: Nueva factura de venta
  con 2 lineas en 360 y 900 px y de compra en 390 px, tarjetas completas y sin desborde; a 900 px
  el resumen va debajo de Datos generales. Panel en 360 px con tarjetas de Stock bajo y Ultimas
  ventas y un toast de 16 a 329 px. Categorias en 390 px con tarjetas. Al terminar no quedo nada
  escuchando en 8080 ni en 5173.

## Pendiente

* PAT-11 (un componente comun de tarjetas para todos los listados) queda fuera.
