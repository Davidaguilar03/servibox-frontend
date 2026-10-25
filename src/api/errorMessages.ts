import { WHATSAPP_DISPLAY } from '../config/contact'
import { ApiError } from '../lib/api'
import { formatCurrency, formatDate } from '../lib/format'
import { NIT_FORMAT_MESSAGE, PHONE_FORMAT_MESSAGE } from '../lib/validation/contact'

// Texto para el usuario de cualquier error: mapa de los mensajes del backend (que llegan sin
// tildes, con cifras crudas o con nombres tecnicos) y textos por estado HTTP. Como agregar
// uno nuevo: docs/ai-context/06-COPY.md.

export const MESSAGES = {
  invalid: 'Revisa los datos e inténtalo de nuevo.',
  session: 'Tu sesión venció. Inicia sesión de nuevo.',
  forbidden: 'No tienes permiso para hacer esto.',
  notFound: 'No encontramos lo que buscas. Puede que ya no exista.',
  conflict: 'Esto cambió mientras lo editabas. Recarga e inténtalo de nuevo.',
  network: `No pudimos completar la acción. Revisa tu conexión e inténtalo de nuevo; si sigue pasando, escríbenos por WhatsApp al ${WHATSAPP_DISPLAY}.`,
} as const

const STATUS_LABELS: Record<string, string> = { PENDIENTE: 'pendiente', PAGADA: 'pagada', ANULADA: 'anulada' }
const ROLE_LABELS: Record<string, string> = { CLIENTE: 'cliente', PROVEEDOR: 'proveedor', AMBOS: 'cliente y proveedor' }
const NOUNS: Record<string, string> = {
  Categoria: 'esa categoría',
  Compra: 'esa compra',
  Cuenta: 'esa cuenta',
  Factura: 'esa factura',
  Movimiento: 'ese movimiento',
  Producto: 'ese producto',
  Tercero: 'ese tercero',
}

/** Monto crudo del backend ("50000.0", "3706375.9000000004") con formato de pesos. */
const money = (raw: string) => formatCurrency(Number(raw))
/** Ya con formato ("$ 300.000") se deja; crudo ("100.0") se formatea. */
const pesos = (raw: string) => (raw.includes('$') ? raw : money(raw))
const units = (raw: string) => `${Number(raw)} ${Math.abs(Number(raw)) === 1 ? 'unidad' : 'unidades'}`
const thousands = (raw: string) => Number(raw).toLocaleString('es-CO')

type Rule = [RegExp, string | ((...groups: string[]) => string)]

/**
 * Mensajes conocidos del backend (servibox-backend, src/main: excepciones con mensaje y
 * GlobalExceptionHandler). Los parametricos con expresion regular. Las pruebas
 * (errorMessages.test.ts) tienen la lista de origen.
 */
