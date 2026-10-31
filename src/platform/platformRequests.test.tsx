import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { saveToken, getToken } from '../auth/session'
import { routes } from '../routes'
import { jsonResponse, makeToken, renderRoute, validToken } from '../test/utils'
import { savePlatformSession, getPlatformToken } from './platformSession'
import { type PlatformRegistrationRequest, type RegistrationStatus } from './platformApi'
import { userMessage } from '../api/errorMessages'
import { ApiError } from '../lib/api'

const root = '/api/platform/registration-requests'
const url = '/plataforma/solicitudes'
const row = (overrides: Partial<PlatformRegistrationRequest> = {}): PlatformRegistrationRequest => ({
  id: 'request-1', status: 'PENDING', businessName: 'Taller Norte', slug: 'taller-norte', nit: '900123456-7', phone: '3001234567',
  contactName: 'Ana Ruiz', contactEmail: 'ana@example.test', createdAt: '2026-10-30T02:00:00', reservationExpiresAt: '2099-11-05T15:00:00',
  reservationExpired: false, reviewedAt: null, reviewerId: null, rejectionReason: null, version: 3,
  matches: { requestsWithSameNit: 2, requestsWithSameEmail: 3, tenantsWithSameNit: 1 }, ...overrides,
})
const page = (items: PlatformRegistrationRequest[], pageNumber = 0, total = items.length) => ({ items, page: pageNumber, size: 25, totalElements: total, totalPages: Math.ceil(total / 25) })
type Handler = (url: URL, init?: RequestInit) => Response | Promise<Response>
function api(overrides: Record<string, Handler> = {}) {
  const handlers: Record<string, Handler> = {
    '/api/platform/auth/me': () => jsonResponse({ id: 1, email: 'platform@example.test' }),
    '/api/platform/metrics': () => jsonResponse({ tenants: { ACTIVE: 1, SUSPENDED: 0 }, users: { total: 1, active: 1, inactive: 0 }, registrationRequests: { PENDING: 1 }, outboxMessages: { PENDING: 1, SENT: 0, FAILED: 0 } }),
    [root]: () => jsonResponse(page([row()])),
    [`${root}/request-1`]: () => jsonResponse(row()), ...overrides,
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
  const token = makeToken({ sub: '1', identityType: 'PLATFORM', exp: Math.floor(Date.now() / 1000) + 3600 })
  savePlatformSession(token, { id: 1, email: 'platform@example.test' })
  return token
}
const calls = (mock: ReturnType<typeof api>, path: string) => mock.mock.calls.filter(([input]) => new URL(String(input), 'http://localhost').pathname === path)
const fail = (message: string, status: number) => jsonResponse({ error: message, status }, status)
async function openAction(name: string) {
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name }))
  return { user, dialog: within(screen.getByRole('dialog')) }
}

