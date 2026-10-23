import { useMemo, useSyncExternalStore } from 'react'

const TOKEN_KEY = 'servibox.token'
const IDENTITY_KEY = 'servibox.identity'
const TENANT_SLUG_KEY = 'servibox.tenantSlug'

/** Quien entro y a que serviteca, tal como lo devuelve el login o el registro. */
export interface Identity {
  username: string
  role: string
  tenantName: string
  tenantSlug: string
  /** Nombre completo del usuario. Falta en los usuarios anteriores al registro publico. */
  fullName?: string
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

/**
 * Cambia el nombre de la serviteca en la identidad guardada, sin tocar el token: la barra
 * superior lo muestra sin recargar. Una sesion sin identidad guardada la arma desde el JWT.
 */
export function updateTenantName(name: string) {
  const token = getToken()
  const session = token ? readSession(token, getStoredIdentity()) : null
  if (!session) return
  const identity: Identity = {
    username: session.username,
    role: session.role,
    tenantName: name,
    tenantSlug: session.tenantSlug,
    ...(session.fullName ? { fullName: session.fullName } : {}),
  }
  sessionStorage.setItem(IDENTITY_KEY, JSON.stringify(identity))
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
    const { username, role, tenantName, tenantSlug, fullName } = value as Record<string, unknown>
    if (typeof username !== 'string' || typeof role !== 'string') return null
    if (typeof tenantName !== 'string' || typeof tenantSlug !== 'string') return null
    const identity: Identity = { username, role, tenantName, tenantSlug }
    if (typeof fullName === 'string' && fullName.trim()) identity.fullName = fullName
    return identity
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

/** El nombre que ve el usuario: el completo si lo hay, si no el username. */
export function displayName(session: Pick<Identity, 'username' | 'fullName'>): string {
  return session.fullName?.trim() || session.username
}

/**
 * Dos letras para el circulo del usuario. Con nombre completo: la primera del primer nombre
 * y la del ultimo apellido; con una sola palabra, sus dos primeras letras. Sin nombre
 * completo se parte el username por espacios, punto, guion y guion bajo.
 */
export function initials(session: Pick<Identity, 'username' | 'fullName'>): string {
  const fullName = session.fullName?.trim()
  const parts = fullName ? fullName.split(/\s+/) : session.username.split(/[\s._-]+/).filter(Boolean)
  const first = parts[0] ?? ''
  const last = parts[parts.length - 1] ?? ''
  const letters = parts.length > 1 ? first.charAt(0) + last.charAt(0) : first.slice(0, 2)
  return letters.toUpperCase()
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  MECANICO: 'Mecánico',
  CAJERO: 'Cajero',
}

export function roleLabel(role: string): string {
  return roleLabels[role] ?? role
}