const RULES: Rule[] = [
  // Registro y sesion.
  [/^Debe aceptar los terminos y condiciones$/, 'Acepta los términos de uso y el tratamiento de datos para continuar.'],
  [/^El NIT solo admite digitos/, NIT_FORMAT_MESSAGE],
  [/^El telefono solo admite digitos/, PHONE_FORMAT_MESSAGE],
  [/^El correo del administrador no es valido$/, 'El correo del administrador no es válido.'],
  [/^El correo del administrador no puede superar (\d+) caracteres$/, (n) => `El correo del administrador no puede superar ${n} caracteres.`],
  [/^El identificador (\S+) esta reservado$/, (slug) => `El código ${slug} está reservado. Elige otro.`],
  [/^El identificador debe tener de 3 a 30 caracteres/, 'El código debe tener de 3 a 30 caracteres: minúsculas, números y guiones.'],
  [/^El identificador no puede empezar ni terminar en guion$/, 'El código no puede empezar ni terminar en guion.'],
  [/^El usuario debe tener de 3 a 50 caracteres/, 'El usuario debe tener de 3 a 50 caracteres: letras, números, punto, guion y guion bajo.'],
  [/^La contrasena debe tener al menos (\d+) caracteres$/, (n) => `La contraseña debe tener al menos ${n} caracteres.`],
  [/^La contrasena no puede superar (\d+) caracteres$/, (n) => `La contraseña no puede superar ${n} caracteres.`],
  [/^El nombre comercial es obligatorio$/, 'Escribe el nombre comercial.'],
  [/^El NIT es obligatorio$/, 'Ingresa el NIT de tu serviteca.'],
  [/^El telefono es obligatorio$/, 'Ingresa el teléfono de contacto.'],
  [/^El nombre completo del administrador es obligatorio$/, 'Escribe el nombre completo del administrador.'],
  [/^(El nombre comercial|El NIT|El telefono|El nombre completo del administrador) no puede superar (\d+) caracteres$/, (field, n) =>
    `${field.replace('telefono', 'teléfono')} no puede superar ${n} caracteres.`],
  [/^Ya existe una serviteca con el identificador (\S+)$/, (slug) => `Ya existe una serviteca con el código ${slug}. Elige otro.`],
  [/^El registro de nuevas servitecas esta deshabilitado$/, 'Por ahora no estamos creando servitecas nuevas. Intenta de nuevo más tarde.'],
  [/^Credenciales invalidas$/, 'Revisa el código de tu serviteca, el usuario y la contraseña.'],
  [/^No autenticado$/, MESSAGES.session],
  [/^Solo un administrador puede editar la configuracion financiera$/, 'Solo un administrador puede editar la configuración financiera.'],
  [/^Solo un administrador puede editar los datos de la serviteca$/, 'Solo un administrador puede editar los datos de la serviteca.'],

  // Terceros.
  [/^El celular admite hasta (\d+) caracteres$/, (n) => `El celular admite hasta ${n} caracteres.`],
  [/^El correo admite hasta (\d+) caracteres$/, (n) => `El correo admite hasta ${n} caracteres.`],
  [/^El correo no tiene un formato valido$/, 'El correo no tiene un formato válido.'],
  [/^El nombre o razon social admite hasta (\d+) caracteres$/, (n) => `El nombre o razón social admite hasta ${n} caracteres.`],
  [/^El numero de documento admite hasta (\d+) caracteres$/, (n) => `El número de documento admite hasta ${n} caracteres.`],
  [/^El tercero (\S+) es (\w+) y una (venta|compra) exige \w+ o AMBOS$/, (doc, role, operation) =>
    `El tercero con documento ${doc} es ${ROLE_LABELS[role] ?? role.toLowerCase()} y no se puede usar en una ${operation}.`],
  [/^El tercero necesita un nombre o razon social$/, 'Escribe el nombre o razón social.'],
  [/^El tercero necesita un numero de documento$/, 'Escribe el número de documento.'],
  [/^El tercero necesita un tipo de documento$/, 'Elige el tipo de documento.'],
  [/^El documento (\S+) es del Consumidor final$/, (doc) => `El documento ${doc} es del Consumidor final. Usa otro.`],
  [/^Ya existe un tercero con el documento (\S+) como (\w+)$/, (doc, role) => `Ya existe un ${ROLE_LABELS[role] ?? 'tercero'} con el documento ${doc}.`],
  [/^Ya existe un tercero con el documento (\S+)$/, (doc) => `Ya existe un tercero con el documento ${doc}.`],
  [/^El tercero Consumidor final es del sistema y no se puede editar$/, 'El Consumidor final es del sistema y no se puede editar.'],

  // Inventario.
  [/^Ya existe una categoria con el nombre (.+)$/, (name) => `Ya existe una categoría con el nombre ${name}.`],
  [/^Ya existe un producto con el codigo (.+)$/, (code) => `Ya existe un producto con el código ${code}.`],
  [/^El codigo del producto admite hasta (\d+) caracteres$/, (n) => `El código del producto admite hasta ${n} caracteres.`],
  [/^El costo de compra no puede ser negativo$/, 'El costo de compra no puede ser negativo.'],
  [/^El margen debe estar entre 0 y menos de 100%$/, 'El margen debe estar entre 0 y menos de 100 %.'],
  [/^El nombre de la categoria admite hasta (\d+) caracteres$/, (n) => `El nombre de la categoría admite hasta ${n} caracteres.`],
  [/^El umbral amarillo no puede ser negativo$/, 'El aviso de stock bajo no puede ser negativo.'],
  [/^El umbral rojo no puede ser negativo$/, 'El aviso de stock crítico no puede ser negativo.'],
  [/^El umbral rojo no puede superar al amarillo$/, 'El aviso de stock crítico no puede ser mayor que el de stock bajo.'],
  [/^Impuesto no encontrado: \d+$/, 'Uno de los impuestos elegidos ya no existe. Recarga e inténtalo de nuevo.'],
  [/^La cantidad no puede ser negativa$/, 'La cantidad no puede ser negativa.'],
  [/^La descripcion del producto admite hasta (\d+) caracteres$/, (n) => `La descripción del producto admite hasta ${n} caracteres.`],
  [/^El codigo (.+) no se puede cambiar: el producto ya tiene facturas de venta o de compra$/, (code) =>
    `El código ${code} no se puede cambiar: el producto ya tiene facturas de venta o de compra.`],
  [/^El tenant ya tiene una configuracion financiera/, MESSAGES.conflict],

  // Ventas.
  [/^Ya existe una factura con el numero (\S+)$/, (number) => `Ya existe una factura con el número ${number}.`],
  [/^Stock insuficiente para (.+): hay (-?\d+) y se piden (\d+)$/, (product, have, want) =>
    `No hay stock suficiente de ${product}: hay ${units(have)} y se piden ${units(want)}.`],
  [/^El abono de ([\d.E-]+) excede el saldo pendiente de ([\d.E-]+)$/, (amount, pending) =>
    `El abono de ${money(amount)} supera el saldo pendiente de ${money(pending)}.`],
  [/^El monto del abono debe ser mayor a cero$/, 'El valor del abono debe ser mayor que cero.'],
  [/^La factura (\S+) ya esta anulada$/, (number) => `La factura ${number} ya está anulada.`],
  [/^La factura necesita un numero$/, 'La factura necesita un número.'],
  [/^La fecha del abono \((\S+)\) no puede ser posterior a hoy \((\S+)\)$/, (date, today) =>
    `La fecha del abono (${formatDate(date)}) no puede ser posterior a hoy (${formatDate(today)}).`],
  [/^La fecha del abono no puede ser anterior a la fecha de la factura$/, 'La fecha del abono no puede ser anterior a la fecha de la factura.'],
  [/^Solo se puede abonar a una factura PENDIENTE, y esta esta (\w+)$/, (status) =>
    `Esta factura ya está ${STATUS_LABELS[status] ?? status.toLowerCase()}: no se le pueden registrar abonos.`],
  [/^Solo se puede restaurar una factura ANULADA, y la (\S+) esta (\w+)$/, (number, status) =>
    `La factura ${number} ya no está en la papelera: está ${STATUS_LABELS[status] ?? status.toLowerCase()}.`],
  [/^Una factura de contado necesita la cuenta donde entra el dinero$/, 'Elige la cuenta donde entra el dinero.'],
  [/^Una factura necesita al menos una linea$/, 'Agrega al menos un producto.'],

  // Ventas y compras.
  [/^El precio de (.+) debe ser mayor a cero$/, (product) => `El precio de ${product} debe ser mayor que cero.`],
  [/^La cantidad de (.+) debe ser mayor a cero$/, (product) => `La cantidad de ${product} debe ser mayor que cero.`],
  [/^El vencimiento no puede ser anterior a la fecha de la factura$/, 'El vencimiento no puede ser anterior a la fecha de la factura.'],
  [/^Una factura a credito necesita fecha de vencimiento$/, 'Una factura a crédito necesita fecha de vencimiento.'],

  // Compras.
  [/^Ya existe una factura de compra (\S+) del proveedor (.+)$/, (number, supplier) => `Ya existe la factura de compra ${number} de ${supplier}.`],
  [/^Saldo insuficiente en (.+): hay (.+?) y se requieren (.+)$/, (account, have, need) =>
    `Saldo insuficiente en ${account}: hay ${pesos(have)} y se necesitan ${pesos(need)}.`],
  [/^El monto del pago debe ser mayor a cero$/, 'El valor del pago debe ser mayor que cero.'],
  [/^El pago de ([\d.E-]+) excede el saldo pendiente de ([\d.E-]+)$/, (amount, pending) =>
    `El pago de ${money(amount)} supera el saldo pendiente de ${money(pending)}.`],
  [/^La compra (\S+) ya esta anulada$/, (number) => `La compra ${number} ya está anulada.`],
  [/^La factura de compra necesita un numero$/, 'Escribe el número de la factura de compra.'],
  [/^La fecha del pago \((\S+)\) no puede ser posterior a hoy \((\S+)\)$/, (date, today) =>
    `La fecha del pago (${formatDate(date)}) no puede ser posterior a hoy (${formatDate(today)}).`],
  [/^La fecha del pago no puede ser anterior a la fecha de la factura$/, 'La fecha del pago no puede ser anterior a la fecha de la factura.'],
  [/^No se puede anular la compra (\S+): de (.+) quedan (-?\d+) unidades y habria que quitar (\d+)\. Parte de ese stock ya se vendio\.$/, (number, product, have, remove) =>
    `No se puede anular la compra ${number}: de ${product} quedan ${units(have)} y habría que quitar ${units(remove)}. Parte de ese stock ya se vendió.`],
  [/^Solo se puede pagar una compra PENDIENTE, y esta esta (\w+)$/, (status) =>
    `Esta compra ya está ${STATUS_LABELS[status] ?? status.toLowerCase()}: no se le pueden registrar pagos.`],
  [/^Solo se puede restaurar una compra ANULADA, y la (\S+) esta (\w+)$/, (number, status) =>
    `La compra ${number} ya no está en la papelera: está ${STATUS_LABELS[status] ?? status.toLowerCase()}.`],
  [/^Una compra de contado necesita la cuenta de la que sale el dinero$/, 'Elige la cuenta de la que sale el dinero.'],
  [/^Una compra necesita un proveedor/, 'Elige el proveedor.'],
  [/^Una factura de compra necesita al menos una linea$/, 'Agrega al menos un producto.'],

  // Cuentas y movimientos.
  [/^El tipo de una cuenta no se puede cambiar$/, 'El tipo de una cuenta no se puede cambiar.'],
  [/^Saldo insuficiente en (.+): faltan (.+) para cambiar el saldo inicial$/, (account, amount) =>
    `Saldo insuficiente en ${account}: faltan ${pesos(amount)} para cambiar el saldo inicial.`],
  [/^Ya existe una cuenta con el nombre (.+)$/, (name) => `Ya existe una cuenta con el nombre ${name}.`],
  [/^El concepto admite hasta (\d+) caracteres$/, (n) => `El concepto admite hasta ${n} caracteres.`],
  [/^El monto del movimiento debe ser mayor a cero$/, 'El monto debe ser mayor que cero.'],
  [/^El movimiento necesita una cuenta$/, 'Elige la cuenta.'],
  [/^Las notas admiten hasta (\d+) caracteres$/, (n) => `Las observaciones admiten hasta ${n} caracteres.`],
  [/^El movimiento \d+ es de categoria \w+ y se gestiona desde su operacion$/, 'Este movimiento se gestiona desde su factura o su transferencia.'],
  [/^La categoria de un movimiento no se puede cambiar/, 'Este movimiento no se puede cambiar de tipo.'],
  [/^El monto de la transferencia debe ser mayor a cero$/, 'El monto de la transferencia debe ser mayor que cero.'],
  [/^La cuenta origen y la cuenta destino no pueden ser la misma$/, 'La cuenta de origen y la de destino no pueden ser la misma.'],
  [/^La transferencia necesita cuenta origen y cuenta destino$/, 'Elige la cuenta de origen y la de destino.'],

  // Reportes.
  [/^El rango de un reporte no puede pasar de (\d+) dias$/, (n) => `El período de un reporte no puede pasar de ${n} días.`],
  [/^El reporte tiene mas de (\d+) movimientos: acota el rango de fechas$/, (n) =>
    `El reporte tiene más de ${thousands(n)} movimientos: acorta el período.`],
  [/^El rango necesita fecha desde y fecha hasta$/, 'Elige las fechas Desde y Hasta.'],
  [/^La fecha desde no puede ser posterior a la fecha hasta$/, 'Hasta no puede ser anterior a Desde.'],

  // No encontrado, bloqueos y errores generales.
  [/^(Categoria|Compra|Cuenta|Factura|Movimiento|Producto|Tercero) no encontrad[ao]: \d+$/, (noun) =>
    `No encontramos ${NOUNS[noun] ?? 'lo que buscas'}. Puede que ya no exista.`],
  [/^Recurso no encontrado$/, MESSAGES.notFound],
  [/^El recurso esta siendo modificado por otra operacion/, 'Alguien más está modificando esto. Inténtalo de nuevo en un momento.'],
]