describe('cola de solicitudes', () => {
  it('pagina por servidor con estado y pagina en URL y conserva el contexto al recargar detalle y volver', async () => {
    const mock = api({ [root]: (u) => jsonResponse(page([row()], Number(u.searchParams.get('page')), 51)) })
    signIn()
    const router = renderRoute(`${url}?estado=PENDING&pagina=2`)
    const user = userEvent.setup()
    await screen.findByRole('table')
    expect(await screen.findByText('26 a 26 de 51 solicitudes')).toBeInTheDocument()
    const listCall = calls(mock, root)[0]
    expect(new URL(String(listCall?.[0]), 'http://localhost').searchParams.toString()).toBe('page=1&size=25&status=PENDING')
    await user.click(screen.getAllByRole('link', { name: 'Revisar Taller Norte' })[0]!)
    await screen.findByRole('heading', { name: 'Taller Norte' })
    expect(router.state.location.search).toBe('?estado=PENDING&pagina=2')
    await user.click(screen.getByRole('link', { name: 'Volver a solicitudes' }))
    await screen.findByRole('table')
    expect(router.state.location.search).toBe('?estado=PENDING&pagina=2')
    await user.click(screen.getByRole('button', { name: 'Página siguiente' }))
    await waitFor(() => expect(router.state.location.search).toContain('pagina=3'))
    await user.selectOptions(screen.getByLabelText('Estado'), 'REJECTED')
    await waitFor(() => expect(router.state.location.search).toBe('?estado=REJECTED'))
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(router.state.location.search).toBe('')
    await waitFor(() => expect(String(calls(mock, root).at(-1)?.[0])).not.toContain('status='))
  })

  it('ajusta una pagina vacia al ultimo rango disponible', async () => {
    const mock = api({ [root]: (u) => jsonResponse(u.searchParams.get('page') === '8' ? page([], 8, 26) : page([row()], 1, 26)) })
    signIn()
    const router = renderRoute(`${url}?pagina=9`)
    await screen.findByRole('table')
    await waitFor(() => expect(router.state.location.search).toBe('?pagina=2'))
    await waitFor(() => expect(calls(mock, root)).toHaveLength(2))
    expect(await screen.findByText('26 a 26 de 26 solicitudes')).toBeInTheDocument()
  })

  it('normaliza parametros invalidos antes de consultar y permite revisar sin filtros', async () => {
    const mock = api({ [root]: () => jsonResponse(page([])) })
    signIn()
    renderRoute(`${url}?estado=ARCHIVED&pagina=-5`)
    await screen.findByText('No hay solicitudes de registro.')
    expect(String(calls(mock, root)[0]?.[0])).toBe('/api/platform/registration-requests?page=0&size=25')
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })

  it('muestra carga, error y recuperacion del listado', async () => {
    let resolve!: (r: Response) => void
    let first = true
    api({ [root]: () => first ? new Promise<Response>((r) => { resolve = r }) : jsonResponse(page([row()])) })
    signIn()
    renderRoute(url)
    await waitFor(() => expect(resolve).toBeDefined())
    expect(screen.getByRole('table').querySelector('tbody')).toHaveAttribute('aria-busy', 'true')
    await act(async () => resolve(fail('Fallo', 500)))
    first = false
    await userEvent.click(await screen.findByRole('button', { name: 'Reintentar' }))
    await screen.findByRole('table')
  })

  it('abre la cola y cada solicitud desde Resumen conservando su limite', async () => {
    const mock = api()
    signIn()
    const router = renderRoute('/plataforma')
    const user = userEvent.setup()
    await screen.findAllByRole('link', { name: 'Revisar Taller Norte' })
    expect(String(calls(mock, root)[0]?.[0])).toBe(`${root}?status=PENDING&page=0&size=5`)
    expect(screen.getAllByRole('link', { name: 'Revisar Taller Norte' })[0]).toHaveAttribute('href', `${url}/request-1?estado=PENDING`)
    await user.click(screen.getByRole('link', { name: 'Ver todas' }))
    await screen.findByRole('heading', { level: 1, name: 'Solicitudes de registro' })
    expect(router.state.location.search).toBe('?estado=PENDING')
  })
})

