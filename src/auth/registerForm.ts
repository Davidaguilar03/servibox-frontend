import type { RegisterRequest } from './authApi'

// Reglas del registro, espejo de TenantRegistrationService del backend. Ver 03-DECISIONS.md.

export interface RegisterValues {
  businessName: string
  nit: string
  phone: string
  slug: string
  adminFullName: string
  adminEmail: string
  adminUsername: string
  password: string
  acceptTerms: boolean
}

export type RegisterField = keyof RegisterValues

export type RegisterErrors = Partial<Record<RegisterField, string>>

export const EMPTY_REGISTER_VALUES: RegisterValues = {
  businessName: '',
  nit: '',
  phone: '',
  slug: '',
  adminFullName: '',
  adminEmail: '',
  adminUsername: '',
  password: '',
  acceptTerms: false,
}

export const SLUG_MAX_LENGTH = 30

/** Los mismos de `SLUGS_RESERVADOS` en el backend. */
export const RESERVED_SLUGS = new Set([
  'api', 'admin', 'www', 'app', 'login', 'registro', 'register', 'servibox', 'soporte',
  'static', 'assets', 'health',
  'auth', 'inventory', 'treasury', 'counterparties', 'sales', 'purchases', 'reporting', 'demo',
])

const NIT = /^\d+(-\d)?$/
const PHONE = /^[0-9 +()-]+$/
const SLUG = /^[a-z0-9-]{3,30}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME = /^[A-Za-z0-9._-]{3,50}$/

/**
 * Identificador sugerido a partir del nombre comercial: sin tildes ni enies, en minusculas,
 * todo lo que no sea letra o numero a un solo guion, sin guion al inicio ni al final y con
 * maximo 30 caracteres.
 */
export function suggestSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/, '')
}

/** Lo que escribe el usuario en el identificador: a minusculas y sin caracteres no permitidos. */
export function normalizeSlugInput(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, '')
}

function required(value: string, max: number, empty: string): string | undefined {
  const text = value.trim()
  if (!text) return empty
  if (text.length > max) return `Usa máximo ${max} caracteres.`
  return undefined
}

/** NIT tal como lo pega o escribe el usuario (`900.123.456-7`), sin puntos ni espacios. */
export function normalizeNit(value: string): string {
  return value.replace(/[.\s]/g, '')
}

/** Error de un NIT ya recortado y no vacio; lo comparten el registro y Configuracion. */
export function nitError(nit: string): string | undefined {
  if (nit.length > 25) return 'Usa máximo 25 caracteres.'
  if (!NIT.test(nit)) return 'Usa solo dígitos y, si quieres, un guion con el dígito de verificación. Por ejemplo, 900123456-7.'
  return undefined
}

/** Error de un telefono ya recortado y no vacio. */
export function phoneError(phone: string): string | undefined {
  if (phone.length > 25) return 'Usa máximo 25 caracteres.'
  if (!PHONE.test(phone)) return 'Usa solo dígitos, espacios, +, - y paréntesis.'
  return undefined
}

export function businessNameError(name: string): string | undefined {
  return required(name, 150, 'Escribe el nombre comercial.')
}

/** Un mensaje por campo con error, en la voz del manual. */
export function validateRegister(values: RegisterValues): RegisterErrors {
  const errors: RegisterErrors = {}

  errors.businessName = businessNameError(values.businessName)
  errors.nit = values.nit.trim() ? nitError(values.nit.trim()) : 'Escribe el NIT.'
  errors.phone = values.phone.trim() ? phoneError(values.phone.trim()) : 'Escribe el teléfono.'

  const slug = values.slug.trim()
  if (!slug) errors.slug = 'Escribe el identificador.'
  else if (!SLUG.test(slug)) errors.slug = 'Usa de 3 a 30 caracteres: minúsculas, números y guiones.'
  else if (slug.startsWith('-') || slug.endsWith('-')) errors.slug = 'Quita el guion del inicio o del final.'
  else if (RESERVED_SLUGS.has(slug)) errors.slug = 'Este identificador está reservado. Elige otro.'

  errors.adminFullName = required(values.adminFullName, 150, 'Escribe tu nombre completo.')

  errors.adminEmail = required(values.adminEmail, 150, 'Escribe tu correo.')
  if (!errors.adminEmail && !EMAIL.test(values.adminEmail.trim())) {
    errors.adminEmail = 'Escribe un correo válido, por ejemplo nombre@correo.com.'
  }

  const username = values.adminUsername.trim()
  if (!username) errors.adminUsername = 'Escribe un usuario.'
  else if (!USERNAME.test(username)) {
    errors.adminUsername = 'Usa de 3 a 50 caracteres: letras, números, punto, guion y guion bajo.'
  }

  // BCrypt usa solo 72 bytes: el backend tambien mide la contrasena en bytes UTF-8.
  const { password } = values
  if (!password) errors.password = 'Escribe una contraseña.'
  else if (password.length < 8) errors.password = 'Usa al menos 8 caracteres.'
  else if (password.length > 72 || new TextEncoder().encode(password).length > 72) {
    errors.password = 'Usa máximo 72 caracteres.'
  }

  if (!values.acceptTerms) errors.acceptTerms = 'Acepta los términos y condiciones para continuar.'

  for (const field of Object.keys(errors) as RegisterField[]) {
    if (!errors[field]) delete errors[field]
  }
  return errors
}

/** Cuerpo del POST: textos sin espacios a los lados, el slug en minusculas y la contrasena tal cual. */
export function toRegisterRequest(values: RegisterValues): RegisterRequest {
  return {
    businessName: values.businessName.trim(),
    nit: values.nit.trim(),
    phone: values.phone.trim(),
    slug: values.slug.trim().toLowerCase(),
    adminFullName: values.adminFullName.trim(),
    adminEmail: values.adminEmail.trim(),
    adminUsername: values.adminUsername.trim(),
    password: values.password,
    acceptTerms: true,
  }
}
