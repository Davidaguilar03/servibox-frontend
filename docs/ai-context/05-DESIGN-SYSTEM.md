# Sistema de diseno base

Tokens en `src/styles/tokens.css` (bloque `@theme` de Tailwind v4), roles `monto` y `codigo`
en `src/index.css` y constantes de icono en `src/components/icons.ts`. La guarda
`src/styles/designSystem.test.ts` recorre los `.tsx`, `.ts` y `.css` de `src` y falla si algo
se sale de estas reglas. Colores y pares de contraste: ver 02-CONVENTIONS y `tokens.test.ts`
(sin cambio en esta tarea).

Alcance: toda la app. Quedan fuera la landing (`LandingPage`), el login y el registro, que
redisena la tarea 7; usan tokens de legado (`text-display`, `text-h1` a `text-h3`,
`rounded-tag`, `rounded-card`, `rounded-container`, `shadow-card`, `shadow-menu`,
`shadow-modal`) que la guarda prohibe en el resto. Sus componentes compartidos (Wordmark,
campos, botones) si usan la escala.

## Tipografia: tres tamanos de contenido y los de componente

| Clase | Tamano | Interlineado | Peso | Uso |
|-|-|-|-|-|
| `text-title` | 24 px | 32 px | 600 | Solo el titulo de pantalla (`h1`) y la marca (Wordmark y la "S" de la barra contraida) |
| `text-body` | 15 px | 1.6 (24 px) | 400 | Cuerpo, celdas de tabla, campos, textos de modal |
| `text-section` | 15 px | 1.6 (24 px) | 600 | Titulos de seccion y de modal (`h2`, `h3`). Es body con peso 600: no es un tamano nuevo |
| `text-small` | 13 px | 1.5 | 400 | Ayudas, subtitulos, pies, metadatos, badges, migas, menu lateral |
| `text-label` | 12 px | 16 px | 600 | Rotulos de campo, leyendas de grupo, encabezados de columna (estos en mayusculas) |
| `text-button` | 14 px | 1 | 600 | Botones, paginacion, segmentos y chips que actuan como boton |
| `text-figure` | 24/28 bajo md, 28/32 desde md | | 600 | Componente: valor de indicadores y totales destacados (total de factura, saldo pendiente, saldos y totales de Cuentas, total disponible). Inter con numeros tabulares (rol monto) |

* El peso va en el token (`--text-*--font-weight`): no hace falta `font-semibold` con estas
  clases. `font-medium` sigue disponible para destacar dentro de un tamano.
* body, small y button son los del manual v1.0. title (24/32/600) es el titulo de pantalla; el
  manual tenia H1 32, H2 24, H3 18. Desde el 2026-10-25 title sube de 20 a 24 y los titulos de
  seccion y de modal bajan a `text-section`: title 20 en todo aplanaba la jerarquia. label pasa
  de 11 px con tracking a 12/16 sin tracking para servir de rotulo de campo (2026-10-24).
* `text-figure` es una utilidad de `index.css` con los tokens `--figure-*` de `tokens.css`;
  no cuenta como tamano de contenido. Tres tamanos de contenido por pantalla: title 24, body 15
  (con section) y small 13.
* La guarda solo deja `text-title` en un `h1` (y en Wordmark y AppShell), `text-section` en un
  `h2` o `h3` y `text-figure` en la lista `FIGURE_FILES`.
* **Desvio del manual v1.0:** el manual define label en 11 px con tracking 0,06em; aqui es
  12/16/600 sin tracking. Pendiente de validar con el disenador.
* Una pantalla usa como maximo title, body (y section) y small mas label, button y figure. Prohibidos
  `text-xs`, `text-sm`, `text-base`, `text-lg` y mayores, `text-[...]` y los de legado.
* Titulos en Montserrat (estilo base de `h1`, `h2`, `h3`); el resto en Inter.

## Roles de fuente

| Clase | Definicion | Uso |
|-|-|-|
| `monto` | Inter con `font-variant-numeric: tabular-nums` | Todo valor en dinero: celdas (a la derecha, `align: 'right'`), tarjetas moviles, resumenes, cifras de indicadores, campos de solo lectura (`TextField valueRole="monto"`) y campos de precio |
| `codigo` | IBM Plex Mono | Numero de factura (tambien en el titulo del detalle), codigo de producto y NIT o documento (`TextField valueRole="codigo"`) |

* IBM Plex Mono solo con `codigo`; `font-mono` esta prohibido. Origen en Cuentas
  (`VENTA FV-0003`) no es un codigo: va en Inter.
* Otros numeros (cantidades, fechas, paginacion) pueden usar `tabular`; `table` ya lo aplica.

## Sombras: solo lo que flota