describe('filtros de solicitudes en servidor', () => {
  it.each([
    ['serviteca', 'tenantName', '100% Llantas'],
    ['responsable', 'contactName', 'María_López'],
    ['desde', 'receivedFrom', '2026-10-01'],
    ['hasta', 'receivedTo', '2026-10-31'],
  ])('envia %s por separado como %s sin transformar su valor', async (key, apiKey, value) => {
    const mock = api()
    signIn()
    renderRoute(`${url}?${new URLSearchParams({ [key]: value })}`)
    await screen.findAllByRole('link', { name: 'Revisar Taller Norte' })
    const sent = new URL(String(calls(mock, root)[0]?.[0]), 'http://localhost').searchParams
    expect(Object.fromEntries(sent)).toEqual({ page: '0', size: '25', [apiKey]: value })
    expect(calls(mock, root)).toHaveLength(1)
  })

  it('combina los cinco filtros y pagina con el total filtrado sin filtrar filas en el cliente', async () => {
    const mock = api({ [root]: () => jsonResponse(page([row()], 1, 27)) })
    signIn()
    const search = new URLSearchParams({ serviteca: '  100%_Llantas  ', responsable: ' María ', desde: '2026-10-15', hasta: '2026-10-15', estado: 'APPROVED', pagina: '2' })
    renderRoute(`${url}?${search}`)
    expect(await screen.findByText('26 a 26 de 27 solicitudes')).toBeInTheDocument()
    const sent = new URL(String(calls(mock, root)[0]?.[0]), 'http://localhost').searchParams
    expect(Object.fromEntries(sent)).toEqual({ status: 'APPROVED', page: '1', size: '25', tenantName: '100%_Llantas', contactName: 'María', receivedFrom: '2026-10-15', receivedTo: '2026-10-15' })
    // El fixture devuelto se muestra aunque su nombre no coincida: la seleccion es del servidor.
    expect(screen.getAllByRole('link', { name: 'Revisar Taller Norte' })).toHaveLength(2)
    expect(screen.getByLabelText('Serviteca')).toHaveValue('  100%_Llantas  ')
    expect(screen.getByLabelText('Estado')).toHaveValue('APPROVED')
  })

  it('omite todos los valores vacios sin perder parametros ajenos', async () => {
    const mock = api({ [root]: () => jsonResponse(page([])) })
    signIn()
    renderRoute(`${url}?serviteca=+++&responsable=&desde=&hasta=&origen=revision`)
    await screen.findByText('No hay solicitudes de registro.')
    expect(String(calls(mock, root)[0]?.[0])).toBe(`${root}?page=0&size=25`)
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument()
  })

  it('usa debounce y Enter, reinicia pagina y conserva los otros filtros', async () => {
    const mock = api({ [root]: () => jsonResponse(page([row()], 1, 51)) })
    signIn()
    const router = renderRoute(`${url}?estado=PENDING&pagina=2&origen=revision`)
    await screen.findByText('26 a 26 de 51 solicitudes')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Serviteca'), 'Norte')
    expect(calls(mock, root)).toHaveLength(1)
    expect(screen.getByLabelText('Serviteca')).toHaveValue('Norte')
    await waitFor(() => expect(calls(mock, root)).toHaveLength(2))
    expect(new URLSearchParams(router.state.location.search).get('pagina')).toBeNull()
    await user.type(screen.getByLabelText('Responsable'), 'Ana{Enter}')
    await waitFor(() => expect(calls(mock, root)).toHaveLength(3))
    const params = new URL(String(calls(mock, root).at(-1)?.[0]), 'http://localhost').searchParams
    expect(Object.fromEntries(params)).toEqual({ status: 'PENDING', page: '0', size: '25', tenantName: 'Norte', contactName: 'Ana' })
    expect(new URLSearchParams(router.state.location.search).get('origen')).toBe('revision')
  })

  it.each([
    ['Desde', 'desde', 'receivedFrom'], ['Hasta', 'hasta', 'receivedTo'],
  ])('admite fecha abierta %s, la conserva como cadena y reinicia pagina al cambiar', async (label, key, apiKey) => {
    const mock = api({ [root]: () => jsonResponse(page([row()], 1, 51)) })
    signIn()
    const router = renderRoute(`${url}?pagina=2&estado=PENDING`)
    await screen.findByText('26 a 26 de 51 solicitudes')
    fireEvent.change(screen.getByLabelText(label), { target: { value: '2026-10-15' } })
    fireEvent.blur(screen.getByLabelText(label))
    await waitFor(() => expect(calls(mock, root)).toHaveLength(2))
    const sent = new URL(String(calls(mock, root).at(-1)?.[0]), 'http://localhost').searchParams
    expect(Object.fromEntries(sent)).toEqual({ page: '0', size: '25', status: 'PENDING', [apiKey]: '2026-10-15' })
    expect(new URLSearchParams(router.state.location.search).get(key)).toBe('2026-10-15')
    expect(new URLSearchParams(router.state.location.search).has('pagina')).toBe(false)
  })

  it('rango invertido conserva fechas, no consulta y permite corregir dejando una fecha abierta', async () => {
    const mock = api()
    signIn()
    const router = renderRoute(`${url}?desde=2026-10-31&hasta=2026-10-01&estado=PENDING`)
    expect(await screen.findByText('Desde no puede ser posterior a Hasta.')).toBeInTheDocument()
    expect(screen.getByLabelText('Desde')).toHaveValue('2026-10-31')
    expect(screen.getByLabelText('Hasta')).toHaveValue('2026-10-01')
    expect(screen.getByLabelText('Hasta')).toHaveAttribute('aria-invalid', 'true')
    expect(calls(mock, root)).toHaveLength(0)
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '' } })
    fireEvent.blur(screen.getByLabelText('Hasta'))
    await screen.findAllByRole('link', { name: 'Revisar Taller Norte' })
    expect(new URLSearchParams(router.state.location.search).has('hasta')).toBe(false)
    expect(screen.queryByText('Desde no puede ser posterior a Hasta.')).not.toBeInTheDocument()
  })

  it('limpia todos los filtros y pagina, incluso texto pendiente, conservando parametros ajenos', async () => {
    const mock = api({ [root]: (u) => jsonResponse(page([row()], Number(u.searchParams.get('page')), 51)) })
    signIn()
    const router = renderRoute(`${url}?serviteca=Norte&responsable=Ana&desde=2026-10-01&hasta=2026-10-31&estado=PENDING&pagina=2&origen=revision`)
    const user = userEvent.setup()
    await screen.findByText('26 a 26 de 51 solicitudes')
    await user.type(screen.getByLabelText('Serviteca'), ' Sur')
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    await waitFor(() => expect(router.state.location.search).toBe('?origen=revision'))
    for (const label of ['Serviteca', 'Responsable', 'Desde', 'Hasta']) expect(screen.getByLabelText(label)).toHaveValue('')
    expect(screen.getByLabelText('Estado')).toHaveValue('')
    await waitFor(() => expect(String(calls(mock, root).at(-1)?.[0])).toBe(`${root}?page=0&size=25`))
  })

  it('recarga con filtros en URL y conserva el contexto al abrir detalle y regresar', async () => {
    api({ [root]: () => jsonResponse(page([row()], 1, 51)) })
    signIn()
    const search = '?serviteca=Norte&responsable=Ana&desde=2026-10-01&hasta=2026-10-31&estado=PENDING&pagina=2&origen=revision'
    const router = renderRoute(`${url}${search}`)
    const user = userEvent.setup()
    await screen.findAllByRole('link', { name: 'Revisar Taller Norte' })
    await user.click(screen.getAllByRole('link', { name: 'Revisar Taller Norte' })[0]!)
    await screen.findByRole('heading', { name: 'Taller Norte' })
    expect(router.state.location.search).toBe(search)
    await user.click(screen.getByRole('link', { name: 'Volver a solicitudes' }))
    await screen.findAllByRole('link', { name: 'Revisar Taller Norte' })
    expect(router.state.location.search).toBe(search)
    expect(screen.getByLabelText('Serviteca')).toHaveValue('Norte')
    expect(screen.getByLabelText('Responsable')).toHaveValue('Ana')
    expect(screen.getByLabelText('Desde')).toHaveValue('2026-10-01')
    expect(screen.getByLabelText('Hasta')).toHaveValue('2026-10-31')
  })

  it('atras y adelante restauran campos, estado y pagina desde el historial', async () => {
    api({ [root]: (u) => jsonResponse(page([row()], Number(u.searchParams.get('page')), 51)) })
    signIn()
    const router = renderRoute(`${url}?serviteca=Norte&responsable=Ana&desde=2026-10-01&hasta=2026-10-31&estado=PENDING&pagina=2`)
    const user = userEvent.setup()
    await screen.findByText('26 a 26 de 51 solicitudes')
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    await waitFor(() => expect(router.state.location.search).toBe(''))
    await act(async () => { await router.navigate(-1) })
    expect(screen.getByLabelText('Serviteca')).toHaveValue('Norte')
    expect(screen.getByLabelText('Responsable')).toHaveValue('Ana')
    expect(screen.getByLabelText('Desde')).toHaveValue('2026-10-01')
    expect(screen.getByLabelText('Hasta')).toHaveValue('2026-10-31')
    expect(screen.getByLabelText('Estado')).toHaveValue('PENDING')
    expect(new URLSearchParams(router.state.location.search).get('pagina')).toBe('2')
    await act(async () => { await router.navigate(1) })
    for (const label of ['Serviteca', 'Responsable', 'Desde', 'Hasta']) expect(screen.getByLabelText(label)).toHaveValue('')
    expect(screen.getByLabelText('Estado')).toHaveValue('')
  })

  it('crea claves de cache distintas para cada filtro conservando el prefijo de invalidacion', async () => {
    api()
    signIn()
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const router = createMemoryRouter(routes, { initialEntries: [url] })
    render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>)
    await screen.findAllByRole('link', { name: 'Revisar Taller Norte' })
    const changes = [
      ['serviteca', 'Norte', 'tenantName'], ['responsable', 'Ana', 'contactName'],
      ['desde', '2026-10-01', 'receivedFrom'], ['hasta', '2026-10-31', 'receivedTo'],
    ]
    const expected = { tenantName: '', contactName: '', receivedFrom: '', receivedTo: '' }
    const params = new URLSearchParams()
    for (const [key, value, apiKey] of changes) {
      params.set(key!, value!)
      await act(async () => { await router.navigate(`${url}?${params}`) })
      Object.assign(expected, { [apiKey!]: value })
      await waitFor(() => expect(client.getQueryState(['platform', 'registration-requests', 'list', '', 1, expected])?.status).toBe('success'))
    }
    expect(client.getQueryCache().findAll({ queryKey: ['platform', 'registration-requests', 'list'] })).toHaveLength(5)
    await act(async () => { await client.invalidateQueries({ queryKey: ['platform', 'registration-requests'], refetchType: 'none' }) })
    expect(client.getQueryCache().findAll({ queryKey: ['platform', 'registration-requests'] }).every((query) => query.state.isInvalidated)).toBe(true)
  })

  it('diferencia ausencia de solicitudes de filtros sin coincidencias y usa total filtrado cero', async () => {
    api({ [root]: () => jsonResponse(page([])) })
    signIn()
    const router = renderRoute(url)
    expect(await screen.findByText('No hay solicitudes de registro.')).toBeInTheDocument()
    await act(async () => { await router.navigate(`${url}?serviteca=Inexistente`) })
    expect(await screen.findByText('No hay solicitudes que coincidan con estos filtros.')).toBeInTheDocument()
    expect(screen.getByText('0 a 0 de 0 solicitudes')).toBeInTheDocument()
  })

  it.each([
    ['El filtro de texto no puede superar 100 caracteres', 'El filtro de texto no puede superar 100 caracteres.', { serviteca: 'x'.repeat(101), responsable: 'Ana', desde: '2026-10-01' }],
    ['La fecha debe tener formato AAAA-MM-DD', 'Escribe una fecha válida con formato AAAA-MM-DD.', { serviteca: 'Norte', responsable: 'Ana', desde: '2026-10-01' }],
    ['La fecha inicial no puede ser posterior a la final', 'Desde no puede ser posterior a Hasta.', { serviteca: 'Norte', responsable: 'Ana', desde: '2026-10-01' }],
  ])('400 %s conserva entradas y permite reintentar', async (backendMessage, expected, filters) => {
    let failed = true
    const mock = api({ [root]: () => failed ? fail(backendMessage, 400) : jsonResponse(page([row()])) })
    signIn()
    const search = new URLSearchParams(filters)
    const router = renderRoute(`${url}?${search}`)
    expect(await screen.findByText(expected)).toBeInTheDocument()
    expect(screen.getByLabelText('Serviteca')).toHaveValue(filters.serviteca)
    expect(screen.getByLabelText('Responsable')).toHaveValue(filters.responsable)
    expect(screen.getByLabelText('Desde')).toHaveValue(filters.desde)
    expect(router.state.location.search).toBe(`?${search}`)
    expect(userMessage(new ApiError(backendMessage, 400))).toBe(expected)
    failed = false
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await screen.findAllByRole('link', { name: 'Revisar Taller Norte' })
    expect(calls(mock, root)).toHaveLength(2)
    expect(screen.getByLabelText('Serviteca')).toHaveValue(filters.serviteca)
  })
})

