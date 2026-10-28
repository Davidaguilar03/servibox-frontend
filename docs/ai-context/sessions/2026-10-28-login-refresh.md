# 2026-10-28: Login, tarea 8 de 11

## Cierre 2026-10-28: aprobacion visual de David

* David aprueba visualmente Login y autoriza commit, push y PR de
  feat/40-login-refresh hacia main. Esta aprobacion reemplaza todos los
  pendientes visuales historicos de esta nota, incluida la correccion del
  logo. Sin navegador ni auditoria visual automatizada en este cierre.
* Estado real de WhatsApp confirmado en contact.ts y LoginPage: el contacto
  central sigue siendo demostrativo y Login no importa ni monta el enlace.
  Ayuda completamente omitida, sin icono, pregunta, boton ni enlace funcional.
  Falta numero empresarial real antes de incorporar la ayuda solicitada.
  El mensaje generico local tampoco publica el telefono demostrativo.
* La fotografia ambiental generada no representa cliente ni testimonio real;
  WebP 1122x1402 RGB, 111698 bytes. Original externo conservado.
* Resultados completos reales de cierre: 1387/1387 correctas en 65 archivos,
  cero fallos. Build y lint correctos sin advertencias; git diff check correcto.
  Este resultado reemplaza las 1385 pruebas anteriores a la correccion.
  Balance contra main: 1380 base + 7 nuevas = 1387, once ajustadas y cero
  retiradas. Las siete nuevas son cuatro de comportamiento, dos de contrato
  de logo y la guarda parametrizada adicional de LoginPage.css.
  Las once ajustadas y sus motivos constan abajo, sin cambios en el cierre.
* API simulada con fetch en Vitest/jsdom; sin comprobacion HTTP real ni
  autenticacion contra backend real. La aprobacion visual corresponde a
  David; jsdom no verifica geometria renderizada ni reemplaza esa revision.
  Build emite login-workshop-v1-C4Ga7-R2.webp con 111698 bytes, sin cambios.
* Se conservan backend, AGENTS.md, .idea y procesos ajenos. Solo se agregan
  las doce rutas explicitas de la tarea. Sin merge ni checkout.
* Siguiente tarea tras merge por David: Registro, tarea 9 de 11.

## Git y alcance

* Base main limpia, HEAD y origin/main remotos en 5d04cb4; PR 41 de
  Landing confirmado MERGED. Rama feat/40-login-refresh libre local y
  remotamente antes de crearla. Sin commit, push ni PR en esta entrega.
* Se conserva backend, AGENTS.md y .idea. No se arrancan servidores,
  navegadores ni se detienen procesos ajenos. Sin dependencias nuevas.

## Presentacion y recursos

* Referencia inspeccionada: login.png externo, 1547x1016. Se implementa
  con HTML/CSS, sin usar la maqueta completa como pantalla.
* LoginPage.tsx y LoginPage.css: foto a la izquierda desde lg, formulario
  max480 px sobre neutral-100 a la derecha, sin tarjeta adicional. Marca
  compartida, mensaje ambiental inferior y velo gradual solo en la foto.
  Campos y boton 52 px; titulo local 32/40 y 44/52 desde lg.
* Movil: escena oculta, marca visible sobre formulario y regreso al inicio.
  Altura minima 100svh, contenido sin altura maxima ni recorte de errores.
  No cambia layout de Registro, Landing o paginas privadas.
* Crear cuenta conserva /registro; regreso y marca van a /; Terminos y
  datos personales enlaza /terminos existente. Favicon intacto.
* Contacto omitido: contact.ts tiene WhatsApp y correo demostrativos.
  Pendiente WhatsApp real antes de habilitar ayuda con icono gris.
  Error generico de Login conserva conexion/reintento sin incluir el
  numero de ejemplo; no cambia mensajes compartidos de otras pantallas.

### Fotografia ambiental generada

* Fuente externa conservada: login-assets/login-workshop-v1.png, bajo
  C:/Users/PC/Documents/Codex/2026-10-25/files-pasted-by-the-user-vale/outputs/servibox-redesign/.
* PNG original: 1122x1402 RGB, 2170847 bytes. WebP integrado:
  src/assets/login/login-workshop-v1.webp, 1122x1402 RGB, 111698 bytes,
  aproximadamente 94,85 por ciento menos. Pillow existente, calidad 82,
  method 6; sin ampliacion, sin nuevas imagenes ni dependencias.
* WebP reabierto y decodificado correctamente. SHA256 del PNG antes y
  despues identico: f29887a4d9dbe873bd07632754070ed7f08ccd2557b35b41ef5dd1940454f282.
* Foto decorativa, alt vacio, dimensiones declaradas, prioridad alta,
  decoding async; cover con posicion 50%/35%. No representa un cliente
  real ni testimonio. David debe aprobar foto y recorte.

## Contratos y pruebas

* Conserva tres campos reales, required, trim solo en codigo y usuario,
  contrasena sin normalizar, POST de login sin Authorization, almacenamiento
  de sesion y codigo recordado, identidad y redireccion existente.
