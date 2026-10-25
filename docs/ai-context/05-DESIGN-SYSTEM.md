# Sistema de diseno base

Tokens en `src/styles/tokens.css` (bloque `@theme` de Tailwind v4), roles `monto` y `codigo`
en `src/index.css` y constantes de icono en `src/components/icons.ts`. La guarda
`src/styles/designSystem.test.ts` recorre los `.tsx`, `.ts` y `.css` de `src` y falla si algo
se sale de estas reglas. Colores y pares de contraste: ver 02-CONVENTIONS y `tokens.test.ts`
(sin cambio en esta tarea).

Alcance: toda la app, tambien la landing, el login, el registro y `/terminos` desde el
2026-10-25. Los tokens de legado (`--text-display` 48, `--text-h1` a `--text-h3`,
`--radius-tag`, `--radius-card`, `--radius-container`, `--shadow-card`, `--shadow-menu`,
`--shadow-modal`) se eliminaron de `tokens.css` y la guarda ya no excluye ninguna pagina.

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
| `text-display` | 32/36 bajo md, 40/44 desde md | | 700 | Componente con excepcion unica: solo el titular (`h1`) de la landing. Montserrat |

* El peso va en el token (`--text-*--font-weight`): no hace falta `font-semibold` con estas
  clases. Solo hay dos pesos en la app: 400 y 600 (`font-semibold` para rotulos y enfasis).
  `font-medium`, `font-[500]` y `font-weight: 500` estan prohibidos (regla `weight` de la
  guarda).
* body, small y button son los del manual v1.0. title (24/32/600) es el titulo de pantalla; el
  manual tenia H1 32, H2 24, H3 18. Desde el 2026-10-25 title sube de 20 a 24 y los titulos de
  seccion y de modal bajan a `text-section`: title 20 en todo aplanaba la jerarquia. label pasa
  de 11 px con tracking a 12/16 sin tracking para servir de rotulo de campo (2026-10-24).
* `text-figure` es una utilidad de `index.css` con los tokens `--figure-*` de `tokens.css`;
  no cuenta como tamano de contenido. Tres tamanos de contenido por pantalla: title 24, body 15
  (con section) y small 13.
* La guarda solo deja `text-title` en un `h1` (y en Wordmark y AppShell), `text-section` en un
  `h2` o `h3`, `text-figure` en la lista `FIGURE_FILES` y `text-display` en el `h1` de
  `LandingPage.tsx` (`DISPLAY_FILES`, mas su definicion en `index.css`).
* **Excepcion documentada de la landing:** `text-display` (tokens `--display-*`, utilidad en
  `index.css`) solo en su `h1`, y sus titulos de seccion (`h2`) en `text-title`
  (`TITLE_H2_FILES`). No cuenta como tamano de contenido: la landing usa title 24, body 15 (con
  section) y small 13 mas display y button.
* **Desvio del manual v1.0:** el manual define label en 11 px con tracking 0,06em; aqui es
  12/16/600 sin tracking. Pendiente de validar con el disenador.
* Una pantalla usa como maximo title, body (y section) y small mas label, button y figure. Prohibidos
  `text-xs`, `text-sm`, `text-base`, `text-lg` y mayores, `text-[...]` y los de legado.
* Titulos en Montserrat (estilo base de `h1`, `h2`, `h3`); el resto en Inter.

## Roles de fuente

| Clase | Definicion | Uso |
|-|-|-|
| `monto` | Inter con `font-variant-numeric: tabular-nums` | Todo valor en dinero: celdas (a la derecha, `align: 'right'`), tarjetas moviles, resumenes, cifras de indicadores, campos de solo lectura (`TextField valueRole="monto"`) y campos de precio |
| `codigo` | IBM Plex Mono con `white-space: nowrap` | Numero de factura (tambien en el titulo del detalle), codigo de producto y NIT o documento (`TextField valueRole="codigo"`). No se parte en dos lineas: la columna toma el ancho del codigo y el texto vecino es el que envuelve |

* IBM Plex Mono solo con `codigo`; `font-mono` esta prohibido. Origen en Cuentas
  (`VENTA FV-0003`) no es un codigo: va en Inter.
* Otros numeros (cantidades, fechas, paginacion) pueden usar `tabular`; `table` ya lo aplica.

## Sombras: solo lo que flota

