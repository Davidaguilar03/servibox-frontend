import { clearSession, getToken } from '../auth/session'

const BASE_URL = '/api'

/** Error del backend, que siempre responde `{"error": mensaje, "status": n}`. */
export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface ApiOptions {
  method?: string
  body?: unknown
  /** false para las rutas publicas: no envia el token ni cierra sesion en un 401. */
  auth?: boolean
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = auth ? getToken() : null
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(BASE_URL + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!response.ok) {
    // Un 401 con token es una sesion vencida o invalida: se cierra y el guard de rutas
    // privadas manda a /login.
    if (response.status === 401 && auth) clearSession()
    throw await toApiError(response)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const data = (await response.json()) as { error?: unknown; status?: unknown }
    const message = typeof data.error === 'string' ? data.error : response.statusText
    const status = typeof data.status === 'number' ? data.status : response.status
    return new ApiError(message, status)
  } catch {
    return new ApiError(response.statusText, response.status)
  }
}
