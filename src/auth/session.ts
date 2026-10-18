import { useMemo, useSyncExternalStore } from 'react'

const TOKEN_KEY = 'servibox.token'
const IDENTITY_KEY = 'servibox.identity'
const TENANT_SLUG_KEY = 'servibox.tenantSlug'

/** Quien entro y a que serviteca, tal como lo devuelve el login. */
export interface Identity {
  username: string
  role: string
  tenantName: string
  tenantSlug: string
}

export interface Session extends Identity {
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

function getStoredIdentity(): string | null {
  return sessionStorage.getItem(IDENTITY_KEY)
}

/** Guarda el token y, si viene, la identidad del login. Sin identidad se usa el respaldo. */
export function saveToken(token: string, identity?: Identity) {
  sessionStorage.setItem(TOKEN_KEY, token)
  if (identity) sessionStorage.setItem(IDENTITY_KEY, JSON.stringify(identity))
  else sessionStorage.removeItem(IDENTITY_KEY)
  notify()
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(IDENTITY_KEY)
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
    const slug = getRememberedTenantSlug()
    return {
      username: sub,
      role: typeof role === 'string' ? role : '',
      tenantName: slug,
      tenantSlug: slug,
      expiresAt: exp,
    }
  } catch {
    return null
  }
}

/** La identidad guardada, o null si falta o no se puede leer. */
function parseIdentity(raw: string | null): Identity | null {
  if (!raw) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) return null
    const { username, role, tenantName, tenantSlug } = value as Record<string, unknown>
    if (typeof username !== 'string' || typeof role !== 'string') return null
    if (typeof tenantName !== 'string' || typeof tenantSlug !== 'string') return null
    return { username, role, tenantName, tenantSlug }
  } catch {
    return null
  }
}

/**
 * Sesion a partir del token y la identidad guardada. Una sesion guardada antes de que el
 * login devolviera la identidad usa el sub del JWT y el slug recordado.
 */
export function readSession(token: string, rawIdentity: string | null, now = Date.now()): Session | null {
  const session = decodeSession(token, now)
  if (!session) return null
  const identity = parseIdentity(rawIdentity)
  return identity ? { ...identity, expiresAt: session.expiresAt } : session
}

export function useSession(): Session | null {
  const token = useSyncExternalStore(subscribe, getToken)
  const identity = useSyncExternalStore(subscribe, getStoredIdentity)
  return useMemo(() => (token ? readSession(token, identity) : null), [token, identity])
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  MECANICO: 'Mecánico',
  CAJERO: 'Cajero',
}

export function roleLabel(role: string): string {
  return roleLabels[role] ?? role
}
