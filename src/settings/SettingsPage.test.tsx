import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient } from '@tanstack/react-query'
import { saveToken } from '../auth/session'
import { jsonResponse, makeToken, renderRoute } from '../test/utils'

type Handler = (body: unknown) => Response | Promise<Response>
type Routes = Record<string, Handler>

const profile = { name: 'ServiBox Demo', slug: 'demo', nit: '900123456-7', phone: '300 123 4567' }
// Tenant anterior a la regla: sin NIT ni telefono.
const legacyProfile = { ...profile, nit: null, phone: null }
const zeros = { expensesRate: 0, dianRate: 0, icaRate: 0, cardCommissionRate: 0 }
const categories = [
  { id: 1, name: 'LLANTAS', color: '#e74c3c', yellowStockMin: 10, redStockMin: 3, targetMargin: 0.3, taxTypes: [] },
  { id: 2, name: 'LUBRICANTES', color: '#f1c40f', yellowStockMin: 10, redStockMin: 3, targetMargin: 0, taxTypes: [] },
]

function routes(extra: Routes = {}): Routes {
  return {
    'GET /api/tenant': () => jsonResponse(profile),
    'GET /api/inventory/financial-settings': () => jsonResponse(zeros),
    'GET /api/inventory/categories': () => jsonResponse(categories),
    'PUT /api/tenant': (body) => jsonResponse({ ...profile, ...(body as object) }),
    'PUT /api/inventory/financial-settings': (body) => jsonResponse(body),
    ...extra,
  }
}

function mockApi(table: Routes) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const handler = table[`${init?.method ?? 'GET'} ${new URL(url, 'http://localhost').pathname}`]
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    return Promise.resolve(handler ? handler(body) : jsonResponse({ error: 'Recurso no encontrado', status: 404 }, 404))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const requests = (fetchMock: ReturnType<typeof mockApi>, method: string, path: string) =>
  fetchMock.mock.calls
    .filter(([url, init]) => (init?.method ?? 'GET') === method && url === path)
    .map(([, init]) => (typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined))

function login(role = 'ADMIN') {
  saveToken(makeToken({ sub: 'admin', role, exp: Math.floor(Date.now() / 1000) + 3600 }), {
    username: 'admin',
    role,
    tenantName: 'ServiBox Demo',
    tenantSlug: 'demo',
  })
}

beforeEach(() => login())

describe('estados compartidos de Configuración', () => {
  it.each([
    ['/configuracion', '/api/tenant', 'Nombre comercial', profile],
    ['/configuracion?tab=financiera', '/api/inventory/financial-settings', 'Gastos (%)', zeros],
  ] as const)('carga en %s sin campos editables hasta recibir los datos', async (path, endpoint, label, data) => {
    let resolve!: (response: Response) => void
    mockApi(routes({ [`GET ${endpoint}`]: () => new Promise<Response>((done) => { resolve = done }) }))
    renderRoute(path)

    const panel = label === 'Nombre comercial' ? screen.getByRole('main') : document.getElementById('seccion-financiera')!
    const loading = panel.querySelector('[aria-busy="true"]')
    expect(loading).toBeInTheDocument()
    expect(screen.queryByLabelText(label)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: label === 'Nombre comercial' ? 'Guardar cambios' : 'Guardar configuración' })).not.toBeInTheDocument()
    await act(async () => resolve(jsonResponse(data)))
    expect(await screen.findByLabelText(label)).toBeEnabled()
    expect(loading).not.toBeInTheDocument()
  })

  it.each([
    ['/configuracion', '/api/tenant', 'Nombre comercial', 'Serviteca Nueva', 'Guardar cambios', profile,
      { name: 'Serviteca Nueva', nit: profile.nit, phone: profile.phone }],
    ['/configuracion?tab=financiera', '/api/inventory/financial-settings', 'Gastos (%)', '34,3333', 'Guardar configuración', zeros,
      { ...zeros, expensesRate: 0.343333 }],
  ] as const)('en %s revertir desactiva Guardar y un envio pendiente no se duplica', async (path, endpoint, label, value, action, data, payload) => {
    const user = userEvent.setup()
    let resolve!: (response: Response) => void
    const fetchMock = mockApi(routes({ [`PUT ${endpoint}`]: () => new Promise<Response>((done) => { resolve = done }) }))
    renderRoute(path)
    const input = await screen.findByLabelText(label)
    const initial = (input as HTMLInputElement).value
    const button = screen.getByRole('button', { name: action })
    expect(button).toBeDisabled()
    await user.clear(input)
    await user.type(input, value)
    expect(button).toBeEnabled()
    await user.clear(input)
    await user.type(input, initial)
    expect(button).toBeDisabled()
    expect(window.dispatchEvent(new Event('beforeunload', { cancelable: true }))).toBe(true)
    await user.clear(input)
    await user.type(input, value)
    expect(window.dispatchEvent(new Event('beforeunload', { cancelable: true }))).toBe(false)
    await user.click(button)
    expect(button).toHaveAccessibleName('Guardando…')
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toBeDisabled()
    await user.click(button)
    expect(requests(fetchMock, 'PUT', endpoint)).toEqual([payload])
    await act(async () => resolve(jsonResponse({ ...data, ...payload })))
    expect(await screen.findByRole('button', { name: action })).toBeDisabled()
    expect(await screen.findByText(action === 'Guardar cambios' ? 'Datos guardados' : 'Configuración guardada. Se recalcularon los precios sugeridos.')).toBeInTheDocument()
    expect(window.dispatchEvent(new Event('beforeunload', { cancelable: true }))).toBe(true)
  })
})

