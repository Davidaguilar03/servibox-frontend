import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { saveToken } from '../auth/session'
import { MESSAGES } from '../api/errorMessages'
import { jsonResponse, renderRoute, validToken } from '../test/utils'

type Handler = (body: unknown) => Response
type Routes = Record<string, Handler>

const categories = [
  {
    id: 4,
    name: 'REPUESTOS DEMO',
    color: '#ff3b30',
    yellowStockMin: 10,
    redStockMin: 3,
    targetMargin: 0.3,
    taxTypes: [{ id: 1, name: 'IVA', rate: 0.19, isVat: true }],
  },
  { id: 1, name: 'LLANTAS', color: '#d32f2f', yellowStockMin: 5, redStockMin: 2, targetMargin: 0.25, taxTypes: [] },
]

const demo = {
  id: 1,
  code: 'DEMO-001',
  description: 'Aceite 20W50 galon',
  purchaseCost: 30000,
  quantity: 50,
  taxAmount: 5700,
  suggestedPrice: 42857.14,
  categoryId: 4,
  categoryName: 'REPUESTOS DEMO',
}

function fullRoutes(): Routes {
  return {
    'GET /api/inventory/categories': () => jsonResponse(categories),
    'GET /api/inventory/financial-settings': () => jsonResponse({ expensesRate: 0, dianRate: 0, icaRate: 0, cardCommissionRate: 0 }),
    'GET /api/inventory/products': () => jsonResponse([demo]),
    'GET /api/inventory/products/1': () => jsonResponse(demo),
    'POST /api/inventory/products': (body) => jsonResponse({ ...demo, ...(body as object), id: 9 }, 201),
    'PUT /api/inventory/products/1': (body) => jsonResponse({ ...demo, ...(body as object) }),
  }
}

function mockApi(routes: Routes) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const handler = routes[`${init?.method ?? 'GET'} ${url.split('?')[0] ?? ''}`]
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    return Promise.resolve(handler ? handler(body) : jsonResponse({ error: 'Recurso no encontrado', status: 404 }, 404))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function bodies(fetchMock: ReturnType<typeof mockApi>, method: string) {
  return fetchMock.mock.calls
    .filter(([, init]) => init?.method === method)
    .map(([, init]) => JSON.parse(String(init?.body)) as Record<string, unknown>)
}

/** El listado de atras tambien tiene un filtro Categoría: se busca dentro del modal. */
const formDialog = () => within(screen.getByRole('dialog'))

async function fillNew(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Código'), 'LL-020')
  await user.type(screen.getByLabelText('Descripción'), 'Llanta Hankook 185/65 R14')
  await user.selectOptions(await formDialog().findByLabelText('Categoría'), '1')
  await user.type(screen.getByLabelText('Costo de compra sin IVA'), '98.500')
  await user.clear(screen.getByLabelText('Stock inicial'))
  await user.type(screen.getByLabelText('Stock inicial'), '6')
}

