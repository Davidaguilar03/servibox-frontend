# Convenciones

## Convenciones de nombres

* Codigo en ingles: componentes, funciones, tipos y archivos (`LoginPage`, `apiFetch`,
  `useSession`). Rutas de la interfaz en espanol (`/inventario`, `/crear-cuenta`).
* Un componente por archivo, en PascalCase, con export nombrado (sin `export default`).
* Los campos de la API se llaman como en el backend (`tenantSlug`, `quantity`,
  `pendingBalance`); no se traducen ni se renombran en el frontend. Terminologia en
  `servibox-backend/docs/ai-context/02-CONVENTIONS.md`.
* Pruebas junto al archivo que prueban (`api.test.ts` al lado de `api.ts`), con nombre en
  espanol que describe el comportamiento (`cierra la sesion ante un 401`).
* Claves de almacenamiento del navegador con prefijo `servibox.`.

## Tokens visuales

`src/styles/tokens.css` es la unica fuente visual. Define los tokens del manual de estilos
ServiBox v1.0 en el bloque `@theme` de Tailwind y vacia las escalas por defecto de color,
radio, sombra y puntos de corte, asi que una utilidad como `bg-red-500` no existe.

* Los componentes consumen tokens por medio de las utilidades (`bg-brand`, `text-text-muted`,
  `rounded-control`, `shadow-card`, `h-control`). **Nunca un hexadecimal literal** ni un valor
  arbitrario de color en un componente.
* Unica excepcion: la paleta de colores de categoria (`CATEGORY_COLORS` en
  `src/inventory/categoryForm.ts`), 8 hexadecimales definidos en ese solo lugar. No es un
  estilo de la interfaz sino el dato `color` que guarda el backend; por eso el punto de color
  (`CategoryDot`) lo aplica con `style`. Ver [03-DECISIONS.md](03-DECISIONS.md).
* Un valor nuevo se agrega primero al archivo de tokens y despues se usa.
* `color-action` es el fondo del boton primario; hoy vale lo mismo que `color-brand` y se
  cambia en un solo lugar. El hover de los botones usa los tokens del manual
  (`brand-hover`, `nav-hover`); los estados que el manual no trae (activo, hover de
  peligro) se derivan con `color-mix` en el mismo archivo.
* Texto rojo sobre fondo claro: `brand-ink`, no `brand` (contraste).

