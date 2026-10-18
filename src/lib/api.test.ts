import { describe, expect, it, vi } from 'vitest'
import { ApiError, apiFetch } from './api'
import { getToken, saveToken } from '../auth/session'
import { jsonResponse, validToken } from '../test/utils'

describe('apiFetch', () => {
  it('envia el token como Bearer con la base /api', async () => {
    const token = validToken()
    saveToken(token)
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]))
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/inventory/products')

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/inventory/products')
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${token}`)
  })

  it('convierte el error del backend en ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'Stock insuficiente', status: 409 }, 409)))

    const error = await apiFetch('/sales', { method: 'POST', body: {} }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ message: 'Stock insuficiente', status: 409 })
  })

  it('cierra la sesion ante un 401', async () => {
    saveToken(validToken())
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'No autenticado', status: 401 }, 401)))

    await expect(apiFetch('/inventory/products')).rejects.toMatchObject({ status: 401 })
    expect(getToken()).toBeNull()
  })

  it('no envia token en una ruta publica', async () => {
    saveToken(validToken())
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ token: 'x' }))
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/auth/login', { method: 'POST', body: {}, auth: false })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined()
  })
})
