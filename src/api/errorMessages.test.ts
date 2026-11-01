import { describe, expect, it } from 'vitest'
import { ApiError } from '../lib/api'
import { MESSAGES, mapBackendMessage, retryAfterText, userMessage } from './errorMessages'

const api = (message: string, status: number) => new ApiError(message, status)

/**
 * Mensajes que el backend puede enviar al usuario, copiados de servibox-backend/src/main
 * (excepciones con mensaje, GlobalExceptionHandler y JsonAuthenticationEntryPoint) con valores
 * de ejemplo en los parametricos. Cada uno debe pasar por el mapa con su texto final.
 */
const BACKEND: Array<[string, string]> = [
  // registration/RateLimitExceededException y auth/LoginThrottle (429 con Retry-After).
  ['Demasiadas solicitudes desde esta conexion, intenta de nuevo mas tarde', 'Recibimos demasiadas solicitudes desde esta conexión. Inténtalo de nuevo más tarde.'],
  ['Demasiados intentos de activacion, espera unos minutos e intenta de nuevo', 'Hiciste demasiados intentos de activación. Espera unos minutos e inténtalo de nuevo.'],
  ['Demasiados intentos de inicio de sesion, espera unos minutos e intenta de nuevo', 'Hiciste demasiados intentos de inicio de sesión. Espera unos minutos e inténtalo de nuevo.'],
  // registration/RegistrationRequestService y RegistrationRequestConflictException (solicitud publica).
  ['La clave de reintento es obligatoria', 'No pudimos enviar la solicitud. Inténtalo de nuevo.'],
  ['La clave de reintento no es valida', 'No pudimos enviar la solicitud. Inténtalo de nuevo.'],
  ['La clave de reintento ya se uso con otros datos', 'No pudimos confirmar el envío porque los datos cambiaron. Envía la solicitud de nuevo.'],
  ['La solicitud no admite contrasena', 'La solicitud no lleva contraseña: la creas al activar la cuenta.'],
  // registration/ActivationException.
  ['El enlace de activacion no es valido', 'El enlace de activación no es válido. Ábrelo de nuevo desde el correo, completo.'],
  ['El enlace de activacion vencio o fue reemplazado', 'El enlace de activación venció o fue reemplazado por uno más reciente. Usa el último correo que te enviamos.'],
  ['El enlace de activacion ya fue utilizado; inicia sesion', 'Este enlace de activación ya se usó. Inicia sesión con el código de tu serviteca.'],
  // platform/PlatformTenantService y PlatformTenantConflictException.
  ['Tenant no encontrado', 'No encontramos esta serviteca. Puede que ya no exista.'],
  ['Usuario no encontrado', 'No encontramos ese usuario en esta serviteca. Puede que ya no exista.'],
  ['El motivo de suspension es obligatorio', 'Escribe el motivo de la suspensión.'],
  ['El motivo no puede superar 500 caracteres', 'El motivo no puede superar 500 caracteres.'],
  ['El tenant ya esta suspendido', 'La serviteca ya estaba suspendida. Revisa los datos actualizados.'],
  ['El tenant ya esta activo', 'La serviteca ya estaba activa. Revisa los datos actualizados.'],
  // treasury/TreasuryService, validacion de color.
  ['El color debe tener el formato #RRGGBB', 'El color debe tener el formato #RRGGBB.'],
  ['El precio unitario admite como maximo dos decimales', 'El precio unitario admite como máximo dos decimales.'],
  // treasury/TreasuryService.editarCuenta
  ['El tipo de una cuenta no se puede cambiar', 'El tipo de una cuenta no se puede cambiar.'],
  ['Saldo insuficiente en Banco prueba: faltan $ 10.000 para cambiar el saldo inicial', 'Saldo insuficiente en Banco prueba: faltan $ 10.000 para cambiar el saldo inicial.'],
  ['Saldo insuficiente en Banco prueba: faltan $ 10.000,50 para cambiar el saldo inicial', 'Saldo insuficiente en Banco prueba: faltan $ 10.001 para cambiar el saldo inicial.'],
  // auth/TenantRegistrationService, auth/*Exception
  ['Debe aceptar los terminos y condiciones', 'Acepta los términos de uso y el tratamiento de datos para continuar.'],
  ['El NIT solo admite digitos y un guion con el digito de verificacion, por ejemplo 900123456-7', 'El NIT solo admite dígitos y un guion con el dígito de verificación, por ejemplo 900123456-7.'],
  ['El telefono solo admite digitos, espacios, +, - y parentesis', 'El teléfono solo admite dígitos, espacios, +, - y paréntesis.'],
  ['El correo del administrador no es valido', 'El correo del administrador no es válido.'],
  ['El correo del administrador no puede superar 150 caracteres', 'El correo del administrador no puede superar 150 caracteres.'],
  ['El identificador demo esta reservado', 'El código demo está reservado. Elige otro.'],
  ['El identificador debe tener de 3 a 30 caracteres con solo minusculas, numeros y guiones', 'El código debe tener de 3 a 30 caracteres: minúsculas, números y guiones.'],
  ['El identificador no puede empezar ni terminar en guion', 'El código no puede empezar ni terminar en guion.'],
  ['El usuario debe tener de 3 a 50 caracteres con letras, numeros, punto, guion y guion bajo', 'El usuario debe tener de 3 a 50 caracteres: letras, números, punto, guion y guion bajo.'],
  ['La contrasena debe tener al menos 8 caracteres', 'La contraseña debe tener al menos 8 caracteres.'],
  ['La contrasena no puede superar 72 caracteres', 'La contraseña no puede superar 72 caracteres.'],
  ['El nombre comercial es obligatorio', 'Escribe el nombre comercial.'],
  ['El NIT es obligatorio', 'Ingresa el NIT de tu serviteca.'],
  ['El telefono es obligatorio', 'Ingresa el teléfono de contacto.'],
  ['El nombre completo del administrador es obligatorio', 'Escribe el nombre completo del administrador.'],
  ['El telefono no puede superar 25 caracteres', 'El teléfono no puede superar 25 caracteres.'],
  ['Ya existe una serviteca con el identificador el-roble', 'Ya existe una serviteca con el código el-roble. Elige otro.'],
  ['El registro de nuevas servitecas esta deshabilitado', 'Por ahora no estamos creando servitecas nuevas. Intenta de nuevo más tarde.'],
  ['Credenciales invalidas', 'Revisa el código de tu serviteca, el usuario y la contraseña.'],
  ['No autenticado', MESSAGES.session],
  // tenant/AdminRequiredException, inventory/controller/InventoryController
  ['Solo un administrador puede editar los datos de la serviteca', 'Solo un administrador puede editar los datos de la serviteca.'],
  ['Solo un administrador puede editar la configuracion financiera', 'Solo un administrador puede editar la configuración financiera.'],
  // counterparties/service/CounterpartyService, *Exception
  ['El celular admite hasta 25 caracteres', 'El celular admite hasta 25 caracteres.'],
  ['El correo admite hasta 150 caracteres', 'El correo admite hasta 150 caracteres.'],
  ['El correo no tiene un formato valido', 'El correo no tiene un formato válido.'],
  ['El nombre o razon social admite hasta 150 caracteres', 'El nombre o razón social admite hasta 150 caracteres.'],
  ['El numero de documento admite hasta 25 caracteres', 'El número de documento admite hasta 25 caracteres.'],
  ['El tercero 900123456 es PROVEEDOR y una venta exige CLIENTE o AMBOS', 'El tercero con documento 900123456 es proveedor y no se puede usar en una venta.'],
  ['El tercero necesita un nombre o razon social', 'Escribe el nombre o razón social.'],
  ['El tercero necesita un numero de documento', 'Escribe el número de documento.'],
  ['El tercero necesita un tipo de documento', 'Elige el tipo de documento.'],
  ['El documento 222222222222 es del Consumidor final', 'El documento 222222222222 es del Consumidor final. Usa otro.'],
  ['Ya existe un tercero con el documento 900123456 como CLIENTE', 'Ya existe un cliente con el documento 900123456.'],
  ['Ya existe un tercero con el documento 900123456', 'Ya existe un tercero con el documento 900123456.'],
  ['El tercero Consumidor final es del sistema y no se puede editar', 'El Consumidor final es del sistema y no se puede editar.'],
  // inventory/service/InventoryService, *Exception
  ['Ya existe una categoria con el nombre LLANTAS', 'Ya existe una categoría con el nombre LLANTAS.'],
  ['Ya existe un producto con el codigo LL-001', 'Ya existe un producto con el código LL-001.'],
  ['El codigo del producto admite hasta 50 caracteres', 'El código del producto admite hasta 50 caracteres.'],
  ['El costo de compra no puede ser negativo', 'El costo de compra no puede ser negativo.'],
  ['El margen debe estar entre 0 y menos de 100%', 'El margen debe estar entre 0 y menos de 100 %.'],
  ['El nombre de la categoria admite hasta 100 caracteres', 'El nombre de la categoría admite hasta 100 caracteres.'],
  ['El umbral amarillo no puede ser negativo', 'El aviso de stock bajo no puede ser negativo.'],
  ['El umbral rojo no puede ser negativo', 'El aviso de stock crítico no puede ser negativo.'],
  ['El umbral rojo no puede superar al amarillo', 'El aviso de stock crítico no puede ser mayor que el de stock bajo.'],
  ['Impuesto no encontrado: 7', 'Uno de los impuestos elegidos ya no existe. Recarga e inténtalo de nuevo.'],
  ['La cantidad no puede ser negativa', 'La cantidad no puede ser negativa.'],
  ['La descripcion del producto admite hasta 255 caracteres', 'La descripción del producto admite hasta 255 caracteres.'],
  ['El codigo LL-001 no se puede cambiar: el producto ya tiene facturas de venta o de compra', 'El código LL-001 no se puede cambiar: el producto ya tiene facturas de venta o de compra.'],
  ['El tenant ya tiene una configuracion financiera; edita la existente en vez de crear otra', MESSAGES.conflict],
  // sales/service/SalesService, *Exception
  ['Ya existe una factura con el numero FV-0045', 'Ya existe una factura con el número FV-0045.'],
  ['Stock insuficiente para Llanta Michelin 175/70 R13: hay 4 y se piden 5', 'No hay stock suficiente de Llanta Michelin 175/70 R13: hay 4 unidades y se piden 5 unidades.'],
  ['Stock insuficiente para Aceite 20W50: hay 1 y se piden 2', 'No hay stock suficiente de Aceite 20W50: hay 1 unidad y se piden 2 unidades.'],
  ['El abono de 50000.0 excede el saldo pendiente de 30000.0', 'El abono de $ 50.000 supera el saldo pendiente de $ 30.000.'],
  ['El abono de 4000000.0 excede el saldo pendiente de 3706375.9000000004', 'El abono de $ 4.000.000 supera el saldo pendiente de $ 3.706.376.'],
  ['El monto del abono debe ser mayor a cero', 'El valor del abono debe ser mayor que cero.'],
  ['La factura FV-0045 ya esta anulada', 'La factura FV-0045 ya está anulada.'],
  ['La factura necesita un numero', 'La factura necesita un número.'],
  ['La fecha del abono (2026-10-26) no puede ser posterior a hoy (2026-10-25)', 'La fecha del abono (26/10/2026) no puede ser posterior a hoy (25/10/2026).'],
  ['La fecha del abono no puede ser anterior a la fecha de la factura', 'La fecha del abono no puede ser anterior a la fecha de la factura.'],
  ['Solo se puede abonar a una factura PENDIENTE, y esta esta PAGADA', 'Esta factura ya está pagada: no se le pueden registrar abonos.'],
  ['Solo se puede restaurar una factura ANULADA, y la FV-0045 esta PENDIENTE', 'La factura FV-0045 ya no está en la papelera: está pendiente.'],
  ['Una factura de contado necesita la cuenta donde entra el dinero', 'Elige la cuenta donde entra el dinero.'],
  ['Una factura necesita al menos una linea', 'Agrega al menos un producto.'],
  ['El precio de Llanta Michelin debe ser mayor a cero', 'El precio de Llanta Michelin debe ser mayor que cero.'],
  ['La cantidad de Llanta Michelin debe ser mayor a cero', 'La cantidad de Llanta Michelin debe ser mayor que cero.'],
  ['El vencimiento no puede ser anterior a la fecha de la factura', 'El vencimiento no puede ser anterior a la fecha de la factura.'],
  ['Una factura a credito necesita fecha de vencimiento', 'Una factura a crédito necesita fecha de vencimiento.'],
  // purchases/service/PurchasesService, *Exception
  ['Ya existe una factura de compra DO-4788 del proveedor Distrillantas del Oriente SAS', 'Ya existe la factura de compra DO-4788 de Distrillantas del Oriente SAS.'],
  ['Saldo insuficiente en Caja General: hay $ 300.000 y se requieren $ 397.938', 'Saldo insuficiente en Caja General: hay $ 300.000 y se necesitan $ 397.938.'],
  ['El monto del pago debe ser mayor a cero', 'El valor del pago debe ser mayor que cero.'],
  ['El pago de 400000.0 excede el saldo pendiente de 397938.28', 'El pago de $ 400.000 supera el saldo pendiente de $ 397.938.'],
  ['La compra DO-4788 ya esta anulada', 'La compra DO-4788 ya está anulada.'],
  ['La factura de compra necesita un numero', 'Escribe el número de la factura de compra.'],
  ['La fecha del pago (2026-10-26) no puede ser posterior a hoy (2026-10-25)', 'La fecha del pago (26/10/2026) no puede ser posterior a hoy (25/10/2026).'],
  ['La fecha del pago no puede ser anterior a la fecha de la factura', 'La fecha del pago no puede ser anterior a la fecha de la factura.'],
  [
    'No se puede anular la compra DO-4788: de Aceite 20W50 quedan 2 unidades y habria que quitar 5. Parte de ese stock ya se vendio.',
    'No se puede anular la compra DO-4788: de Aceite 20W50 quedan 2 unidades y habría que quitar 5 unidades. Parte de ese stock ya se vendió.',
  ],
  ['Solo se puede pagar una compra PENDIENTE, y esta esta PAGADA', 'Esta compra ya está pagada: no se le pueden registrar pagos.'],
  ['Solo se puede restaurar una compra ANULADA, y la DO-4788 esta PAGADA', 'La compra DO-4788 ya no está en la papelera: está pagada.'],
  ['Una compra de contado necesita la cuenta de la que sale el dinero', 'Elige la cuenta de la que sale el dinero.'],
  ['Una compra necesita un proveedor (supplierId)', 'Elige el proveedor.'],
  ['Una factura de compra necesita al menos una linea', 'Agrega al menos un producto.'],
  // treasury/service/TreasuryService, treasury/controller/TreasuryController, *Exception
  ['Ya existe una cuenta con el nombre Bancolombia', 'Ya existe una cuenta con el nombre Bancolombia.'],
  ['El concepto admite hasta 255 caracteres', 'El concepto admite hasta 255 caracteres.'],
  ['El monto del movimiento debe ser mayor a cero', 'El monto debe ser mayor que cero.'],
  ['El movimiento necesita una cuenta', 'Elige la cuenta.'],
  ['Las notas admiten hasta 255 caracteres', 'Las observaciones admiten hasta 255 caracteres.'],
  ['El movimiento 12 es de categoria RECAUDO_VENTA y se gestiona desde su operacion', 'Este movimiento se gestiona desde su factura o su transferencia.'],
  ['La categoria de un movimiento no se puede cambiar: el 12 es GASTO_OPERATIVO', 'Este movimiento no se puede cambiar de tipo.'],
  ['El monto de la transferencia debe ser mayor a cero', 'El monto de la transferencia debe ser mayor que cero.'],
  ['La cuenta origen y la cuenta destino no pueden ser la misma', 'La cuenta de origen y la de destino no pueden ser la misma.'],
  ['La transferencia necesita cuenta origen y cuenta destino', 'Elige la cuenta de origen y la de destino.'],
  // reporting/service/ReportExportService, ReportingService
  ['El rango de un reporte no puede pasar de 366 dias', 'El período de un reporte no puede pasar de 366 días.'],
  ['El reporte tiene mas de 20000 movimientos: acota el rango de fechas', 'El reporte tiene más de 20.000 movimientos: acorta el período.'],
  ['El rango necesita fecha desde y fecha hasta', 'Elige las fechas Desde y Hasta.'],
  ['La fecha desde no puede ser posterior a la fecha hasta', 'Hasta no puede ser anterior a Desde.'],
  // shared/ResourceNotFoundException (servicios), GlobalExceptionHandler
  ['Factura no encontrada: 999', 'No encontramos esa factura. Puede que ya no exista.'],
  ['Producto no encontrado: 9', 'No encontramos ese producto. Puede que ya no exista.'],
  ['Recurso no encontrado', MESSAGES.notFound],
  ['El recurso esta siendo modificado por otra operacion, intenta de nuevo', 'Alguien más está modificando esto. Inténtalo de nuevo en un momento.'],
]