| Grupo | Tokens | Utilidad de ejemplo |
|-|-|-|
| Color | `brand`, `brand-hover`, `brand-ink`, `action`, `surface`, `canvas`, `nav`, `nav-hover`, `text`, `text-muted`, `text-subtle`, `text-inverse`, `border`, `row-alt`, `overlay`, `neutral-50` a `neutral-900`, `success`, `warning`, `error`, `info` y su `-bg` | `bg-canvas`, `text-brand-ink` |
| Tipografia | `font-display` (Montserrat), `font-body` (Inter), `font-mono` (IBM Plex Mono); tamanos `display`, `h1`, `h2`, `h3`, `body`, `button`, `small`, `label` con su interlineado y peso | `text-h2`, `font-mono` |
| Espaciado | base de 4 px: `p-1` 4, `p-2` 8, `p-3` 12, `p-4` 16, `p-6` 24, `p-8` 32, `p-12` 48, `p-16` 64 | `gap-4` |
| Radios | `tag` 4, `control` 8, `card` 12, `container` 20, `pill` 999 | `rounded-card` |
| Sombras | `card`, `menu`, `modal` | `shadow-card` |
| Layout | `sidebar` 240, `sidebar-collapsed` 72, `topbar` 64, `control` 40, `row` 48, `touch` 44, `button-x` 22, `content` 1440 | `w-sidebar`, `max-w-content` |
| Puntos de corte | `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536 | `lg:flex` |
| Movimiento | `duration-fast` 120 ms (hover y foco), `duration-base` 200 ms (menus y toasts), `duration-slow` 280 ms (modales) | `duration-(<token>)` |

Otras reglas del manual:

* Titulos en Montserrat (lo aplica el estilo base a `h1`, `h2`, `h3`); cuerpo y formularios
  en Inter; codigos, SKU y valores tecnicos en IBM Plex Mono. Numeros tabulares en tablas y
  montos (`table` o la clase `tabular`).
* Bordes de 1 px `border`. Foco visible con anillo de 2 px `brand` y desplazamiento de 2 px.
* Movimiento sin rebotes ni parallax. `index.css` anula transiciones y animaciones con
  `prefers-reduced-motion`.
* Area tactil minima de 44 px (`min-h-touch`, `size-touch`).

## Componentes

Solo existen los que usa alguna pantalla. Hoy: `Button` (variantes `primary`, `dark`,
`secondary`, `text`, `danger`, mas el estado deshabilitado; el rojo de `danger` es solo
para confirmar una accion destructiva dentro de un modal; sus clases viven en
`buttonStyles.ts` para los enlaces que se ven como boton), `TextField` (reposo, foco,
error, deshabilitado; con mostrar u ocultar si es contrasena), `Alert` (tonos `success`,
`warning`, `error`, `info`), `IndicatorCard` (con texto secundario, variacion opcional y su propio error con
reintentar), `StatusBadge`, `DataTable`, `SearchField` (con la lupa de Lucide),
`SelectField` (selector nativo, con ayuda o error opcional), `CategoryDot` (punto con el
color de una categoria), `ComboboxField` (selector con
busqueda, patron combobox de ARIA), `Modal` (Esc, foco atrapado y devuelto, fondo
`overlay`, sombra `modal`), `Toaster` con `showToast` (entra en `duration-base`, se cierra a
los 5 s, `aria-live`), `Pagination` (anterior, numeros, siguiente y el texto
"1 a 25 de 231") y los estados `Skeleton`, `EmptyState` (con accion opcional) y
`ErrorState` (`states.tsx`) y `UnsavedChangesGuard` (modal "Descartar cambios" con
`useBlocker` y aviso de `beforeunload`), `DiscardableModal` (modal de formulario que, con
datos digitados, pide "Descartar cambios" al cerrarse). `NewCounterpartyModal` (`src/counterparties/`) crea un
cliente o un proveedor segun el rol. Un componente nuevo entra con la primera pantalla que lo
necesite, no antes.

* Una sola accion primaria roja por pantalla.
* `StatusBadge` siempre lleva texto; el color solo acompana. `STOCK_CRITICO` ("Stock
  critico", tono de error) no esta en el manual: pendiente de validar con el disenador.
  `INGRESO` y `EGRESO` (tonos de exito y de error) marcan el tipo de un movimiento.
* `DataTable`: encabezado fijo en mayusculas, fila alterna `row-alt`, hover, texto a la
  izquierda y numeros y montos a la derecha (`align: 'right'`), con numeros tabulares.
* Cada bloque de datos resuelve sus tres estados: carga (skeleton gris), vacio (que no hay)
  y error (que paso, con "Reintentar" solo para ese bloque).
* Todo campo de texto atado a la URL (buscadores, fechas personalizadas de Cuentas) usa
  `useUrlTextParam` (`src/lib/useUrlTextParam.ts`): estado local en cada tecla y escritura en
  la URL tras la espera, con Enter o al salir. Nunca `value` leido de la URL con un `onChange`
  que navega. Las demas entradas atadas a la URL (selectores, pestanas, periodo, pagina)
  escriben de inmediato. Motivo en [03-DECISIONS.md](03-DECISIONS.md).

## Rutas publicas y titulo de pagina

* Una ruta publica se declara en el primer bloque de `src/routes.tsx`, fuera de
  `RequireAuth` y sin `AppShell`. Si no tiene sentido con sesion (login, registro) la
  pagina redirige a `/inicio` con `<Navigate replace>` al leer `useSession()`.
* Cada pagina publica llama a `usePageMeta(titulo, descripcion)` (`src/lib/usePageMeta.ts`):
  fija `document.title` y la meta description y los restaura al salir. Titulo con el
  formato `Pagina · ServiBox`; descripcion de una o dos frases con la voz del manual.
  `index.html` trae la descripcion por defecto. Las privadas no lo usan por ahora.
* El wordmark de las paginas publicas enlaza a `/` con `WordmarkLink`.

## Formatos

En `src/lib/format.ts`, nunca a mano en un componente:

* Moneda: `formatCurrency`, pesos sin decimales con punto de miles (`$ 180.000`, `-$ 3.500`).
* Fecha en tablas: `formatDate`, dd/mm/aaaa a partir de la fecha ISO del backend, sin pasar
  por `Date` para que la zona horaria no corra el dia.
* Sin valor: `EMPTY_VALUE`, una raya; nunca "N/A". Se define una sola vez con el escape
  unicode de la raya (`\u2014`) para respetar la regla 1 de [00-RULES.md](00-RULES.md);
  ningun otro archivo escribe la raya.
* Fechas para la API (`desde`, `hasta`): `toIsoDate`, `AAAA-MM-DD` en hora local.

## Textos de la interfaz

* Espanol correcto, con tildes y signos de apertura en las preguntas y exclamaciones. Solo
  los archivos de docs van sin tildes, por eso los ejemplos de esta seccion no las llevan.
* Voz del manual: tuteo, frases cortas, verbo primero, sin jerga tecnica.
* Botones en infinitivo (`Ingresar`, `Guardar cambios`).
* Titulos con mayuscula solo en la inicial (`Inicia sesion`, no `Inicia Sesion`).
* Etiquetas de tabla en mayusculas sostenidas (`text-label uppercase`).
* Un error le dice al usuario que paso y que hacer (`Revisa tus datos e intenta de nuevo.`).
  Excepcion pendiente en Manejo de errores.

## Manejo de errores

Toda peticion pasa por `apiFetch`, que lanza `ApiError` con el `status` del backend. La
pantalla decide el texto segun el codigo; el criterio de codigos (400, 401, 404, 409) es el
del backend, ver Manejo de errores en `servibox-backend/docs/ai-context/02-CONVENTIONS.md`.

El texto que ve el usuario sale siempre de `errorMessage(error)` (`src/lib/errorMessage.ts`),
nunca de `error.message` directamente:

* `ApiError` con estado 400 o 409: el mensaje del backend, tal cual. Son validaciones y
  conflictos de negocio escritos para el usuario.
* Cualquier otro estado HTTP (404, 5xx y los demas): `GENERIC_ERROR_MESSAGE`, "Algo salio mal
  de nuestro lado. Intenta de nuevo en unos minutos." (con tilde en la interfaz).
* Error de red (no es `ApiError`, no hubo respuesta): `NETWORK_ERROR_MESSAGE`, "Revisa tu
  conexion e intenta de nuevo.".
* 401: lo maneja la sesion (`apiFetch` la cierra y el guard manda a `/login`); el login
  muestra su propio texto de credenciales.
* `apiDownload` con un error que no es JSON lanza `ApiError` con el mensaje generico; el
  codigo HTTP queda en `status`, no en el texto.
* Un 404 de la ruta (factura o producto inexistente) no es un Alert: la pantalla muestra su
  estado "no encontrado". Un 409 que corresponde a un campo (codigo de producto, nombre de
  categoria) se muestra bajo ese campo, con el mensaje del backend.

Pendiente:

* Los mensajes del backend no llevan tildes ("Ya existe un producto con el codigo ...").
