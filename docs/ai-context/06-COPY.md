# Textos de la interfaz: glosario y mensajes

Fuente unica de los rotulos de conceptos, de los textos de error y de donde se muestran.
Este archivo va sin tildes como el resto de los docs; en la interfaz los textos llevan tilde.
Reglas generales de voz en [02-CONVENTIONS.md](02-CONVENTIONS.md) (Textos de la interfaz).

## Glosario

`src/copy/glossary.ts` (`GLOSSARY`). Toda pantalla que nombra uno de estos conceptos toma el
texto de ahi; nunca se escribe a mano otro sinonimo.

| Clave | Rotulo | Uso | Reemplaza |
|-|-|-|-|
| `incomeNavigation` | Ingresos | agrupador de navegacion, sin ruta propia | Ventas solo como padre de navegacion |
| `expenseNavigation` | Egresos | agrupador de navegacion, sin ruta propia | Compras solo como padre de navegacion |
| `treasury` | Tesoreria | etiqueta, titulo y miga del modulo /cuentas | Cuentas solo como nombre del modulo |
| `paymentType` | Forma de pago | Contado o Credito | Tipo de pago |
| `paymentMethod` | Medio de pago | Efectivo, Transferencia, Tarjeta... | Metodo de pago |
| `registerSale` | Registrar venta | boton, estado vacio y menus hacia `/ventas/nueva` | |
| `registerPurchase` | Registrar compra | igual hacia `/compras/nueva` | |
| `otherIncome` | Otros ingresos | ingresos que no vienen de una venta (la ruta sigue `/ventas/ingresos`) | Ingresos ocasionales |
| `newOtherIncome` | Nuevo ingreso | boton de alta | |
| `tenantCode` | Codigo de tu serviteca | identificador del tenant (login, registro, Configuracion) | Identificador de la serviteca |
| `lowStockThreshold` | Avisar con stock bajo en (unidades) | campo de la categoria | Umbral amarillo |
| `criticalStockThreshold` | Avisar con stock critico en (unidades) | campo de la categoria | Umbral rojo |
| `lowStock` | Stock bajo | estado, filtro y encabezado | Bajo stock |
| `criticalStock` | Stock critico | estado y encabezado | |
| `outOfStock` | Sin stock | estado | |
| `collection` | Abono | cobro de una venta a credito | |
| `payment` | Pago | pago de una compra a credito | |
| `pendingBalance` | Saldo pendiente | columna y detalle | |
| `annul` | Anular | accion de factura | |
| `restore` | Restaurar | accion de la Papelera | Recuperar |
| `trash` | Papelera | | |
| `accountColor` | Color de la cuenta | Nueva y Editar cuenta | |
| `platformRequests` | Solicitudes | navegacion de plataforma | |
| `platformTenants` | Servitecas | navegacion y titulo de plataforma | |
| `tenantStatuses` | Activa, Suspendida | estado de servitecas en plataforma | |
| `registrationStatuses` | Pendiente, Aprobada, Rechazada, Cancelada, Activada | filtros y estados de solicitudes | |

Un concepto nuevo con mas de un sinonimo posible se agrega aqui antes de usarlo en pantalla.

Ingresos y Egresos no redefinen reglas financieras. Facturas de venta y de compra conservan
sus conceptos, rutas y acciones. Cuenta, Nueva cuenta, nombres y grupos de cuentas reales
no se renombran. Las migas de Ingresos/Egresos no enlazan a destinos ficticios.

## Guarda de textos

`src/copy/copy.test.ts` extrae con la API de TypeScript el texto visible de cada `.tsx` y
`.ts` de `src` (JSX, cadenas y plantillas; sin comentarios, `import`, atributos tecnicos como
`className`, `href`, `to`, `id`, `type` o `name`, rutas, enums en mayusculas ni clases de
Tailwind) y falla si encuentra:

* Una palabra de la lista `UNACCENTED` escrita sin tilde (telefono, numero, codigo, sesion,
  periodo, configuracion, conexion, accion...).
* Jerga tecnica (`JARGON`): tenant, slug, undefined, NaN, null, token, endpoint, JSON, UUID,
  id.
* Un termino reemplazado por el glosario (Ingresos ocasionales, Identificador de la
  serviteca, Umbral amarillo o rojo, Metodo de pago, Tipo de pago, Bajo stock).