describe('detalle y estados', () => {
  it('muestra los datos reales, cantidades de coincidencias y fechas de Bogota sin informacion secreta', async () => {
    api()
    signIn()
    renderRoute(`${url}/request-1?estado=PENDING&pagina=2`)
    await screen.findByRole('heading', { name: 'Taller Norte' })
    for (const value of ['Ana Ruiz', 'ana@example.test', '900123456-7', '3001234567', 'taller-norte']) expect(screen.getByText(value)).toBeInTheDocument()
    const matches = screen.getByRole('heading', { name: 'Coincidencias' }).closest('section')!
    for (const [label, value] of [['Otras solicitudes con el mismo NIT', '2'], ['Otras solicitudes con el mismo correo', '3'], ['Servitecas con el mismo NIT', '1']]) {
      expect(within(matches).getByText(label!).nextElementSibling).toHaveTextContent(value!)
    }
    expect(screen.getByText(/29\/10\/26/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aprobar y enviar enlace' })).toBeEnabled()
    expect(screen.queryByText(/JWT|contraseña|cifrado/)).not.toBeInTheDocument()
  })

  it.each<[RegistrationStatus, boolean, string[]]>([
    ['PENDING', false, ['Rechazar solicitud', 'Aprobar y enviar enlace']],
    ['PENDING', true, ['Rechazar solicitud']], ['APPROVED', false, ['Reenviar activación']],
    ['APPROVED', true, []], ['REJECTED', false, []], ['CANCELLED', false, []], ['ACTIVATED', false, []],
  ])('estado %s con reserva vencida %s ofrece solo acciones permitidas', async (status, reservationExpired, actions) => {
    api({ [`${root}/request-1`]: () => jsonResponse(row({ status, reservationExpired, rejectionReason: status === 'REJECTED' ? 'Datos incorrectos' : null })) })
    signIn()
    renderRoute(`${url}/request-1`)
    await screen.findByRole('heading', { name: 'Taller Norte' })
    for (const name of ['Rechazar solicitud', 'Aprobar y enviar enlace', 'Reenviar activación']) {
      expect(Boolean(screen.queryByRole('button', { name }))).toBe(actions.includes(name))
    }
    if (reservationExpired) expect(screen.getByText('Vencida')).toBeInTheDocument()
    if (status === 'REJECTED') expect(screen.getByText('Datos incorrectos')).toBeInTheDocument()
  })

  it('impide aprobar aunque el indicador de reserva no se haya refrescado al vencer la fecha', async () => {
    api({ [`${root}/request-1`]: () => jsonResponse(row({ reservationExpiresAt: '2020-01-01T00:00:00' })) })
    signIn()
    renderRoute(`${url}/request-1`)
    await screen.findByRole('heading', { name: 'Taller Norte' })
    expect(screen.queryByRole('button', { name: 'Aprobar y enviar enlace' })).not.toBeInTheDocument()
  })

  it('distingue coincidencias ausentes de cantidades cero', async () => {
    api({ [`${root}/request-1`]: () => jsonResponse(row({ matches: null })) })
    signIn()
    renderRoute(`${url}/request-1`)
    expect(await screen.findByText('Sin datos de coincidencias.')).toBeInTheDocument()
  })

  it('404 muestra solicitud inexistente y regreso sin toast', async () => {
    api({ [`${root}/request-1`]: () => fail('Solicitud no encontrada', 404) })
    signIn()
    renderRoute(`${url}/request-1?estado=REJECTED&pagina=3`)
    await screen.findByText('Solicitud no encontrada. Puede que ya no exista.')
    expect(screen.getAllByRole('link', { name: 'Volver a solicitudes' })[0]).toHaveAttribute('href', `${url}?estado=REJECTED&pagina=3`)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('confirmaciones y recuperacion', () => {
  it('atrapa Tab en la confirmacion y Escape sin cambios devuelve foco al disparador', async () => {
    api()
    signIn()
    renderRoute(`${url}/request-1`)
    const { user, dialog } = await openAction('Aprobar y enviar enlace')
    const confirm = dialog.getByRole('button', { name: 'Aprobar y enviar enlace' })
    confirm.focus()
    await user.tab()
    expect(dialog.getByRole('button', { name: 'Cerrar' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(confirm).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aprobar y enviar enlace' })).toHaveFocus()
  })

  it('404 durante una decision conserva la confirmacion y permite comprobar si sigue existiendo', async () => {
    api({ [`${root}/request-1/approve`]: () => fail('Solicitud no encontrada', 404) })
    signIn()
    renderRoute(`${url}/request-1`)
    const { user, dialog } = await openAction('Aprobar y enviar enlace')
    await user.click(dialog.getByRole('button', { name: 'Aprobar y enviar enlace' }))
    await dialog.findByText('No encontramos esta solicitud. Puede que ya no exista.')
    expect(dialog.getByRole('button', { name: 'Aprobar y enviar enlace' })).toBeDisabled()
    expect(dialog.getByRole('button', { name: 'Actualizar solicitud' })).toBeEnabled()
  })

  it('aprueba con la version revisada y bloquea doble envio y cierre mientras esta pendiente', async () => {
    let resolve!: (r: Response) => void
    const mock = api({ [`${root}/request-1/approve`]: () => new Promise<Response>((r) => { resolve = r }) })
    signIn()
    renderRoute(`${url}/request-1`)
    const { user, dialog } = await openAction('Aprobar y enviar enlace')
    expect(dialog.getByText(/El acceso requiere completar/)).toBeInTheDocument()
    expect(dialog.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    await user.dblClick(dialog.getByRole('button', { name: 'Aprobar y enviar enlace' }))
    expect(calls(mock, `${root}/request-1/approve`)).toHaveLength(1)
    const call = calls(mock, `${root}/request-1/approve`)[0]
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ expectedVersion: 3 })
    expect(call?.[1]?.method).toBe('POST')
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await act(async () => resolve(jsonResponse(row({ status: 'APPROVED', version: 4 }))))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText(/Correo de activación encolado/)).toBeInTheDocument()
  })

  it('rechaza con motivo recortado y version; valida motivo vacio y longitud antes de enviar', async () => {
    const mock = api({ [`${root}/request-1/reject`]: () => jsonResponse(row({ status: 'REJECTED', version: 4 })) })
    signIn()
    renderRoute(`${url}/request-1`)
    const { user, dialog } = await openAction('Rechazar solicitud')
    const input = dialog.getByLabelText('Motivo del rechazo')
    expect(input).toHaveFocus()
    await user.click(dialog.getByRole('button', { name: 'Rechazar solicitud' }))
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveFocus()
    await user.paste('x'.repeat(501))
    await user.click(dialog.getByRole('button', { name: 'Rechazar solicitud' }))
    expect(dialog.getByText('El motivo del rechazo no puede superar 500 caracteres.')).toBeInTheDocument()
    expect(calls(mock, `${root}/request-1/reject`)).toHaveLength(0)
    await user.clear(input)
    await user.type(input, '  Datos incorrectos  ')
    await user.click(dialog.getByRole('button', { name: 'Rechazar solicitud' }))
    await waitFor(() => expect(calls(mock, `${root}/request-1/reject`)).toHaveLength(1))
    expect(JSON.parse(String(calls(mock, `${root}/request-1/reject`)[0]?.[1]?.body))).toEqual({ expectedVersion: 3, reason: 'Datos incorrectos' })
  })

  it('Escape conserva formulario con cambios y permite continuar editando', async () => {
    api()
    signIn()
    renderRoute(`${url}/request-1`)
    const { user, dialog } = await openAction('Rechazar solicitud')
    await user.type(dialog.getByLabelText('Motivo del rechazo'), 'Revisar datos')
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toHaveTextContent('¿Descartar los cambios?')
    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(screen.getByLabelText('Motivo del rechazo')).toHaveValue('Revisar datos')
  })

  it.each([400, 403, 500])('error %s conserva el motivo y permite reintento manual', async (status) => {
    let failed = true
    const mock = api({ [`${root}/request-1/reject`]: () => failed ? fail(status === 400 ? 'El motivo de rechazo es obligatorio' : 'Fallo', status) : jsonResponse(row({ status: 'REJECTED' })) })
    signIn()
    renderRoute(`${url}/request-1`)
    const { user, dialog } = await openAction('Rechazar solicitud')
    await user.type(dialog.getByLabelText('Motivo del rechazo'), 'Conservar motivo')
    await user.click(dialog.getByRole('button', { name: 'Rechazar solicitud' }))
    await waitFor(() => expect(dialog.getByRole('alert')).toBeInTheDocument())
    expect(dialog.getByLabelText('Motivo del rechazo')).toHaveValue('Conservar motivo')
    expect(calls(mock, `${root}/request-1/reject`)).toHaveLength(1)
    failed = false
    await user.click(dialog.getByRole('button', { name: 'Rechazar solicitud' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('409 bloquea confirmacion hasta actualizar explicitamente y conserva el motivo usando nueva version', async () => {
    let changed = false
    const mock = api({
      [`${root}/request-1`]: () => jsonResponse(row({ version: changed ? 4 : 3 })),
      [`${root}/request-1/reject`]: (_u, init) => {
        if (JSON.parse(String(init?.body)).expectedVersion === 3) { changed = true; return fail('El recurso cambio; actualiza e intenta de nuevo', 409) }
        return jsonResponse(row({ status: 'REJECTED', version: 5 }))
      },
    })
    signIn()
    renderRoute(`${url}/request-1`)
    const { user, dialog } = await openAction('Rechazar solicitud')
    await user.type(dialog.getByLabelText('Motivo del rechazo'), 'Conservar')
    await user.click(dialog.getByRole('button', { name: 'Rechazar solicitud' }))
    await dialog.findByText('La solicitud cambió mientras la revisabas. Actualízala antes de continuar.')
    expect(dialog.getByRole('button', { name: 'Rechazar solicitud' })).toBeDisabled()
    expect(calls(mock, `${root}/request-1`)).toHaveLength(1)
    await user.click(dialog.getByRole('button', { name: 'Actualizar solicitud' }))
    await waitFor(() => expect(dialog.getByRole('button', { name: 'Rechazar solicitud' })).toBeEnabled())
    expect(dialog.getByLabelText('Motivo del rechazo')).toHaveValue('Conservar')
    await user.click(dialog.getByRole('button', { name: 'Rechazar solicitud' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(JSON.parse(String(calls(mock, `${root}/request-1/reject`)[1]?.[1]?.body))).toEqual({ expectedVersion: 4, reason: 'Conservar' })
  })

  it('409 por estado y fallo al actualizar conservan formulario y luego muestran accion imposible', async () => {
    let detailCalls = 0
    api({
      [`${root}/request-1`]: () => ++detailCalls === 1 ? jsonResponse(row()) : detailCalls === 2 ? fail('Fallo', 500) : jsonResponse(row({ status: 'CANCELLED' })),
      [`${root}/request-1/approve`]: () => fail('La solicitud ya no permite esta operacion', 409),
    })
    signIn()
    renderRoute(`${url}/request-1`)
    const { user, dialog } = await openAction('Aprobar y enviar enlace')
    await user.click(dialog.getByRole('button', { name: 'Aprobar y enviar enlace' }))
    await dialog.findByText(/La solicitud cambió de estado/)
    await user.click(dialog.getByRole('button', { name: 'Actualizar solicitud' }))
    await waitFor(() => expect(dialog.getAllByRole('alert')).toHaveLength(2))
    await user.click(dialog.getByRole('button', { name: 'Actualizar solicitud' }))
    await dialog.findByText('El estado actual o el vencimiento de la reserva ya no permiten esta acción.')
    expect(dialog.getByRole('button', { name: 'Aprobar y enviar enlace' })).toBeDisabled()
  })

  it('reenvia sin cuerpo, confirma revocacion y maneja 202 sin prometer recepcion', async () => {
    const mock = api({ [`${root}/request-1`]: () => jsonResponse(row({ status: 'APPROVED' })), [`${root}/request-1/resend-activation`]: () => jsonResponse(row({ status: 'APPROVED' }), 202) })
    signIn()
    renderRoute(`${url}/request-1`)
    const { user, dialog } = await openAction('Reenviar activación')
    expect(dialog.getByText(/Se revocará el enlace anterior/)).toBeInTheDocument()
    await user.click(dialog.getByRole('button', { name: 'Reenviar activación' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(calls(mock, `${root}/request-1/resend-activation`)[0]?.[1]?.body).toBeUndefined()
    expect(await screen.findByText(/Correo de activación encolado/)).toBeInTheDocument()
  })

  it.each(['Espera un momento antes de reenviar la activacion', 'Se alcanzo el limite diario de reenvios de esta solicitud'])('429 %s no reintenta ni inventa cuenta regresiva', async (message) => {
    const mock = api({ [`${root}/request-1`]: () => jsonResponse(row({ status: 'APPROVED' })), [`${root}/request-1/resend-activation`]: () => fail(message, 429) })
    signIn()
    renderRoute(`${url}/request-1`)
    const { user, dialog } = await openAction('Reenviar activación')
    await user.click(dialog.getByRole('button', { name: 'Reenviar activación' }))
    await dialog.findByRole('alert')
    expect(calls(mock, `${root}/request-1/resend-activation`)).toHaveLength(1)
    expect(screen.queryByRole('timer')).not.toBeInTheDocument()
    expect(dialog.getByRole('button', { name: 'Reenviar activación' })).toBeEnabled()
  })

  it('invalidacion incluye detalle, cola, cinco pendientes y metricas sin tocar cache comercial', async () => {
    let approved = false
    api({ [`${root}/request-1`]: () => jsonResponse(row({ status: approved ? 'APPROVED' : 'PENDING' })), [`${root}/request-1/approve`]: () => { approved = true; return jsonResponse(row({ status: 'APPROVED' })) } })
    signIn()
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const keys = [['platform', 'registration-requests', 'list', 'PENDING', 1], ['platform', 'registration-requests', 'PENDING', 5], ['platform', 'metrics'], ['tenant']]
    keys.forEach((key) => client.setQueryData(key, { sentinel: true }))
    const router = createMemoryRouter(routes, { initialEntries: [`${url}/request-1`] })
    render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>)
    const { user, dialog } = await openAction('Aprobar y enviar enlace')
    await user.click(dialog.getByRole('button', { name: 'Aprobar y enviar enlace' }))
    await screen.findByRole('button', { name: 'Reenviar activación' })
    keys.slice(0, 3).forEach((key) => expect(client.getQueryState(key)?.isInvalidated).toBe(true))
    expect(client.getQueryState(['tenant'])?.isInvalidated).toBe(false)
    expect(client.getQueryData(['platform', 'registration-requests', 'detail', 'request-1'])).toMatchObject({ status: 'APPROVED' })
  })
})

describe('proteccion y aislamiento', () => {
  it.each([url, `${url}/request-1`])('sesion comercial no autoriza %s', async (path) => {
    const mock = api()
    saveToken(validToken())
    const router = renderRoute(path)
    await screen.findByRole('heading', { name: 'Acceso de plataforma' })
    expect(router.state.location.pathname).toBe('/plataforma/login')
    expect(mock).not.toHaveBeenCalled()
  })

  it('401 de solicitudes cierra solo plataforma y usa su Bearer', async () => {
    const mock = api({ [`${root}/request-1`]: () => fail('No autenticado', 401) })
    const tenant = validToken()
    saveToken(tenant)
    const token = signIn()
    renderRoute(`${url}/request-1`)
    await screen.findByRole('heading', { name: 'Acceso de plataforma' })
    expect(getToken()).toBe(tenant)
    expect(getPlatformToken()).toBeNull()
    expect(calls(mock, `${root}/request-1`)[0]?.[1]?.headers).toMatchObject({ Authorization: `Bearer ${token}` })
  })
})

describe('mensajes exactos verificados contra backend', () => {
  it.each([
    [400, 'Paginacion invalida', 'La paginación no es válida. Vuelve al listado.'],
    [404, 'Solicitud no encontrada', 'No encontramos esta solicitud. Puede que ya no exista.'],
    [400, 'El motivo de rechazo es obligatorio', 'Escribe el motivo del rechazo.'],
    [400, 'El motivo de rechazo no puede superar 500 caracteres', 'El motivo del rechazo no puede superar 500 caracteres.'],
    [400, 'La version esperada es obligatoria', 'Actualiza la solicitud antes de continuar.'],
    [409, 'El codigo solicitado no esta disponible', 'El código solicitado ya no está disponible. Actualiza la solicitud.'],
    [409, 'La solicitud ya no permite esta operacion', 'La solicitud cambió de estado o su reserva venció. Actualízala antes de continuar.'],
    [409, 'El recurso cambio; actualiza e intenta de nuevo', 'La solicitud cambió mientras la revisabas. Actualízala antes de continuar.'],
    [429, 'Espera un momento antes de reenviar la activacion', 'Espera un momento antes de reenviar la activación.'],
    [429, 'Se alcanzo el limite diario de reenvios de esta solicitud', 'Se alcanzó el límite diario de reenvíos de esta solicitud.'],
  ] as const)('%s: %s', (status, backend, expected) => {
    expect(userMessage(new ApiError(backend, status))).toBe(expected)
  })
})
