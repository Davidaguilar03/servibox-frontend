# 2026-10-24: Sistema de diseno base

Rama `feat/23-design-system-base`. Reglas en [05-DESIGN-SYSTEM.md](../05-DESIGN-SYSTEM.md),
decision en [03-DECISIONS.md](../03-DECISIONS.md). Sin cambios de textos, rutas,
comportamiento, colores ni backend.

## Lectura previa (barrido sobre la app, sin landing, login ni registro)

* Tamanos: no habia `text-xs` a `text-3xl` ni tamanos arbitrarios; se usaban los del manual:
  `small` 154, `body` 51, `h3` 30, `h1` 16, `h2` 11, `label` 5, `button` 2.
* Sombras: `shadow-card` 21 (todas las tarjetas, indicadores, Terminos), `shadow-menu` 4
  (combobox, toast, enlace de salto, barra fija de producto), `shadow-modal` 1 (Modal).
* Fuera de la rejilla: `gap-1.5` 10, `xl:pt-2.5` 6, `mt-1.5` 5, `mb-1.5` 2, `py-0.5` 2,
  `px-2.5` 1, `p-0.5` 1, `mt-px` 1, `-mb-px` 1 y la columna de `110px` de las lineas.
* Radios: `control` 48, `card` 24, `tag` 16, `pill` 6.
* Iconos: 33 con trazo 1.5, uno con 2 y uno con 2.5; tamanos 18 (16 usos), 16 (10), 20 (4),
  24 (3) y 14 (2).
* IBM Plex Mono en 20 usos: codigos (bien) y Origen de Cuentas (no es codigo). Montos con
  `tabular` en Inter en tablas y en Montserrat bold en indicadores y totales.
* Movimiento: `duration-(--duration-fast)` 29, `duration-(--duration-base)` 2, el toast con
  `ease-out`; `duration-slow` (280) sin uso.
* Ya existian como token: colores, familias, la escala del manual, `--spacing` 4, radios,
  sombras y duraciones.

## Tamanos de texto de contenido por pantalla

Antes: tabla 4.1 de la auditoria visual (sin contar label ni button). Despues: tamanos
calculados en Chrome (texto visible del documento, con el tenant demo), a 1280 y a 390 px.

| Pantalla | Antes | Despues 1280 | Despues 390 |
|-|-|-|-|
| Panel `/inicio` | 5 (H1, H2, H3, Body, Small) | 3 (20, 15, 13) + 14 + 12 | 3 + 14 |
| Facturas de venta | 4 | 3 + 14 + 12 | 3 + 14 + 12 |
| Nueva venta | 5 | 3 + 14 + 12 | 2 (20, 13) + 14 + 12 |
| Detalle de venta | 5 | 3 + 14 + 12 | 3 + 14 |
| Productos | 4 | 3 + 14 + 12 | 3 + 14 + 12 |
| Nuevo producto | 4 | 2 (20, 13) + 14 + 12 (los campos van en 15) | 2 + 14 + 12 |
| Categorias | 3 a 4 | 3 + 14 + 12 | 3 + 14 |
| Cuentas | 5 | 3 + 14 + 12 | 3 + 14 |
| Reportes | 5 | 3 + 14 + 12 | 3 + 14 + 12 |
| Configuracion | 4 | 2 (20, 13) + 14 + 12 | 2 + 14 + 12 |
| Modal Nuevo gasto (390) | 3 (H3, Body, Small) | | 2 (20, 13) + 14 + 12 |

Sombras medidas: ninguna tarjeta, tabla ni panel tiene `box-shadow`. Solo el enlace de salto,
la barra fija de Nuevo producto y los anillos de seleccion (`ring-1` del menu activo y de la
cuenta elegida, que no son sombra). Modal y menu movil abierto: `0 16px 40px` al 16 %; toast:
`0 4px 12px` al 10 %; menu cerrado y menu de escritorio: sin sombra. Toast y menu con
`cubic-bezier(0.2, 0, 0, 1)` y 200 ms.

## Cambios visuales inevitables

* Titulos de pantalla 32 a 20; titulos de seccion y de modal 18 a 20; "no encontrado" y
  Terminos 24 a 20. El Wordmark (tambien en landing, login y registro) 18 a 20.
* Cifras: indicadores 24 Montserrat 700 a 20 Inter 600; total de Nueva factura, saldo
  pendiente de los detalles y saldos de Cuentas 24 a 20; total disponible y totales del
  periodo 18 a 20. Todas en Inter tabular.
