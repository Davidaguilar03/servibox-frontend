# 2026-10-31: Rediseno del acceso y del shell de plataforma (tarea extra)

Rama feat/51-platform-shell-redesign desde main en 5dec4b6 (merge PR 52,
feat/50-public-registration-request). Sin commit, push ni PR: quedan para el prompt de cierre.
Sin navegador ni capturas; la revision visual es de David. Todas las pruebas usan API
simulada en Vitest: no hubo HTTP real ni llamadas al backend de revision. Backend sin tocar.

## Hallazgos del paso 0

* Main limpio e igual a origin/main, incluye el PR 52. Ramas existentes hasta 50: libre 51.
* Login de usuario: `#login` con dos columnas iguales desde lg (foto a sangre con velo,
  WordmarkLink onDark y mensaje) y panel con marca movil, Volver al inicio, rotulo, titulo
  32/40 y 44/52, formulario de controles de 52 px, enlace Solicitar cuenta y pie con
  terminos. Bajo lg solo el panel. Estilos en LoginPage.css, todos bajo `#login`.
* Login de plataforma: tarjeta centrada (max-w-md, borde, surface) sobre canvas con
  Wordmark sin enlace, sin foto, sin rotulo, sin regreso ni pie. Misma logica de errores
  (401 generico de correo y contrasena, 429 con Retry-After via reportError, sesion vencida).
  Esa era toda la diferencia de distribucion: no compartia ni el CSS ni la estructura.
* PlatformShell montaba AppShell con props items, home, settings=false, account y
  headerInPage: barra lateral carbon `nav` de 240 px (72 px contraida, eleccion guardada en
  localStorage compartida con las servitecas), menu movil lateral bajo lg con trampa de foco y
  Esc, boton de menu inyectado en el encabezado de cada pagina (`menuButton` del contexto del
  Outlet), SkipLink, main `#contenido` max-content y titulo del documento desde el handle.
  Las cinco paginas de plataforma leen `menuButton` de `AppShellContext`.
* UserMenu: disclosure, panel siempre hacia arriba (`bottom-full left-0`), hover nav-hover.
* Tokens: no habia color oscuro distinto del carbon; `overlay` #111827 es casi igual a `nav`.
  tokens.test.ts verifica pares de texto (4.5), bordes y foco (3); designSystem.test.ts
  limita sombras a una lista por archivo, escala, rejilla y radios; copy.test.ts revisa tildes.
* Imagenes: `src/assets/<pantalla>/nombre-vN.webp`, dimensiones naturales declaradas, foto
  del login decorativa (alt vacio) con fetchPriority high y decoding async. Referencia:
  login-workshop-v1.webp 1122x1402, 111 698 bytes; register-workshop-v1.webp igual, 84 042.
* La imagen de David existia: PNG 1122x1402, 1 782 838 bytes.

## Decisiones

* `LoginLayout` (src/pages/LoginLayout.tsx) extrae la composicion del login sin cambiar su
  marcado. LoginPage y PlatformLoginPage la usan; plataforma pasa su foto, rotulo ACCESO DE
  PLATAFORMA, titulo y subtitulo de siempre, y no lleva mensaje sobre la foto ni enlace de
  registro. Hereda Volver al inicio y el pie de terminos.
* Imagen: `src/assets/login/platform-login-v1.webp`, WebP con perdida calidad 85, metodo 6,
  sin metadatos (ImageMagick), 1122x1402, 103 054 bytes (SSIM 0.99 frente al PNG). Mismo
  trato que la del login: alt vacio, dimensiones declaradas, prioridad alta.
* Shell: barra superior propia en PlatformShell (AppShell sin cambios). Fija (sticky top 0),
  h-topbar 64 px. Marca (solo simbolo bajo sm), rotulo PLATAFORMA, Resumen, Solicitudes y
  Servitecas con icono, UserMenu compacto con placement below. Activa: aria-current,
  fondo platform-hover, borde inferior brand e icono brand.
* (Reemplazado por el ajuste 2) Tokens nuevos: `platform` #072a2c y `platform-hover` #0e3b3e (verde petroleo oscuro). Un
  primer intento azul tinta #0f2a4a se descarto: tiene el mismo tono que `nav` #1f2937
  (luminancia 1.01 a 1) y no se distinguia a simple vista.
* (Reemplazado por el ajuste 2) Contrastes en tokens.test.ts: blanco sobre platform 15.26 y sobre hover 12.25; neutral-300
  12.32 y 9.90; brand (foco y acento) 4.30 y 3.45.
* Movil: bajo lg desplegable disclosure bajo la barra, el patron de UserMenu y del menu Mas
  de ListHeader; el panel lateral con trampa de foco de AppShell sobra para tres enlaces.
  Corte lg, el del menu movil de las servitecas (en 768 px marca, rotulo, tres ventanas y
  usuario no caben con holgura). Esc cierra y devuelve el foco, clic fuera y ruta nueva cierran.