/** Mensajes tecnicos del backend que quedan en el texto de su estado (no se muestran crudos). */
const FALLBACK: Array<[string, number, string]> = [
  ['Peticion invalida', 400, MESSAGES.invalid],
  ['El rol de un tercero nuevo es CLIENTE o PROVEEDOR', 400, MESSAGES.invalid],
  ['El tercero necesita un rol', 400, 'El tercero necesita un rol.'],
  ['Falta el parametro format: PDF o XLSX', 400, MESSAGES.invalid],
  ['accountId solo aplica al reporte MOVIMIENTOS', 400, MESSAGES.invalid],
  ['Un movimiento necesita tipo y categoria', 400, MESSAGES.invalid],
  ["Valor invalido 'X' en el campo paymentType. Valores permitidos: CONTADO, CREDITO", 400, MESSAGES.invalid],
  ['El cuerpo de la peticion no es un JSON valido o un campo tiene un valor del tipo equivocado', 400, MESSAGES.invalid],
  ['No se puede persistir una entidad sin un tenant activo en el contexto', 400, MESSAGES.invalid],
  ['Error interno del servidor', 500, MESSAGES.network],
]

describe('mapa de mensajes del backend', () => {
  it.each(BACKEND)('%s', (message, expected) => {
    expect(mapBackendMessage(message)).toBe(expected)
  })

  it.each(FALLBACK)('%s (%i) cae en el texto de su estado', (message, status, expected) => {
    expect(userMessage(api(message, status))).toBe(expected)
  })

  it('las cifras crudas salen con formato de pesos y los textos sin tildes, con tildes', () => {
    expect(userMessage(api('El abono de 50000.0 excede el saldo pendiente de 30000.0', 400))).toBe(
      'El abono de $ 50.000 supera el saldo pendiente de $ 30.000.',
    )
    for (const [message] of BACKEND) {
      expect(userMessage(api(message, 400))).not.toMatch(/\d\.\d(?!\d\d)|\b(?:numero|codigo|categoria|telefono|valido|esta reservado)\b/)
    }
  })
})