* Celdas de tabla 13 a 15 (DataTable y Estado de resultados de Reportes); en `xl` las celdas
  de codigo, IVA y total de las lineas de factura 13 a 15 con `pt` de 10 a 8 para seguir
  centradas con los campos de 40.
* Rotulos de campo y leyendas 13/500 a 12/600; encabezados de columna 11 con tracking a 12
  sin tracking (tambien las etiquetas `text-label` de la landing y el registro).
* Botones de paginacion, segmentos de Tipo de pago y chips de periodo de Cuentas 13/500 a
  14/600. El enlace "Ver detalle" de Ventas y Compras hereda 15 de la celda.
* Sin sombra: 15 tarjetas con la constante `card`, indicadores, tarjetas de cuenta y
  Terminos. Nueva: el menu movil abierto lleva `shadow-overlay`.
* Radios: tarjetas moviles, alertas y toast 8 a 12; segmentados (Tipo de pago, Formato) a
  pill; chip de documento de terceros 4 a pill; contorno de foco de enlaces y skeleton 4 a 8.
* Espaciado: rotulo a campo 6 a 8 (todos los campos); Categorias 6 a 8; badges `px` 10 a 12 y
  `py` 2 a 4 (alto de unos 23,5 a 27,5, **+4 px**); chip de terceros `py` 2 a 4; carrusel de
  cuentas 2 a 4; columna de codigo de las lineas 110 a 112.
* Iconos: 18 a 16 (Alert, toast, ojo de contrasena, volver de Categorias) o 18 a 20 (menu
  lateral, contraer, salir, cerrar modal, acciones de fila, quitar linea); vacio y error 20 a
  24; check de color 14/2.5 a 16/1.5; tendencias de Reportes 14/2 a 16/1.5.
* Fuentes: numero de factura del titulo del detalle a IBM Plex Mono; Origen de Cuentas sale
  de la mono; codigo de producto y NIT en mono dentro del campo.
* Movimiento: toda transicion pasa de la curva por defecto de Tailwind a `ease-standard`; el
  toast de `ease-out` a `ease-standard`.

Ninguno pasa de 4 px salvo los titulos y cifras (cambio de escala) y las celdas (+2 px de
fuente, +4 de interlinea).

## Desvios para decidir

* Cifras destacadas (indicadores, total de factura, saldos) quedan en `title` 20: antes iban
  en 24 bold. Si se quieren mas grandes, hace falta un rol nuevo (por ejemplo `figure`).
* `IndicatorCard` aplica `monto` a todo valor, tambien a conteos (productos, clientes,
  movimientos): se ven igual que `tabular`.
* Wordmark y la "S" de la barra contraida usan `text-title` con `font-bold` (marca).
* Enlaces de accion en celdas: Ventas y Compras heredan 15; Productos, Categorias y el panel
  conservan `text-small` en su `linkClass` (se usa tambien fuera de celdas).
* Menu lateral, pestanas de Configuracion y badges en `small`; pestanas de Productos en
  `body`. Validar con el disenador.
* `font-medium` (500) sigue en unos 70 usos para destacar dentro de un tamano.
* Bloques internos (nota de Nueva factura, totales del periodo, saldo pendiente del modal)
  conservan radio `control` dentro de tarjetas `surface`.
* Interlineados de body (24) y small (19,5) son los del manual y no siguen la rejilla de 4.
* Tokens de legado en `tokens.css` para landing, login y registro hasta la tarea 7.

## Verificacion

* `npm run build`, `npm run lint` y `npm test`: 747 pruebas (616 base + 131 nuevas: guarda y
  tokens, superficies, montos y codigos en Ventas, Compras y Cuentas, sombra del menu movil).
* Script de desbordes de fix/20 (scratchpad, 360, 390, 768, 1024, 1280 y 1536 px, 176 casos
  con el tenant demo y las rutas publicas): antes y despues 0 desbordes. Quedan los mismos 6
  desbordes internos sin desplazamiento: `-mr-2` del cerrar en 3 modales, NIT `nowrap` en las
  tarjetas de Clientes y Proveedores a 360 y el resumen de `/compras/1` a 1024.
* `tokens.test.ts` sin cambios: ningun par de contraste cambio.
* Backend dev en 8080 y Vite en 5173 detenidos al terminar.
