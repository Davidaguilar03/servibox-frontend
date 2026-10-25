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
  `rounded-control`, `shadow-raised`, `h-control`). **Nunca un hexadecimal literal** ni un valor
  arbitrario de color en un componente.
* Unica excepcion: la paleta de colores de categoria (`CATEGORY_COLORS` en
  `src/inventory/categoryForm.ts`), 8 hexadecimales definidos en ese solo lugar. No es un
  estilo de la interfaz sino el dato `color` que guarda el backend; por eso el punto de color
  (`CategoryDot`) lo aplica con `style`. Ver [03-DECISIONS.md](03-DECISIONS.md).
* Un valor nuevo se agrega primero al archivo de tokens y despues se usa.
* `color-action` es el fondo del boton primario y de los estados activos con texto blanco
  (item de la barra lateral, pagina actual); vale `brand-ink` y se cambia en un solo lugar.
  Hover y activo del primario y del peligro se derivan con `color-mix` en el mismo
  archivo; el oscuro usa `nav-hover`.
* Texto rojo sobre fondo claro: `brand-ink`, no `brand` (contraste). Nunca `color-brand`
  como fondo de texto: queda para superficies sin texto pequeno, wordmark y foco.
* Texto semantico sobre su fondo `-bg` y montos verdes: `success-ink`, `warning-ink`,
  `error-ink`, `info-ink`. El color semantico sin `-ink` es para iconos, bordes y puntos.
* Borde de controles (campos, selectores, botones secundarios, paginacion, segmentados):
  `border-control`. Tarjetas, divisores y menus: `border`.
* `text-subtle` nunca para informacion: solo iconos decorativos, deshabilitados y texto
  sobre el carbon. El texto secundario es `text-muted`.
* Todo par texto sobre fondo (o borde de control) nuevo se agrega a
  `src/styles/tokens.test.ts`, que exige 4.5 a 1 en texto y 3 a 1 en bordes de controles.