Tiene una prueba negativa (una cadena de ejemplo que debe reportar cada regla) y una positiva.
Las cadenas que comparan con el backend (expresiones regulares) no son texto visible.

## Mensajes de error

### Texto: `userMessage(error)`

`src/api/errorMessages.ts`. Ninguna pantalla muestra `error.message`. `userMessage`:

1. Si el backend mando un mensaje conocido, lo traduce con `RULES` (expresion regular sobre el
   texto del backend y su texto final). Ahi se ponen tildes y punto final, las cifras pasan a
   pesos (`$ 3.706.376`), unidades (`1 unidad`, `3 unidades`) o miles (`20.000`), las fechas a
   dd/mm/aaaa y los estados y roles a palabras (PENDIENTE a pendiente, CLIENTE a cliente).
2. Si es un 400 que no esta en el mapa pero se lee bien (corto, sin palabras sin tilde,
   cifras crudas, nombres tecnicos ni mayusculas sostenidas), lo muestra con la primera letra
   en mayuscula y punto final.
3. Si no, el texto de su estado (`MESSAGES`):

| Estado | Texto |
|-|-|
| 400 ilegible | Revisa los datos e intentalo de nuevo. |
| 401 | Tu sesion vencio. Inicia sesion de nuevo. |
| 403 | No tienes permiso para hacer esto. |
| 404 | No encontramos lo que buscas. Puede que ya no exista. |
| 409 sin mapa | Esto cambio mientras lo editabas. Recarga e intentalo de nuevo. |
| 429 sin mapa | Hiciste demasiados intentos. Espera unos minutos e intentalo de nuevo. |
| 5xx, red o respuesta no JSON | No pudimos completar la accion. Revisa tu conexion e intentalo de nuevo; si sigue pasando, escribenos a hola@servibox.co (o por WhatsApp al numero de `src/config/contact.ts` cuando exista). |

Un 429 con Retry-After agrega "Podras intentarlo de nuevo en N segundos, minutos u horas."
(`retryAfterText`, redondeo hacia arriba).

Un 403 o 404 con mensaje conocido usa el mapa ("Solo un administrador puede editar...",
"No encontramos esa factura. Puede que ya no exista.").

Como agregar un mensaje nuevo del backend:

1. Copiar el texto exacto de la excepcion en `servibox-backend/src/main`.
2. Agregar en `RULES` la expresion regular (anclada con `^...$`, grupos para los valores) y
   el texto final con el formateador que toque (`money`, `pesos`, `units`, `thousands`,
   `formatDate`, `STATUS_LABELS`, `ROLE_LABELS`, `NOUNS`).
3. Agregar el par en `BACKEND` de `src/api/errorMessages.test.ts`, con el archivo de origen en
   el comentario del grupo.

Si una pantalla compara el mensaje del backend para saber que campo marcar (numero de
factura repetido, documento repetido), la comparacion va contra el texto del backend y el
texto que se muestra sale de `userMessage`.

Mensaje de precision de precio unitario, HTTP 400:

* Backend exacto: `El precio unitario admite como maximo dos decimales`
* Interfaz: mismo texto con tilde en maximo y punto final; se muestra bajo el campo en la
  validacion local. La respuesta del servidor sigue pasando por reportError/userMessage.
* No aplica a pagos, abonos, transferencias ni saldos iniciales.

### Donde: `reportError(error)`

Mensajes de edicion de cuentas agregados al mapa (TreasuryService.editarCuenta):

* `El tipo de una cuenta no se puede cambiar`: 400, alerta del formulario.
* `El color debe tener el formato #RRGGBB`: 400, alerta del formulario de alta
  o edicion; la interfaz agrega punto final y conserva todos los campos.
* `Saldo insuficiente en {cuenta}: faltan {monto} para cambiar el saldo inicial`: 409,
  bajo Saldo inicial. Conserva nombre y monto ya formateado (por ejemplo `$ 10.000`).
  El nombre duplicado se distingue por su mensaje exacto y va bajo Nombre.

`src/api/reportError.ts`, regla unica:

* 400 y 409: en linea, en el formulario o modal donde paso (bajo el campo si corresponde a uno,
  si no en el `Alert` del formulario). Lo que el usuario digito se conserva.
* Red, 5xx, 403 y 404: toast de error persistente (`role="alert"`, boton "Cerrar aviso"); el
  WhatsApp del texto de red es un enlace.
