import { describe, expect, it, vi } from 'vitest'
import { ApiError, apiDownload } from './api'
import { GENERIC_ERROR_MESSAGE, NETWORK_ERROR_MESSAGE, errorMessage } from './errorMessage'
import { saveToken } from '../auth/session'
import { validToken } from '../test/utils'

describe('errorMessage', () => {
  it('muestra el mensaje del backend en un 400', () => {
    expect(errorMessage(new ApiError('Peticion invalida', 400))).toBe('Peticion invalida')
  })

  it('muestra el mensaje del backend en un 409', () => {
    expect(errorMessage(new ApiError('Ya existe un producto con el codigo LL-001', 409))).toBe(
      'Ya existe un producto con el codigo LL-001',
    )
  })

  it('usa el mensaje generico en un 500', () => {
    expect(errorMessage(new ApiError('Error interno del servidor', 500))).toBe(GENERIC_ERROR_MESSAGE)
  })

  it('usa el mensaje generico en un 503', () => {
    expect(errorMessage(new ApiError('Service Unavailable', 503))).toBe(GENERIC_ERROR_MESSAGE)
  })

  it('usa el mensaje generico en un 404', () => {
    expect(errorMessage(new ApiError('Producto no encontrado: 9', 404))).toBe(GENERIC_ERROR_MESSAGE)
  })

  it('pide revisar la conexion en un error de red', () => {
    expect(errorMessage(new TypeError('Failed to fetch'))).toBe(NETWORK_ERROR_MESSAGE)
    expect(NETWORK_ERROR_MESSAGE).toBe('Revisa tu conexión e intenta de nuevo.')
  })

  it('usa el mensaje generico en una descarga con error que no es JSON', async () => {
    saveToken(validToken())
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 })))

    const error = await apiDownload('/reporting/export').catch((e: unknown) => e)

    expect(errorMessage(error)).toBe(GENERIC_ERROR_MESSAGE)
    expect(GENERIC_ERROR_MESSAGE).toBe('Algo salió mal de nuestro lado. Intenta de nuevo en unos minutos.')
    expect(GENERIC_ERROR_MESSAGE).not.toMatch(/502/)
  })
})
