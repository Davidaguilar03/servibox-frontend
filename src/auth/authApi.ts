import { apiFetch } from '../lib/api'
import { saveToken } from './session'

export interface LoginRequest {
  tenantSlug: string
  username: string
  password: string
}

/**
 * `LoginResponse` del backend: el token y quien entro a que serviteca. Tambien es la
 * respuesta del registro. `fullName` es null en los usuarios anteriores al registro.
 */
export interface LoginResponse {
  token: string
  user: { username: string; role: string; fullName?: string | null }
  tenant: { name: string; slug: string }
}

/** `RegisterRequest` del backend: la serviteca, su administrador y la aceptacion de los terminos. */
export interface RegisterRequest {
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

export function login(request: LoginRequest) {
  return apiFetch<LoginResponse>('/auth/login', { method: 'POST', body: request, auth: false })
}

export function register(request: RegisterRequest) {
  return apiFetch<LoginResponse>('/auth/register', { method: 'POST', body: request, auth: false })
}

/** Guarda la sesion que devuelven el login y el registro. */
export function startSession({ token, user, tenant }: LoginResponse) {
  saveToken(token, {
    username: user.username,
    role: user.role,
    tenantName: tenant.name,
    tenantSlug: tenant.slug,
    ...(user.fullName ? { fullName: user.fullName } : {}),
  })
}
