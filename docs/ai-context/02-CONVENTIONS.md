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
* Un valor nuevo se agrega primero al archivo de tokens y despues se usa.
* `color-action` es el fondo del boton primario; hoy vale lo mismo que `color-brand` y se
  cambia en un solo lugar. Los estados hover (oscurece 8 por ciento) y activo (14 por
  ciento) de los botones se derivan con `color-mix` en el mismo archivo.
* Texto rojo sobre fondo claro: `brand-ink`, no `brand` (contraste).

| Grupo | Tokens | Utilidad de ejemplo |
|-|-|-|
| Color | `brand`, `brand-ink`, `action`, `surface`, `canvas`, `nav`, `text`, `text-muted`, `border`, `neutral-50` a `neutral-900`, `success`, `warning`, `error`, `info` y su `-bg` | `bg-canvas`, `text-brand-ink` |
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
`secondary`, `text`, `danger`, mas el estado deshabilitado), `TextField` (reposo, foco,
error, deshabilitado; con mostrar u ocultar si es contrasena) y `Alert` (tonos `success`,
`warning`, `error`, `info`). Un componente nuevo entra con la primera pantalla que lo
necesite, no antes.

* Una sola accion primaria roja por pantalla.

## Textos de la interfaz

* Espanol correcto, con tildes y signos de apertura en las preguntas y exclamaciones. Solo
  los archivos de docs van sin tildes, por eso los ejemplos de esta seccion no las llevan.
* Voz del manual: tuteo, frases cortas, verbo primero, sin jerga tecnica.
* Botones en infinitivo (`Ingresar`, `Guardar cambios`).
* Titulos con mayuscula solo en la inicial (`Inicia sesion`, no `Inicia Sesion`).
* Etiquetas de tabla en mayusculas sostenidas (`text-label uppercase`).
* Un error le dice al usuario que paso y que hacer (`Revisa tus datos e intenta de nuevo.`),
  nunca el mensaje crudo del backend ni un codigo HTTP.

## Manejo de errores

Toda peticion pasa por `apiFetch`, que lanza `ApiError` con el `status` del backend. La
pantalla decide el texto segun el codigo; el criterio de codigos (400, 401, 404, 409) es el
del backend, ver Manejo de errores en `servibox-backend/docs/ai-context/02-CONVENTIONS.md`.
