import { nitError, normalizeNit, phoneError } from '../lib/validation/contact'
import type { RegistrationRequestBody } from './authApi'

// Reglas de la solicitud de cuenta y de la activacion, espejo de TenantRegistrationService del
// backend (RegistrationRequestService y RegistrationActivationService las reutilizan). Ver 03-DECISIONS.md.

export interface RegisterValues {
  businessName: string
  nit: string
  phone: string
  slug: string
  adminFullName: string
  adminEmail: string
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
  acceptTerms: false,
}

export const SLUG_MAX_LENGTH = 30

/** Los mismos de `SLUGS_RESERVADOS` en el backend. */
export const RESERVED_SLUGS = new Set([
  'api', 'admin', 'www', 'app', 'login', 'registro', 'register', 'servibox', 'soporte',
  'static', 'assets', 'health',
  'auth', 'inventory', 'treasury', 'counterparties', 'sales', 'purchases', 'reporting', 'demo',
  'plataforma', 'activar',
])

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

export function businessNameError(name: string): string | undefined {
  return required(name, 150, 'Escribe el nombre comercial.')
}

/** Un mensaje por campo con error, en la voz del manual. */
export function validateRegister(values: RegisterValues): RegisterErrors {
  const errors: RegisterErrors = {}

  errors.businessName = businessNameError(values.businessName)
  // NIT y telefono: el modulo comun con Configuracion (lib/validation/contact.ts).
  errors.nit = nitError(values.nit)
  errors.phone = phoneError(values.phone)

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

  if (!values.acceptTerms) errors.acceptTerms = 'Acepta los términos de uso y el tratamiento de datos para continuar.'

  for (const field of Object.keys(errors) as RegisterField[]) {
    if (!errors[field]) delete errors[field]
  }
  return errors
}

/** Usuario del administrador, el que se crea al activar la cuenta. */
export function usernameError(value: string): string | undefined {
  const username = value.trim()
  if (!username) return 'Escribe un usuario.'
  if (!USERNAME.test(username)) return 'Usa de 3 a 50 caracteres: letras, números, punto, guion y guion bajo.'
  return undefined
}

/** BCrypt usa solo 72 bytes: el backend tambien mide la contrasena en bytes UTF-8. */
export function passwordError(password: string): string | undefined {
  if (!password) return 'Escribe una contraseña.'
  if (password.length < 8) return 'Usa al menos 8 caracteres.'
  if (password.length > 72 || new TextEncoder().encode(password).length > 72) return 'Usa máximo 72 caracteres.'
  return undefined
}

/** Cuerpo del POST: textos sin espacios a los lados, el NIT normalizado y el slug en minusculas. */
export function toRegisterRequest(values: RegisterValues): RegistrationRequestBody {
  return {
    businessName: values.businessName.trim(),
    nit: normalizeNit(values.nit),
    phone: values.phone.trim(),
    slug: values.slug.trim().toLowerCase(),
    adminFullName: values.adminFullName.trim(),
    adminEmail: values.adminEmail.trim(),
    acceptTerms: true,
  }
}
