# Textos de la interfaz: glosario y mensajes

Fuente unica de los rotulos de conceptos, de los textos de error y de donde se muestran.
Este archivo va sin tildes como el resto de los docs; en la interfaz los textos llevan tilde.
Reglas generales de voz en [02-CONVENTIONS.md](02-CONVENTIONS.md) (Textos de la interfaz).

## Glosario

`src/copy/glossary.ts` (`GLOSSARY`). Toda pantalla que nombra uno de estos conceptos toma el
texto de ahi; nunca se escribe a mano otro sinonimo.

| Clave | Rotulo | Uso | Reemplaza |
|-|-|-|-|
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

Un concepto nuevo con mas de un sinonimo posible se agrega aqui antes de usarlo en pantalla.

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
| 5xx, red o respuesta no JSON | No pudimos completar la accion. Revisa tu conexion e intentalo de nuevo; si sigue pasando, escribenos por WhatsApp al (numero de `src/config/contact.ts`). |

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
demostrativo de contact.ts. La ayuda se omite hasta tener WhatsApp real;
los mensajes compartidos de las otras pantallas no cambian en esta tarea.

## Validacion de contacto

`src/lib/validation/contact.ts` es el unico modulo de NIT y telefono (registro y
Configuracion): mismo patron que el backend, mismo largo maximo (25) y mismos mensajes. El NIT
se normaliza (sin puntos ni espacios) antes de validar y de enviar.
