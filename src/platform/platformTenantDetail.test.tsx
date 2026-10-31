import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { getToken, saveToken } from '../auth/session'
import { userMessage } from '../api/errorMessages'
import { ApiError } from '../lib/api'
import { EMPTY_VALUE } from '../lib/format'
import { routes } from '../routes'
import { jsonResponse, makeToken, renderRoute, validToken } from '../test/utils'
import { getPlatformToken, savePlatformSession } from './platformSession'
import type { PlatformTenant, PlatformTenantDetail, PlatformTenantUser } from './platformApi'

const root = '/api/platform/tenants/7'
const url = '/plataforma/servitecas/7'
const tenant = (overrides: Partial<PlatformTenant> = {}): PlatformTenant => ({
  id: 7, name: 'Serviteca El Roble', slug: 'elroble', nit: '900123456-7', phone: '3001234567', status: 'ACTIVE', version: 2,
  createdAt: '2026-10-30T02:00:00', suspendedAt: null, suspensionReason: null, ...overrides,
})
const suspended = (overrides: Partial<PlatformTenant> = {}) => tenant({ status: 'SUSPENDED', version: 3, suspendedAt: '2026-10-31T15:00:00', suspensionReason: 'Mora en el pago', ...overrides })
const detail = (t: PlatformTenant = tenant(), overrides: Partial<PlatformTenantDetail> = {}): PlatformTenantDetail => ({
  tenant: t, totalUsers: 4,
  userCounts: [{ role: 'ADMIN', active: true, count: 1 }, { role: 'CAJERO', active: true, count: 2 }, { role: 'MECANICO', active: false, count: 1 }],
  registrationRequest: { id: 'request-1', status: 'ACTIVATED', createdAt: '2026-10-29T14:00:00', reviewedAt: '2026-10-29T16:30:00' }, ...overrides,
})
const user = (overrides: Partial<PlatformTenantUser> = {}): PlatformTenantUser => ({
  id: 11, username: 'camila.torres', fullName: 'Camila Torres', email: 'camila@example.test', role: 'ADMIN', active: true,
  createdAt: '2026-10-30T02:00:00', updatedAt: '2026-10-30T03:00:00', ...overrides,
})
const usersPage = (items: PlatformTenantUser[], pageNumber = 0, total = items.length) => ({ items, page: pageNumber, size: 25, totalElements: total, totalPages: Math.ceil(total / 25) })
const defaultUsers = [user(), user({ id: 12, username: 'andres.ruiz', fullName: null, email: null, role: 'MECANICO', active: false })]
type Handler = (url: URL, init?: RequestInit) => Response | Promise<Response>
function api(overrides: Record<string, Handler> = {}) {
  const handlers: Record<string, Handler> = {
    '/api/platform/auth/me': () => jsonResponse({ id: 1, email: 'platform@example.test' }),
    '/api/platform/tenants': () => jsonResponse({ items: [tenant()], page: 0, size: 25, totalElements: 1, totalPages: 1 }),
    '/api/platform/metrics': () => jsonResponse({ tenants: { ACTIVE: 1, SUSPENDED: 0 }, users: { total: 4, active: 3, inactive: 1 }, registrationRequests: {}, outboxMessages: {} }),
    [root]: () => jsonResponse(detail()),
    [`${root}/users`]: () => jsonResponse(usersPage(defaultUsers)),
    ...overrides,
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
const bodies = (mock: ReturnType<typeof api>, path: string) => calls(mock, path).map(([, init]) => init?.body === undefined ? undefined : JSON.parse(String(init.body)))
const fail = (message: string, status: number) => jsonResponse({ error: message, status }, status)
const usersTable = async () => within(await screen.findByRole('table'))
async function open(name: string) {
  const u = userEvent.setup()
  // La tabla y las tarjetas (bajo md) estan en el DOM: se usa la primera.
  await u.click((await screen.findAllByRole('button', { name }))[0]!)
  return { u, dialog: within(screen.getByRole('dialog')) }
}

describe('detalle de serviteca', () => {
  it('muestra datos, solicitud de origen y desglose de usuarios de una serviteca activa', async () => {
    api()
    signIn()
    renderRoute(`${url}?q=roble&estado=ACTIVE&pagina=2`)
    expect(await screen.findByRole('heading', { level: 2, name: 'Serviteca El Roble' })).toBeInTheDocument()
    expect(document.title).toBe('Detalle de serviteca · ServiBox')
    const data = screen.getByRole('heading', { level: 2, name: 'Serviteca El Roble' }).closest('section')!
    expect(within(data).getByText('Activa')).toBeInTheDocument()
    for (const [label, value] of [['Código', 'elroble'], ['NIT', '900123456-7'], ['Teléfono', '3001234567']]) {
      expect(within(data).getByText(label!).nextSibling).toHaveTextContent(value!)
    }
    expect(within(data).getByText('Creada').nextSibling?.textContent).toMatch(/29\/10\/(20)?26/)
    expect(within(data).queryByText('Suspendida desde')).not.toBeInTheDocument()
    expect(within(data).queryByText('Motivo de la suspensión')).not.toBeInTheDocument()
    expect(within(data).getByText('Activada')).toBeInTheDocument()
    expect(within(data).getByText('Recibida').nextSibling?.textContent).toMatch(/29\/10\/(20)?26/)
    expect(within(data).getByText('Revisada').nextSibling?.textContent).toMatch(/29\/10\/(20)?26/)
    expect(within(data).getByRole('link', { name: 'Ver solicitud de registro' })).toHaveAttribute('href', '/plataforma/solicitudes/request-1')
    const users = screen.getByRole('region', { name: 'Usuarios' })
    for (const [label, value] of [['Total', '4'], ['Activos', '3'], ['Inactivos', '1'], ['Administrador', '1 activo · 0 inactivos'], ['Mecánico', '0 activos · 1 inactivo'], ['Cajero', '2 activos · 0 inactivos']]) {
      expect(within(users).getAllByText(label!)[0]!.nextSibling).toHaveTextContent(value!)
    }
    expect(screen.getByRole('link', { name: 'Volver a servitecas' })).toHaveAttribute('href', '/plataforma/servitecas?q=roble&estado=ACTIVE&pagina=2')
    expect(screen.getByRole('button', { name: 'Suspender serviteca' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cerrar todas las sesiones' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reactivar serviteca' })).not.toBeInTheDocument()
    expect(screen.queryByText(/versión|^2$|^7$/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Eliminar|Editar|Desactivar|Crear/ })).not.toBeInTheDocument()
  })

  it('muestra fecha y motivo de una suspendida, sin origen, y solo permite reactivar', async () => {
    api({ [root]: () => jsonResponse(detail(suspended(), { registrationRequest: null })) })
    signIn()
    renderRoute(url)
    const heading = await screen.findByRole('heading', { level: 2, name: 'Serviteca El Roble' })
    const data = heading.closest('section')!
    expect(within(data).getByText('Suspendida', { selector: 'span' })).toBeInTheDocument()
    expect(within(data).getByText('Suspendida desde').nextSibling?.textContent).toMatch(/31\/10\/(20)?26/)
    expect(within(data).getByText('Motivo de la suspensión').nextSibling).toHaveTextContent('Mora en el pago')
    expect(within(data).getByText('Sin solicitud asociada: se registró directamente.')).toBeInTheDocument()
    expect(within(data).queryByRole('link', { name: 'Ver solicitud de registro' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reactivar serviteca' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Suspender serviteca' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cerrar todas las sesiones' })).not.toBeInTheDocument()
    await usersTable()
    expect(screen.queryByRole('button', { name: /Cerrar sesiones de/ })).not.toBeInTheDocument()
  })

  it('consulta solo detalle y usuarios con el token de plataforma', async () => {
    const mock = api()
    saveToken(validToken())
    signIn()
    renderRoute(url)
    await usersTable()
    const paths = new Set(mock.mock.calls.map(([input]) => new URL(String(input), 'http://localhost').pathname))
    expect(paths).toEqual(new Set(['/api/platform/auth/me', root, `${root}/users`]))
    expect(Object.fromEntries(new URL(String(calls(mock, `${root}/users`)[0]?.[0]), 'http://localhost').searchParams)).toEqual({ page: '0', size: '25' })
    const headers = new Headers(calls(mock, root)[0]?.[1]?.headers)
    expect(headers.get('Authorization')).toMatch(/^Bearer /)
    expect(headers.get('Authorization')).not.toBe(`Bearer ${validToken()}`)
  })

  it('el listado enlaza al detalle y Volver conserva filtros y pagina', async () => {
    api({ '/api/platform/tenants': () => jsonResponse({ items: [tenant()], page: 1, size: 25, totalElements: 26, totalPages: 2 }) })
    signIn()
    const router = renderRoute('/plataforma/servitecas?q=roble&estado=ACTIVE&pagina=2')
    const u = userEvent.setup()
    await u.click((await screen.findAllByRole('link', { name: 'Ver detalle de Serviteca El Roble' }))[0]!)
    await waitFor(() => expect(router.state.location.pathname).toBe(url))
    expect(router.state.location.search).toBe('?q=roble&estado=ACTIVE&pagina=2')
    await u.click(await screen.findByRole('link', { name: 'Volver a servitecas' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/plataforma/servitecas'))
    expect(router.state.location.search).toBe('?q=roble&estado=ACTIVE&pagina=2')
  })

  it('404 del detalle muestra vuelta al listado sin consultar usuarios', async () => {
    const mock = api({ [root]: () => fail('Tenant no encontrado', 404) })
    signIn()
    renderRoute(`${url}?estado=SUSPENDED`)
    expect(await screen.findByText('Serviteca no encontrada. Puede que ya no exista.')).toBeInTheDocument()
    const links = screen.getAllByRole('link', { name: 'Volver a servitecas' })
    links.forEach((link) => expect(link).toHaveAttribute('href', '/plataforma/servitecas?estado=SUSPENDED'))
    expect(calls(mock, `${root}/users`)).toHaveLength(0)
    expect(screen.queryByText('No encontramos esta serviteca. Puede que ya no exista.')).not.toBeInTheDocument()
  })

  it('error del detalle permite reintentar', async () => {
    let failed = true
    api({ [root]: () => failed ? fail('Fallo', 500) : jsonResponse(detail()) })
    signIn()
    renderRoute(url)
    const retry = await screen.findByRole('button', { name: 'Reintentar' })
    failed = false
    await userEvent.click(retry)
    expect(await screen.findByRole('heading', { level: 2, name: 'Serviteca El Roble' })).toBeInTheDocument()
  })
})

describe('usuarios de la serviteca', () => {
  it('muestra solo los campos del contrato, sin hash ni tokens, y cerrar sesiones solo en activos', async () => {
    api({ [`${root}/users`]: () => jsonResponse(usersPage([{ ...user(), passwordHash: 'secreto', authVersion: 9 } as PlatformTenantUser, defaultUsers[1]!])) })
    signIn()
    renderRoute(url)
    const table = await usersTable()
    const rows = table.getAllByRole('row')
    expect(within(rows[0]!).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Usuario', 'Correo', 'Rol', 'Estado', 'Creado', 'Actualizado', 'Acciones'])
    const first = within(rows[1]!).getAllByRole('cell').map((c) => c.textContent)
    expect(first.slice(0, 4)).toEqual(['camila.torresCamila Torres', 'camila@example.test', 'Administrador', 'Activo'])
    expect(first[4]).toMatch(/29\/10\/(20)?26/)
    expect(first[6]).toBe('Cerrar sesiones')
    const second = within(rows[2]!).getAllByRole('cell').map((c) => c.textContent)
    expect([second[0], second[1], second[2], second[3], second[6]]).toEqual(['andres.ruiz', EMPTY_VALUE, 'Mecánico', 'Inactivo', EMPTY_VALUE])
    expect(screen.queryByText(/secreto|^9$|^11$/)).not.toBeInTheDocument()
    expect(screen.getByText('1 a 2 de 2 usuarios')).toBeInTheDocument()
  })

  it('pagina en el servidor de forma independiente', async () => {
    const mock = api({ [`${root}/users`]: (u) => {
      const p = Number(u.searchParams.get('page'))
      return jsonResponse(usersPage(p === 0 ? [user()] : [user({ id: 40, username: 'ultimo.usuario' })], p, 30))
    } })
    signIn()
    const router = renderRoute(`${url}?pagina=3`)
    expect(await screen.findByText('1 a 1 de 30 usuarios')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(await screen.findByText('26 a 26 de 30 usuarios')).toBeInTheDocument()
    expect((await usersTable()).getByText('ultimo.usuario')).toBeInTheDocument()
    expect(Object.fromEntries(new URL(String(calls(mock, `${root}/users`).at(-1)?.[0]), 'http://localhost').searchParams)).toEqual({ page: '1', size: '25' })
    expect(router.state.location.search).toBe('?pagina=3')
    expect(calls(mock, root)).toHaveLength(1)
  })

  it('carga, error con reintento y vacio no afectan el resto del detalle', async () => {
    let resolve!: (r: Response) => void
    let state: 'wait' | 'empty' = 'wait'
    api({ [`${root}/users`]: () => state === 'wait' ? new Promise<Response>((r) => { resolve = r }) : jsonResponse(usersPage([])) })
    signIn()
    renderRoute(url)
    await waitFor(() => expect(resolve).toBeDefined())
    expect(screen.getByRole('table').querySelector('tbody')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('heading', { level: 2, name: 'Serviteca El Roble' })).toBeInTheDocument()
    await act(async () => resolve(fail('Fallo', 500)))
    const retry = await within(screen.getByRole('region', { name: 'Usuarios' })).findByRole('button', { name: 'Reintentar' })
    expect(screen.getByRole('heading', { level: 2, name: 'Serviteca El Roble' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Suspender serviteca' })).toBeEnabled()
    state = 'empty'
    await userEvent.click(retry)
    expect(await screen.findByText('Esta serviteca no tiene usuarios.')).toBeInTheDocument()
  })
})

describe('suspender y reactivar', () => {
  it('suspender exige motivo, respeta el limite y envia expectedVersion con el motivo recortado', async () => {
    let done = false
    const mock = api({
      [root]: () => jsonResponse(detail(done ? suspended({ suspensionReason: 'Mora' }) : tenant())),
      [`${root}/suspend`]: () => { done = true; return jsonResponse(detail(suspended({ suspensionReason: 'Mora' }))) },
    })
    signIn()
    renderRoute(url)
    const { u, dialog } = await open('Suspender serviteca')
    expect(dialog.getByText(/no podrán entrar y sus sesiones activas se cerrarán de inmediato/)).toBeInTheDocument()
    expect(dialog.getByText('Serviteca El Roble · elroble')).toBeInTheDocument()
    const input = dialog.getByLabelText('Motivo de la suspensión')
    expect(dialog.getByText('Obligatorio. 0 de 500 caracteres.')).toBeInTheDocument()
    await u.click(dialog.getByRole('button', { name: 'Suspender serviteca' }))
    expect(dialog.getByText('Escribe el motivo de la suspensión.')).toBeInTheDocument()
    expect(input).toHaveFocus()
    await u.type(input, '   ')
    await u.click(dialog.getByRole('button', { name: 'Suspender serviteca' }))
    expect(dialog.getByText('Escribe el motivo de la suspensión.')).toBeInTheDocument()
    await u.clear(input)
    await u.click(input)
    await u.paste('x'.repeat(501))
    await u.click(dialog.getByRole('button', { name: 'Suspender serviteca' }))
    expect(dialog.getByText('El motivo no puede superar 500 caracteres.')).toBeInTheDocument()
    expect(calls(mock, `${root}/suspend`)).toHaveLength(0)
    await u.clear(input)
    await u.type(input, '  Mora  ')
    expect(dialog.getByText('Obligatorio. 4 de 500 caracteres.')).toBeInTheDocument()
    await u.click(dialog.getByRole('button', { name: 'Suspender serviteca' }))
    expect(await screen.findByText('Serviteca suspendida. Sus usuarios ya no pueden entrar y sus sesiones se cerraron.')).toBeInTheDocument()
    expect(bodies(mock, `${root}/suspend`)).toEqual([{ expectedVersion: 2, reason: 'Mora' }])
    expect(calls(mock, `${root}/suspend`)[0]?.[1]?.method).toBe('POST')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Reactivar serviteca' })).toBeInTheDocument()
  })

  it('500 caracteres exactos son validos', async () => {
    const mock = api({ [`${root}/suspend`]: () => jsonResponse(detail(suspended())) })
    signIn()
    renderRoute(url)
    const { u, dialog } = await open('Suspender serviteca')
    await u.click(dialog.getByLabelText('Motivo de la suspensión'))
    await u.paste('y'.repeat(500))
    expect(dialog.getByText('Obligatorio. 500 de 500 caracteres.')).toBeInTheDocument()
    await u.click(dialog.getByRole('button', { name: 'Suspender serviteca' }))
    await waitFor(() => expect(bodies(mock, `${root}/suspend`)).toEqual([{ expectedVersion: 2, reason: 'y'.repeat(500) }]))
  })

  it.each([
    ['sin motivo', '', { expectedVersion: 3 }],
    ['con motivo', ' Pago recibido ', { expectedVersion: 3, reason: 'Pago recibido' }],
  ])('reactivar %s envia expectedVersion y aclara el nuevo inicio de sesion', async (_, typed, body) => {
    let done = false
    const mock = api({
      [root]: () => jsonResponse(detail(done ? tenant({ version: 4 }) : suspended())),
      [`${root}/reactivate`]: () => { done = true; return jsonResponse(detail(tenant({ version: 4 }))) },
    })
    signIn()
    renderRoute(url)
    const { u, dialog } = await open('Reactivar serviteca')
    expect(dialog.getByText(/deben iniciar sesión de nuevo/)).toBeInTheDocument()
    expect(dialog.getByText('Opcional. 0 de 500 caracteres.')).toBeInTheDocument()
    if (typed) await u.type(dialog.getByLabelText('Motivo de la reactivación'), typed)
    await u.click(dialog.getByRole('button', { name: 'Reactivar serviteca' }))
    expect(await screen.findByText('Serviteca reactivada. Sus usuarios deben iniciar sesión de nuevo.')).toBeInTheDocument()
    expect(bodies(mock, `${root}/reactivate`)).toEqual([body])
    expect(await screen.findByRole('button', { name: 'Suspender serviteca' })).toBeInTheDocument()
  })

  it('reactivar rechaza un motivo de mas de 500 caracteres', async () => {
    const mock = api({ [root]: () => jsonResponse(detail(suspended())) })
    signIn()
    renderRoute(url)
    const { u, dialog } = await open('Reactivar serviteca')
    await u.click(dialog.getByLabelText('Motivo de la reactivación'))
    await u.paste('z'.repeat(501))
    await u.click(dialog.getByRole('button', { name: 'Reactivar serviteca' }))
    expect(dialog.getByText('El motivo no puede superar 500 caracteres.')).toBeInTheDocument()
    expect(calls(mock, `${root}/reactivate`)).toHaveLength(0)
  })

  it('evita el doble envio y no cierra mientras la peticion esta en curso', async () => {
    let resolve!: (r: Response) => void
    const mock = api({ [`${root}/suspend`]: () => new Promise<Response>((r) => { resolve = r }) })
    signIn()
    renderRoute(url)
    const { u, dialog } = await open('Suspender serviteca')
    await u.type(dialog.getByLabelText('Motivo de la suspensión'), 'Mora')
    const confirm = dialog.getByRole('button', { name: 'Suspender serviteca' })
    await u.click(confirm)
    await u.click(dialog.getByRole('button', { name: 'Procesando…' }))
    await u.keyboard('{Escape}')
    expect(dialog.getByRole('button', { name: 'Procesando…' })).toBeDisabled()
    expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(calls(mock, `${root}/suspend`)).toHaveLength(1)
    await act(async () => resolve(jsonResponse(detail(suspended()))))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('409 por version recarga el detalle, conserva el motivo y reenvia con la version nueva', async () => {
    let version = 2
    const mock = api({
      [root]: () => jsonResponse(detail(tenant({ version }))),
      [`${root}/suspend`]: (_, init) => JSON.parse(String(init?.body)).expectedVersion === 5
        ? jsonResponse(detail(suspended({ version: 6 })))
        : fail('El recurso cambio; actualiza e intenta de nuevo', 409),
    })
    signIn()
    renderRoute(url)
    await screen.findByRole('button', { name: 'Suspender serviteca' })
    version = 5
    const { u, dialog } = await open('Suspender serviteca')
    await u.type(dialog.getByLabelText('Motivo de la suspensión'), 'Mora')
    await u.click(dialog.getByRole('button', { name: 'Suspender serviteca' }))
    expect(await dialog.findByText('La serviteca cambió mientras la revisabas. Revisa los datos actualizados antes de confirmar.')).toBeInTheDocument()
    expect(dialog.getByLabelText('Motivo de la suspensión')).toHaveValue('Mora')
    await waitFor(() => expect(calls(mock, root)).toHaveLength(2))
    await waitFor(() => expect(dialog.getByRole('button', { name: 'Suspender serviteca' })).toBeEnabled())
    await u.click(dialog.getByRole('button', { name: 'Suspender serviteca' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(bodies(mock, `${root}/suspend`)).toEqual([{ expectedVersion: 2, reason: 'Mora' }, { expectedVersion: 5, reason: 'Mora' }])
    expect(userMessage(new ApiError('El recurso cambio; actualiza e intenta de nuevo', 409))).toBe('La solicitud cambió mientras la revisabas. Actualízala antes de continuar.')
  })

  it('409 por estado ya cambiado recarga, avisa y bloquea la confirmacion', async () => {
    let changed = false
    const mock = api({
      [root]: () => jsonResponse(detail(changed ? suspended({ suspensionReason: 'Otro administrador' }) : tenant())),
      [`${root}/suspend`]: () => { changed = true; return fail('El tenant ya esta suspendido', 409) },
    })
    signIn()
    renderRoute(url)
    const { u, dialog } = await open('Suspender serviteca')
    await u.type(dialog.getByLabelText('Motivo de la suspensión'), 'Mora')
    await u.click(dialog.getByRole('button', { name: 'Suspender serviteca' }))
    expect(await dialog.findByText('La serviteca ya estaba suspendida. Revisa los datos actualizados.')).toBeInTheDocument()
    expect(await dialog.findByText('La serviteca ahora está suspendida. Esta acción ya no aplica.')).toBeInTheDocument()
    expect(dialog.getByRole('button', { name: 'Suspender serviteca' })).toBeDisabled()
    expect(dialog.getByLabelText('Motivo de la suspensión')).toHaveValue('Mora')
    expect(calls(mock, `${root}/suspend`)).toHaveLength(1)
    await u.click(dialog.getByRole('button', { name: 'Cancelar' }))
    await u.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Descartar/ }))
    expect(await screen.findByText('Otro administrador')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reactivar serviteca' })).toBeInTheDocument()
  })

  it('409 de reactivar por estado ya activo usa su mensaje', async () => {
    let changed = false
    api({
      [root]: () => jsonResponse(detail(changed ? tenant({ version: 4 }) : suspended())),
      [`${root}/reactivate`]: () => { changed = true; return fail('El tenant ya esta activo', 409) },
    })
    signIn()
    renderRoute(url)
    const { u, dialog } = await open('Reactivar serviteca')
    await u.click(dialog.getByRole('button', { name: 'Reactivar serviteca' }))
    expect(await dialog.findByText('La serviteca ya estaba activa. Revisa los datos actualizados.')).toBeInTheDocument()
    expect(await dialog.findByText('La serviteca ahora está activa. Esta acción ya no aplica.')).toBeInTheDocument()
  })

  it('si falla la recarga tras un 409 bloquea confirmar y permite actualizar', async () => {
    let detailFails = false
    const mock = api({
      [root]: () => detailFails ? fail('Fallo', 500) : jsonResponse(detail()),
      [`${root}/suspend`]: () => { detailFails = true; return fail('El recurso cambio; actualiza e intenta de nuevo', 409) },
    })
    signIn()
    renderRoute(url)
    const { u, dialog } = await open('Suspender serviteca')
    await u.type(dialog.getByLabelText('Motivo de la suspensión'), 'Mora')
    await u.click(dialog.getByRole('button', { name: 'Suspender serviteca' }))
    const refresh = await dialog.findByRole('button', { name: 'Actualizar serviteca' })
    expect(dialog.getByRole('button', { name: 'Suspender serviteca' })).toBeDisabled()
    detailFails = false
    await u.click(refresh)
    await waitFor(() => expect(dialog.queryByRole('button', { name: 'Actualizar serviteca' })).not.toBeInTheDocument())
    expect(dialog.getByRole('button', { name: 'Suspender serviteca' })).toBeEnabled()
    expect(calls(mock, `${root}/suspend`)).toHaveLength(1)
  })

  it.each([
    ['El motivo de suspension es obligatorio', 'Escribe el motivo de la suspensión.'],
    ['El motivo no puede superar 500 caracteres', 'El motivo no puede superar 500 caracteres.'],
    ['La version esperada es obligatoria', 'Actualiza la serviteca antes de continuar.'],
  ])('400 %s se muestra mapeado en la confirmacion', async (backend, shown) => {
    api({ [`${root}/suspend`]: () => fail(backend, 400) })
    signIn()
    renderRoute(url)
    const { u, dialog } = await open('Suspender serviteca')
    await u.type(dialog.getByLabelText('Motivo de la suspensión'), 'Mora')
    await u.click(dialog.getByRole('button', { name: 'Suspender serviteca' }))
    expect(await dialog.findByText(shown)).toBeInTheDocument()
    expect(dialog.getByLabelText('Motivo de la suspensión')).toHaveValue('Mora')
  })

  it('404 al suspender avisa y muestra la vuelta al listado', async () => {
    let gone = false
    api({
      [root]: () => gone ? fail('Tenant no encontrado', 404) : jsonResponse(detail()),
      [`${root}/suspend`]: () => { gone = true; return fail('Tenant no encontrado', 404) },
    })
    signIn()
    renderRoute(url)
    const { u, dialog } = await open('Suspender serviteca')
    await u.type(dialog.getByLabelText('Motivo de la suspensión'), 'Mora')
    await u.click(dialog.getByRole('button', { name: 'Suspender serviteca' }))
    expect(await screen.findByText('No encontramos esta serviteca. Puede que ya no exista.')).toBeInTheDocument()
    expect(await screen.findByText('Serviteca no encontrada. Puede que ya no exista.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('cerrar sesiones', () => {
  it('por usuario confirma, aclara que sigue activo y no envia cuerpo', async () => {
    const mock = api({ [`${root}/users/11/revoke`]: () => jsonResponse(user()) })
    signIn()
    renderRoute(url)
    const { u, dialog } = await open('Cerrar sesiones de camila.torres')
    expect(dialog.getByRole('heading', { name: 'Cerrar sesiones del usuario' })).toBeInTheDocument()
    expect(dialog.getByText('Serviteca El Roble · elroble · camila.torres')).toBeInTheDocument()
    expect(dialog.getByText(/El usuario sigue activo/)).toBeInTheDocument()
    expect(dialog.queryByRole('textbox')).not.toBeInTheDocument()
    await u.click(dialog.getByRole('button', { name: 'Cerrar sesiones del usuario' }))
    expect(await screen.findByText('Sesiones de camila.torres cerradas. El usuario sigue activo.')).toBeInTheDocument()
    expect(calls(mock, `${root}/users/11/revoke`)).toHaveLength(1)
    expect(calls(mock, `${root}/users/11/revoke`)[0]?.[1]?.method).toBe('POST')
    expect(bodies(mock, `${root}/users/11/revoke`)).toEqual([undefined])
    expect(calls(mock, `${root}/revoke-sessions`)).toHaveLength(0)
  })

  it('cancelar no envia nada', async () => {
    const mock = api()
    signIn()
    renderRoute(url)
    const { u, dialog } = await open('Cerrar sesiones de camila.torres')
    await u.click(dialog.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)
  })

  it('404 de usuario avisa y cierra la confirmacion', async () => {
    api({ [`${root}/users/11/revoke`]: () => fail('Usuario no encontrado', 404) })
    signIn()
    renderRoute(url)
    const { u, dialog } = await open('Cerrar sesiones de camila.torres')
    await u.click(dialog.getByRole('button', { name: 'Cerrar sesiones del usuario' }))
    expect(await screen.findByText('No encontramos ese usuario en esta serviteca. Puede que ya no exista.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('de toda la serviteca muestra la cantidad revocada', async () => {
    const mock = api({ [`${root}/revoke-sessions`]: () => jsonResponse({ tenantId: 7, revokedUsers: 3 }) })
    signIn()
    renderRoute(url)
    const { u, dialog } = await open('Cerrar todas las sesiones')
    expect(dialog.getByText(/Siguen activos y pueden volver a iniciar sesión/)).toBeInTheDocument()
    await u.click(dialog.getByRole('button', { name: 'Cerrar todas las sesiones' }))
    expect(await screen.findByText('Sesiones cerradas: 3 usuarios. Siguen activos.')).toBeInTheDocument()
    expect(bodies(mock, `${root}/revoke-sessions`)).toEqual([undefined])
  })

  it('error de red al cerrar sesiones se muestra en la confirmacion y permite reintentar', async () => {
    let failed = true
    api({ [`${root}/revoke-sessions`]: () => failed ? fail('Fallo', 500) : jsonResponse({ tenantId: 7, revokedUsers: 1 }) })
    signIn()
    renderRoute(url)
    const { u, dialog } = await open('Cerrar todas las sesiones')
    await u.click(dialog.getByRole('button', { name: 'Cerrar todas las sesiones' }))
    expect(await dialog.findByText(/No pudimos completar la acción/)).toBeInTheDocument()
    failed = false
    await u.click(dialog.getByRole('button', { name: 'Cerrar todas las sesiones' }))
    expect(await screen.findByText('Sesiones cerradas: 1 usuario. Siguen activos.')).toBeInTheDocument()
  })
})

describe('cache y sesion de plataforma', () => {
  it.each([
    ['Suspender serviteca', `${root}/suspend`, () => jsonResponse(detail(suspended()))],
    ['Cerrar todas las sesiones', `${root}/revoke-sessions`, () => jsonResponse({ tenantId: 7, revokedUsers: 2 })],
    ['Cerrar sesiones de camila.torres', `${root}/users/11/revoke`, () => jsonResponse(user())],
  ] as const)('%s invalida detalle, usuarios, listado y metricas sin tocar la cache comercial', async (trigger, path, handler) => {
    api({ [path]: handler })
    signIn()
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const keys = [['platform', 'tenants', 'list', '', '', 1], ['platform', 'metrics'], ['tenant']]
    keys.forEach((key) => client.setQueryData(key, { sentinel: true }))
    const router = createMemoryRouter(routes, { initialEntries: [url] })
    render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>)
    await screen.findByRole('table')
    const { u, dialog } = await open(trigger)
    if (trigger === 'Suspender serviteca') await u.type(dialog.getByLabelText('Motivo de la suspensión'), 'Mora')
    await u.click(dialog.getAllByRole('button').at(-1)!)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    keys.slice(0, 2).forEach((key) => expect(client.getQueryState(key)?.isInvalidated).toBe(true))
    expect(client.getQueryState(['tenant'])?.isInvalidated).toBe(false)
    // Detalle y usuarios estan montados: se invalidan y se vuelven a consultar.
    await waitFor(() => expect(client.getQueryState(['platform', 'tenants', 'detail', '7'])?.dataUpdateCount).toBe(2))
    await waitFor(() => expect(client.getQueryState(['platform', 'tenants', 'users', '7', 1])?.dataUpdateCount).toBe(2))
  })

  it('sin sesion de plataforma redirige a su acceso aunque haya sesion de serviteca', async () => {
    const mock = api()
    saveToken(validToken())
    const router = renderRoute(url)
    await waitFor(() => expect(router.state.location.pathname).toBe('/plataforma/login'))
    expect(calls(mock, root)).toHaveLength(0)
  })

  it('401 en una accion cierra solo la sesion de plataforma', async () => {
    api({ [`${root}/revoke-sessions`]: () => fail('No autenticado', 401) })
    const commercial = validToken()
    saveToken(commercial)
    signIn()
    const router = renderRoute(url)
    const { u, dialog } = await open('Cerrar todas las sesiones')
    await u.click(dialog.getByRole('button', { name: 'Cerrar todas las sesiones' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/plataforma/login'))
    expect(getPlatformToken()).toBeNull()
    expect(getToken()).toBe(commercial)
  })
})