| Token | Valor | Uso |
|-|-|-|
| `--shadow-raised` | `0 4px 12px rgb(0 0 0 / 10%)` | Menus desplegables (combobox, menu de usuario), toasts, tooltips, barra fija del formulario de producto, enlace "Saltar al contenido" (shell y landing) |
| `--shadow-overlay` | `0 16px 40px rgb(0 0 0 / 16%)` | Modales y menu movil abierto (`lg:shadow-none` en escritorio) |

Tarjetas, tablas, paneles, tarjetas de indicador y estados no llevan sombra: se separan con
`border border-border`. La guarda tiene la lista explicita de archivos que pueden usar cada
sombra (`FLOATING_SHADOWS`). Los anillos de seleccion (`ring-*`) no son sombra.

## Espaciado: rejilla de 4 px

* `--spacing: 4px`: `p-1` 4, `p-2` 8, `p-3` 12, `p-4` 16, `p-5` 20, `p-6` 24...
* Prohibidos los medios pasos (`*-0.5`, `*-1.5`, `*-2.5`, `*-3.5`) y los px arbitrarios que no
  sean multiplo de 4 (`w-[110px]`). Excepciones: bordes de 1 px, anillos y desplazamientos de
  foco (`outline-offset-2`), `-mb-px` de las pestanas de `TabList` (solapa el borde) y
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

## Alturas de control y areas tactiles

| Token | Valor | Uso |
|-|-|-|
| `--control-height` (`h-control`) | 40 px | Botones y campos desde lg |
| `--control-height-touch` (`h-control-touch`) | 44 px | Botones y campos bajo lg |
| `--hit-min` (`size-touch`, `min-h-touch`) | 44 px | Area tactil minima de todo control bajo lg |
| `--hit-row` (`size-hit-row`) | 36 px | Acciones de fila con icono (y `IconButton`) desde lg |

* Bajo 1024 px (lg) todo control interactivo mide al menos 44 x 44 de area tactil; desde lg
  botones y campos miden 40 y las acciones de fila con icono 36. Separacion minima de 8 px
  entre objetivos adyacentes bajo lg (`gap-2 lg:gap-1` en acciones de fila, menu lateral y
  paginacion).
* `buttonClasses` y los campos (`TextField`, `SelectField`, `SearchField`, `ComboboxField` y
  los campos de linea de factura) usan `h-control-touch lg:h-control`.
* `IconButton` (`components/IconButton.tsx`, y `IconLink` para enlaces): boton de solo icono
  con `aria-label` obligatorio en el tipo, `size-touch lg:size-hit-row`, icono de 16 o 20.
  Lo usan cerrar del modal, editar y eliminar de fila, nueva factura del tercero y quitar
  linea. Paginacion: `size-touch lg:size-control`.
* Cuando el aspecto debe ser menor que el area (enlaces de texto: Ver detalle, Editar, Ver
  todas, Nuevo cliente), la utilidad `hit-area` agrega un `::after` centrado de al menos 44
  (36 desde lg) sin cambiar el aspecto. No sirve dentro de `overflow: hidden` (migas: llevan
  `leading-11` y `px-1` bajo lg).
* Casillas y radios: el rotulo es parte del area de clic y mide 44 (`min-h-touch`).

## SegmentedControl y TabList

`components/SegmentedControl.tsx`, unica implementacion de elegir una opcion entre pocas:

* `SegmentedControl`: `role="radiogroup"` con botones `role="radio"` y `aria-checked`;
  opciones en pildora (`rounded-pill`), seleccionada en `dark`, 44 bajo lg y 40 desde lg;
  envuelve (`flex-wrap`) o recibe la disposicion por `className` (`grid grid-cols-2`).
* `TabList`: `role="tablist"` con `role="tab"`, `aria-selected` y `aria-controls` opcional;
  subrayado `brand`; desplazamiento horizontal si no cabe.
* Los dos: flechas (con vuelta), Inicio y Fin mueven el foco y eligen (activacion
  automatica); un solo elemento en el orden de tabulacion (roving tabindex).
* Excepciones con comportamiento propio (no son segmentados de texto): tarjetas de cuenta con
  su saldo (`aria-pressed`), muestras de color de categoria y tarjetas de tipo de reporte con
  descripcion (radios nativos). Las lista `controls.test.tsx`.

## Foco

