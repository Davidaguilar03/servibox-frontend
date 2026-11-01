import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { getToken, saveToken } from '../auth/session'
import { userMessage } from '../api/errorMessages'
import { ApiError } from '../lib/api'
import { jsonResponse, makeToken, renderRoute, validToken } from '../test/utils'
import { getPlatformToken, savePlatformSession } from './platformSession'
import type { PlatformTenant } from './platformApi'

const root = '/api/platform/tenants'
const url = '/plataforma/servitecas'
const tenant = (overrides: Partial<PlatformTenant> = {}): PlatformTenant => ({
  id: 7, name: 'Serviteca El Roble', slug: 'elroble', nit: '900123456-7', phone: '3001234567', status: 'ACTIVE', version: 2,
  createdAt: '2026-10-30T02:00:00', suspendedAt: null, suspensionReason: null, ...overrides,
})
const page = (items: PlatformTenant[], pageNumber = 0, total = items.length) => ({ items, page: pageNumber, size: 25, totalElements: total, totalPages: Math.ceil(total / 25) })
type Handler = (url: URL, init?: RequestInit) => Response | Promise<Response>
function api(overrides: Record<string, Handler> = {}) {
  const handlers: Record<string, Handler> = {
    '/api/platform/auth/me': () => jsonResponse({ id: 1, email: 'platform@example.test' }),
    [root]: () => jsonResponse(page([tenant()])), ...overrides,
  }
  const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const parsed = new URL(String(input), 'http://localhost')
    const handler = handlers[parsed.pathname]
    if (!handler) throw new Error(`Sin fixture para ${parsed.pathname}`)
    return handler(parsed, init)
  })
  vi.stubGlobal('fetch', mock)
  return mock
}
function signIn() {
  savePlatformSession(makeToken({ sub: '1', identityType: 'PLATFORM', exp: Math.floor(Date.now() / 1000) + 3600 }), { id: 1, email: 'platform@example.test' })
}
const calls = (mock: ReturnType<typeof api>, path: string) => mock.mock.calls.filter(([input]) => new URL(String(input), 'http://localhost').pathname === path)
const sent = (mock: ReturnType<typeof api>, index = 0) => Object.fromEntries(new URL(String(calls(mock, root).at(index)?.[0]), 'http://localhost').searchParams)
const fail = (message: string, status: number) => jsonResponse({ error: message, status }, status)
const table = async () => within(await screen.findByRole('table'))