| Token | Valor | Uso |
|-|-|-|
| `--shadow-raised` | `0 4px 12px rgb(0 0 0 / 10%)` | Menus desplegables (combobox, menu de usuario), toasts, tooltips, barra fija del formulario de producto, enlace "Saltar al contenido" |
| `--shadow-overlay` | `0 16px 40px rgb(0 0 0 / 16%)` | Modales y menu movil abierto (`lg:shadow-none` en escritorio) |

Tarjetas, tablas, paneles, tarjetas de indicador y estados no llevan sombra: se separan con
`border border-border`. La guarda tiene la lista explicita de archivos que pueden usar cada
sombra (`FLOATING_SHADOWS`). Los anillos de seleccion (`ring-*`) no son sombra.

## Espaciado: rejilla de 4 px

* `--spacing: 4px`: `p-1` 4, `p-2` 8, `p-3` 12, `p-4` 16, `p-5` 20, `p-6` 24...
* Prohibidos los medios pasos (`*-0.5`, `*-1.5`, `*-2.5`, `*-3.5`) y los px arbitrarios que no
  sean multiplo de 4 (`w-[110px]`). Excepciones: bordes de 1 px, anillos y desplazamientos de
  foco (`outline-offset-2`), `-mb-px` de las pestanas de Configuracion (solapa el borde) y
  `mt-px` del icono de `Alert` (lo centra con la primera linea). Estan en `ONE_PX_OFFSETS`.

## Radios

| Token | Valor | Uso |
|-|-|-|
| `--radius-control` | 8 px | Campos, botones, selectores, menus, bloques internos, skeleton, contorno de foco de enlaces |
| `--radius-surface` | 12 px | Tarjetas (tambien las moviles), tablas, modales, alertas, toasts |
| `--radius-pill` | 999 px | Badges, chips, avatares, control segmentado y sus segmentos |

`rounded-none` se permite para anular un radio (lineas de factura en `xl`).

## Iconos

| Token | Constante | Valor | Uso |
|-|-|-|-|
| `--icon-sm` | `iconSm` | 16 px | En linea con texto y dentro de botones y campos |
| `--icon-md` | `iconMd` | 20 px | Menu lateral, cerrar modal, acciones de fila |
| `--icon-lg` | `iconLg` | 24 px | Estados vacio y de error, encabezados de "no encontrado" |

Un solo trazo, `ICON_STROKE` 1.5. Uso: `<X {...iconSm} aria-hidden />`. La guarda prohibe
`size={n}` y `strokeWidth={n}` en los `.tsx`.

## Movimiento

| Token | Valor | Uso |
|-|-|-|
| `--duration-fast` | 120 ms | Hover y foco (`duration-(--duration-fast)`); duracion por defecto de toda transicion |
| `--duration-base` | 200 ms | Menu movil, barra lateral, entrada del toast |
| `--duration-slow` | 320 ms | Modales (sin animacion hoy) |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Curva por defecto de toda transicion y del toast |

`--default-transition-duration` y `--default-transition-timing-function` apuntan a fast y a
ease-standard, asi que `transition-*` ya los usa. Prohibidos `duration-<n>`, `duration-[...]` y
`ease-in`/`ease-out`/`ease-in-out`/`ease-linear`. `index.css` anula animaciones y
transiciones con `prefers-reduced-motion`. Sin rebotes ni parallax.

## Guarda

`src/styles/designSystem.test.ts`:

* Por cada archivo de la app, `violations()` debe devolver `[]`. Quita comentarios antes de
  buscar.
* Prueba negativa con una cadena de ejemplo (sin tocar archivos) que debe reportar cada regla,
  y una positiva con lo permitido.
* Comprueba el valor de cada token nuevo, que las constantes de icono coincidan con los tokens
  y que `monto` y `codigo` existan en `index.css`.

`src/styles/surfaces.test.tsx` comprueba que tabla, indicador y estado vacio no llevan sombra
y que modal y toast si.

## Desvios pendientes

Pendientes de decidir o validar con el disenador (detalle en
[sessions/2026-10-24-design-system-base.md](sessions/2026-10-24-design-system-base.md)):

1. **Resuelto el 2026-10-25:** las cifras destacadas usan `text-figure` (24 a 28 px) y la
   jerarquia de titulos se corrige con title 24 en el `h1` y `text-section` en secciones y
   modales.
2. `IndicatorCard` aplica `text-figure` (numeros tabulares) tambien a conteos (productos,
   clientes, movimientos).
3. Wordmark y la "S" de la barra contraida usan `text-title` con `font-bold` (marca).
4. Enlaces de accion en celdas: Ventas y Compras heredan 15; Productos, Categorias y el panel
   conservan `text-small`.
5. Menu lateral, pestanas de Configuracion y badges en `small`; pestanas de Productos en
   `body`.
6. `font-medium` (500) sigue en unos 70 usos para destacar dentro de un tamano.
7. Tokens de legado en `tokens.css` para landing, login y registro hasta su rediseno.

Ademas: label 12/16/600 sin tracking es un desvio del manual (11 px con tracking 0,06em).