* Un solo anillo: `--focus-ring` (2 px solido `brand`) con `--focus-ring-offset` 2 px.
  Utilidades en `index.css`: `focus-ring` (`:focus-visible`, botones, enlaces, segmentados,
  items de menu, summary), `focus-ring-field` (`:focus`, campos) y `focus-ring-within`
  (rotulo que envuelve un control oculto). Prohibido quitar el outline sin reemplazo.
* Campos: al enfocarse muestran el anillo y conservan el borde `border-control` (o `error`);
  ya no hay `ring-brand/20`.
* Contraste del anillo (3 a 1, `tokens.test.ts`): brand sobre surface 3,55, canvas 3,19, nav
  4,14, row-alt 3,42 y neutral-100 3,39. Sobre los fondos -bg de `Alert` brand no llega (info
  2,91, error 2,90): ahi `--focus-ring-on-tint` usa brand-ink (4,27 a 4,75). Sin cambio de
  colores.
* "Saltar al contenido" es `components/SkipLink.tsx`, el mismo en la landing y en el shell:
  relleno 8/16 al enfocarse, `rounded-control`, `shadow-raised`, y foco real en
  `main#contenido`.

## Boton de texto

La variante `text` tiene la misma altura y el mismo relleno (`px-button-x`) que las demas,
sin fondo ni borde; las pantallas no le ponen `px-2` ni `h-auto`. Hover `neutral-100`, foco
`focus-ring`, deshabilitado igual que las demas.

## Listados

Componentes compartidos de `src/components` que usan todos los listados (Facturas de venta y
de compra, Papeleras, Gastos e Ingresos, Cuentas, Clientes, Proveedores, Productos y
Categorias):

* `ListHeader`: `h1`, subtitulo, una sola accion primaria y las secundarias en un grupo.
  Desde 2 secundarias, bajo lg van en el menu "Mas" (boton secundario con `aria-expanded`,
  patron disclosure de UserMenu: Esc cierra y devuelve el foco, clic fuera y cambio de ruta
  cierran); desde lg en linea. Sin `matchMedia` (pruebas) se comporta como escritorio.
  `note` lleva el texto de ayuda bajo las acciones (Cuentas).
* `FilterBar`: busqueda, filtros y `PeriodPicker` en una rejilla (una columna, dos desde sm y
  una fila desde lg); "Limpiar filtros" solo con filtros activos (distintos del estado que
  deja limpiar).
* `PeriodPicker`: selector nativo con los periodos que pasa cada pantalla (Hoy, Esta semana,
  Este mes, Mes anterior, Ultimos 30 dias, Este ano, Todas, Personalizado), el rango como
  ayuda en `small` ("1 oct. 2026 al 24 oct. 2026") y, con Personalizado, Desde y Hasta con sus
  errores. El rango se calcula en `lib/period.ts` con `businessToday()` (zona del negocio).
  Unico selector de periodo de la app.
* `CellLink` y `CellButton`: un solo estilo de enlace o accion de celda (`text-small`,
  600, `brand-ink`, subrayado al hover y al foco, `hit-area`).
* `PendingBalance`: saldo pendiente de una factura (`pendingBalance` del backend) en rol
  monto: `—` si esta anulada, `$ 0` en `text-muted` si no debe nada y el saldo en `text`.
* Facturas: columnas en el orden N.o factura, Fecha, Tercero, Vence, Forma de pago, Estado,
  Total, Saldo pendiente y acciones. Encabezados en rol label (los pone `DataTable`), dinero
  en rol monto a la derecha y sin partir, estados con `StatusBadge`.
* `TabList` con `fill` (Configuracion): las pestanas se reparten el ancho y la etiqueta pasa a
  dos lineas. Sin `fill` (Productos): desplazamiento horizontal, borde derecho difuminado
  mientras haya mas pestanas y la seleccionada se lleva a la vista (`scrollIntoView`).

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
4. **Resuelto el 2026-10-25:** los enlaces de celda usan `CellLink` (rol small, 600).
5. **Resuelto el 2026-10-25:** las pestanas de Configuracion y de Productos usan `TabList` en
   `small`; menu lateral y badges siguen en `small`.
6. **Resuelto el 2026-10-25:** sin `font-medium`; los 55 usos pasaron a 600.
7. **Resuelto el 2026-10-25:** tokens de legado eliminados; landing, login y registro usan la
   escala (excepcion `text-display` en el `h1` de la landing).

Ademas: label 12/16/600 sin tracking es un desvio del manual (11 px con tracking 0,06em).
