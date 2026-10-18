import { apiFetch } from '../lib/api'

export interface LoginRequest {
  tenantSlug: string
  username: string
  password: string
}

/** `LoginResponse` del backend: el token y quien entro a que serviteca. */
export interface LoginResponse {
  token: string
  user: { username: string; role: string }
  tenant: { name: string; slug: string }
}

export function login(request: LoginRequest) {
  return apiFetch<LoginResponse>('/auth/login', { method: 'POST', body: request, auth: false })
}
