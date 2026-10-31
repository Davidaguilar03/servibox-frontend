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

export type RegistrationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'ACTIVATED'

/** `PlatformRegistrationRequestResponse`, sin datos secretos. */
export interface PlatformRegistrationRequest {
  id: string
  status: RegistrationStatus
  businessName: string
  slug: string
  contactName: string
  nit: string
  phone: string
  contactEmail: string
  /** Fecha y hora UTC sin zona (`2026-10-30T15:20:11.123456`). */
  createdAt: string
  reservationExpired: boolean
  reservationExpiresAt: string
  reviewedAt: string | null
  reviewerId: number | null
  rejectionReason: string | null
  version: number
  matches: { requestsWithSameNit: number; requestsWithSameEmail: number; tenantsWithSameNit: number } | null
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

export const PLATFORM_REQUESTS_KEY = [PLATFORM_QUERY_KEY, 'registration-requests'] as const

export interface RegistrationRequestFilters {
  tenantName?: string
  contactName?: string
  receivedFrom?: string
  receivedTo?: string
}

export function fetchRegistrationRequests(status: RegistrationStatus | '', page: number, filters: RegistrationRequestFilters = {}) {
  const params = new URLSearchParams({ page: String(page), size: '25' })
  if (status) params.set('status', status)
  for (const key of ['tenantName', 'contactName', 'receivedFrom', 'receivedTo'] as const) {
    const value = filters[key]?.trim()
    if (value) params.set(key, value)
  }
  return apiFetch<RegistrationRequestPage>(`/platform/registration-requests?${params}`, { platform: true })
}

export function fetchRegistrationRequest(id: string) {
  return apiFetch<PlatformRegistrationRequest>(`/platform/registration-requests/${encodeURIComponent(id)}`, { platform: true })
}

export type RegistrationAction = 'approve' | 'reject' | 'resend-activation'

export function reviewRegistrationRequest(request: PlatformRegistrationRequest, action: RegistrationAction, reason: string) {
  return apiFetch<PlatformRegistrationRequest>(`/platform/registration-requests/${encodeURIComponent(request.id)}/${action}`, {
    platform: true,
    method: 'POST',
    ...(action === 'resend-activation' ? {} : { body: { expectedVersion: request.version, ...(action === 'reject' ? { reason: reason.trim() } : {}) } }),
  })
}