| Grupo | Tokens | Utilidad de ejemplo |
|-|-|-|
| Color | `brand`, `brand-hover`, `brand-ink`, `action`, `surface`, `canvas`, `nav`, `nav-hover`, `text`, `text-muted`, `text-subtle`, `text-inverse`, `border`, `border-control`, `row-alt`, `overlay`, `neutral-50` a `neutral-900`, `success`, `warning`, `error`, `info` con su `-bg` y su `-ink` | `bg-canvas`, `text-success-ink` |
| Tipografia | `font-display` (Montserrat), `font-body` (Inter); tamanos de contenido `title`, `body`, `small` y de componente `label`, `button`, con su interlineado y peso; roles `monto` y `codigo` (IBM Plex Mono) | `text-title`, `monto`, `codigo` |
| Espaciado | base de 4 px: `p-1` 4, `p-2` 8, `p-3` 12, `p-4` 16, `p-6` 24, `p-8` 32, `p-12` 48, `p-16` 64 | `gap-4` |
| Radios | `control` 8, `surface` 12, `pill` 999 | `rounded-surface` |
| Sombras | `raised` (menus, toasts, barra fija), `overlay` (modales, menu movil); solo lo que flota | `shadow-raised` |
| Layout | `sidebar` 240, `sidebar-collapsed` 72, `topbar` 64, `control` 40, `row` 48, `touch` 44, `button-x` 22, `content` 1440 | `w-sidebar`, `max-w-content` |
| Puntos de corte | `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536 | `lg:flex` |
| Movimiento | `duration-fast` 120 ms (hover y foco), `duration-base` 200 ms (menus y toasts), `duration-slow` 320 ms (modales), `ease-standard` | `duration-(<token>)` |

Otras reglas del manual:

* Titulos en Montserrat (lo aplica el estilo base a `h1`, `h2`, `h3`); cuerpo y formularios
  en Inter. IBM Plex Mono solo para codigos (clase `codigo`: numero de factura, codigo de
  producto, NIT). Todo monto en dinero usa la clase `monto` (Inter con numeros tabulares);
  otros numeros pueden usar `tabular`.
* Sistema de diseno base: tokens, valores, usos y reglas en
  [05-DESIGN-SYSTEM.md](05-DESIGN-SYSTEM.md). `src/styles/designSystem.test.ts` es la guarda:
  falla si una pantalla de la app usa un tamano de texto fuera de la escala, una sombra fuera
  de lo que flota, medios pasos o px fuera de la rejilla de 4, otro radio, iconos con px
  sueltos (usar `iconSm`, `iconMd`, `iconLg` de `components/icons.ts`) o `font-mono`.
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
`overlay`, sombra `overlay`), `Toaster` con `showToast` (entra en `duration-base`, se cierra a
los 5 s, `aria-live`), `Pagination` (anterior, numeros, siguiente y el texto
"1 a 25 de 231") y los estados `Skeleton`, `EmptyState` (con accion opcional, secundaria por defecto) y
`ErrorState` (`states.tsx`) y `UnsavedChangesGuard` (modal "Descartar cambios" con
`useBlocker` y aviso de `beforeunload`), `DiscardableModal` (modal de formulario que, con
datos digitados, pide "Descartar cambios" al cerrarse). `NewCounterpartyModal` (`src/counterparties/`) crea un
cliente o un proveedor segun el rol, o edita un tercero; el aviso de descartar es opcional. Un componente nuevo entra con la primera pantalla que lo
necesite, no antes.

* Una sola accion primaria roja visible por pantalla, en todos sus estados (normal, vacio,
  error). Si el encabezado de la pagina tiene un primario, ese es el primario.
* `EmptyState` recibe la accion como `{ label, to | onClick, variant }` y es secundaria por
  defecto: repite la accion del encabezado sin competir con ella. Solo pasa
  `variant: 'primary'` (con un comentario que lo explique) en una pantalla sin primario en el
  encabezado, cuando la accion del vacio es la unica.
* Cuando el primario depende del estado, se elige en la pagina: en Cuentas, con dos o mas
  cuentas es Nueva transferencia; con menos, Nueva cuenta, y Nueva transferencia queda
  secundaria y deshabilitada.
* Un modal abierto cuenta como una pantalla nueva: dentro del modal hay un solo primario (o un
  `danger`), aunque detras, atenuado por el overlay, se vea el primario de la pagina.
* `Button` expone su variante en `data-variant`; los enlaces con `buttonClasses` la ponen a
  mano. Las pruebas cuentan `[data-variant="primary"]` con `primaryActions()` de
  `src/test/utils.tsx`.
* Landing (`/`): un primario por tramo visible. La barra superior lleva `Crear cuenta`
  (primario) e `Iniciar sesion` (variante `text`); la portada y el cierre llevan
  `Crear mi serviteca`. Ver [03-DECISIONS.md](03-DECISIONS.md).
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
  formato `Pagina | ServiBox` (`Iniciar sesion | ServiBox`, `Crear cuenta | ServiBox`,
  `Terminos | ServiBox`); la landing usa `ServiBox | Ventas, inventario y caja para
  servitecas`. Descripcion de una o dos frases con la voz del manual. `index.html` trae el
  titulo y la descripcion de la landing. Las privadas no lo usan: su titulo lo pone
  `AppShell`.
* Rutas privadas: `AppShell` fija `document.title` como `<ultimo tramo de la miga> · ServiBox`
  (`Facturas de venta · ServiBox`; en un detalle, el numero de la factura cuando cargo y
  `Detalle de factura` mientras tanto) y lo restaura al salir del shell.
* El wordmark de las paginas publicas enlaza a `/` con `WordmarkLink`.
* Toda pagina tiene un unico `h1` en todos los anchos y un unico landmark `main`. Login y
  registro no llevan lema ni columna decorativa.

## Accesibilidad del shell

* El menu de usuario vive en la barra superior (`layout/UserMenu.tsx`): boton con las
  iniciales y, desde md, la serviteca; panel con nombre, rol traducido (`roleLabel`), serviteca
  y Cerrar sesion. Patron disclosure (`aria-expanded`, `aria-controls`), no `role=menu`: Esc
  cierra y devuelve el foco, el clic fuera y el cambio de ruta lo cierran. La barra lateral
  ya no tiene bloque de usuario ni Salir, y no hay pildora de la serviteca.
* El panel y la vista previa de Reportes leen `netSales` (ventas sin IVA) y `costOfSales` de
  `GET /api/reporting/kpis`; `totalSales` y `totalPurchases` (con IVA) quedan para los
  listados de Ventas y Compras. Las seis filas del Estado de resultados son las del archivo
  exportado (`incomeStatementRows`).
* El primer enfocable de `AppShell` es "Saltar al contenido" (visible solo con foco, mismo
  estilo que el de la landing); lleva el foco al `main#contenido` (`tabIndex -1`).
* Menu lateral bajo lg: cerrado es `inert` (ni foco ni lector de pantalla). Abierto, el foco
  pasa al primer enlace, Tab no sale del menu, Esc o el fondo lo cierran, el foco vuelve al
  boton "Abrir menu" (`aria-expanded`, `aria-controls="menu-lateral"`) y el resto de la
  pagina queda `inert`. Desde lg el menu es fijo y nada de esto aplica. El movimiento
  reducido lo cubre la regla global de `index.css`.