describe('listado de servitecas', () => {
  it('muestra los campos del contrato con estado, motivo, fecha de Bogota y enlace al detalle, sin datos internos', async () => {
    api({ [root]: () => jsonResponse(page([
      tenant(),
      tenant({ id: 8, name: 'Llantas del Norte', slug: 'llantasnorte', nit: '900234567-8', phone: '3109876543', status: 'SUSPENDED', version: 5, suspendedAt: '2026-10-31T15:00:00', suspensionReason: 'Mora en el pago' }),
    ])) })
    signIn()
    renderRoute(url)
    await screen.findAllByText('Llantas del Norte')
    const rows = (await table()).getAllByRole('row')
    expect(rows).toHaveLength(3)
    expect(within(rows[0]!).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Serviteca', 'NIT', 'Teléfono', 'Estado', 'Creada', 'Acciones'])
    const first = within(rows[1]!).getAllByRole('cell').map((cell) => cell.textContent)
    expect(first.slice(0, 4)).toEqual(['Serviteca El Robleelroble', '900123456-7', '3001234567', 'Activa'])
    expect(first[4]).toMatch(/29\/10\/(20)?26/)
    const second = within(rows[2]!).getAllByRole('cell').map((cell) => cell.textContent)
    expect(second.slice(0, 4)).toEqual(['Llantas del Nortellantasnorte', '900234567-8', '3109876543', 'SuspendidaMora en el pago'])
    expect(document.title).toBe('Servitecas · ServiBox')
    expect(screen.getByRole('heading', { level: 1, name: 'Servitecas' })).toBeInTheDocument()
    expect(screen.queryByText(/^(7|8|2|5)$/)).not.toBeInTheDocument()
    expect(within(rows[1]!).getByRole('link', { name: 'Ver detalle de Serviteca El Roble' })).toHaveAttribute('href', '/plataforma/servitecas/7')
    expect(screen.queryByRole('button', { name: /Suspender|Reactivar|Revocar|Eliminar/ })).not.toBeInTheDocument()
  })

  it('consulta solo el listado sin metricas ni otras rutas', async () => {
    const mock = api()
    signIn()
    renderRoute(url)
    await table()
    expect(sent(mock)).toEqual({ page: '0', size: '25' })
    const paths = mock.mock.calls.map(([input]) => new URL(String(input), 'http://localhost').pathname)
    expect(new Set(paths)).toEqual(new Set(['/api/platform/auth/me', root]))
  })

  it('enlaza Servitecas en la navegacion del panel como pagina actual', async () => {
    api()
    signIn()
    renderRoute(url)
    await table()
    const link = within(screen.getByRole('navigation', { name: 'Principal' })).getByRole('link', { name: 'Servitecas' })
    expect(link).toHaveAttribute('href', url)
    expect(link).toHaveAttribute('aria-current', 'page')
  })

  it('sin sesion de plataforma redirige a su acceso aunque haya sesion de serviteca', async () => {
    const mock = api()
    saveToken(validToken())
    const router = renderRoute(url)
    await waitFor(() => expect(router.state.location.pathname).toBe('/plataforma/login'))
    expect(calls(mock, root)).toHaveLength(0)
  })

  it('envia solo el token de plataforma', async () => {
    const mock = api()
    saveToken(validToken())
    signIn()
    renderRoute(url)
    await table()
    const headers = new Headers(calls(mock, root)[0]?.[1]?.headers)
    expect(headers.get('Authorization')).not.toBe(`Bearer ${validToken()}`)
    expect(headers.get('Authorization')).toMatch(/^Bearer /)
  })
})

describe('filtros y paginacion de servitecas', () => {
  it('pagina en el servidor con estado y busqueda en URL', async () => {
    const mock = api({ [root]: (u) => jsonResponse(page([tenant()], Number(u.searchParams.get('page')), 51)) })
    signIn()
    const router = renderRoute(`${url}?estado=SUSPENDED&q=Roble&pagina=2`)
    const user = userEvent.setup()
    expect(await screen.findByText('26 a 26 de 51 servitecas')).toBeInTheDocument()
    expect(sent(mock)).toEqual({ page: '1', size: '25', status: 'SUSPENDED', q: 'Roble' })
    expect(screen.getByLabelText('Buscar')).toHaveValue('Roble')
    expect(screen.getByLabelText('Estado')).toHaveValue('SUSPENDED')
    await user.click(screen.getByRole('button', { name: 'Página siguiente' }))
    await waitFor(() => expect(router.state.location.search).toContain('pagina=3'))
    await waitFor(() => expect(sent(mock, -1)).toEqual({ page: '2', size: '25', status: 'SUSPENDED', q: 'Roble' }))
    expect(await screen.findByText('51 a 51 de 51 servitecas')).toBeInTheDocument()
    await act(async () => { router.navigate(-1) })
    await waitFor(() => expect(router.state.location.search).toBe('?estado=SUSPENDED&q=Roble&pagina=2'))
  })

  it.each([['ACTIVE', 'Activas'], ['SUSPENDED', 'Suspendidas']])('filtra por estado %s y reinicia la pagina', async (value, label) => {
    const mock = api()
    signIn()
    const router = renderRoute(`${url}?pagina=3&otro=x`)
    const user = userEvent.setup()
    await table()
    expect(within(screen.getByLabelText('Estado')).getAllByRole('option').map((o) => o.textContent)).toEqual(['Todas', 'Activas', 'Suspendidas'])
    await user.selectOptions(screen.getByLabelText('Estado'), label)
    await waitFor(() => expect(router.state.location.search).toBe(`?otro=x&estado=${value}`))
    await waitFor(() => expect(sent(mock, -1)).toEqual({ page: '0', size: '25', status: value }))
  })

  it('busca con debounce sin crear historial, recorta y envia comodines literales', async () => {
    const mock = api()
    signIn()
    const router = renderRoute(`${url}?pagina=2`)
    const user = userEvent.setup()
    await table()
    await user.type(screen.getByLabelText('Buscar'), '  100%_norte ')
    await waitFor(() => expect(router.state.location.search).toBe(`?${new URLSearchParams({ q: '  100%_norte ' })}`))
    expect(router.state.historyAction).toBe('REPLACE')
    await waitFor(() => expect(sent(mock, -1)).toEqual({ page: '0', size: '25', q: '100%_norte' }))
  })

  it('limpia busqueda, estado y pagina conservando parametros ajenos', async () => {
    const mock = api()
    signIn()
    const router = renderRoute(`${url}?q=roble&estado=ACTIVE&pagina=2&otro=x`)
    const user = userEvent.setup()
    await table()
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(router.state.location.search).toBe('?otro=x')
    expect(screen.getByLabelText('Buscar')).toHaveValue('')
    await waitFor(() => expect(sent(mock, -1)).toEqual({ page: '0', size: '25' }))
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument()
  })

  it('normaliza estado y pagina invalidos sin enviarlos', async () => {
    const mock = api({ [root]: () => jsonResponse(page([])) })
    signIn()
    renderRoute(`${url}?estado=PENDING&pagina=-4&responsable=Ana&desde=2026-10-01`)
    await screen.findByText('Todavía no hay servitecas registradas.')
    expect(sent(mock)).toEqual({ page: '0', size: '25' })
  })

  it('ajusta una pagina fuera de rango a la ultima disponible', async () => {
    const mock = api({ [root]: (u) => jsonResponse(u.searchParams.get('page') === '8' ? page([], 8, 26) : page([tenant()], 1, 26)) })
    signIn()
    const router = renderRoute(`${url}?pagina=9`)
    await waitFor(() => expect(router.state.location.search).toBe('?pagina=2'))
    expect(await screen.findByText('26 a 26 de 26 servitecas')).toBeInTheDocument()
    expect(calls(mock, root)).toHaveLength(2)
  })
})

describe('estados de servitecas', () => {
  it('distingue sin servitecas de sin coincidencias', async () => {
    api({ [root]: () => jsonResponse(page([])) })
    signIn()
    const router = renderRoute(url)
    expect(await screen.findByText('Todavía no hay servitecas registradas.')).toBeInTheDocument()
    await act(async () => { await router.navigate(`${url}?q=Inexistente`) })
    expect(await screen.findByText('No hay servitecas que coincidan con estos filtros.')).toBeInTheDocument()
    expect(screen.getByText('0 a 0 de 0 servitecas')).toBeInTheDocument()
  })

  it('muestra carga, error de red y recuperacion con Reintentar', async () => {
    let resolve!: (r: Response) => void
    let first = true
    api({ [root]: () => first ? new Promise<Response>((r) => { resolve = r }) : jsonResponse(page([tenant()])) })
    signIn()
    renderRoute(url)
    await waitFor(() => expect(resolve).toBeDefined())
    expect(screen.getByRole('table').querySelector('tbody')).toHaveAttribute('aria-busy', 'true')
    await act(async () => resolve(fail('Fallo', 500)))
    first = false
    // act no espera a TanStack Query: notifica con setTimeout(0) y act solo cede un setImmediate.
    await userEvent.click(await screen.findByRole('button', { name: 'Reintentar' }))
    expect((await table()).getByText('Serviteca El Roble')).toBeInTheDocument()
  })

  it('400 de busqueda larga muestra el mensaje mapeado, conserva el texto y permite reintentar', async () => {
    let failed = true
    const mock = api({ [root]: () => failed ? fail('La busqueda no puede superar 100 caracteres', 400) : jsonResponse(page([tenant()])) })
    signIn()
    const long = 'x'.repeat(101)
    const router = renderRoute(`${url}?q=${long}`)
    expect(await screen.findByText('La búsqueda no puede superar 100 caracteres.')).toBeInTheDocument()
    expect(userMessage(new ApiError('La busqueda no puede superar 100 caracteres', 400))).toBe('La búsqueda no puede superar 100 caracteres.')
    expect(sent(mock)).toEqual({ page: '0', size: '25', q: long })
    expect(screen.getByLabelText('Buscar')).toHaveValue(long)
    expect(router.state.location.search).toBe(`?q=${long}`)
    failed = false
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await table()
    expect(calls(mock, root)).toHaveLength(2)
  })

  it('401 del listado cierra solo la sesion de plataforma', async () => {
    api({ [root]: () => fail('No autenticado', 401) })
    saveToken(validToken())
    signIn()
    const router = renderRoute(url)
    await waitFor(() => expect(router.state.location.pathname).toBe('/plataforma/login'))
    expect(getPlatformToken()).toBeNull()
    expect(getToken()).toBe(validToken())
  })
})
