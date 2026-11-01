# 2026-11-01: Consentimiento versionado y frontend listo para servibox.co (tarea extra)

Rama feat/53-consent-and-deploy-readiness desde main en 8dd8449 (merge PR 54,
feat/52-platform-quality-fixes). Sin commit, push ni PR: quedan para el prompt de cierre. Sin
navegador ni capturas; la revision visual es de David. Todas las pruebas usan API simulada: nada
se probo contra HTTP real. No se leyo ni toco el backend; su contrato sale del prompt de la tarea.

## Hallazgos del paso 0

* Lectura: 00, 01, 02 y 06 completos, nota mas reciente completa. De 03-DECISIONS y
  05-DESIGN-SYSTEM solo las entradas relacionadas, por su tamano (185 KB y 51 KB).
* URL de la API: una sola constante BASE_URL `/api` en lib/api.ts, usada por apiFetch y apiDownload.
  Ningun otro archivo de src llama a fetch ni usa import.meta.env. vite build sin `base`, o sea `/`.
* Lo que la tarea pedia crear y ya existia: `/terminos` (TermsPage con otro texto) y la casilla
  `acceptTerms`, sin marcar, obligatoria, con aria-describedby y foco. Se adaptaron.
* Campos del formulario: nombre comercial, NIT, telefono, codigo de la serviteca (slug), nombre
  completo del administrador y correo del administrador, mas la casilla. Sin usuario ni contrasena:
  se piden en /activar.
* Errores: 404 de compuerta, 409 de codigo bajo el campo, otros 400 y 409 en el Alert, 429 con
  Retry-After. Idempotency-Key se reutiliza mientras no cambie el cuerpo. Sin cambios.
* LandingPage.test exige que el correo solo este escrito en config/contact.ts: el modulo legal usa
  SUPPORT_EMAIL. La copia en docs/legal lo lleva escrito porque es el registro de la version.
* errorMessages.ts: RULES con expresion anclada y su par en BACKEND del test. copy.test revisa tildes
  y jerga de todo texto de src, incluido el modulo legal.
* `.dockerignore` excluye `.env*` y el Dockerfile no lo copia: la imagen Docker sigue con /api relativo.
* Prueba intermitente: causa en la seccion siguiente.

## Causa de la prueba intermitente

platformTenants.test.tsx, "muestra carga, error de red y recuperacion con Reintentar", buscaba el
boton con getByRole (sincrono) justo despues de `await act(async () => resolve(fail(...)))`.

* TanStack Query notifica a los observadores con setTimeout(0) (notifyManager, systemSetTimeoutZero).
* act de React espera con setImmediate (enqueueTask). En Node el orden entre un setTimeout(0), que
  en realidad es 1 ms, y un setImmediate no es fijo: depende de cuanto tardo la vuelta anterior.
* Si act termina primero, el boton aun no esta en pantalla. Por eso falla con mas carga.

No es un tiempo corto, reintentos (el listado usa retry false) ni estado compartido.

| Copia temporal de la prueba, 60 repeticiones | Aprobadas | Fallidas |
|-|-|-|
| Original, getByRole | 54 | 6 (no encuentra Reintentar) |
| Corregida, findByRole | 60 | 0 |

La sonda se borro. Correccion: findByRole, sin subir tiempos ni quitar aserciones. En las hermanas no
hubo que cambiar nada: platformRequests:108 y platformTenantDetail:210 ya usan findByRole en ese
punto, y las otras dos llamadas con el mismo act (platformRequests:426 y platformTenantDetail:316)
siguen con waitFor. El nombre dice "error de red" y simula un 500; se dejo igual.

## Decisiones

Ver 03-DECISIONS, entrada 2026-11-01. Ademas:

* Etiqueta con tildes: Acepto la Política de tratamiento de datos personales y los Términos y
  condiciones. El prompt la trae sin tildes y AGENTS.md pide tildes en la interfaz.
* Lista exacta de la seccion 3 de la politica: "nombre comercial, NIT, teléfono y código de tu
  serviteca, y nombre completo y correo del administrador", seguida de las dos frases de David
  sobre la activacion y el registro de la aceptacion.
* El error de la casilla y el del backend `Debe aceptar...` usan los nombres nuevos de los documentos.
* Agregado que no se pidio de forma literal: cada pagina legal enlaza a la otra, para no obligar a
  pasar por la landing. Es un enlace y se retira facil.
* Sin nueva dependencia ni token.

## Archivos

Nuevos: .env.production, src/legal/legalContent.ts, LegalPage.tsx, LegalLinks.tsx, legal.test.tsx,
src/pages/PrivacyPolicyPage.tsx, docs/legal/2026-11-01-politica-datos.md,
docs/legal/2026-11-01-terminos.md y esta nota.

