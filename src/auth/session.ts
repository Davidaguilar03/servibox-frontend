import { useMemo, useSyncExternalStore } from 'react'

const TOKEN_KEY = 'servibox.token'
const TENANT_SLUG_KEY = 'servibox.tenantSlug'

export interface Session {
  username: string
  role: string
  /** Vencimiento del token en segundos desde epoch, el `exp` del JWT. */
  expiresAt: number
}

const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function saveToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token)
  notify()
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY)
  notify()
}

export function getRememberedTenantSlug(): string {
  return localStorage.getItem(TENANT_SLUG_KEY) ?? ''
}

export function rememberTenantSlug(slug: string) {
  localStorage.setItem(TENANT_SLUG_KEY, slug)
}

/**
 * Lee sub, role y exp del payload del JWT. No verifica la firma: eso lo hace el backend
 * en cada peticion. Un token ilegible o vencido no es sesion.
 */
export function decodeSession(token: string, now = Date.now()): Session | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const claims: unknown = JSON.parse(json)
    if (typeof claims !== 'object' || claims === null) return null
    const { sub, role, exp } = claims as Record<string, unknown>
    if (typeof sub !== 'string' || typeof exp !== 'number') return null
    if (exp * 1000 <= now) return null
    return { username: sub, role: typeof role === 'string' ? role : '', expiresAt: exp }
  } catch {
    return null
  }
}

export function useSession(): Session | null {
  const token = useSyncExternalStore(subscribe, getToken)
  return useMemo(() => (token ? decodeSession(token) : null), [token])
}
