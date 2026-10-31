import { apiFetch } from '../lib/api'
import { savePlatformSession, type PlatformIdentity } from './platformSession'

// Consultas del panel de plataforma. Campos nombrados como en los DTO del backend. Las claves
// de TanStack Query empiezan por 'platform': al cerrar esa sesion se borran solo esas.

export const PLATFORM_QUERY_KEY = 'platform'

/** `PlatformLoginResponse` del backend. */
export interface PlatformLoginResponse {
  token: string
  admin: PlatformIdentity
}

/**
 * `PlatformMetricsResponse`: conteos por estado. tenants ACTIVE/SUSPENDED; users total,
 * active e inactive; registrationRequests y outboxMessages con cada valor de su enum.
 */
export interface PlatformMetrics {
  tenants: Record<string, number>
  users: Record<string, number>
  registrationRequests: Record<string, number>
  outboxMessages: Record<string, number>
}

/** Campos de `PlatformRegistrationRequestResponse` que usa el Resumen. */
export interface PlatformRegistrationRequest {
  id: string
  status: string
  businessName: string
  slug: string
  contactName: string
  /** Fecha y hora UTC sin zona (`2026-10-30T15:20:11.123456`). */
  createdAt: string
  reservationExpired: boolean
}

/** `RegistrationRequestPage`. */
export interface RegistrationRequestPage {
  items: PlatformRegistrationRequest[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export function platformLogin(email: string, password: string) {
  return apiFetch<PlatformLoginResponse>('/platform/auth/login', { method: 'POST', body: { email, password }, auth: false })
}

export function startPlatformSession({ token, admin }: PlatformLoginResponse) {
  savePlatformSession(token, { id: admin.id, email: admin.email })
}

export function fetchPlatformMe() {
  return apiFetch<PlatformIdentity>('/platform/auth/me', { platform: true })
}

export function fetchPlatformMetrics() {
  return apiFetch<PlatformMetrics>('/platform/metrics', { platform: true })
}

/** Primera pagina de solicitudes PENDING; el backend ordena por fecha de creacion descendente. */
export function fetchPendingRequests(size: number) {
  return apiFetch<RegistrationRequestPage>(`/platform/registration-requests?status=PENDING&page=0&size=${size}`, { platform: true })
}
