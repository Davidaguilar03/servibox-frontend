import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, FALLBACK_FILE_NAME, apiDownload, apiFetch, fileNameFrom } from './api'
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

describe('apiDownload', () => {
  function stubDownload() {
    const createObjectURL = vi.fn(() => 'blob:reporte')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }))
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push({ href: this.getAttribute('href'), download: this.download })
    })
    const clicked: Array<{ href: string | null; download: string }> = []
    return { createObjectURL, revokeObjectURL, click, clicked }
  }

  function fileResponse(headers: Record<string, string> = {}) {
    return new Response(new Blob(['%PDF-1.7']), { status: 200, headers: { 'Content-Type': 'application/pdf', ...headers } })
  }

  afterEach(() => vi.restoreAllMocks())

  it('descarga con el nombre de Content-Disposition y libera la URL', async () => {
    const token = validToken()
    saveToken(token)
    const { createObjectURL, revokeObjectURL, clicked } = stubDownload()
    const fetchMock = vi.fn().mockResolvedValue(
      fileResponse({ 'Content-Disposition': 'attachment; filename="estado-resultados_2026-10-01_2026-10-19.pdf"' }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const name = await apiDownload('/reporting/export?type=ESTADO_RESULTADOS')

    expect(name).toBe('estado-resultados_2026-10-01_2026-10-19.pdf')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/reporting/export?type=ESTADO_RESULTADOS')
    expect(init.headers).toEqual({ Accept: '*/*', Authorization: `Bearer ${token}` })
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(clicked).toEqual([{ href: 'blob:reporte', download: 'estado-resultados_2026-10-01_2026-10-19.pdf' }])
    expect(document.querySelector('a[download]')).toBeNull()
    await vi.waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith('blob:reporte'))
  })

  it('usa un nombre de respaldo sin Content-Disposition', async () => {
    saveToken(validToken())
    const { clicked } = stubDownload()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fileResponse()))

    expect(await apiDownload('/reporting/export')).toBe(FALLBACK_FILE_NAME)
    expect(clicked[0]?.download).toBe(FALLBACK_FILE_NAME)
  })

  it('lee el nombre codificado de filename*', () => {
    expect(fileNameFrom("attachment; filename*=UTF-8''movimientos%20cuentas.xlsx")).toBe('movimientos cuentas.xlsx')
    expect(fileNameFrom('attachment; filename=reporte.pdf')).toBe('reporte.pdf')
    expect(fileNameFrom('attachment')).toBeNull()
  })

  it('cierra la sesion ante un 401', async () => {
    saveToken(validToken())
    const { click } = stubDownload()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'No autenticado', status: 401 }, 401)))

    await expect(apiDownload('/reporting/export')).rejects.toMatchObject({ status: 401 })
    expect(getToken()).toBeNull()
    expect(click).not.toHaveBeenCalled()
  })

  it('convierte el error JSON del backend en ApiError', async () => {
    saveToken(validToken())
    stubDownload()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'El rango de un reporte no puede pasar de 366 dias', status: 400 }, 400)),
    )

    const error = await apiDownload('/reporting/export').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ message: 'El rango de un reporte no puede pasar de 366 dias', status: 400 })
    expect(getToken()).not.toBeNull()
  })

  it('un error que no es JSON da un mensaje generico con el codigo', async () => {
    saveToken(validToken())
    stubDownload()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 })))

    await expect(apiDownload('/reporting/export')).rejects.toMatchObject({
      message: 'No pudimos descargar el archivo (error 502). Intenta de nuevo.',
      status: 502,
    })
  })
})