describe('texto por estado HTTP', () => {
  it('edicion de cuentas conserva nombre y moneda formateada en userMessage', () => {
    expect(userMessage(api('El tipo de una cuenta no se puede cambiar', 400))).toBe('El tipo de una cuenta no se puede cambiar.')
    expect(userMessage(api('Saldo insuficiente en Mi cuenta: faltan $ 10.000 para cambiar el saldo inicial', 409)))
      .toBe('Saldo insuficiente en Mi cuenta: faltan $ 10.000 para cambiar el saldo inicial.')
    expect(userMessage(api('Saldo insuficiente en Mi cuenta: faltan 10000.0 para cambiar el saldo inicial', 409)))
      .toBe('Saldo insuficiente en Mi cuenta: faltan $ 10.000 para cambiar el saldo inicial.')
  })
  it('el contexto de servitecas nombra la serviteca en los mensajes compartidos con Solicitudes', () => {
    expect(userMessage(api('El recurso cambio; actualiza e intenta de nuevo', 409), 'tenant')).toBe('La serviteca cambió mientras la revisabas. Revisa los datos actualizados antes de confirmar.')
    expect(userMessage(api('La version esperada es obligatoria', 400), 'tenant')).toBe('Actualiza la serviteca antes de continuar.')
    expect(userMessage(api('El recurso cambio; actualiza e intenta de nuevo', 409))).toBe('La solicitud cambió mientras la revisabas. Actualízala antes de continuar.')
    expect(userMessage(api('Tenant no encontrado', 404), 'tenant')).toBe('No encontramos esta serviteca. Puede que ya no exista.')
  })

  it('400 usa el mensaje corto y legible del backend o el generico', () => {
    expect(userMessage(api('el nombre ya se usa', 400))).toBe('El nombre ya se usa.')
    expect(userMessage(api('Valor 12.5 fuera de rango', 400))).toBe(MESSAGES.invalid)
    expect(userMessage(api('x'.repeat(200), 400))).toBe(MESSAGES.invalid)
  })

  it('401, 403, 404, 409, 5xx y sin red', () => {
    expect(userMessage(api('cualquier cosa', 401))).toBe('Tu sesión venció. Inicia sesión de nuevo.')
    expect(userMessage(api('Forbidden', 403))).toBe('No tienes permiso para hacer esto.')
    expect(userMessage(api('Not Found', 404))).toBe('No encontramos lo que buscas. Puede que ya no exista.')
    expect(userMessage(api('Conflict', 409))).toBe('Esto cambió mientras lo editabas. Recarga e inténtalo de nuevo.')
    expect(userMessage(api('Bad Gateway', 502))).toBe(MESSAGES.network)
    expect(userMessage(new TypeError('Failed to fetch'))).toBe(MESSAGES.network)
    // Sin WhatsApp definido en contact.ts el mensaje de red invita al correo real.
    expect(MESSAGES.network).toBe('No pudimos completar la acción. Revisa tu conexión e inténtalo de nuevo; si sigue pasando, escríbenos a hola@servibox.co.')
  })

  it('el contexto de la solicitud y de la activacion le habla a quien pide la cuenta', () => {
    expect(userMessage(api('El codigo solicitado no esta disponible', 409), 'registration')).toBe('Este código ya no está disponible. Elige otro.')
    expect(userMessage(api('El codigo solicitado no esta disponible', 409), 'activation'))
      .toBe('El código de serviteca de tu solicitud ya no está disponible. Escríbenos a hola@servibox.co para revisarla.')
    expect(userMessage(api('La solicitud ya no permite esta operacion', 409), 'activation'))
      .toBe('Esta solicitud ya no se puede activar. Escríbenos a hola@servibox.co para revisarla.')
    // Plataforma conserva sus textos.
    expect(userMessage(api('El codigo solicitado no esta disponible', 409))).toBe('El código solicitado ya no está disponible. Actualiza la solicitud.')
  })

  it('429 muestra el mensaje del backend y, con Retry-After, el tiempo de espera', () => {
    const login = 'Demasiados intentos de inicio de sesion, espera unos minutos e intenta de nuevo'
    const mapped = 'Hiciste demasiados intentos de inicio de sesión. Espera unos minutos e inténtalo de nuevo.'
    expect(userMessage(api(login, 429))).toBe(mapped)
    expect(userMessage(new ApiError(login, 429, 898))).toBe(`${mapped} Podrás intentarlo de nuevo en 15 minutos.`)
    expect(userMessage(api('Too Many Requests', 429))).toBe(MESSAGES.tooMany)
  })

  it('el tiempo de espera se redondea hacia arriba en segundos, minutos u horas', () => {
    expect(retryAfterText(1)).toBe('Podrás intentarlo de nuevo en 1 segundo.')
    expect(retryAfterText(30)).toBe('Podrás intentarlo de nuevo en 30 segundos.')
    expect(retryAfterText(60)).toBe('Podrás intentarlo de nuevo en 1 minuto.')
    expect(retryAfterText(61)).toBe('Podrás intentarlo de nuevo en 2 minutos.')
    expect(retryAfterText(900)).toBe('Podrás intentarlo de nuevo en 15 minutos.')
    expect(retryAfterText(3600)).toBe('Podrás intentarlo de nuevo en 1 hora.')
    expect(retryAfterText(5400)).toBe('Podrás intentarlo de nuevo en 90 minutos.')
    expect(retryAfterText(7200)).toBe('Podrás intentarlo de nuevo en 2 horas.')
  })

  it('nunca muestra JSON, trazas, clases ni ingles', () => {
    for (const message of ['{"error":"x"}', 'java.lang.NullPointerException', 'Internal Server Error', 'Bad Request']) {
      expect(userMessage(api(message, 400))).toBe(MESSAGES.invalid)
    }
  })
})