describe('pantalla unificada', () => {
  it.each(['/configuracion', '/configuracion?tab=financiera'])('en %s solo el enlace financiero enfoca y desplaza, despues de ambas cargas y una sola vez', async (path) => {
    const user = userEvent.setup()
    let tenantReady!: (response: Response) => void
    let financeReady!: (response: Response) => void
    mockApi(routes({
      'GET /api/tenant': () => new Promise<Response>((resolve) => { tenantReady = resolve }),
      'GET /api/inventory/financial-settings': () => new Promise<Response>((resolve) => { financeReady = resolve }),
    }))
    renderRoute(path)
    const target = document.getElementById('seccion-financiera')!
    const scroll = vi.fn()
    target.scrollIntoView = scroll
    await act(async () => financeReady(jsonResponse(zeros)))
    expect(await screen.findByLabelText('Gastos (%)')).toBeInTheDocument()
    expect(scroll).not.toHaveBeenCalled()
    await act(async () => tenantReady(jsonResponse(profile)))
    const phone = await screen.findByLabelText('Teléfono')
    if (path.includes('financiera')) {
      await waitFor(() => expect(target).toHaveFocus())
      expect(scroll).toHaveBeenCalledExactlyOnceWith({ block: 'start' })
    } else {
      expect(scroll).not.toHaveBeenCalled()
      expect(target).not.toHaveFocus()
    }
    await user.type(phone, '1')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByText('Datos guardados')).toBeInTheDocument()
    expect(scroll).toHaveBeenCalledTimes(path.includes('financiera') ? 1 : 0)
    expect(screen.getByRole('form', { name: 'Datos de la serviteca' })).toBeVisible()
    expect(screen.getByRole('form', { name: 'Configuración financiera' })).toBeVisible()
  })

  it.each(['datos', 'financiera'])('con cambios simultaneos guarda primero %s sin liberar los cambios del otro', async (first) => {
    const user = userEvent.setup()
    const fetchMock = mockApi(routes())
    const router = renderRoute('/configuracion')
    await user.type(await screen.findByLabelText('Teléfono'), '1')
    const expenses = await screen.findByLabelText('Gastos (%)')
    await user.clear(expenses)
    await user.type(expenses, '10')
    const dataSave = screen.getByRole('button', { name: 'Guardar cambios' })
    const financeSave = screen.getByRole('button', { name: 'Guardar configuración' })
    const firstSave = first === 'datos' ? dataSave : financeSave
    const otherSave = first === 'datos' ? financeSave : dataSave
    await user.click(firstSave)
    await waitFor(() => expect(firstSave).toBeDisabled())
    expect(otherSave).toBeEnabled()
    expect(screen.getByLabelText('Teléfono')).toHaveValue('300 123 45671')
    expect(expenses).toHaveValue('10')
    expect(requests(fetchMock, 'PUT', first === 'datos' ? '/api/inventory/financial-settings' : '/api/tenant')).toEqual([])
    expect(window.dispatchEvent(new Event('beforeunload', { cancelable: true }))).toBe(false)
    await user.click(screen.getByRole('link', { name: 'Inicio' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Seguir editando' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(router.state.location.pathname).toBe('/configuracion')
    await user.click(otherSave)
    await waitFor(() => expect(otherSave).toBeDisabled())
    expect(window.dispatchEvent(new Event('beforeunload', { cancelable: true }))).toBe(true)
    expect(requests(fetchMock, 'PUT', '/api/tenant')).toEqual([{ name: profile.name, nit: profile.nit, phone: '300 123 45671' }])
    expect(requests(fetchMock, 'PUT', '/api/inventory/financial-settings')).toEqual([{ ...zeros, expensesRate: 0.1 }])
  })

  it('descarta cambios simultaneos con un solo dialogo sin enviar ninguno de los formularios', async () => {
    const user = userEvent.setup()
    const fetchMock = mockApi(routes())
    const router = renderRoute('/configuracion')
    await user.type(await screen.findByLabelText('Teléfono'), '1')
    await user.type(await screen.findByLabelText('Gastos (%)'), '1')
    await user.click(screen.getByRole('link', { name: 'Inicio' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(screen.getByLabelText('Teléfono')).toHaveValue('300 123 45671')
    expect(screen.getByLabelText('Gastos (%)')).toHaveValue('01')
    await user.click(screen.getByRole('link', { name: 'Inicio' }))
    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/inicio'))
    expect(requests(fetchMock, 'PUT', '/api/tenant')).toEqual([])
    expect(requests(fetchMock, 'PUT', '/api/inventory/financial-settings')).toEqual([])
    expect(window.dispatchEvent(new Event('beforeunload', { cancelable: true }))).toBe(true)
  })

  it('el enlace financiero funciona aunque fallen los datos de la serviteca', async () => {
    mockApi(routes({ 'GET /api/tenant': () => jsonResponse({ error: 'x', status: 500 }, 500) }))
    renderRoute('/configuracion?tab=financiera')
    const target = document.getElementById('seccion-financiera')!
    target.scrollIntoView = vi.fn()
    expect(await screen.findByText('No pudimos cargar los datos de la serviteca.')).toBeInTheDocument()
    await waitFor(() => expect(target).toHaveFocus())
    expect(await screen.findByLabelText('Gastos (%)')).toBeEnabled()
  })

  it('seguir un enlace financiero dentro de la pantalla conserva ambos cambios sin abrir descarte', async () => {
    const user = userEvent.setup()
    mockApi(routes())
    const router = renderRoute('/configuracion')
    await user.type(await screen.findByLabelText('Teléfono'), '1')
    await user.type(await screen.findByLabelText('Gastos (%)'), '1')
    const target = document.getElementById('seccion-financiera')!
    target.scrollIntoView = vi.fn()
    await act(async () => { await router.navigate('/configuracion?tab=financiera') })
    await waitFor(() => expect(target).toHaveFocus())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Teléfono')).toHaveValue('300 123 45671')
    expect(screen.getByLabelText('Gastos (%)')).toHaveValue('01')
    expect(window.dispatchEvent(new Event('beforeunload', { cancelable: true }))).toBe(false)
  })

  it('muestra ambos formularios sin pestanas, tambien con un parametro desconocido', async () => {
    mockApi(routes())
    const router = renderRoute('/configuracion?tab=otra')

    expect(await screen.findByRole('heading', { level: 1, name: 'Configuración' })).toBeInTheDocument()
    expect(await screen.findByLabelText('Nombre comercial')).toHaveValue(profile.name)
    expect(await screen.findByLabelText('Gastos (%)')).toHaveValue('0')
    expect(screen.getByRole('region', { name: 'Datos de la serviteca' })).toBeVisible()
    expect(screen.getByRole('region', { name: 'Configuración financiera' })).toBeVisible()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.getByRole('main').querySelectorAll('form')).toHaveLength(2)
    expect(screen.queryByRole('navigation', { name: 'Ruta de navegación' })).not.toBeInTheDocument()
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(document.title).toBe('Configuración · ServiBox')
    expect(router.state.location.search).toBe('?tab=otra')
  })
})

describe('sin funciones que no existen', () => {
  it('no hay Usuarios ni pestanas y ?tab=usuarios muestra los dos formularios', async () => {
    mockApi(routes())
    renderRoute('/configuracion?tab=usuarios')

    expect(await screen.findByRole('heading', { level: 1, name: 'Configuración' })).toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(screen.queryByText(/Próximamente/)).not.toBeInTheDocument()
    expect(await screen.findByLabelText('Nombre comercial')).toBeInTheDocument()
    expect(await screen.findByLabelText('Gastos (%)')).toBeInTheDocument()
  })

  it('rotula Impuesto de renta deducible y no menciona DIAN', async () => {
    mockApi(routes())
    renderRoute('/configuracion?tab=financiera')

    const field = await screen.findByLabelText('Impuesto de renta deducible (%)')
    expect(field).toHaveAccessibleDescription('Se usa en el cálculo del precio sugerido; no es facturación electrónica.')
    expect(document.body.textContent).not.toMatch(/DIAN/)
  })
})

describe('Datos de la serviteca', () => {
  it('un tenant sin NIT ni telefono los muestra vacios y no guarda hasta completarlos; normaliza el NIT y envia el PUT con ambos', async () => {
    const user = userEvent.setup()
    const fetchMock = mockApi(
      routes({
        'GET /api/tenant': () => jsonResponse(legacyProfile),
        'PUT /api/tenant': (body) => jsonResponse({ ...legacyProfile, ...(body as object) }),
      }),
    )
    renderRoute('/configuracion')

    const name = await screen.findByLabelText('Nombre comercial')
    expect(screen.getByLabelText('Código de tu serviteca')).toHaveValue('demo')
    expect(screen.getByLabelText('Código de tu serviteca')).toHaveAttribute('readonly')
    await screen.findByLabelText('Gastos (%)')
    expect(screen.getByText(/Es lo que tu equipo escribe en “Serviteca” para iniciar sesión/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()

    expect(screen.getByLabelText('NIT')).toHaveValue('')
    expect(screen.getByLabelText('Teléfono')).toHaveValue('')
    expect(screen.getByLabelText('NIT')).toBeRequired()
    expect(screen.getByLabelText('Teléfono')).toBeRequired()

    await user.clear(name)
    await user.type(name, 'Serviteca El Roble ')
    // Con cambios pero sin NIT ni telefono no se envia: Guardar habilitado y foco al primer error.
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(screen.getByLabelText('NIT')).toHaveFocus()
    expect(screen.getByLabelText('NIT')).toHaveAttribute('aria-invalid', 'true')
    await user.type(screen.getByLabelText('NIT'), '900.123.456-7')
    await user.tab()
    expect(screen.getByLabelText('NIT')).toHaveValue('900123456-7')
    await user.type(screen.getByLabelText('Teléfono'), '300 123 4567')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Datos guardados')).toBeInTheDocument()
    expect(requests(fetchMock, 'PUT', '/api/tenant')).toEqual([
      { name: 'Serviteca El Roble', nit: '900123456-7', phone: '300 123 4567' },
    ])
    expect(JSON.parse(sessionStorage.getItem('servibox.identity') ?? '')).toMatchObject({
      tenantName: 'Serviteca El Roble',
      tenantSlug: 'demo',
    })
    const sidebar = screen.getByRole('navigation', { name: 'Principal' }).closest('aside') as HTMLElement
    expect(within(sidebar).getByText('Serviteca El Roble')).toBeInTheDocument()
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
  })

  it('valida al salir del campo y no deja guardar con errores', async () => {
    const user = userEvent.setup()
    mockApi(routes())
    renderRoute('/configuracion')

    await user.clear(await screen.findByLabelText('Nombre comercial'))
    await user.clear(screen.getByLabelText('Teléfono'))
    await user.type(screen.getByLabelText('Teléfono'), '300-abc')
    await user.tab()
    await user.clear(screen.getByLabelText('NIT'))
    await user.type(screen.getByLabelText('NIT'), '900.123.456-78')
    await user.tab()

    expect(screen.getByText('Escribe el nombre comercial.')).toBeInTheDocument()
    expect(screen.getByText('El teléfono solo admite dígitos, espacios, +, - y paréntesis.')).toBeInTheDocument()
    expect(
      screen.getByText('El NIT solo admite dígitos y un guion con el dígito de verificación, por ejemplo 900123456-7.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(screen.getByLabelText('Nombre comercial')).toHaveFocus()
  })

  it('NIT y telefono son obligatorios y no pasan de 25 caracteres', async () => {
    const user = userEvent.setup()
    mockApi(routes())
    renderRoute('/configuracion')

    await user.clear(await screen.findByLabelText('NIT'))
    await user.clear(screen.getByLabelText('Teléfono'))
    await user.tab()
    expect(screen.getByText('Ingresa el NIT de tu serviteca.')).toBeInTheDocument()
    expect(screen.getByText('Ingresa el teléfono de contacto.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled()

    await user.type(screen.getByLabelText('NIT'), '1'.repeat(26))
    await user.type(screen.getByLabelText('Teléfono'), '3'.repeat(26))
    await user.tab()
    expect(screen.getAllByText('El NIT y el teléfono no pueden superar 25 caracteres.')).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(screen.getByLabelText('NIT')).toHaveFocus()
  })

  it('un 400 queda en el Alert sin perder lo digitado', async () => {
    const user = userEvent.setup()
    mockApi(routes({ 'PUT /api/tenant': () => jsonResponse({ error: 'El nombre comercial es obligatorio', status: 400 }, 400) }))
    renderRoute('/configuracion')

    await user.type(await screen.findByLabelText('Teléfono'), '300')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Escribe el nombre comercial.')
    expect(screen.getByLabelText('Teléfono')).toHaveValue('300 123 4567300')
  })

  it.each(['CAJERO', 'MECANICO'])('con rol %s todo queda en solo lectura', async (role) => {
    login(role)
    mockApi(routes())
    renderRoute('/configuracion')

    expect(await screen.findByLabelText('Nombre comercial')).toBeDisabled()
    expect(screen.getByLabelText('NIT')).toBeDisabled()
    expect(screen.getByLabelText('Teléfono')).toBeDisabled()
    expect(screen.getByLabelText('Código de tu serviteca')).toHaveAttribute('readonly')
    expect(screen.getAllByText('Solo un administrador puede editar estos datos.')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument()

    expect(await screen.findByLabelText('Gastos (%)')).toBeDisabled()
    expect(screen.getByLabelText('Impuesto de renta deducible (%)')).toBeDisabled()
    expect(screen.getByLabelText('ICA (por mil)')).toBeDisabled()
    expect(screen.getByLabelText('Comisión de tarjeta (%)')).toBeDisabled()
    expect(screen.getAllByText('Solo un administrador puede editar estos datos.')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Guardar configuración' })).not.toBeInTheDocument()
  })

  it('un 403 del backend va en un toast y deja el formulario en solo lectura', async () => {
    const user = userEvent.setup()
    mockApi(
      routes({
        'PUT /api/tenant': () =>
          jsonResponse({ error: 'Solo un administrador puede editar los datos de la serviteca', status: 403 }, 403),
      }),
    )
    renderRoute('/configuracion')

    await user.type(await screen.findByLabelText('Teléfono'), '300')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Solo un administrador puede editar los datos de la serviteca.')
    expect(screen.getByText('Solo un administrador puede editar estos datos.')).toBeInTheDocument()
    expect(screen.getByLabelText('Teléfono')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument()
  })

  it('guardar datos no valida ni descarta cambios financieros invalidos', async () => {
    const user = userEvent.setup()
    const fetchMock = mockApi(routes())
    renderRoute('/configuracion')
    await user.type(await screen.findByLabelText('Teléfono'), '300')
    const expenses = await screen.findByLabelText('Gastos (%)')
    await user.clear(expenses)
    await user.type(expenses, '150')
    // Submit sin desenfocar el otro campo ni revelar sus errores pendientes.
    const form = screen.getByRole('button', { name: 'Guardar cambios' }).closest('form')!
    await act(async () => { form.requestSubmit() })
    expect(await screen.findByText('Datos guardados')).toBeInTheDocument()
    expect(requests(fetchMock, 'PUT', '/api/tenant')).toEqual([{ name: profile.name, nit: profile.nit, phone: '300 123 4567300' }])
    expect(requests(fetchMock, 'PUT', '/api/inventory/financial-settings')).toEqual([])
    expect(expenses).toHaveValue('150')
    expect(expenses).not.toHaveAttribute('aria-invalid')
    expect(screen.getByRole('button', { name: 'Guardar configuración' })).toBeEnabled()
    expect(window.dispatchEvent(new Event('beforeunload', { cancelable: true }))).toBe(false)
  })

  it('salir a otra pagina con cambios pide descartar', async () => {
    const user = userEvent.setup()
    mockApi(routes())
    const router = renderRoute('/configuracion')
    await user.type(await screen.findByLabelText('Teléfono'), '300')

    await user.click(screen.getByRole('link', { name: 'Inicio' }))
    expect(screen.getByRole('dialog', { name: '¿Descartar los cambios?' })).toHaveTextContent(
      'Si sales ahora, se pierden los cambios que no guardaste en Configuración.',
    )
    expect(router.state.location.pathname).toBe('/configuracion')
  })

  it('error al cargar con reintento', async () => {
    const fetchMock = mockApi(routes({ 'GET /api/tenant': () => jsonResponse({ error: 'x', status: 500 }, 500) }))
    renderRoute('/configuracion')

    expect(await screen.findByText('No pudimos cargar los datos de la serviteca.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(requests(fetchMock, 'GET', '/api/tenant').length).toBe(2))
  })
})

describe('Configuración financiera', () => {
  it('agrupa las tasas del precio y mantiene separada la comision con su ayuda', async () => {
    mockApi(routes())
    renderRoute('/configuracion?tab=financiera')
    const price = await screen.findByRole('group', { name: 'Precio sugerido' })
    expect(within(price).getAllByRole('textbox')).toHaveLength(3)
    expect(within(price).getByLabelText('Gastos (%)')).toHaveAccessibleDescription('Gastos del negocio sobre la venta. Por ejemplo, 34,3.')
    expect(within(price).getByLabelText('ICA (por mil)')).toHaveAccessibleDescription('Industria y comercio, en por mil. Por ejemplo, 8,2.')
    const commission = screen.getByRole('group', { name: 'Pagos con tarjeta' })
    expect(within(commission).getAllByRole('textbox')).toHaveLength(1)
    expect(within(commission).getByLabelText('Comisión de tarjeta (%)')).toHaveAccessibleDescription(/todavía no se aplica a las ventas ni a los reportes/)
  })

  it('error de carga permite reintentar y recuperar valores', async () => {
    let failed = true
    const fetchMock = mockApi(routes({
      'GET /api/inventory/financial-settings': () => failed
        ? jsonResponse({ error: 'x', status: 500 }, 500)
        : jsonResponse({ ...zeros, icaRate: 0.009966 }),
    }))
    renderRoute('/configuracion?tab=financiera')
    expect(await screen.findByText('No pudimos cargar la configuración financiera.')).toBeInTheDocument()
    failed = false
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByLabelText('ICA (por mil)')).toHaveValue('9,966')
    expect(requests(fetchMock, 'GET', '/api/inventory/financial-settings')).toHaveLength(2)
  })

  it.each([403, 500])('un %s al guardar anuncia el error y conserva valores', async (status) => {
    const user = userEvent.setup()
    const fetchMock = mockApi(routes({
      'PUT /api/inventory/financial-settings': () => jsonResponse({ error: 'x', status }, status),
    }))
    renderRoute('/configuracion?tab=financiera')
    const expenses = await screen.findByLabelText('Gastos (%)')
    await user.clear(expenses)
    await user.type(expenses, '12,3456')
    await user.click(screen.getByRole('button', { name: 'Guardar configuración' }))
    const alerts = await screen.findAllByRole('alert')
    expect(alerts.map((alert) => alert.textContent).join(' ')).toContain(status === 403 ? 'No tienes permiso' : 'No pudimos completar')
    expect(expenses).toHaveValue('12,3456')
    expect(requests(fetchMock, 'PUT', '/api/inventory/financial-settings')).toEqual([{ ...zeros, expensesRate: 0.123456 }])
    if (status === 403) {
      expect(expenses).toBeDisabled()
      expect(screen.getByLabelText('Comisión de tarjeta (%)')).toBeDisabled()
      expect(screen.queryByRole('button', { name: 'Guardar configuración' })).not.toBeInTheDocument()
    } else {
      expect(expenses).toBeEnabled()
      expect(screen.getByRole('button', { name: 'Guardar configuración' })).toBeEnabled()
    }
  })

  it('guardar finanzas no valida ni descarta los datos invalidos del otro formulario', async () => {
    const user = userEvent.setup()
    const fetchMock = mockApi(routes())
    renderRoute('/configuracion?tab=financiera')
    const expenses = await screen.findByLabelText('Gastos (%)')
    await user.clear(expenses)
    await user.type(expenses, '10')
    const nit = await screen.findByLabelText('NIT')
    await user.clear(nit)
    const form = screen.getByRole('button', { name: 'Guardar configuración' }).closest('form')!
    await act(async () => { form.requestSubmit() })
    expect(await screen.findByText('Configuración guardada. Se recalcularon los precios sugeridos.')).toBeInTheDocument()
    expect(requests(fetchMock, 'PUT', '/api/inventory/financial-settings')).toEqual([{ ...zeros, expensesRate: 0.1 }])
    expect(requests(fetchMock, 'PUT', '/api/tenant')).toEqual([])
    expect(nit).toHaveValue('')
    expect(nit).not.toHaveAttribute('aria-invalid')
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled()
    expect(window.dispatchEvent(new Event('beforeunload', { cancelable: true }))).toBe(false)
  })

  it('salir con cambios permite cancelar o descartar y libera la proteccion', async () => {
    const user = userEvent.setup()
    mockApi(routes())
    const router = renderRoute('/configuracion?tab=financiera')
    await user.type(await screen.findByLabelText('Gastos (%)'), '1')
    await user.click(screen.getByRole('link', { name: 'Inicio' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Si sales ahora, se pierden los cambios que no guardaste en Configuración.')
    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(router.state.location.pathname).toBe('/configuracion')
    expect(screen.getByLabelText('Gastos (%)')).toHaveValue('01')
    await user.click(screen.getByRole('link', { name: 'Inicio' }))
    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/inicio'))
    expect(window.dispatchEvent(new Event('beforeunload', { cancelable: true }))).toBe(true)
  })

  it('sin configuracion muestra ceros y la nota; envia las fracciones exactas e invalida productos y categorias', async () => {
    const user = userEvent.setup()
    const invalidate = vi.spyOn(QueryClient.prototype, 'invalidateQueries')
    const fetchMock = mockApi(routes())
    renderRoute('/configuracion?tab=financiera')

    const gastos = await screen.findByLabelText('Gastos (%)')
    expect(gastos).toHaveValue('0')
    expect(screen.getByText('Aún no has configurado estos valores')).toBeInTheDocument()
    expect(screen.getByText('Al guardar se recalcula el precio sugerido de todos los productos.')).toBeInTheDocument()
    expect(screen.getByText(/Se guarda para uso futuro: todavía no se aplica a las ventas ni a los reportes/)).toBeInTheDocument()

    for (const [label, value] of [
      ['Gastos (%)', '10'],
      ['Impuesto de renta deducible (%)', '5'],
      ['ICA (por mil)', '8,2'],
      ['Comisión de tarjeta (%)', '3'],
    ]) {
      const input = screen.getByLabelText(label as string)
      await user.clear(input)
      await user.type(input, value as string)
    }
    await user.click(screen.getByRole('button', { name: 'Guardar configuración' }))

    expect(await screen.findByText('Configuración guardada. Se recalcularon los precios sugeridos.')).toBeInTheDocument()
    expect(requests(fetchMock, 'PUT', '/api/inventory/financial-settings')).toEqual([
      { expensesRate: 0.1, dianRate: 0.05, icaRate: 0.0082, cardCommissionRate: 0.03 },
    ])
    const keys = invalidate.mock.calls.map(([filters]) => JSON.stringify(filters?.queryKey))
    expect(keys).toContain(JSON.stringify(['inventory', 'products']))
    expect(keys).toContain(JSON.stringify(['inventory', 'categories']))
    expect(screen.getByLabelText('ICA (por mil)')).toHaveValue('8,2')
    invalidate.mockRestore()
  })

  it('muestra los valores guardados con coma decimal', async () => {
    mockApi(
      routes({
        'GET /api/inventory/financial-settings': () =>
          jsonResponse({ expensesRate: 0.343, dianRate: 0.35, icaRate: 0.0082, cardCommissionRate: 0.025 }),
      }),
    )
    renderRoute('/configuracion?tab=financiera')

    expect(await screen.findByLabelText('Gastos (%)')).toHaveValue('34,3')
    expect(screen.getByLabelText('Impuesto de renta deducible (%)')).toHaveValue('35')
    expect(screen.getByLabelText('ICA (por mil)')).toHaveValue('8,2')
    expect(screen.getByLabelText('Comisión de tarjeta (%)')).toHaveValue('2,5')
    expect(screen.queryByText('Aún no has configurado estos valores')).not.toBeInTheDocument()
  })

  it('advierte las categorias con el divisor en cero o negativo sin bloquear', async () => {
    const user = userEvent.setup()
    mockApi(routes())
    renderRoute('/configuracion?tab=financiera')

    const gastos = await screen.findByLabelText('Gastos (%)')
    await user.clear(gastos)
    await user.type(gastos, '60')
    expect(screen.queryByText(/queda igual al costo/)).not.toBeInTheDocument()
    const dian = screen.getByLabelText('Impuesto de renta deducible (%)')
    await user.clear(dian)
    await user.type(dian, '60')

    const warning = screen.getByRole('alert')
    expect(warning).toHaveTextContent('Con estos valores el precio sugerido de algunas categorías queda igual al costo')
    expect(warning).toHaveTextContent('LLANTAS')
    expect(warning).not.toHaveTextContent('LUBRICANTES')
    expect(screen.getByRole('button', { name: 'Guardar configuración' })).toBeEnabled()
  })

  it('un valor fuera de rango es error bajo el campo y no deja guardar', async () => {
    const user = userEvent.setup()
    mockApi(routes())
    renderRoute('/configuracion?tab=financiera')

    const dian = await screen.findByLabelText('Impuesto de renta deducible (%)')
    await user.clear(dian)
    await user.type(dian, '150')
    await user.tab()

    expect(screen.getByText('Usa un valor entre 0 y 100.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar configuración' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Guardar configuración' }))
    expect(dian).toHaveFocus()
    expect(dian).toHaveAttribute('aria-invalid', 'true')
  })

  it('un 400 queda en el Alert', async () => {
    const user = userEvent.setup()
    mockApi(routes({ 'PUT /api/inventory/financial-settings': () => jsonResponse({ error: 'Peticion invalida', status: 400 }, 400) }))
    renderRoute('/configuracion?tab=financiera')

    const gastos = await screen.findByLabelText('Gastos (%)')
    await user.clear(gastos)
    await user.type(gastos, '10')
    await user.click(screen.getByRole('button', { name: 'Guardar configuración' }))

    expect(await screen.findByText('Revisa los datos e inténtalo de nuevo.')).toBeInTheDocument()
    expect(gastos).toHaveValue('10')
  })
})
