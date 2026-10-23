import type { Counterparty, CounterpartyRequest, DocumentType } from '../sales/salesApi'
import type { CounterpartyUpdateRequest } from './counterpartiesApi'
import { CONSUMIDOR_FINAL_DOCUMENT } from './counterpartyList'

// Formulario de crear y editar un tercero. Longitudes de la entidad Counterparty del backend.

export const NAME_MAX = 150
export const DOCUMENT_MAX = 25
export const EMAIL_MAX = 150
export const PHONE_MAX = 25

/** Los valores del enum DocumentType del backend, con su rotulo. */
export const DOCUMENT_TYPE_OPTIONS: Array<{ value: DocumentType; label: string }> = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'NIT', label: 'NIT' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'RUT', label: 'RUT' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
]

export const RESERVED_DOCUMENT_MESSAGE = 'Ese número es del Consumidor final'

export interface CounterpartyFormValues {
  name: string
  documentType: DocumentType
  documentNumber: string
  email: string
  phone: string
}

export type CounterpartyFormErrors = Partial<Record<keyof CounterpartyFormValues, string>>

export function emptyCounterpartyForm(): CounterpartyFormValues {
  return { name: '', documentType: 'CC', documentNumber: '', email: '', phone: '' }
}

export function formFromCounterparty(counterparty: Counterparty): CounterpartyFormValues {
  return {
    name: counterparty.name,
    documentType: counterparty.documentType,
    documentNumber: counterparty.documentNumber,
    email: counterparty.email ?? '',
    phone: counterparty.phone ?? '',
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[0-9+\-() ]+$/

/**
 * Reglas del backend (obligatorios y longitudes) mas dos del cliente: el formato del correo y
 * de los caracteres del celular, y el documento del Consumidor final, que el backend todavia
 * no reserva y que en un alta de proveedor lo convertiria en AMBOS.
 */
export function validateCounterpartyForm(values: CounterpartyFormValues): CounterpartyFormErrors {
  const errors: CounterpartyFormErrors = {}
  const name = values.name.trim()
  const documentNumber = values.documentNumber.trim()
  const email = values.email.trim()
  const phone = values.phone.trim()
  if (!name) errors.name = 'Escribe el nombre o la razón social.'
  else if (name.length > NAME_MAX) errors.name = `Usa hasta ${NAME_MAX} caracteres.`
  if (!documentNumber) errors.documentNumber = 'Escribe el número de documento.'
  else if (documentNumber.length > DOCUMENT_MAX) errors.documentNumber = `Usa hasta ${DOCUMENT_MAX} caracteres.`
  else if (documentNumber === CONSUMIDOR_FINAL_DOCUMENT) errors.documentNumber = RESERVED_DOCUMENT_MESSAGE
  if (email.length > EMAIL_MAX) errors.email = `Usa hasta ${EMAIL_MAX} caracteres.`
  else if (email && !EMAIL_PATTERN.test(email)) errors.email = 'Escribe un correo válido, como nombre@correo.com.'
  if (phone.length > PHONE_MAX) errors.phone = `Usa hasta ${PHONE_MAX} caracteres.`
  else if (phone && !PHONE_PATTERN.test(phone)) errors.phone = 'Usa solo números, espacios, +, - y paréntesis.'
  return errors
}

/** POST: correo y celular solo si tienen algo, como siempre lo envio el modal de las facturas. */
export function buildCreateRequest(values: CounterpartyFormValues, role: CounterpartyRequest['role']): CounterpartyRequest {
  const email = values.email.trim()
  const phone = values.phone.trim()
  return {
    role,
    name: values.name.trim(),
    documentType: values.documentType,
    documentNumber: values.documentNumber.trim(),
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
  }
}

/** PUT: todos los campos editables; correo o celular vacios van en null para borrarlos. */
export function buildUpdateRequest(values: CounterpartyFormValues): CounterpartyUpdateRequest {
  return {
    name: values.name.trim(),
    documentType: values.documentType,
    documentNumber: values.documentNumber.trim(),
    email: values.email.trim() || null,
    phone: values.phone.trim() || null,
  }
}