Modificados: .env.example, vite.config.ts (solo comentario), src/lib/api.ts, src/routes.tsx,
src/copy/glossary.ts, src/api/errorMessages.ts, src/auth/authApi.ts, src/auth/registerForm.ts,
src/pages/RegisterPage.tsx, TermsPage.tsx, LoginLayout.tsx, ActivationPage.tsx, LandingPage.tsx,
pruebas listadas abajo, docs/DEPLOYMENT.md y 01, 02, 03, 05 y 06 de docs/ai-context.

## Evidencia

* npm test, dos veces seguidas: 73 archivos, 1715/1715 aprobadas en ambas.
* Total: base 1682, 34 nuevas, 1 retirada. Nuevas: legal.test 9, api.test 5, RegisterPage.test 7,
  errorMessages.test 3 (mensajes del mapa), LandingPage.test 2 (politica en frases prohibidas y
  titulo) y 8 automaticas de las guardas por los 4 archivos nuevos (copy y designSystem).
* Pruebas base ajustadas:
  * RegisterPage.test, fillForm: nombre nuevo de la casilla.
  * RegisterPage.test, "sin aceptar los terminos": texto nuevo del error.
  * RegisterPage.test, "envia el cuerpo exacto": agrega policyVersion.
  * RegisterPage.test, enlace de terminos: ahora dos enlaces y rel noopener noreferrer.
  * RegisterPage.test, "informa el uso de los datos": la nota bajo el boton se retiro; ahora comprueba
    que no aparece y conserva la asercion del aviso de activacion.
  * registerForm.test: texto del error y policyVersion en el cuerpo.
  * errorMessages.test, `Debe aceptar...`: texto nuevo.
  * controls.test, casilla: texto nuevo de la etiqueta.
  * LoginPage.test: el pie ahora tiene dos enlaces.
  * LandingPage.test, pie y lista de destinos permitidos: agrega /politica-de-datos.
  * contact.test, terminos con WhatsApp: el texto aprobado no nombra telefono; ahora comprueba que
    no se agrega y que el correo es enlace.
  * LandingPage.test, describe terminos: retirada (1). Afirmaba el texto anterior; legal.test cubre
    el nuevo con mas detalle.
* Guardas designSystem, tokens, copy y errorMessages: pasan, sin retirar ni relajar reglas.
* Una vez, antes de la suite completa, una corrida parcial fallo en surfaces.test.tsx con "Failed to
  resolve import react-router". Paso sola enseguida y no se repitio en las dos suites completas. El
  archivo no cambio. Causa no determinada: parece de Vite y no de esta tarea.
* npm run build: sin errores. dist 6,9 MB (7.002.798 bytes, 91 archivos). JS principal 378 kB (98 kB
  gzip), vendor 369 kB (116 kB gzip).
* dist/index.html: script, CSS y favicon con rutas absolutas /assets. Las imagenes de login, plataforma
  y registro existen en dist/assets y el JS las referencia como /assets/...
* localhost en dist: solo la base interna de react-router para interpretar URL, no una peticion. URL
  absolutas del JS de la app: https://api.servibox.co y https://servibox.co.
* npm run lint y git diff --check: sin hallazgos (git avisa solo de finales de linea CRLF).

## Limitaciones y riesgos

* CORS no verificado: al pasar a otro origen, Content-Disposition y Retry-After solo son legibles si
  el backend los expone, e Idempotency-Key debe estar permitida en el preflight. Sin lo primero las
  descargas se llaman `archivo`, sin extension. Comando en docs/DEPLOYMENT.md.
* Ajustes de David antes del cierre, sin cambiar POLICY_VERSION porque no se habia publicado: la
  seccion 3 agrega usuario y contrasena de la activacion y el registro de fecha y version aceptadas,
  y se retira la nota bajo el boton (la autorizacion se da al marcar la casilla).
* La politica no menciona la conexion que el backend usa para el limite de solicitudes.
* Recargar la pagina borra lo digitado en el formulario.
* El pie de registro y activacion abre los textos legales en la misma pestana, como antes, y se pierde
  lo digitado. La casilla si abre pestana nueva.
* Textos sin revision juridica por parte del agente.

## Revision manual de David

Con `npm run dev`:

* /politica-de-datos y /terminos en escritorio y en 360 px: lectura, encabezados, version, correo.
* /registro: casilla sin marcar, foco y error, los dos enlaces en pestana nueva, area de clic.
* Pie de landing, login, acceso de plataforma, registro y activacion.
* Con un 400 simulado o real de politica: Alert con Recargar la pagina.

Despues de publicar: comandos de la seccion Publicar en servibox.co de docs/DEPLOYMENT.md, imagenes de
ambos logins, recargar una ruta interna, y una descarga de reporte para ver el nombre del archivo.