* Miga de pan: `nav` con `aria-label` "Ruta de navegacion" y una lista ordenada. Los tramos
  previos son enlaces (destinos en `crumbLinks` de `src/routes.tsx`), el ultimo es texto con
  `aria-current="page"` y los separadores son `aria-hidden`. Una pagina cambia el ultimo
  tramo con `useBreadcrumbTail(valor)` (reemplaza) o `useBreadcrumbTail(valor, 'append')`
  (se agrega despues, como la cuenta elegida en Cuentas).
* Un texto informativo no lleva estilo de boton (el "Este mes" del panel es una etiqueta).

## Responsive

* Ninguna pantalla desborda en ancho, de 360 px en adelante, con la barra lateral abierta o
  contraida y con un modal abierto. Una tabla puede desplazarse dentro de su contenedor
  (`overflow-x-auto`), pero no puede ensanchar la pagina.
* Toda tabla tiene su vista de tarjetas bajo md (768 px) con la misma informacion. Las dos van
  en el DOM y el cambio es solo por CSS (`hidden md:block` la tabla, `md:hidden` la lista). Con
  `DataTable` basta pasar `card` (render de la tarjeta) y `cardsLabel`; los listados con
  paginacion tienen su propia lista.
* Una rejilla de columnas fijas solo se activa desde el ancho donde cabe con la barra lateral
  abierta (240 px). Las lineas de factura suman 666 px fijos: rejilla y resumen al lado desde
  xl (1280 px); por debajo, tarjetas apiladas y el resumen debajo del formulario.
* Un elemento fijo (toasts) se ancla a los dos lados bajo sm (`left-4 right-4`) y vuelve a su
  ancho maximo desde sm.
* Una clase que oculta (`hidden`) no se combina con `buttonClasses`, que trae `inline-flex` y
  gana; para ocultar un boton bajo sm se usa `max-sm:hidden`.
* En los encabezados con varios botones el grupo es `flex flex-wrap gap-3` y el primario va al
  final.
* Criterio de aceptacion: el script de auditoria de desbordes (cada ruta en 360, 390, 768,
  1024, 1280 y 1536 px, con datos y con un tenant vacio) no deja desbordes sin justificar. Ver
  [sessions/2026-10-24-responsive.md](sessions/2026-10-24-responsive.md).

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
* Botones en infinitivo (`Iniciar sesion`, `Guardar cambios`).
* Titulos con mayuscula solo en la inicial (`Iniciar sesion`, no `Iniciar Sesion`).
* Voz de mostrador: directa, verbos en imperativo o infinitivo, hechos concretos. Prohibido en
  toda la app: "Tu negocio en buenas manos" (no aparece en ningun lado), "plataforma
  integral", "solucion", "optimiza", "potencia", "revoluciona" y "todo en uno". Sin lemas en
  login ni registro. `LandingPage.test.tsx` busca estas frases (y "Proximamente", "Vista de
  ejemplo" y "Cliente 1") en `/`, `/login`, `/registro` y `/terminos`.
* La landing solo promete lo que existe hoy y lo muestra con capturas reales del panel
  (`src/assets/landing/`, tenant demo). Nada de mockups dibujados, testimonios, cifras ni logos
  inventados. Lo que no existe (facturacion electronica DIAN, recuperar contrasena, roles,
  precio publicado) no se menciona como funcion.
* Contactos: `src/config/contact.ts` (`WHATSAPP_DISPLAY`, `WHATSAPP_URL`, `SUPPORT_EMAIL`) es
  la unica fuente; la interfaz los importa de ahi y ningun archivo repite el numero ni el
  correo (lo comprueba `LandingPage.test.tsx`). Hoy son demostrativos: reemplazar antes de
  publicar.
* Identificador del tenant: en login y registro se rotula `Codigo de tu serviteca`.
* Etiquetas de tabla en mayusculas sostenidas (`text-label uppercase`).
* Un error le dice al usuario que paso y que hacer (`Revisa tus datos e intenta de nuevo.`).
  Excepcion pendiente en Manejo de errores.
* La interfaz no ofrece funciones que no existen: nada de enlaces, pestanas, opciones ni
  textos "Proximamente" para algo que hoy no funciona. Si una funcion no esta, no se muestra;
  se agrega cuando exista. `/terminos` ya tiene su texto (pendiente de revision legal).
* Un solo verbo de mostrador por accion, igual en el boton primario, el estado vacio, los
  menus y los iconos que llevan a ella: `Registrar venta` (`/ventas/nueva`) y `Registrar
  compra` (`/compras/nueva`). Los titulos de las pantallas (`Nueva factura de venta`, `Nueva
  factura de compra`) y su miga de pan no cambian.

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
