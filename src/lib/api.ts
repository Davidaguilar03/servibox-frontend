import { clearSession, getToken } from '../auth/session'
import { clearPlatformSession, getPlatformToken } from '../platform/platformSession'

/**
 * Unico punto que arma la URL de una llamada al backend. VITE_API_BASE_URL es el origen de la API
 * en el build de produccion (.env.production); sin definir, la ruta es relativa y en desarrollo
 * la atiende el proxy de Vite.
 */
export function apiUrl(path: string): string {
  const origin = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').trim().replace(/\/+$/, '')
  return `${origin}/api${path}`
}

/**
 * Mensaje para cualquier error HTTP que no sea de validacion ni de conflicto, 5xx incluido.
 * Lo usan `errorMessage` (lib/errorMessage.ts) y las descargas sin cuerpo JSON.
 */
export const GENERIC_ERROR_MESSAGE = 'Algo salió mal de nuestro lado. Intenta de nuevo en unos minutos.'

/** Error del backend, que siempre responde `{"error": mensaje, "status": n}`. */
export class ApiError extends Error {
  readonly status: number
  /** Segundos de la cabecera Retry-After (429 de las rutas publicas y de los logins). */
  readonly retryAfter?: number

  constructor(message: string, status: number, retryAfter?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.retryAfter = retryAfter
  }
}

interface ApiOptions {
  method?: string
  body?: unknown
  /** false para las rutas publicas: no envia el token ni cierra sesion en un 401. */
  auth?: boolean
  /** Usa el token de plataforma; su 401 cierra solo la sesion de plataforma. */
  platform?: boolean
  /** Cabeceras extra, por ejemplo Idempotency-Key. */
  headers?: Record<string, string>
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, platform = false } = options
  const headers: Record<string, string> = { Accept: 'application/json', ...options.headers }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = auth ? (platform ? getPlatformToken() : getToken()) : null
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(apiUrl(path), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!response.ok) {
    // Un 401 con token es una sesion vencida o invalida: se cierra y el guard de rutas
    // privadas manda a /login.
    if (response.status === 401 && auth) {
      if (platform) clearPlatformSession(true)
      else clearSession(true)
    }
    throw await toApiError(response)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

/** Nombre con el que se guarda un archivo cuya respuesta no trae Content-Disposition. */
export const FALLBACK_FILE_NAME = 'archivo'

/**
 * Descarga un archivo del backend (GET) con el mismo token que apiFetch y lo guarda con
 * el nombre de Content-Disposition. Devuelve ese nombre. Un 401 cierra la sesion y un
 * error se lanza como ApiError, igual que apiFetch.
 */
export async function apiDownload(path: string): Promise<string> {
  const headers: Record<string, string> = { Accept: '*/*' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(apiUrl(path), { headers })
  if (!response.ok) {
    if (response.status === 401) clearSession(true)
    throw await toDownloadError(response)
  }

  const fileName = fileNameFrom(response.headers.get('Content-Disposition')) ?? FALLBACK_FILE_NAME
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  // Se libera en la siguiente vuelta: algunos navegadores leen la URL despues del click.
  setTimeout(() => URL.revokeObjectURL(url), 0)
  return fileName
}

/** `attachment; filename="x.pdf"` (o `filename*=UTF-8''x.pdf`) a `x.pdf`. */
export function fileNameFrom(header: string | null): string | null {
  if (!header) return null
  const encoded = /filename\*\s*=\s*[^']*''([^;]+)/i.exec(header)
  if (encoded?.[1]) {
    try {
      return decodeURIComponent(encoded[1].trim())
    } catch {
      // Sigue con filename sin codificar.
    }
  }
  const plain = /filename\s*=\s*("([^"]*)"|[^;]+)/i.exec(header)
  const name = (plain?.[2] ?? plain?.[1])?.trim()
  return name || null
}

/**
 * El error de una descarga: el JSON del backend o, si no lo es, el mensaje generico. El
 * codigo HTTP queda en `status`, no en el texto.
 */
async function toDownloadError(response: Response): Promise<ApiError> {
  try {
    const data = (await response.json()) as { error?: unknown; status?: unknown }
    if (typeof data.error !== 'string') throw new Error('Sin mensaje')
    return new ApiError(data.error, typeof data.status === 'number' ? data.status : response.status)
  } catch {
    return new ApiError(GENERIC_ERROR_MESSAGE, response.status)
  }
}

/** Retry-After en segundos; el backend no envia la forma de fecha HTTP. */
function retryAfterOf(response: Response): number | undefined {
  const seconds = Number(response.headers.get('Retry-After') ?? NaN)
  return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined
}

async function toApiError(response: Response): Promise<ApiError> {
  const retryAfter = retryAfterOf(response)
  try {
    const data = (await response.json()) as { error?: unknown; status?: unknown }
    const message = typeof data.error === 'string' ? data.error : response.statusText
    const status = typeof data.status === 'number' ? data.status : response.status
    return new ApiError(message, status, retryAfter)
  } catch {
    return new ApiError(response.statusText, response.status, retryAfter)
  }
}
