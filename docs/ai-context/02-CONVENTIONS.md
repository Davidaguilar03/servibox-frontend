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
* Excepciones de datos persistidos: la paleta de colores de categoria (`CATEGORY_COLORS` en
  `src/inventory/categoryForm.ts`), 8 hexadecimales definidos en ese solo lugar. No es un
  estilo de la interfaz sino el dato `color` que guarda el backend; por eso el punto de color
  (`CategoryDot`) lo aplica con `style`. Ver [03-DECISIONS.md](03-DECISIONS.md).
  Tambien `ACCOUNT_COLORS` en `src/accounts/accountColors.ts`, con valores basados en
  info, warning-ink, neutral-600 y violet. El color libre de cuenta viene de la API
  y se aplica con style solo a sus acentos; texto e importes usan tokens legibles.
* Un valor nuevo se agrega primero al archivo de tokens y despues se usa.
* `color-action` es el fondo del boton primario y de los estados activos con texto blanco
  (pagina actual); vale `brand-ink` y se cambia en un solo lugar.
  La barra lateral usa `nav-active` con acento lateral `brand` y texto blanco.
  Hover y activo del primario y del peligro se derivan con `color-mix` en el mismo
  archivo; el oscuro usa `nav-hover`.
* Texto rojo sobre fondo claro: `brand-ink`, no `brand` (contraste). Nunca `color-brand`
  como fondo de texto: queda para superficies sin texto pequeno, wordmark y foco.
* Texto semantico sobre su fondo `-bg` y montos verdes: `success-ink`, `warning-ink`,
  `error-ink`, `info-ink`; el reparto Digital usa `violet-ink` sobre `violet-bg`.
  El color sin `-ink` es para iconos, bordes y puntos.
* Borde de controles (campos, selectores, botones secundarios, paginacion, segmentados):
  `border-control`. Tarjetas, divisores y menus: `border`.
* `text-subtle` nunca para informacion: solo iconos decorativos, deshabilitados y texto
  sobre el carbon. El texto secundario es `text-muted`.
* Todo par texto sobre fondo (o borde de control) nuevo se agrega a
  `src/styles/tokens.test.ts`, que exige 4.5 a 1 en texto y 3 a 1 en bordes de controles.

| Grupo | Tokens | Utilidad de ejemplo |
|-|-|-|
| Color | `brand`, `brand-hover`, `brand-ink`, `action`, `surface`, `canvas`, `nav`, `nav-hover`, `text`, `text-muted`, `text-subtle`, `text-inverse`, `border`, `border-control`, `row-alt`, `overlay`, `neutral-50` a `neutral-900`, `success`, `warning`, `error`, `info`, `violet` con su `-bg` y su `-ink` | `bg-canvas`, `text-success-ink` |
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
  `Crear mi serviteca`. El cierre rojo usa la variante secundaria clara como
  unica llamada a la accion, con foco inverso. Ver [03-DECISIONS.md](03-DECISIONS.md).
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

* El menu de usuario vive en el pie de la barra lateral (`layout/UserMenu.tsx`): boton con las
  iniciales, serviteca y rol real, solo iniciales en compacto; panel hacia arriba con nombre, rol traducido (`roleLabel`), serviteca
  y Cerrar sesion. Patron disclosure (`aria-expanded`, `aria-controls`), no `role=menu`: Esc
  cierra y devuelve el foco, el clic fuera y el cambio de ruta lo cierran. No se duplica en
  la barra superior. Configuracion vive separada de la navegacion operativa, sobre el usuario.
* Barra lateral desde lg: contraida (72 px, solo iconos con `aria-label` y `title`) de 1024 a
  1279 px y expandida (240) desde 1280. El boton Expandir o Contraer menu guarda la eleccion en
  `localStorage` (`servibox.sidebar`, con try/catch) y la eleccion manda sobre el ancho.
* El panel y la vista previa de Reportes leen `netSales` (ventas sin IVA) y `costOfSales` de
  `GET /api/reporting/kpis`; `totalSales` y `totalPurchases` (con IVA) quedan para los
  listados de Ventas y Compras. Las seis filas del Estado de resultados son las del archivo
  exportado (`incomeStatementRows`).
* El primer enfocable de `AppShell` es "Saltar al contenido" (`SkipLink`, el mismo
  componente de la landing); lleva el foco al `main#contenido` (`tabIndex -1`).
* Todo control interactivo cumple el area minima: 44 x 44 bajo lg; desde lg 40 de alto en
  botones y campos y 36 en acciones de fila con icono, con 8 px entre objetivos bajo lg. Un
  boton de solo icono es `IconButton` (o `IconLink`) con `aria-label`; un enlace de texto
  pequeno lleva `hit-area`. Ver [05-DESIGN-SYSTEM.md](05-DESIGN-SYSTEM.md).
