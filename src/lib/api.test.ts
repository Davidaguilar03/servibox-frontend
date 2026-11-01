/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, FALLBACK_FILE_NAME, GENERIC_ERROR_MESSAGE, apiDownload, apiFetch, apiUrl, fileNameFrom } from './api'
import { getToken, saveToken } from '../auth/session'
import { jsonResponse, validToken } from '../test/utils'

describe('URL de la API', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('sin VITE_API_BASE_URL la ruta es relativa, para el proxy de Vite', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]))
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/inventory/products')

    expect(apiUrl('/sales')).toBe('/api/sales')
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/inventory/products')
  })

  it('con VITE_API_BASE_URL apiFetch llama a la URL absoluta', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.servibox.co')
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}))
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/registration-requests', { method: 'POST', body: {}, auth: false })

    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.servibox.co/api/registration-requests')
  })

  it('con VITE_API_BASE_URL apiDownload llama a la URL absoluta', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.servibox.co')
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: 'Recurso no encontrado', status: 404 }, 404))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiDownload('/reporting/export?type=MOVIMIENTOS')).rejects.toMatchObject({ status: 404 })

    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.servibox.co/api/reporting/export?type=MOVIMIENTOS')
  })

  it('una barra final en la variable no duplica la barra', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.servibox.co/')
    expect(apiUrl('/sales')).toBe('https://api.servibox.co/api/sales')
  })

  it('.env.production apunta a la API publica y solo api.ts llama a fetch', () => {
    expect(readFileSync('.env.production', 'utf-8')).toMatch(/^VITE_API_BASE_URL=https:\/\/api\.servibox\.co\r?$/m)
    const files = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)],
      )
    const callers = files('src')
      .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file))
      .filter((file) => /(^|[^.\w])fetch\(/.test(readFileSync(file, 'utf-8')))
      .map((file) => file.replaceAll('\\', '/'))
    expect(callers).toEqual(['src/lib/api.ts'])
  })
})

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

  it('un error que no es JSON da el mensaje generico y deja el codigo en status', async () => {
    saveToken(validToken())
    stubDownload()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 })))

    await expect(apiDownload('/reporting/export')).rejects.toMatchObject({
      message: GENERIC_ERROR_MESSAGE,
      status: 502,
    })
  })
})