describe('formulario de producto', () => {
  beforeEach(() => {
    saveToken(validToken())
  })

  it('valida al salir del campo y al guardar', async () => {
    const fetchMock = mockApi(fullRoutes())
    const user = userEvent.setup()
    renderRoute('/inventario/nuevo')

    expect(await screen.findByRole('heading', { name: 'Nuevo producto' })).toBeInTheDocument()
    // El panel reemplaza los campos deshabilitados: sin costo ni categoria muestra "—".
    expect(screen.queryByLabelText('IVA del costo')).not.toBeInTheDocument()
    const panel = screen.getByRole('complementary', { name: 'Cómo se calcula el precio' })
    expect(within(panel).getAllByText('—')).toHaveLength(4)
    expect(within(panel).getByText('Elige una categoría y escribe el costo para ver el precio sugerido.')).toBeInTheDocument()
    expect(within(panel).getByText('El precio se recalcula al guardar con tu configuración actual.')).toBeInTheDocument()

    await user.click(screen.getByLabelText('Código'))
    await user.tab()
    expect(screen.getByText('Escribe el código del producto.')).toBeInTheDocument()
    expect(screen.queryByText('Escribe la descripción del producto.')).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Costo de compra sin IVA'), '0')
    await user.click(screen.getByRole('button', { name: 'Guardar producto' }))
    // Foco al primer campo con error, errores asociados y resumen para lectores de pantalla.
    expect(screen.getByLabelText('Código')).toHaveFocus()
    expect(screen.getByLabelText('Código')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Código')).toHaveAccessibleDescription('Escribe el código del producto.')
    expect(screen.getByRole('alert')).toHaveTextContent('Revisa los 4 campos marcados.')
    expect(screen.getByText('Escribe la descripción del producto.')).toBeInTheDocument()
    expect(screen.getByText('Elige una categoría.')).toBeInTheDocument()
    expect(screen.getByText('El costo debe ser un valor mayor que cero.')).toBeInTheDocument()
    expect(bodies(fetchMock, 'POST')).toHaveLength(0)
  })

  it('crea con el cuerpo exacto y vuelve al listado con sus filtros', async () => {
    const fetchMock = mockApi(fullRoutes())
    const user = userEvent.setup()
    const router = renderRoute('/inventario?estado=BAJO')
    await screen.findByRole('heading', { name: 'Productos' })
    await user.click(screen.getByRole('link', { name: 'Nuevo producto' }))
    await screen.findByRole('heading', { name: 'Nuevo producto' })

    await fillNew(user)
    await user.click(screen.getByRole('button', { name: 'Guardar producto' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/inventario'))
    expect(router.state.location.search).toBe('?estado=BAJO')
    expect(bodies(fetchMock, 'POST')).toEqual([
      { code: 'LL-020', description: 'Llanta Hankook 185/65 R14', purchaseCost: 98500, quantity: 6, categoryId: 1 },
    ])
    expect(await screen.findByText('Producto guardado')).toBeInTheDocument()
  })

  it('edita sin enviar quantity; el panel muestra IVA y precio y sigue al costo', async () => {
    const fetchMock = mockApi(fullRoutes())
    const user = userEvent.setup()
    const router = renderRoute('/inventario/1/editar')

    expect(await screen.findByRole('heading', { name: 'Editar producto' })).toBeInTheDocument()
    expect(await screen.findByLabelText('Stock')).toHaveValue('50')
    expect(screen.getByLabelText('Stock')).toHaveAttribute('readonly')
    expect(screen.getByText('El stock cambia con las ventas y las compras; no se edita aquí.')).toBeInTheDocument()
    expect(await formDialog().findByLabelText('Categoría')).toHaveValue('4')
    const panel = screen.getByRole('complementary', { name: 'Cómo se calcula el precio' })
    expect(await within(panel).findByText('$ 42.857')).toBeInTheDocument()
    expect(within(panel).getByText('$ 5.700')).toBeInTheDocument()
    expect(within(panel).getByText('30 %')).toBeInTheDocument()
    // Edicion sin cambios: Guardar deshabilitado (la unica excepcion de la regla).
    expect(screen.getByRole('button', { name: 'Guardar producto' })).toBeDisabled()

    await user.clear(screen.getByLabelText('Costo de compra sin IVA'))
    await user.type(screen.getByLabelText('Costo de compra sin IVA'), '32000')
    expect(within(panel).getByText('$ 45.714')).toBeInTheDocument()
    expect(within(panel).getByText('$ 6.080')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Guardar producto' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/inventario'))
    const [put] = bodies(fetchMock, 'PUT')
    expect(put).toEqual({ code: 'DEMO-001', description: 'Aceite 20W50 galon', purchaseCost: 32000, categoryId: 4 })
    expect(put).not.toHaveProperty('quantity')
  })

  it('un 409 del codigo se muestra bajo el campo Codigo', async () => {
    mockApi({
      ...fullRoutes(),
      'PUT /api/inventory/products/1': () =>
        jsonResponse({ error: 'El codigo DEMO-001 no se puede cambiar: el producto ya tiene facturas de venta o de compra', status: 409 }, 409),
    })
    const user = userEvent.setup()
    renderRoute('/inventario/1/editar')
    await screen.findByLabelText('Stock')
    await formDialog().findByLabelText('Categoría')

    await user.clear(screen.getByLabelText('Código'))
    await user.type(screen.getByLabelText('Código'), 'DEMO-100')
    await user.click(screen.getByRole('button', { name: 'Guardar producto' }))

    const code = screen.getByLabelText('Código')
    await waitFor(() => expect(code).toHaveAttribute('aria-invalid', 'true'))
    expect(code).toHaveAccessibleDescription(
      'El código DEMO-001 no se puede cambiar: el producto ya tiene facturas de venta o de compra.',
    )
    expect(code).toHaveFocus()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await user.type(code, 'X')
    expect(code).not.toHaveAttribute('aria-invalid')
  })

  it('otros errores van en un toast con el mensaje generico', async () => {
    mockApi({ ...fullRoutes(), 'POST /api/inventory/products': () => jsonResponse({ error: 'Error interno del servidor', status: 500 }, 500) })
    const user = userEvent.setup()
    renderRoute('/inventario/nuevo')
    await screen.findByRole('heading', { name: 'Nuevo producto' })

    await fillNew(user)
    await user.click(screen.getByRole('button', { name: 'Guardar producto' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(MESSAGES.network)
    expect(screen.queryByText('No pudimos guardar el producto')).not.toBeInTheDocument()
    expect(alert).not.toHaveTextContent('Error interno')
    expect(screen.getByLabelText('Código')).toHaveValue('LL-020')
  })

  it('avisa los cambios sin guardar al salir', async () => {
    mockApi(fullRoutes())
    const user = userEvent.setup()
    const router = renderRoute('/inventario/nuevo')
    await screen.findByRole('heading', { name: 'Nuevo producto' })

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/inventario'))

    await router.navigate('/inventario/nuevo')
    await screen.findByRole('heading', { name: 'Nuevo producto' })
    await user.type(screen.getByLabelText('Descripción'), 'Algo')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    const dialog = await screen.findByRole('dialog', { name: '¿Descartar los cambios?' })
    await user.click(within(dialog).getByRole('button', { name: 'Seguir editando' }))
    expect(router.state.location.pathname).toBe('/inventario/nuevo')
    expect(screen.getByLabelText('Descripción')).toHaveValue('Algo')

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Descartar' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/inventario'))
  })

  it('la ayuda del costo dice pesos colombianos y no menciona centavos', async () => {
    mockApi(fullRoutes())
    renderRoute('/inventario/nuevo')

    const cost = await screen.findByLabelText(/Costo de compra sin IVA/)
    expect(cost).toHaveAccessibleDescription('Costo de compra antes de IVA, en pesos colombianos.')
    expect(document.body.textContent).not.toMatch(/centavo/i)
  })

  it('un id inexistente o no numerico muestra Producto no encontrado', async () => {
    mockApi(fullRoutes())
    const router = renderRoute('/inventario/abc/editar')
    expect(await screen.findByRole('heading', { name: 'Producto no encontrado' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a Productos' })).toHaveAttribute('href', '/inventario')

    await router.navigate('/inventario/77/editar')
    expect(await screen.findByRole('heading', { name: 'Producto no encontrado' })).toBeInTheDocument()
    // Sigue siendo el modal sobre el listado y el enlace lo cierra.
    await userEvent.setup().click(screen.getByRole('link', { name: 'Volver a Productos' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/inventario'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('el costo va en pesos enteros: decimales escritos dan error', async () => {
    const fetchMock = mockApi(fullRoutes())
    const user = userEvent.setup()
    renderRoute('/inventario/nuevo')
    await screen.findByRole('heading', { name: 'Nuevo producto' })

    await fillNew(user)
    await user.clear(screen.getByLabelText('Costo de compra sin IVA'))
    await user.type(screen.getByLabelText('Costo de compra sin IVA'), '98500,50')
    await user.tab()
    expect(screen.getByText('Escribe el costo en pesos, sin centavos.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Guardar producto' }))
    expect(screen.getByLabelText('Costo de compra sin IVA')).toHaveFocus()
    expect(bodies(fetchMock, 'POST')).toHaveLength(0)

    // Un punto escrito se ignora (es el del formato); pegado, si no es de miles, es decimal.
    await user.clear(screen.getByLabelText('Costo de compra sin IVA'))
    await user.type(screen.getByLabelText('Costo de compra sin IVA'), '98.5')
    expect(screen.getByLabelText('Costo de compra sin IVA')).toHaveValue('985')
    await user.clear(screen.getByLabelText('Costo de compra sin IVA'))
    await user.paste('98.5')
    expect(screen.getByLabelText('Costo de compra sin IVA')).toHaveValue('98,5')
    expect(screen.getByText('Escribe el costo en pesos, sin centavos.')).toBeInTheDocument()
    await user.clear(screen.getByLabelText('Costo de compra sin IVA'))
    await user.type(screen.getByLabelText('Costo de compra sin IVA'), '98.500')
    expect(screen.queryByText('Escribe el costo en pesos, sin centavos.')).not.toBeInTheDocument()
  })

  it('un producto con costo guardado con decimales se carga y se guarda sin bloqueo', async () => {
    const withCents = { ...demo, purchaseCost: 30000.5 }
    const fetchMock = mockApi({
      ...fullRoutes(),
      'GET /api/inventory/products/1': () => jsonResponse(withCents),
    })
    const user = userEvent.setup()
    const router = renderRoute('/inventario/1/editar')
    expect(await screen.findByLabelText('Costo de compra sin IVA')).toHaveValue('30.000,5')

    await user.clear(screen.getByLabelText('Descripción'))
    await user.type(screen.getByLabelText('Descripción'), 'Aceite 20W50 galon nuevo')
    await user.click(screen.getByRole('button', { name: 'Guardar producto' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/inventario'))
    expect(bodies(fetchMock, 'PUT')[0]).toMatchObject({ purchaseCost: 30000.5 })
  })
})

describe('costo de compra con separador de miles', () => {
  beforeEach(() => {
    saveToken(validToken())
  })

  const costField = () => screen.getByLabelText<HTMLInputElement>('Costo de compra sin IVA')

  it('formatea al escribir; el panel calcula y la API recibe el numero sin formato', async () => {
    const fetchMock = mockApi(fullRoutes())
    const user = userEvent.setup()
    renderRoute('/inventario/nuevo')
    await screen.findByRole('heading', { name: 'Nuevo producto' })

    await user.type(screen.getByLabelText('Código'), 'LL-020')
    await user.type(screen.getByLabelText('Descripción'), 'Llanta')
    await user.selectOptions(await formDialog().findByLabelText('Categoría'), '4')
    await user.type(costField(), '1234567')
    expect(costField()).toHaveValue('1.234.567')
    expect(costField()).toHaveAttribute('inputmode', 'numeric')
    expect(costField()).toHaveAccessibleDescription('Costo de compra antes de IVA, en pesos colombianos.')

    // Con margen de 30 %, IVA de 19 % y configuracion en cero: 1234567 / 0,7 y 1234567 * 0,19.
    const panel = screen.getByRole('complementary', { name: 'Cómo se calcula el precio' })
    expect(await within(panel).findByText('$ 1.763.667')).toBeInTheDocument()
    expect(within(panel).getByText('$ 1.234.567')).toBeInTheDocument()
    expect(within(panel).getByText('$ 234.568')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Guardar producto' }))
    await waitFor(() => expect(bodies(fetchMock, 'POST')).toHaveLength(1))
    expect(bodies(fetchMock, 'POST')[0]).toMatchObject({ purchaseCost: 1234567 })
  })

  it('el stock inicial sigue sin separador', async () => {
    mockApi(fullRoutes())
    const user = userEvent.setup()
    renderRoute('/inventario/nuevo')
    await screen.findByRole('heading', { name: 'Nuevo producto' })
    await user.clear(screen.getByLabelText('Stock inicial'))
    await user.type(screen.getByLabelText('Stock inicial'), '1234')
    expect(screen.getByLabelText('Stock inicial')).toHaveValue('1234')
  })

  it('pegar con formato, borrar en medio y el panel siguen el valor', async () => {
    const fetchMock = mockApi(fullRoutes())
    const user = userEvent.setup()
    renderRoute('/inventario/nuevo')
    await screen.findByRole('heading', { name: 'Nuevo producto' })
    await user.type(screen.getByLabelText('Código'), 'LL-020')
    await user.type(screen.getByLabelText('Descripción'), 'Llanta')
    await user.selectOptions(await formDialog().findByLabelText('Categoría'), '4')

    await user.click(costField())
    await user.paste('$ 1.234.567')
    expect(costField()).toHaveValue('1.234.567')
    const panel = screen.getByRole('complementary', { name: 'Cómo se calcula el precio' })
    expect(within(panel).getByText('$ 1.234.567')).toBeInTheDocument()

    costField().setSelectionRange(4, 4)
    await user.keyboard('{Backspace}')
    expect(costField()).toHaveValue('124.567')
    expect(costField().selectionStart).toBe(2)
    expect(within(panel).getByText('$ 124.567')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Guardar producto' }))
    await waitFor(() => expect(bodies(fetchMock, 'POST')).toHaveLength(1))
    expect(bodies(fetchMock, 'POST')[0]).toMatchObject({ purchaseCost: 124567 })
  })

  it('una coma escrita no multiplica el valor: se ve y da el error de siempre', async () => {
    const fetchMock = mockApi(fullRoutes())
    const user = userEvent.setup()
    renderRoute('/inventario/nuevo')
    await screen.findByRole('heading', { name: 'Nuevo producto' })
    await fillNew(user)
    await user.clear(costField())
    await user.type(costField(), '98500,50')
    expect(costField()).toHaveValue('98.500,50')
    await user.click(screen.getByRole('button', { name: 'Guardar producto' }))
    expect(screen.getByText('Escribe el costo en pesos, sin centavos.')).toBeInTheDocument()
    expect(bodies(fetchMock, 'POST')).toHaveLength(0)
  })

  it('al editar llega formateado, sin marcar cambios, y se envia sin formato', async () => {
    const big = { ...demo, purchaseCost: 1234567 }
    const fetchMock = mockApi({ ...fullRoutes(), 'GET /api/inventory/products/1': () => jsonResponse(big) })
    const user = userEvent.setup()
    renderRoute('/inventario/1/editar')

    expect(await screen.findByLabelText('Costo de compra sin IVA')).toHaveValue('1.234.567')
    expect(screen.getByRole('button', { name: 'Guardar producto' })).toBeDisabled()
    expect(screen.getByLabelText('Stock')).toHaveValue('50')

    await user.type(costField(), '0')
    expect(costField()).toHaveValue('12.345.670')
    await user.click(screen.getByRole('button', { name: 'Guardar producto' }))
    await waitFor(() => expect(bodies(fetchMock, 'PUT')).toHaveLength(1))
    expect(bodies(fetchMock, 'PUT')[0]).toMatchObject({ purchaseCost: 12345670 })
  })
})

describe('modal de producto', () => {
  beforeEach(() => {
    saveToken(validToken())
  })

  const productGets = (fetchMock: ReturnType<typeof mockApi>) =>
    fetchMock.mock.calls.filter(([url, init]) => url === '/api/inventory/products' && (init?.method ?? 'GET') === 'GET').length

  async function openNew(user: ReturnType<typeof userEvent.setup>, path = '/inventario') {
    const router = renderRoute(path)
    await screen.findByRole('heading', { name: 'Productos' })
    const opener = screen.getByRole('link', { name: 'Nuevo producto' })
    await user.click(opener)
    await screen.findByRole('dialog', { name: 'Nuevo producto' })
    return { router, opener }
  }

  it('se abre sobre el listado, con el foco en el primer campo, ancho y con el pie fuera del desplazamiento', async () => {
    mockApi(fullRoutes())
    const user = userEvent.setup()
    await openNew(user)

    expect(screen.getByRole('heading', { level: 1, name: 'Productos' })).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByLabelText('Código')).toHaveFocus()
    // Abrir no marca errores: el campo aun no se ha tocado.
    expect(screen.getByLabelText('Código')).not.toHaveAttribute('aria-invalid')
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveClass('max-w-2xl', 'flex-col')
    const scroller = screen.getByLabelText('Código').closest('.overflow-y-auto') as HTMLElement
    expect(dialog).toContainElement(scroller)
    expect(scroller).not.toContainElement(screen.getByRole('button', { name: 'Guardar producto' }))
    // Un solo primario dentro del modal.
    expect(dialog.querySelectorAll('[data-variant="primary"]')).toHaveLength(1)
  })

  it('un enlace directo a la ruta abre el modal sobre el listado', async () => {
    mockApi(fullRoutes())
    renderRoute('/inventario/nuevo')
    expect(await screen.findByRole('dialog', { name: 'Nuevo producto' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1, name: 'Productos' })).toBeInTheDocument()
  })

  it.each([
    ['Escape', (user: ReturnType<typeof userEvent.setup>) => user.keyboard('{Escape}')],
    ['la X', (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: 'Cerrar' }))],
    ['Cancelar', (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: 'Cancelar' }))],
  ])('sin cambios, %s cierra, conserva los filtros y devuelve el foco al boton', async (_name, closeIt) => {
    mockApi(fullRoutes())
    const user = userEvent.setup()
    const { router, opener } = await openNew(user, '/inventario?estado=BAJO')
    expect(router.state.location.search).toBe('?estado=BAJO')

    await closeIt(user)

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(router.state.location.pathname).toBe('/inventario')
    expect(router.state.location.search).toBe('?estado=BAJO')
    expect(opener).toHaveFocus()
  })

  it('atrapa el foco: Tab no sale del modal en ningun sentido', async () => {
    mockApi(fullRoutes())
    const user = userEvent.setup()
    await openNew(user)
    const dialog = screen.getByRole('dialog')
    await formDialog().findByLabelText('Categoría')

    screen.getByRole('button', { name: 'Guardar producto' }).focus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Guardar producto' })).toHaveFocus()
    expect(dialog).toContainElement(document.activeElement as HTMLElement)
  })

  it('con cambios, Escape pregunta; Seguir editando conserva lo digitado y Descartar cierra', async () => {
    mockApi(fullRoutes())
    const user = userEvent.setup()
    const { router, opener } = await openNew(user)
    await user.type(screen.getByLabelText('Descripción'), 'Algo')

    await user.keyboard('{Escape}')
    const discard = await screen.findByRole('dialog', { name: '¿Descartar los cambios?' })
    // Un solo dialogo a la vez.
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    await user.click(within(discard).getByRole('button', { name: 'Seguir editando' }))
    expect(screen.getByLabelText('Descripción')).toHaveValue('Algo')
    expect(screen.getByLabelText('Código')).toHaveFocus()

    await user.keyboard('{Escape}')
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Descartar' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/inventario'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it('con cambios, volver atras en el navegador tambien pregunta', async () => {
    mockApi(fullRoutes())
    const user = userEvent.setup()
    const { router } = await openNew(user)
    await user.type(screen.getByLabelText('Descripción'), 'Algo')

    await act(() => router.navigate(-1))
    expect(await screen.findByRole('dialog', { name: '¿Descartar los cambios?' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/inventario/nuevo')
  })

  it('guardar cierra sin preguntar, refresca la lista y avisa', async () => {
    const fetchMock = mockApi(fullRoutes())
    const user = userEvent.setup()
    const { opener } = await openNew(user)
    const before = productGets(fetchMock)

    await fillNew(user)
    await user.click(screen.getByRole('button', { name: 'Guardar producto' }))

    expect(await screen.findByText('Producto guardado')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(productGets(fetchMock)).toBeGreaterThan(before))
    expect(bodies(fetchMock, 'POST')).toHaveLength(1)
    expect(opener).toHaveFocus()
  })

  it('un 400 del servidor se muestra en el modal y conserva lo digitado', async () => {
    mockApi({ ...fullRoutes(), 'POST /api/inventory/products': () => jsonResponse({ error: 'La categoria no existe', status: 400 }, 400) })
    const user = userEvent.setup()
    await openNew(user)
    await fillNew(user)
    await user.click(screen.getByRole('button', { name: 'Guardar producto' }))

    const alert = await formDialog().findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos guardar el producto')
    expect(screen.getByLabelText('Código')).toHaveValue('LL-020')
    expect(screen.getByRole('dialog', { name: 'Nuevo producto' })).toBeInTheDocument()
  })

  it('edita desde la fila sin salir del listado y devuelve el foco al enlace', async () => {
    const fetchMock = mockApi(fullRoutes())
    const user = userEvent.setup()
    const router = renderRoute('/inventario')
    await screen.findByRole('heading', { name: 'Productos' })
    const link = await waitFor(() => within(screen.getByRole('table')).getByRole('link', { name: 'Editar DEMO-001' }))
    await user.click(link)

    expect(await screen.findByRole('dialog', { name: 'Editar producto' })).toBeInTheDocument()
    expect(await screen.findByLabelText('Código')).toHaveFocus()
    expect(screen.getByRole('table')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Descripción'))
    await user.type(screen.getByLabelText('Descripción'), 'Aceite nuevo')
    await user.click(screen.getByRole('button', { name: 'Guardar producto' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/inventario'))
    expect(bodies(fetchMock, 'PUT')).toHaveLength(1)
    expect(await screen.findByText('Producto guardado')).toBeInTheDocument()
    await waitFor(() => expect(link).toHaveFocus())
  })

  it('si no se puede cargar el producto, el error queda en el modal con Reintentar', async () => {
    mockApi({ ...fullRoutes(), 'GET /api/inventory/products/1': () => jsonResponse({ error: 'Error interno del servidor', status: 500 }, 500) })
    renderRoute('/inventario/1/editar')
    const dialog = await screen.findByRole('dialog', { name: 'Editar producto' })
    expect(await within(dialog).findByText('No pudimos cargar el producto.', {}, { timeout: 5000 })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