* Los listados usan `ListHeader` (una sola accion primaria; las secundarias en "Mas" bajo lg
  desde 2), `FilterBar`, `CellLink` en las celdas y `PeriodPicker` como unico selector de
  periodo (sus periodos por props y el rango en la zona del negocio). `lists.test.tsx`
  comprueba que ningun listado muestra dos primarios y que no hay otro selector de periodo.
* Regla unica de Guardar (paginas y modales): el boton nunca se deshabilita por errores; solo
  mientras se envia (con `aria-busy`) y, en la edicion de un registro existente, mientras no
  haya cambios (unica excepcion). Cada campo valida al salir (`onBlur`) y todos al enviar; al
  enviar con errores `revealErrors` (`lib/formErrors.ts`) los muestra y lleva el foco al
  primer `aria-invalid` (en una factura sin lineas, a Agregar producto), y `ErrorSummary` lo
  anuncia.
* Guardian de cambios: todo modal con campos usa `DiscardableModal` (cerrar con cambios por
  Esc, la X, Cancelar o clic fuera pide confirmar; sin cambios cierra; tras guardar no
  pregunta). Las paginas con formulario (nueva venta, nueva compra, producto, Configuracion)
  usan `UnsavedChangesGuard`: `useBlocker` para la navegacion interna y `beforeunload` para
  cerrar o recargar la pestana.
* Costo de producto en pesos enteros: digitos con o sin punto de miles; con decimales escritos,
  "Escribe el costo en pesos, sin centavos." Un costo guardado con decimales que no se toca se
  envia tal cual.
* La formula del precio sugerido vive en el backend (`InventoryService.aplicarPrecios`).
  `inventory/pricing.ts` la copia solo para el panel del formulario; `pricing.test.ts` la liga
  a los casos verificados del backend. Si cambia la formula alla, cambia aqui.
* Una sola implementacion de segmentado: `SegmentedControl` (radiogroup) y `TabList`
  (pestanas). Nada de `aria-pressed`, `role="tab"` ni radios propios en las pantallas salvo
  las excepciones documentadas; `controls.test.tsx` lo comprueba.
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
* Un texto informativo no lleva estilo de boton. Inicio usa PeriodPicker funcional:
  Este mes, Mes anterior, Ultimos 30 dias, Este ano y Personalizado. URL con periodo y,
  solo en Personalizado, desde/hasta; fechas en America/Bogota y limite de Reportes.
  Ver todas lleva a Ventas con las fechas exactas como Personalizado. Ventas admite esos
  periodos y Todas; sus indicadores rotulados del mes siguen siendo mensuales.

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
* Desde el rediseno del 2026-10-26, David realiza la revision visual manual antes del cierre.
  Reemplaza las instrucciones anteriores de navegador automatizado y auditoria visual del
  agente: el agente no abre ni automatiza navegadores ni toma capturas. Ejecuta pruebas,
  build y lint, entrega comandos de arranque, URL y lista de revision. La revision tecnica
  y la aprobacion visual de David son necesarias para el cierre; no se declara ausencia de
  desbordes ni aprobacion visual sin esa revision. AGENTS.md no se modifica.

## Formatos

En `src/lib/format.ts`, nunca a mano en un componente:

* Moneda de lectura: formatCurrency muestra pesos enteros con punto de miles,
  HALF_UP al peso: $ 1.500; 13,50 a $ 14; -0,10 a $ 0; -0,50 a -$ 1.
  El dato de API y el exportado conservan centavos; los redondeos separados
  pueden producir diferencias visuales entre filas y totales. No se corrigen
  importes para forzar una suma visual. Los campos editables precargan el
  valor original y conservan su precision al enviar.
* Facturas nuevas: producto decimal de precio por cantidad, luego base e IVA definitivos
  por linea (HALF_UP a dos decimales); resumen suma esas lineas. lib/money.ts comparte
  aritmetica con el racional de Inventario sin cambiar su redondeo a pesos enteros.
* Precios de linea: input numerico con punto decimal, maximo dos decimales significativos
  comprobados desde el texto; 0.005 invalido, 0.01 y 0.0100 validos. Otros montos conservan
  sus separadores y normalizacion HALF_UP del servidor, sin ese rechazo de precision.
* No recalcular documentos historicos: detalles y listados usan cifras guardadas de API.
  Las sumas y restas monetarias derivadas usan centavos definitivos, sin EPSILON.
