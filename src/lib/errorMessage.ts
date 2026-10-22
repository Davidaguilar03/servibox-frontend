import { ApiError, GENERIC_ERROR_MESSAGE } from './api'

// Texto de error para el usuario. Regla en docs/ai-context/02-CONVENTIONS.md, Manejo de errores.

export { GENERIC_ERROR_MESSAGE }

/** No hubo respuesta: fetch fallo antes de llegar al backend. */
export const NETWORK_ERROR_MESSAGE = 'Revisa tu conexión e intenta de nuevo.'

/**
 * 400 y 409 traen un mensaje escrito para el usuario (validacion o conflicto de negocio) y
 * se muestra tal cual. El resto de estados lleva el generico; un error que no es ApiError
 * es de red. El 401 lo resuelve la sesion: cierra y el guard manda a /login.
 */
export function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return NETWORK_ERROR_MESSAGE
  if (error.status === 400 || error.status === 409) return error.message
  return GENERIC_ERROR_MESSAGE
}
