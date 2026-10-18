import { apiFetch } from '../lib/api'

export interface LoginRequest {
  tenantSlug: string
  username: string
  password: string
}

export function login(request: LoginRequest) {
  return apiFetch<{ token: string }>('/auth/login', { method: 'POST', body: request, auth: false })
}