* Contenido: main mx-auto max-content, px-6 y px-8 desde lg, como en AppShell pero sin el
  relleno de la barra lateral. Las paginas reciben `menuButton` null; su contenido no cambia.
* Codigo obsoleto: el uso de AppShell en PlatformShell desaparece. No se retiraron pruebas:
  las de shell de platform.test.tsx siguen pasando sin ajustes (navegacion Principal, marca,
  titulo, sin miga). Las props de plataforma de AppShell quedan sin uso porque la tarea pide
  no tocar el shell de las servitecas; retirarlas queda a decision de David.

## Archivos

* Nuevos: src/pages/LoginLayout.tsx, src/assets/login/platform-login-v1.webp,
  src/platform/platformShell.test.tsx, esta nota.
* Modificados: src/pages/LoginPage.tsx, src/pages/PlatformLoginPage.tsx,
  src/platform/PlatformShell.tsx, src/layout/UserMenu.tsx, src/styles/tokens.css,
  src/styles/tokens.test.ts, docs 01-ARCHITECTURE, 02-CONVENTIONS, 03-DECISIONS y
  05-DESIGN-SYSTEM.
* Intactos: AppShell.tsx, AppShell.test.tsx, LoginPage.css, rutas, API, AGENTS.md, backend.

## Evidencia

* Suite de la primera version: 1669 pruebas en 72 archivos (base 1653 + 16 nuevas): 8 en platformShell.test.tsx,
  6 pares de contraste en tokens.test.ts y 2 pasadas por archivo de las guardas
  (designSystem y copy sobre LoginLayout.tsx). Ninguna prueba existente ajustada ni retirada.
* Build, lint (max-warnings 0) y git diff --check sin errores. El CSS generado incluye
  bg-platform y bg-platform-hover y el build empaqueta la foto (103 054 bytes).

## Limitaciones

* Sin navegador: medidas reales de la barra en 320 a 1023 px y el aspecto del color sobre la
  marca no se verificaron visualmente.
* (Resuelto en el ajuste 2) El color de plataforma era una propuesta; David pidio el de las
  servitecas.
* La seleccion de la barra lateral guardada en localStorage (servibox.sidebar) ya no aplica
  a plataforma; la de las servitecas no cambia.

## Ajuste 2 (mismo dia): menu de usuario y color de la barra

Pedido de David tras la revision: el panel del menu de usuario recortaba correo y rol, y la
barra debe usar exactamente el color de la barra lateral de las servitecas.

* UserMenu es compartido con el shell de las servitecas. El cambio va solo por la prop
  `placement="below"`, que usa unicamente PlatformShell; `above` (por defecto) conserva
  216 px, p-2, truncado, text-small en el rol y Cerrar sesion de 44 px, y el hover del boton
  vuelve a ser `nav-hover` en ambos.
* Panel de plataforma: w-80 (20 rem) con max-w calc(100vw - 6rem), p-3, correo text-body
  semibold con break-all, rol text-body muted con break-words, Cerrar sesion min-h-12 (48 px).
  Se uso 6rem y no 1rem porque el panel se alinea a la derecha del avatar y bajo lg el boton
  Abrir menu queda a su derecha (16 a 24 px de margen mas 52 px): con 1rem saldria por el
  borde izquierdo en 320 px. En 320 px el panel mide 224 px y deja unos 20 px a cada lado.
  Esc, foco visible y cierre por clic fuera o cambio de ruta sin cambios.
* Color: la barra usa `bg-nav`; ventana activa `border-brand bg-nav-active text-text-inverse`
  e inactiva `border-transparent text-neutral-300 hover:bg-nav-hover hover:text-text-inverse`,
  las mismas clases de color de la barra lateral; divisores y panel movil con `nav-hover`.
  La diferencia queda en el rotulo PLATAFORMA y en la barra superior.
* Tokens retirados: `platform` y `platform-hover` de tokens.css y sus 6 pares de
  tokens.test.ts (4 de texto y 2 de foco). No se relaja la guarda: los pares reutilizados
  (text-inverse, neutral-300 y brand sobre nav, nav-hover y nav-active) ya estaban en ella.
  tokens.css y tokens.test.ts quedan identicos a main. El CSS generado no tiene utilidades
  platform.
* Pruebas: +2 en platformShell.test.tsx (panel con correo largo y rol completos, sin clases
  de truncado, Cerrar sesion de 48 px y Esc que cierra y devuelve el foco; la barra comparte
  con la barra lateral las clases de color de la ventana activa e inactiva). Ajustadas en el
  mismo archivo: barra `bg-nav` en vez de `bg-platform`, activa `bg-nav-active` en vez de
  `bg-platform-hover` y el shell de servitecas, que ahora tambien verifica su menu de usuario
  (hacia arriba, 216 px, truncado, 44 px) en vez de buscar la clase bg-platform.
* Evidencia: 1665 pruebas en 72 archivos (1669 de la primera version, menos 6 pares
  retirados, mas 2 nuevas; frente a la base 1653 de main, +12). Build, lint y git diff
  --check sin errores. API simulada en todas; sin navegador.
