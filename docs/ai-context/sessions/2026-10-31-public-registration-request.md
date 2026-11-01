# 2026-10-31: Solicitud publica de cuenta, activacion y contactos reales (tarea 7 de 8)

Rama feat/50-public-registration-request desde main en 32b1d37 (merge PR 51,
feat/49-platform-tenant-detail). Sin commit, push ni PR: quedan para el prompt de cierre.
Sin navegador ni capturas; la revision visual es de David. Todas las pruebas usan API
simulada en Vitest: no hubo HTTP real, correo real ni llamadas al backend de revision.

## Hallazgos del paso 0

* Main limpio e igual a origin/main, incluye el PR 51. Numero libre del frontend: 50.
* Backend leido en solo lectura (main d7c360d): RegistrationRequestController, DTO de
  registration.dto, RegistrationRequestService, RegistrationActivationService,
  ActivationException, RateLimitExceededException, RegistrationRequestConflictException,
  TenantRegistrationService, LoginThrottle, GlobalExceptionHandler, V9 y las notas
  registration-requests, activation-outbox-email, public-rate-limit y
  login-brute-force-protection.
* POST /api/registration-requests: publico, cabecera Idempotency-Key (obligatoria en la
  practica: patron [A-Za-z0-9._:-]{8,100}), 202 {requestId, status:PENDING, message}. Orden:
  compuerta (404 "Recurso no encontrado"), limite por IP (429 con Retry-After), validacion.
  Cuerpo: businessName, nit, phone, slug, adminFullName, adminEmail, acceptTerms y password
  solo para rechazarla. Reglas: las de TenantRegistrationService (nombre 150, NIT
  `\d+(-\d)?` hasta 25, telefono `[0-9 +()-]+` hasta 25, slug 3 a 30 y reservados, nombre del
  responsable 150, correo 150 con formato). Mismo cuerpo y clave dentro de la retencion
  devuelve el mismo acuse; clave con otros datos 409.
* POST /api/registration-requests/activate {token, username, password}: 200
  {status:"ACTIVATED", tenantSlug, message:"Cuenta activada; inicia sesion"}, sin JWT. Token
  `[A-Za-z0-9_-]{43}`. Usuario `[A-Za-z0-9._-]{3,50}`; contrasena 8 a 72 caracteres y 72
  bytes UTF-8. Tambien bajo la compuerta (404) y con limite por IP (429).
* El enlace del correo es `{base}/activar#token=...`: el token viaja en el FRAGMENTO, no en la
  query. El prompt no lo decia; se sigue el codigo.
* Mensajes exactos (backend sin tildes):
  * 429 "Demasiadas solicitudes desde esta conexion, intenta de nuevo mas tarde" (Retry-After)
  * 429 "Demasiados intentos de activacion, espera unos minutos e intenta de nuevo"
  * 429 "Demasiados intentos de inicio de sesion, espera unos minutos e intenta de nuevo"
    (LoginThrottle, ambos logins)
  * 400 "La clave de reintento es obligatoria", "La clave de reintento no es valida",
    "La solicitud no admite contrasena", "Debe aceptar los terminos y condiciones" y los 400
    del registro ya mapeados
  * 409 "El codigo solicitado no esta disponible", "La clave de reintento ya se uso con otros
    datos", "La solicitud ya no permite esta operacion" (activacion con solicitud no
    aprobada o reserva vencida)
  * 400 "El enlace de activacion no es valido", 410 "El enlace de activacion vencio o fue
    reemplazado", 409 "El enlace de activacion ya fue utilizado; inicia sesion"
  * 401 "Credenciales invalidas" identico para serviteca suspendida, usuario inactivo o
    contrasena incorrecta
* Consentimiento: el backend exige acceptTerms true y NO lo guarda (V9 y la entidad no tienen
  columna; solo entra en el hash de idempotencia). No hay version de terminos.
