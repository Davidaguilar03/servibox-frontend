import { useMemo, useSyncExternalStore } from 'react'

// Sesion del administrador de plataforma. Independiente de la sesion de serviteca
// (auth/session.ts): claves, identidad, vencimiento y cierre propios. Mismo criterio de
// almacenamiento que la sesion de serviteca: sessionStorage, sin refresh.

const TOKEN_KEY = 'servibox.platform.token'
const IDENTITY_KEY = 'servibox.platform.identity'
const EXPIRED_KEY = 'servibox.platform.sessionExpired'

/** `PlatformIdentityResponse` del backend. */
export interface PlatformIdentity {
  id: number
  email: string
}

export interface PlatformSession extends PlatformIdentity {
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

export function getPlatformToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

function getStoredIdentity(): string | null {
  return sessionStorage.getItem(IDENTITY_KEY)
}

export function savePlatformSession(token: string, identity: PlatformIdentity) {
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(IDENTITY_KEY, JSON.stringify(identity))
  sessionStorage.removeItem(EXPIRED_KEY)
  notify()
}

/** Cierra solo la sesion de plataforma. Con `expired` el acceso avisa que vencio. */
export function clearPlatformSession(expired = false) {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(IDENTITY_KEY)
  if (expired) sessionStorage.setItem(EXPIRED_KEY, '1')
  notify()
}

/** Si la sesion de plataforma vencio; se lee una vez. */
export function takePlatformSessionExpired(): boolean {
  const expired = sessionStorage.getItem(EXPIRED_KEY) === '1'
  sessionStorage.removeItem(EXPIRED_KEY)
  return expired
}

/**
 * Lee exp e identityType del payload del JWT sin verificar la firma (lo hace el backend).
 * Solo un token de plataforma vigente con su identidad guardada es sesion: un token de
 * serviteca nunca lo es.
 */
export function readPlatformSession(token: string, rawIdentity: string | null, now = Date.now()): PlatformSession | null {
  try {
    const payload = token.split('.')[1]
    if (!payload || !rawIdentity) return null
    const claims: unknown = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    if (typeof claims !== 'object' || claims === null) return null
    const { exp, identityType } = claims as Record<string, unknown>
    if (identityType !== 'PLATFORM' || typeof exp !== 'number' || exp * 1000 <= now) return null
    const identity: unknown = JSON.parse(rawIdentity)
    if (typeof identity !== 'object' || identity === null) return null
    const { id, email } = identity as Record<string, unknown>
    if (typeof id !== 'number' || typeof email !== 'string') return null
    return { id, email, expiresAt: exp }
  } catch {
    return null
  }
}

export function usePlatformSession(): PlatformSession | null {
  const token = useSyncExternalStore(subscribe, getPlatformToken)
  const identity = useSyncExternalStore(subscribe, getStoredIdentity)
  return useMemo(() => (token ? readPlatformSession(token, identity) : null), [token, identity])
}
