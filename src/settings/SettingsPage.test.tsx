import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
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

describe('pestanas', () => {
  it('Datos por defecto, un valor desconocido cae en Datos y las flechas cambian la URL', async () => {
    const user = userEvent.setup()
    mockApi(routes())
    const router = renderRoute('/configuracion?tab=otra')

    expect(await screen.findByRole('heading', { level: 1, name: 'Configuración' })).toBeInTheDocument()
    const datos = screen.getByRole('tab', { name: 'Datos de la serviteca' })
    expect(datos).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', datos.id)
    expect(screen.getByRole('navigation', { name: 'Ruta de navegación' })).toHaveTextContent('Configuración')

    datos.focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Configuración financiera' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Configuración financiera' })).toHaveFocus()
    expect(router.state.location.search).toBe('?tab=financiera')

    await user.keyboard('{Home}')
    expect(router.state.location.search).toBe('')
    await user.keyboard('{End}')
    expect(router.state.location.search).toBe('?tab=financiera')
    await user.keyboard('{ArrowRight}')
    expect(router.state.location.search).toBe('')
    await user.keyboard('{ArrowLeft}')
    expect(router.state.location.search).toBe('?tab=financiera')
  })
})

describe('sin funciones que no existen', () => {
  it('no hay pestana Usuarios y ?tab=usuarios cae en Datos', async () => {
    mockApi(routes())
    renderRoute('/configuracion?tab=usuarios')

    expect(await screen.findByRole('heading', { level: 1, name: 'Configuración' })).toBeInTheDocument()
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Datos de la serviteca', 'Configuración financiera'])
    expect(screen.queryByRole('tab', { name: /Usuarios/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/Próximamente/)).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Datos de la serviteca' })).toHaveAttribute('aria-selected', 'true')
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
    expect(within(screen.getByRole('banner')).getByText('Serviteca El Roble')).toBeInTheDocument()
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

  it('sin rol ADMIN todo queda en solo lectura', async () => {
    login('CAJERO')
    mockApi(routes())
    renderRoute('/configuracion')

    expect(await screen.findByLabelText('Nombre comercial')).toBeDisabled()
    expect(screen.getByText('Solo un administrador puede editar estos datos.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Configuración financiera' }))
    expect(await screen.findByLabelText('Gastos (%)')).toBeDisabled()
    expect(screen.getByText('Solo un administrador puede editar estos datos.')).toBeInTheDocument()
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

  it('cambiar de pestana con cambios pide descartar', async () => {
    const user = userEvent.setup()
    mockApi(routes())
    const router = renderRoute('/configuracion')
    await user.type(await screen.findByLabelText('Teléfono'), '300')

    await user.click(screen.getByRole('tab', { name: 'Configuración financiera' }))
    expect(screen.getByRole('dialog', { name: '¿Descartar los cambios?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(router.state.location.search).toBe('')
    expect(screen.getByLabelText('Teléfono')).toHaveValue('300 123 4567300')

    await user.click(screen.getByRole('tab', { name: 'Configuración financiera' }))
    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(router.state.location.search).toBe('?tab=financiera')
    expect(await screen.findByLabelText('Gastos (%)')).toBeInTheDocument()
  })

  it('salir a otra pagina con cambios pide descartar', async () => {
    const user = userEvent.setup()
    mockApi(routes())
    const router = renderRoute('/configuracion')
    await user.type(await screen.findByLabelText('Teléfono'), '300')

    await user.click(screen.getByRole('link', { name: 'Inicio' }))
    expect(screen.getByRole('dialog', { name: '¿Descartar los cambios?' })).toHaveTextContent(
      'Si sales ahora, se pierden los cambios que no guardaste en los datos de la serviteca.',
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