* TextField conserva contrasena oculta por defecto, control mostrar/ocultar,
  autocompletado, etiquetas y foco. Formulario anuncia pendiente con
  aria-busy y status; submit deshabilitado y protegido mientras espera.
  Alert conserva errores accesibles y aviso de sesion vencida.
* Base ejecutada antes de cambiar codigo: 1380/1380 correctas, 65 archivos.
  Pruebas dirigidas: 421 correctas en siete archivos.
* Nuevos casos de comportamiento: cuatro en LoginPage, red y servidor,
  mostrar/ocultar con teclado, Enter con normalizacion y bloqueo pendiente.
  La guarda parametrizada de designSystem suma automaticamente un caso
  por LoginPage.css. Balance confirmado: 1380 + 4 + 1 = 1385, cero retiradas.
* Existentes ajustadas: tres de LoginPage (titulo/subtitulo, omision de
  contacto y enlaces); cuatro de RequireAuth, dos de UserMenu, una de
  reportError y una fila de LandingPage por el titulo Inicia sesion.
  Once casos ajustados, sin retirar contratos existentes.
* API exclusivamente simulada con fetch en Vitest/jsdom; no se prueba
  autenticacion contra backend real. No se registran credenciales.

## Verificacion final y revision

* Suite completa final: 1385/1385 correctas en 65 archivos, cero fallos.
  Build y lint correctos, sin advertencias; git diff check correcto.
  Recurso emitido por Vite: login-workshop-v1-C4Ga7-R2.webp, 111698 bytes,
  igual al original WebP integrado. No hay comprobacion de rendimiento.
  Git status en sandbox avisa que no puede leer el ignore global externo;
  se revisaron los doce archivos de tarea sin cambios ajenos visibles.
* Sin navegador ni auditoria visual automatizada, por instruccion de David.
  No se declara fidelidad comprobada, ausencia de desbordes ni contraste
  medido sobre la fotografia. David revisara foto/recorte, marca/favicon,
  formulario/errores, enlaces, escritorio, movil, foco y teclado.
* Arranque desde frontend: npm run dev. URL habitual:
  http://localhost:5173/login, usar el puerto que anuncie Vite si esta ocupado.
  API por proxy configurado, por defecto localhost:8080; para autenticar
  realmente se necesita backend disponible. No se cambia proxy ni backend.
* Archivos: LoginPage.tsx, LoginPage.css, WebP de Login; cinco archivos de
  pruebas (LoginPage, LandingPage, RequireAuth, UserMenu, reportError);
  03-DECISIONS, 05-DESIGN-SYSTEM, 06-COPY y esta nota.
* Pendiente de aprobacion visual de David.

## Correccion de logo solicitada por David, 2026-10-28

* Causa: el selector #login .login-scene img alcanzaba tanto la foto como
  BrandSymbol, que monta el SVG compartido mediante img. Su especificidad
  imponia posicion absoluta, inset 0, width/height 100% y cover al simbolo;
  esto hacia crecer el logo hasta cubrir el panel y ocultaba la fotografia.
* Se acota cobertura y encuadre al hijo directo login-photo. La variante
  local login-brand fija simbolo 48x48, palabra 32/40 y enlaces/conjunto
  con width max-content, tanto en escritorio como en movil. No se modifica
  BrandSymbol, Wordmark, WordmarkLink, favicon ni tamanos globales.
* Capas explicitas en la escena aislada: foto 0, velo 1, logo y texto 2.
  Solo el fondo recibe el degradado; la marca y los mensajes no llevan
  opacidad ni filtros. Se conservan fotografia, recorte y formulario.
* Contacto centralizado revisado de nuevo: sigue siendo demostrativo.
  Falta el numero real de WhatsApp; se mantiene la ayuda omitida, sin
  enlace vacio ni boton simulado. Cuando David configure el dato real,
  queda pendiente incorporar icono gris, pregunta y enlace solicitados.
* Dos casos nuevos en LoginPage, anchos 375 y 1440, activan en jsdom las
  reglas CSS de cada ancho y comprueban sobre el DOM real las dimensiones
  calculadas 48x48, palabra 32 px, ancho natural y exclusion del simbolo
  de cualquier regla de posicion absoluta. En escritorio comprueban
  foto absoluta con cobertura y capas de velo por debajo de logo/texto.
  No se limitan al nombre de una clase; no miden geometria renderizada ni
  sustituyen revision visual. Se reutilizan pruebas de marca y contratos.
* Pruebas afectadas: 288/288 correctas en ocho archivos (LoginPage,
  Wordmark, designSystem, reportError, RequireAuth, UserMenu, LandingPage,
  RegisterPage). Build, lint sin advertencias y git diff check correctos.
  Base completa de esta tarea ya ejecutada: 1385; dos casos nuevos,
  cero ajustados adicionales, cero retirados; total esperado 1387.
  No se repite suite completa en esta correccion; no se presenta ese
  total esperado como resultado ejecutado. API exclusivamente simulada.
* Sin navegador, commit ni push. David revisara foto, logo y ayuda.
* Pendiente de aprobacion visual de David.