* El registro inmediato (/api/auth/register) responde 403 con la compuerta de solicitudes
  encendida; con ella apagada sigue vivo en el backend, pero el frontend ya no lo usa.
* Contactos: contact.ts tenia los demostrativos; los usaban errorMessages (mensaje de red),
  Toaster (enlace del WhatsApp), TermsPage y pruebas de landing, terminos y reportError.
* Diferencias con el prompt: solo el fragmento del enlace y que acceptTerms es campo de la
  API (por eso se conserva la casilla).

## Decisiones

* /registro pasa a ser la solicitud de cuenta (mismo RegisterPage y su composicion). Se
  retira el registro inmediato en vez de redirigirlo: la URL ya era el destino de todos los
  CTA y de /crear-cuenta, asi no queda ninguna ruta muerta ni enlace a una pagina que con la
  compuerta encendida responde 403. Se eliminan `register()` y `RegisterRequest`.
* CTAs: "Crear cuenta" pasa a "Solicitar cuenta" (barra, pie de landing y login) y "Crear mi
  serviteca" a "Solicitar mi cuenta" (portada y cierre), porque ya no se crea al instante.
* Idempotency-Key por intento con crypto.randomUUID; la huella es el cuerpo normalizado
  enviado. Mismo cuerpo, misma clave; otro cuerpo o 409 de clave reutilizada, clave nueva.
* Pantalla de exito "Recibimos tu solicitud" con el nombre y el correo enviados, revisar
  spam y el correo de contacto; sin plazos ni garantia de llegada. Foco en el titulo.
* 404 de compuerta: Alert "El registro todavia no esta disponible" con mailto. 409 de codigo
  no disponible bajo el campo con el foco. 429 "Espera antes de enviar de nuevo" con tiempo.