* 401: no se muestra; la sesion se cierra y el login avisa "Tu sesion vencio. Inicia sesion de
  nuevo." (tambien si el token vencio mientras la pestana estaba abierta).

En un componente se usa el hook `useReportedError(mutation.error)`: lanza el toast una sola
vez por error y devuelve el texto en linea (o `null`). `reportError(error, { inlineOnly: true })`
es para pantallas sin Toaster (registro): todo va en linea.

Excepciones: el 404 de la ruta (factura o producto inexistente) es el estado "no encontrado"
de la pantalla, no un toast; el login muestra su propio texto de credenciales.
Desde 2026-10-28 Login usa reportError inlineOnly para los demas errores y conserva
del generico la accion de revisar conexion y reintentar, sin invitar al contacto
demostrativo de contact.ts. Registro adopta la misma regla local el 2026-10-28.
La ayuda se omite hasta tener WhatsApp real; los mensajes compartidos no cambian.
El acceso de plataforma sigue la misma regla con su propio texto de credenciales
("Revisa tu correo y tu contrasena."), sin mencionar el codigo de la serviteca.

## Validacion de contacto

Solicitud de cuenta y activacion (2026-10-31): contextos `registration` y `activation` en
userMessage para los mensajes compartidos con Solicitudes de plataforma (codigo no disponible,
solicitud que ya no permite la operacion). Mensajes nuevos: los tres 429 (solicitudes,
activacion y login), la clave de reintento (obligatoria, no valida, reutilizada), solicitud
sin contrasena y los tres del enlace de activacion. Textos exactos en la nota de sesion
public-registration-request. Las pantallas comparan con el backend por expresion regular.

Solicitudes de plataforma (2026-10-31): mensajes exactos de revision, paginacion,
version, estado y limites de reenvio agregados a errorMessages.ts. Formularios de
confirmacion usan reportError con inlineOnly: errores visibles sin perder motivo,
incluido 429. Un 401 conserva el cierre aislado de plataforma. El 404 del detalle
es solicitud inexistente, sin toast; durante una accion conserva la confirmacion.
No se muestran enlaces secretos ni se promete recepcion del correo. Lista exacta
de mensajes y reglas en la nota de sesion platform-requests.

Correccion de filtros de Solicitudes: Serviteca, Responsable, Desde, Hasta y Estado
son etiquetas visibles. Sin filtros: No hay solicitudes de registro. Con filtros:
No hay solicitudes que coincidan con estos filtros. Tres mensajes 400 nuevos del
backend se mapean para longitud de texto, formato de fecha y rango invertido.
El rango invertido tambien se valida en el frontend usando el mismo mensaje mapeado;
fechas abiertas validas. Datos conservados ante errores y al volver del detalle.

Servitecas de plataforma: Buscar (Nombre o codigo) y Estado (Todas, Activas,
Suspendidas). Sin filtros: Todavia no hay servitecas registradas. Con filtros: No hay
servitecas que coincidan con estos filtros. 400 nuevo mapeado: La busqueda no puede
superar 100 caracteres.

Detalle de serviteca: acciones Suspender serviteca, Reactivar serviteca, Cerrar todas las
sesiones y Cerrar sesiones (por usuario). Las confirmaciones dicen la consecuencia: al
suspender nadie entra y las sesiones se cierran de inmediato; al reactivar hay que iniciar
sesion de nuevo; cerrar sesiones no desactiva al usuario. Motivo con contador "N de 500
caracteres" (obligatorio al suspender, opcional al reactivar y al cerrar sesiones, donde
la etiqueta es Motivo). Cerrar todas las sesiones dice cuantos usuarios activos afecta
(sus N usuarios activos, su unico usuario activo, o que no tiene usuarios activos).
Login de serviteca, 401: Revisa tus datos e intenta de nuevo. Si son correctos y aun no
puedes entrar, puede que tu acceso no este disponible: escribenos al correo de soporte. Seis mensajes nuevos del backend (Tenant no encontrado, Usuario no
encontrado, motivo obligatorio, motivo largo, ya suspendido, ya activo) y contexto
`tenant` en userMessage para que version distinta y version obligatoria nombren la
serviteca en vez de la solicitud. Textos exactos en la nota platform-tenant-detail.

`src/lib/validation/contact.ts` es el unico modulo de NIT y telefono (registro y
Configuracion): mismo patron que el backend, mismo largo maximo (25) y mismos mensajes. El NIT
se normaliza (sin puntos ni espacios) antes de validar y de enviar.