* Fecha en tablas: `formatDate`, dd/mm/aaaa a partir de la fecha ISO del backend, sin pasar
  por `Date` para que la zona horaria no corra el dia.
* Sin valor: `EMPTY_VALUE`, una raya; nunca "N/A". Se define una sola vez con el escape
  unicode de la raya (`\u2014`) para respetar la regla 1 de [00-RULES.md](00-RULES.md);
  ningun otro archivo escribe la raya.
* Fechas de periodos para la API (`desde`, `hasta`): `AAAA-MM-DD`, calculadas con
  businessToday y lib/period en America/Bogota. Personalizado valida fecha ISO real,
  ambos extremos, orden y hasta 366 dias inclusivos con validateRange de Reportes.

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
* La landing solo promete lo que existe hoy. David autoriza seis representaciones
  graficas de funciones existentes en `src/assets/landing/product-visuals-v2/` para
  sustituir los recortes pequenos. No son capturas reales; documentacion y alt no
  deben llamarlas asi. Por solicitud de David no llevan rotulos de referencia,
  captura o ilustracion visibles. Los controles dibujados no son acciones HTML.
  Stock usa un solo archivo tanto en los pasos como en funciones. Reportes tiene
  alt breve y descripcion accesible HTML con las seis filas y formatos existentes.
  Las imagenes ambientales generadas no representan clientes reales. Las fuentes
  y recortes anteriores quedan documentados como historicos, eliminados del
  repositorio cuando no tienen uso. Nada de testimonios, cifras comerciales ni logos
  inventados. Lo que no existe (facturacion electronica DIAN, recuperar contrasena, roles,
  precio publicado) no se menciona como funcion.
* Contactos: `src/config/contact.ts` (`WHATSAPP_DISPLAY`, `WHATSAPP_URL`, `SUPPORT_EMAIL`) es
  la unica fuente; la interfaz los importa de ahi y ningun archivo repite el numero ni el
  correo (lo comprueba `LandingPage.test.tsx`). Hoy son demostrativos: reemplazar antes de
  publicar. La landing omite estos contactos y cualquier accion que dependa de ellos.
* Un concepto, un rotulo: los de `src/copy/glossary.ts` (Forma de pago, Medio de pago, Otros
  ingresos, Codigo de tu serviteca, Stock bajo, Restaurar...). Tabla, guarda de tildes y jerga
  (`src/copy/copy.test.ts`) y mensajes de error en [06-COPY.md](06-COPY.md).
* Etiquetas de tabla en mayusculas sostenidas (`text-label uppercase`).
* Un error le dice al usuario que paso y que hacer (`Revisa los datos e intentalo de nuevo.`).
* La interfaz no ofrece funciones que no existen: nada de enlaces, pestanas, opciones ni
  textos "Proximamente" para algo que hoy no funciona. Si una funcion no esta, no se muestra;
  se agrega cuando exista. `/terminos` ya tiene su texto (pendiente de revision legal).
* Un solo verbo de mostrador por accion, igual en el boton primario, el estado vacio, los
  menus y los iconos que llevan a ella: `Registrar venta` (`/ventas/nueva`) y `Registrar
  compra` (`/compras/nueva`). Los titulos de las pantallas (`Nueva factura de venta`, `Nueva
  factura de compra`) y su miga de pan no cambian.

## Manejo de errores

Toda peticion pasa por `apiFetch`, que lanza `ApiError` con el `status` del backend; el
criterio de codigos es el del backend (Manejo de errores en
`servibox-backend/docs/ai-context/02-CONVENTIONS.md`).

* Texto: siempre `userMessage(error)` (`src/api/errorMessages.ts`; `errorMessage` de
  `lib/errorMessage.ts` es un alias), nunca `error.message`. Mapa de los mensajes del backend
  y textos por estado en [06-COPY.md](06-COPY.md).
* Lugar: regla unica de `reportError` / `useReportedError` (`src/api/reportError.ts`): 400 y
  409 en linea en el formulario o modal (bajo el campo si es de uno); red, 5xx, 403 y 404 en un
  toast de error persistente; 401 cierra la sesion y el login avisa que vencio.
* `apiDownload` con un error que no es JSON lanza `ApiError` con un mensaje generico; el
  codigo HTTP queda en `status` y el texto final lo pone `userMessage`.
* Un 404 de la ruta (factura o producto inexistente) es el estado "no encontrado" de la
  pantalla, no un toast.
* Si una pantalla compara el mensaje del backend (numero de factura o documento repetido), la
  comparacion va contra el texto del backend y lo que se muestra sale de `userMessage`.