/** Palabras que delatan un texto sin tildes o en ingles: ese texto no se muestra crudo. */
const UNREADABLE_WORDS =
  /\b(?:peticion|categoria|invalid[oa]|valid[oa]|numero|codigo|telefono|descripcion|operacion|parametro|sesion|credito|debito|dias|internal|server|error|bad|request|not|found|forbidden|conflict|unauthorized)\b/i

/** Un mensaje del backend que se puede mostrar tal cual: corto, sin cifras crudas ni nombres tecnicos. */
function readable(message: string): string | null {
  const text = message.trim()
  if (!text || text.length > 140) return null
  if (/\d+\.\d|\bnull\b|undefined|NaN|JSON|tenant|Exception|[A-Z]{4,}|[a-z][A-Z]|_|\{|\}|\bid\b/.test(text)) return null
  if (UNREADABLE_WORDS.test(text)) return null
  const sentence = text[0]!.toUpperCase() + text.slice(1)
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`
}

/** El mensaje del backend pasado por el mapa; null si no es uno conocido. */
export function mapBackendMessage(message: string): string | null {
  for (const [pattern, output] of RULES) {
    const match = pattern.exec(message.trim())
    if (match) return typeof output === 'string' ? output : output(...match.slice(1))
  }
  return null
}

/**
 * Texto para el usuario de cualquier error. Nunca muestra JSON, trazas, nombres de clases ni
 * textos en ingles: lo desconocido cae en el texto de su estado HTTP.
 */
export function userMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return MESSAGES.network
  const mapped = mapBackendMessage(error.message)
  switch (error.status) {
    case 400:
      return mapped ?? readable(error.message) ?? MESSAGES.invalid
    case 401:
      return mapped ?? MESSAGES.session
    case 403:
      return mapped ?? MESSAGES.forbidden
    case 404:
      return mapped ?? MESSAGES.notFound
    case 409:
      return mapped ?? MESSAGES.conflict
    default:
      return error.status >= 500 ? MESSAGES.network : (mapped ?? MESSAGES.invalid)
  }
}
