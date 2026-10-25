// NIT y telefono de la serviteca: una sola regla para el registro y Configuracion, la misma del
// backend (TenantRegistrationService.validarNit y validarTelefono).

/** Largo maximo de NIT y telefono en el backend. */
export const CONTACT_MAX_LENGTH = 25

/** Digitos y, opcional, un guion con el digito de verificacion. */
export const NIT_PATTERN = /^\d+(-\d)?$/
export const PHONE_PATTERN = /^[0-9 +()-]+$/

export const NIT_REQUIRED_MESSAGE = 'Ingresa el NIT de tu serviteca.'
export const PHONE_REQUIRED_MESSAGE = 'Ingresa el teléfono de contacto.'
export const CONTACT_TOO_LONG_MESSAGE = 'El NIT y el teléfono no pueden superar 25 caracteres.'
export const NIT_FORMAT_MESSAGE = 'El NIT solo admite dígitos y un guion con el dígito de verificación, por ejemplo 900123456-7.'
export const PHONE_FORMAT_MESSAGE = 'El teléfono solo admite dígitos, espacios, +, - y paréntesis.'

/** NIT tal como lo pega o escribe el usuario (`900.123.456-7`), sin puntos ni espacios. */
export function normalizeNit(value: string): string {
  return value.replace(/[.\s]/g, '')
}

/** Error del NIT escrito (se valida ya normalizado); undefined si esta bien. */
export function nitError(value: string): string | undefined {
  const nit = normalizeNit(value)
  if (!nit) return NIT_REQUIRED_MESSAGE
  if (nit.length > CONTACT_MAX_LENGTH) return CONTACT_TOO_LONG_MESSAGE
  if (!NIT_PATTERN.test(nit)) return NIT_FORMAT_MESSAGE
  return undefined
}

/** Error del telefono escrito (se valida recortado); undefined si esta bien. */
export function phoneError(value: string): string | undefined {
  const phone = value.trim()
  if (!phone) return PHONE_REQUIRED_MESSAGE
  if (phone.length > CONTACT_MAX_LENGTH) return CONTACT_TOO_LONG_MESSAGE
  if (!PHONE_PATTERN.test(phone)) return PHONE_FORMAT_MESSAGE
  return undefined
}