* /activar con la misma composicion (main#register y RegisterPage.css). Token: se lee una
  vez del fragmento, se valida el formato, se quita con navigate replace (replaceState del
  router) y vive solo en estado de React. meta referrer no-referrer agregada al montar y
  retirada al salir. Sin token o con formato invalido: "Este enlace no es valido" sin
  formulario ni llamada.
* Exito de activacion: codigo de la serviteca y usuario en un dl, explicacion y boton a
  /login. Sin sesion; se recuerda el codigo (rememberTenantSlug, la misma clave que ya usaba
  el registro) para que el login lo traiga escrito.
* Logins: titulo "Espera antes de intentar de nuevo" y mensaje mapeado con el tiempo. El 401
  conserva sus textos genericos.
* contact.ts: SUPPORT_EMAIL hola@servibox.co y WHATSAPP opcional, hoy undefined. Terminos y
  el mensaje de red usan el correo; el Toaster enlaza el correo o el WhatsApp si existe.
* Consentimiento: casilla de terminos (la API la exige) y texto informativo bajo el boton sin
  enlace. Pendiente: guardar el consentimiento y su version en el backend, y la politica.

## Textos nuevos (backend a interfaz)

| Backend | Interfaz |
|-|-|
| Demasiadas solicitudes desde esta conexion, intenta de nuevo mas tarde | Recibimos demasiadas solicitudes desde esta conexion. Intentalo de nuevo mas tarde. |
| Demasiados intentos de activacion, espera unos minutos e intenta de nuevo | Hiciste demasiados intentos de activacion. Espera unos minutos e intentalo de nuevo. |
| Demasiados intentos de inicio de sesion, espera unos minutos e intenta de nuevo | Hiciste demasiados intentos de inicio de sesion. Espera unos minutos e intentalo de nuevo. |
| La clave de reintento es obligatoria / no es valida | No pudimos enviar la solicitud. Intentalo de nuevo. |
| La clave de reintento ya se uso con otros datos | No pudimos confirmar el envio porque los datos cambiaron. Envia la solicitud de nuevo. |
| La solicitud no admite contrasena | La solicitud no lleva contrasena: la creas al activar la cuenta. |
| El enlace de activacion no es valido | El enlace de activacion no es valido. Abrelo de nuevo desde el correo, completo. |
| El enlace de activacion vencio o fue reemplazado | El enlace de activacion vencio o fue reemplazado por uno mas reciente. Usa el ultimo correo que te enviamos. |
| El enlace de activacion ya fue utilizado; inicia sesion | Este enlace de activacion ya se uso. Inicia sesion con el codigo de tu serviteca. |
| El codigo solicitado no esta disponible (registration) | Este codigo ya no esta disponible. Elige otro. |
| El codigo solicitado no esta disponible (activation) | El codigo de serviteca de tu solicitud ya no esta disponible. Escribenos a hola@servibox.co para revisarla. |
| La solicitud ya no permite esta operacion (activation) | Esta solicitud ya no se puede activar. Escribenos a hola@servibox.co para revisarla. |
| 429 sin mapa | Hiciste demasiados intentos. Espera unos minutos e intentalo de nuevo. |

Con Retry-After se agrega "Podras intentarlo de nuevo en N segundos/minutos/horas" (898 s
da 15 minutos). Plataforma conserva sus textos sin contexto.

## Archivos

* Nuevos: src/pages/ActivationPage.tsx, src/pages/ActivationPage.test.tsx,
  src/config/contact.test.tsx.
* Cambiados: src/lib/api.ts (retryAfter, headers), src/api/errorMessages.ts,
  src/components/Toaster.tsx, src/config/contact.ts, src/auth/authApi.ts,
  src/auth/registerForm.ts, src/pages/RegisterPage.tsx, src/pages/LoginPage.tsx,
  src/pages/PlatformLoginPage.tsx, src/pages/LandingPage.tsx, src/pages/TermsPage.tsx,
  src/routes.tsx y las pruebas listadas abajo.
* Docs: 01-ARCHITECTURE (rutas, cliente API, registro y activacion), 02-CONVENTIONS
  (contactos), 03-DECISIONS (entrada nueva; marcadas como reemplazadas las dos del registro
  del 2026-10-22), 06-COPY (429, red y contextos).

## Pruebas

* Suite completa: 71 archivos, 1652 pruebas, todas en verde (base reportada 1611, no se volvio a correr aparte; +41 neto).
  Build y lint sin errores ni advertencias; revision de espacios de git diff (opcion check) limpia.
* Nuevas: ActivationPage.test.tsx (token leido y retirado con replace, meta no-referrer,
  exito con tenantSlug sin sesion, codigo recordado en el login, sin token, formato
  invalido, validaciones, contrasenas distintas, 400 y 410 de enlace, 409 usado con login,
  409 de estado, 400 de usuario, 429 con y sin Retry-After, red con reintento; en varias se
  comprueba que el token no queda en localStorage, sessionStorage, URL ni DOM).
  contact.test.tsx (con telefono simulado: terminos y mensaje de red con WhatsApp).
  En errorMessages.test: diez mensajes nuevos en BACKEND, contextos, 429 y retryAfterText.
  LoginPage.test: 429 con y sin Retry-After y 401 generico. platform.test: 429 del acceso
  con y sin Retry-After.
* RegisterPage.test.tsx reescrita para la solicitud: campos, texto de consentimiento,
  sugerencia del codigo, errores locales, terminos, cuerpo y cabecera exactos, acuse sin
  plazos ni sesion, clave estable en reintento y nueva al cambiar datos, 404, 400, 409 de
  codigo, 409 de clave, 429 con y sin Retry-After, red y 500, doble envio, 409 tardio,
  redireccion con sesion y titulo. Se retiraron las del registro inmediato (cuerpo con
  usuario y contrasena, sesion y toast de exito, 403, mostrar contrasena).
* Ajustadas: registerForm.test (sin usuario ni contrasena en el formulario; usernameError y
  passwordError probados aparte; reservados plataforma y activar), LandingPage.test (rotulos
  Solicitar cuenta y Solicitar mi cuenta, titulo de /registro, /activar en frases prohibidas
  y titulos, terminos sin telefono, guarda de contactos con el correo real),
  LoginPage.test (enlace Solicitar cuenta, /crear-cuenta llega a Solicita tu cuenta),
  reportError.test (el contacto del mensaje de red es el correo). Guardas designSystem,
  tokens, copy y errorMessages sin cambios en sus reglas.

## Correccion: el 429 de la solicitud no se veia (revision de David)

* Sintoma: en /registro, con mas de 5 envios desde el mismo equipo no aparecia el 429; los
  429 de ambos logins si.
* Frontend: tras un 409 "El codigo solicitado no esta disponible", handleSubmit bloqueaba
  localmente cualquier envio con el mismo codigo (guarda `!valid || slugError`, heredada del
  registro inmediato). Pulsar Enviar solo devolvia el foco al campo, sin peticion HTTP. Con
  los mismos datos (segundo envio en adelante: la primera solicitud reserva el codigo) cada
  carga de pagina hacia como maximo una peticion, y la sexta que cuenta nunca llegaba. El
  202 deja la pantalla de acuse sin formulario (reenviar exige recargar, con clave nueva). El
  429 y su Retry-After si se leian y mostraban bien.
* Backend en solo lectura: compuerta, luego limite (`acquire` cuenta toda peticion que pasa
  la compuerta, tambien un reintento con la misma clave, un 409 o un 400 del servicio; un
  JSON mal formado es 400 antes del controlador y no cuenta), luego servicio. Valores por
  defecto sin cambios en dev: habilitado, 5 por hora por IP en solicitudes, 10 por 15 minutos
  en activacion, IP del socket (cabecera de proxy vacia).
* Prueba HTTP unica autorizada contra localhost:8080, mismo cuerpo ficticio
  (ficticia-prueba-diagnostico, correo @example.com) y la misma Idempotency-Key, maximo 8:
  intento 1 respondio 429 con Retry-After 2819 y se detuvo ahi. La cuota de esa IP ya estaba
  gastada por las pruebas previas; el 429 no llega al servicio y no creo ninguna fila.
* Decision: causa en el frontend; el backend funciona. Se quita el bloqueo local por codigo
  no disponible: Enviar siempre manda la peticion si la validacion local pasa, y al enviar se
  limpia el aviso del campo para que mande la respuesta nueva (429, 202 u otro 409). La clave
  se sigue reutilizando con datos sin cambios.
* Prueba de regresion en RegisterPage.test: seis envios con los mismos datos (red, cuatro 409
  de codigo y 429 con Retry-After 2819), todos llegan al backend con la misma clave y el
  mismo cuerpo, el sexto muestra el 429 con 47 minutos y el aviso del codigo desaparece.
  Falla sin la correccion (el tercer envio no sale) y pasa con ella.
* Suite: 71 archivos, 1653 pruebas en verde (base 1652, +1). Build, lint y revision de
  espacios de git diff limpios.

## Limitaciones

* Sin HTTP real ni correo real: el enlace de activacion y los 429 solo se probaron con API
  simulada. Con la compuerta apagada (estado por defecto) nadie puede registrarse en
  publico: la pagina avisa y da el correo.
* El consentimiento no se guarda en el backend ni tiene version; no hay politica de datos.

## Para revisar en pantalla (David)

* /registro en movil y escritorio: textos, campos, Alert informativo, casilla, nota de
  consentimiento bajo el boton y pantalla "Recibimos tu solicitud".
* /registro con la compuerta apagada: Alert de registro no disponible con el correo.
* /activar#token=... : formulario, mensajes de error, pantalla de exito con el codigo y
  boton Iniciar sesion; /activar sin token.
* Landing, login y pie con los rotulos Solicitar cuenta y Solicitar mi cuenta (ancho de los
  botones de la barra y del cierre).
* Login de serviteca y de plataforma con un 429 (titulo y tiempo de espera).
* Terminos sin telefono y con hola@servibox.co.
