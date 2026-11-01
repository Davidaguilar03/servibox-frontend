import { apiFetch } from '../lib/api'
import { saveToken } from './session'

export interface LoginRequest {
  tenantSlug: string
  username: string
  password: string
}

/**
 * `LoginResponse` del backend: el token y quien entro a que serviteca. `fullName` es null en
 * los usuarios anteriores al registro.
 */
export interface LoginResponse {
  token: string
  user: { username: string; role: string; fullName?: string | null }
  tenant: { name: string; slug: string }
}

/**
 * `RegistrationRequestBody` del backend: la serviteca, su responsable y la aceptacion de los
 * terminos. Sin usuario ni contrasena: se crean al activar la cuenta.
 */
export interface RegistrationRequestBody {
  businessName: string
  nit: string
  phone: string
  slug: string
  adminFullName: string
  adminEmail: string
  acceptTerms: boolean
}

/** `ActivationAcknowledgment`: sin JWT; el usuario sigue al login con el codigo de la serviteca. */
export interface ActivationResponse {
  status: 'ACTIVATED'
  tenantSlug: string
  message: string
}

export function login(request: LoginRequest) {
  return apiFetch<LoginResponse>('/auth/login', { method: 'POST', body: request, auth: false })
}

/** 202 con el acuse; la misma clave con los mismos datos recibe el mismo acuse. */
export function submitRegistrationRequest(body: RegistrationRequestBody, idempotencyKey: string) {
  return apiFetch<unknown>('/registration-requests', {
    method: 'POST',
    body,
    auth: false,
    headers: { 'Idempotency-Key': idempotencyKey },
  })
}

export function activateAccount(body: { token: string; username: string; password: string }) {
  return apiFetch<ActivationResponse>('/registration-requests/activate', { method: 'POST', body, auth: false })
}

/** Guarda la sesion que devuelve el login. */
export function startSession({ token, user, tenant }: LoginResponse) {
  saveToken(token, {
    username: user.username,
    role: user.role,
    tenantName: tenant.name,
    tenantSlug: tenant.slug,
    ...(user.fullName ? { fullName: user.fullName } : {}),
  })
}
