import { useEffect, useRef } from 'react'
import { showToast } from '../components/toast'
import { ApiError } from '../lib/api'
import { userMessage, type MessageContext } from './errorMessages'

// Regla unica de donde se muestra un error. Ver docs/ai-context/06-COPY.md.

export interface ReportOptions {
  /**
   * Pantallas sin Toaster (login y registro): todo error va en linea. Por defecto solo van en
   * linea los que el usuario puede corregir en el formulario.
   */
  inlineOnly?: boolean
  /** Contexto de mensajes compartidos con otra pantalla (ver TENANT_RULES). */
  context?: MessageContext
}

/** 400 y 409 son de validacion o de una regla de negocio: el usuario los corrige en el formulario. */
export function isInlineError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 400 || error.status === 409)
}

/** El 401 lo resuelve la sesion: se cierra y el login avisa que vencio. */
function isSessionError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401
}

/**
 * Aplica la regla: devuelve el texto para mostrar en linea (bajo el campo o en la alerta del
 * formulario) o, si el error no depende de un campo (red, 5xx, 403, 404), lo muestra en un
 * toast de error persistente y devuelve null. Un 401 no se muestra aqui.
 */
export function reportError(error: unknown, options: ReportOptions = {}): string | null {
  if (!error || isSessionError(error)) return null
  const message = userMessage(error, options.context)
  if (options.inlineOnly || isInlineError(error)) return message
  showToast(message, 'error')
  return null
}

/**
 * `reportError` para el error de una consulta o mutacion de React Query: el toast sale una
 * sola vez por error y el texto en linea se recalcula en cada render.
 */
export function useReportedError(error: unknown, options: ReportOptions = {}): string | null {
  const reported = useRef<unknown>(null)
  const inline = !error || isSessionError(error) ? null : options.inlineOnly || isInlineError(error) ? userMessage(error, options.context) : null

  useEffect(() => {
    if (!error || error === reported.current) return
    reported.current = error
    if (!inline) reportError(error, options)
    // options es un objeto nuevo en cada render; solo importa el error.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error, inline])

  return inline
}
