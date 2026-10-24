import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { saveToken } from '../auth/session'
import { jsonResponse, renderRoute, validToken } from '../test/utils'

type Handler = (body: unknown) => Response
type Routes = Record<string, Handler>

const customers = [
  { id: 1, role: 'CLIENTE', name: 'Consumidor final', documentType: 'NIT', documentNumber: '222222222222', email: null, phone: null },
  { id: 2, role: 'CLIENTE', name: 'Transportes Boyacá S.A.S.', documentType: 'NIT', documentNumber: '900123456', email: 'compras@transboyaca.co', phone: null },
]
const accounts = [
  { id: 10, name: 'Caja General', type: 'EFECTIVO', currentBalance: 0 },
  { id: 11, name: 'Bancolombia', type: 'BANCO', currentBalance: 0 },
]
const categories = [
  { id: 1, name: 'LLANTAS', yellowStockMin: 10, redStockMin: 3, taxTypes: [{ rate: 0.19, isVat: true }] },
]
const products = [
  { id: 1, code: 'LL-001', description: 'Llanta Michelin 205/55 R16', quantity: 50, suggestedPrice: 180000, categoryId: 1 },
  { id: 2, code: 'LUB-012', description: 'Aceite Mobil Super', quantity: 12, suggestedPrice: 38000, categoryId: 1 },
  { id: 3, code: 'BAT-007', description: 'Batería Willard', quantity: 4, suggestedPrice: 420000, categoryId: 1 },
]

const savedSale = (invoiceNumber = 'FV-0232') => ({
  id: 99,
  invoiceNumber,
  customer: customers[0],
  invoiceDate: '2026-10-18',
  dueDate: null,
  paymentType: 'CONTADO',
  status: 'PAGADA',
  total: 428400,
  pendingBalance: 0,
})

function fullRoutes(): Routes {
  return {
    'GET /api/sales/next-invoice-number': () => jsonResponse({ invoiceNumber: 'FV-0232' }),
    'GET /api/counterparties': () => jsonResponse(customers),
    'GET /api/treasury/accounts': () => jsonResponse(accounts),
    'GET /api/inventory/products': () => jsonResponse(products),
    'GET /api/inventory/categories': () => jsonResponse(categories),
    'POST /api/sales': () => jsonResponse(savedSale(), 201),
    'GET /api/sales': () => jsonResponse([]),
    'GET /api/reporting/kpis': () => jsonResponse({ totalSales: 0 }),
    'GET /api/treasury/movements': () => jsonResponse([]),
  }
}

function mockApi(routes: Routes) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    const handler = routes[`${method} ${url.split('?')[0] ?? ''}`]
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    return Promise.resolve(handler ? handler(body) : jsonResponse({ error: 'No encontrado', status: 404 }, 404))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function posts(fetchMock: ReturnType<typeof mockApi>, path: string) {
  return fetchMock.mock.calls
    .filter(([url, init]) => url === path && init?.method === 'POST')
    .map(([, init]) => JSON.parse(String(init?.body)) as Record<string, unknown>)
}

async function setup(routes: Routes = fullRoutes()) {
  const fetchMock = mockApi(routes)
  const user = userEvent.setup()
  const router = renderRoute('/ventas/nueva')
  await screen.findByRole('heading', { name: 'Nueva factura de venta' })
  return { fetchMock, user, router }
}

type User = ReturnType<typeof userEvent.setup>

async function addProduct(user: User, search: string, quantity?: string) {
  await user.click(await screen.findByRole('button', { name: 'Agregar producto' }))
  const combos = screen.getAllByRole('combobox', { name: 'Producto' })
  const combo = combos[combos.length - 1] as HTMLElement
  await user.click(combo)
  await user.type(combo, search)
  await user.keyboard('{Enter}')
  if (quantity !== undefined) {
    const inputs = screen.getAllByLabelText('Cantidad')
    const input = inputs[inputs.length - 1] as HTMLElement
    await user.clear(input)
    await user.type(input, quantity)
  }
}

function summary() {
  return screen.getByRole('complementary', { name: 'Resumen' })
}

describe('nueva factura de venta', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-18T15:00:00Z'))
    saveToken(validToken())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('arranca con el numero sugerido, Consumidor final y la fecha de hoy en Bogota', async () => {
    vi.setSystemTime(new Date('2026-10-19T03:00:00Z'))
    saveToken(validToken())
    await setup()

    expect(await screen.findByLabelText('Número')).toHaveValue('FV-0232')
    expect(screen.getByText('Se confirma al guardar')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Cliente' })).toHaveValue('Consumidor final')
    expect(screen.getByLabelText('Documento')).toHaveValue('NIT 222222222222')
    expect(screen.getByLabelText('Fecha de factura')).toHaveValue('2026-10-18')
    expect(screen.getByRole('button', { name: 'Guardar factura' })).toBeDisabled()
    expect(screen.getByText('Agrega al menos un producto.')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Ruta de navegación' })).toHaveTextContent('Nueva factura')
  })

  it('cada linea tiene sus campos accesibles y la rejilla solo desde xl', async () => {
    const { user } = await setup()
    await addProduct(user, 'michelin', '2')
    await addProduct(user, 'willard')

    const lines = screen.getAllByRole('listitem', { name: /^Línea / })
    expect(lines).toHaveLength(2)
    for (const line of lines) {
      expect(within(line).getByRole('combobox', { name: 'Producto' })).toBeInTheDocument()
      expect(within(line).getByLabelText('Cantidad')).toBeInTheDocument()
      expect(within(line).getByLabelText('Precio')).toBeInTheDocument()
      expect(within(line).getByText('IVA')).toBeInTheDocument()
      expect(within(line).getByText('Total')).toBeInTheDocument()
      expect(within(line).getByRole('button', { name: /^Quitar / })).toBeInTheDocument()
      expect(line).toHaveClass('flex', 'flex-col', 'xl:grid')
      expect(line.className).not.toMatch(/(^|\s)md:grid/)
    }
    expect(lines[0]).toHaveAccessibleName('Línea LL-001')
    expect(within(lines[0] as HTMLElement).getByText('LL-001')).toBeInTheDocument()
  })

  it('en contado propone la primera cuenta de efectivo por id, con Efectivo bloqueado', async () => {
    await setup({
      ...fullRoutes(),
      'GET /api/treasury/accounts': () =>
        jsonResponse([
          { id: 12, name: 'Caja Sede Norte', type: 'EFECTIVO', currentBalance: 0 },
          { id: 11, name: 'Bancolombia', type: 'BANCO', currentBalance: 0 },
          { id: 10, name: 'Caja General', type: 'EFECTIVO', currentBalance: 0 },
        ]),
    })

    expect(await screen.findByLabelText('Cuenta')).toHaveValue('10')
    expect(screen.getByLabelText('Método de pago')).toHaveValue('EFECTIVO')
    expect(screen.getByLabelText('Método de pago')).toBeDisabled()
    expect(screen.queryByLabelText('Medio de pago')).not.toBeInTheDocument()
    expect(screen.queryByText('Elige la cuenta donde entra el dinero.')).not.toBeInTheDocument()
  })

  it('sin cuentas de efectivo no propone ninguna', async () => {
    await setup({
      ...fullRoutes(),
      'GET /api/treasury/accounts': () => jsonResponse([{ id: 11, name: 'Bancolombia', type: 'BANCO', currentBalance: 0 }]),
    })

    expect(await screen.findByLabelText('Cuenta')).toHaveValue('')
    expect(screen.getByText('Elige la cuenta donde entra el dinero.')).toBeInTheDocument()
  })

  it('guarda una factura de contado en efectivo y vuelve al listado con un aviso', async () => {
    const { fetchMock, user, router } = await setup()

    await user.selectOptions(await screen.findByLabelText('Cuenta'), 'Caja General')
    const method = screen.getByLabelText('Método de pago')
    expect(method).toHaveValue('EFECTIVO')
    expect(method).toBeDisabled()
    expect(screen.getByText('Se asigna automáticamente con Caja General')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '30 días' })).not.toBeInTheDocument()

    await addProduct(user, 'michelin', '2')
    const row = screen.getByRole('listitem', { name: 'Línea LL-001' })
    expect(within(row).getByLabelText('Precio')).toHaveValue(180000)
    expect(within(row).getByText('Disponible: 50')).toBeInTheDocument()
    expect(within(row).getByText('$ 68.400')).toBeInTheDocument()
    expect(within(row).getByText('$ 360.000')).toBeInTheDocument()
    expect(within(summary()).getByText('$ 360.000')).toBeInTheDocument()
    expect(within(summary()).getByText('$ 68.400')).toBeInTheDocument()
    expect(within(summary()).getByText('$ 428.400')).toBeInTheDocument()
    expect(
      within(summary()).getByText('Al guardar se descuentan 2 unidades del inventario y se acreditan $ 428.400 en Caja General.'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Guardar factura' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/ventas'))
    expect(await screen.findByText('Factura FV-0232 guardada')).toBeInTheDocument()
    const [body] = posts(fetchMock, '/api/sales')
    expect(body).toEqual({
      customerId: 1,
      invoiceDate: '2026-10-18',
      paymentType: 'CONTADO',
      accountId: 10,
      paymentMethod: 'EFECTIVO',
      details: [{ productId: 1, quantity: 2, price: 180000 }],
    })
  })

  it('a credito propone vencimiento a 30 dias, recalcula con 60 y no envia cuenta ni medio', async () => {
    const { fetchMock, user } = await setup()

    await user.selectOptions(await screen.findByLabelText('Cuenta'), 'Bancolombia')
    expect(screen.getByLabelText('Método de pago')).toBeEnabled()
    expect(within(screen.getByLabelText('Método de pago')).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Transferencia',
      'Tarjeta débito',
      'Tarjeta crédito',
    ])

    await user.click(screen.getByRole('radio', { name: 'Crédito' }))
    expect(screen.queryByLabelText('Cuenta')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Método de pago')).not.toBeInTheDocument()
    const due = screen.getByLabelText('Fecha de vencimiento')
    expect(due).toHaveValue('2026-11-17')
    await user.click(screen.getByRole('button', { name: '60 días' }))
    expect(due).toHaveValue('2026-12-17')

    await user.click(screen.getByRole('combobox', { name: 'Cliente' }))
    await user.type(screen.getByRole('combobox', { name: 'Cliente' }), '900123')
    await user.keyboard('{Enter}')
    expect(screen.getByLabelText('Correo del cliente')).toHaveValue('compras@transboyaca.co')

    await addProduct(user, 'LL-001')
    expect(
      within(summary()).getByText('Al guardar se descuentan 1 unidad del inventario y la factura queda pendiente de abono.'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Guardar factura' }))

    await waitFor(() => expect(posts(fetchMock, '/api/sales')).toHaveLength(1))
    expect(posts(fetchMock, '/api/sales')[0]).toEqual({
      customerId: 2,
      invoiceDate: '2026-10-18',
      paymentType: 'CREDITO',
      dueDate: '2026-12-17',
      details: [{ productId: 1, quantity: 1, price: 180000 }],
    })
  })

  it('valida cantidad contra el stock, precio y cuenta antes de habilitar Guardar', async () => {
    const { user } = await setup()
    const save = screen.getByRole('button', { name: 'Guardar factura' })

    await addProduct(user, 'willard', '5')
    expect(screen.getByText('Solo hay 4 unidades disponibles.')).toBeInTheDocument()
    expect(save).toBeDisabled()

    const quantity = screen.getByLabelText('Cantidad')
    await user.clear(quantity)
    await user.type(quantity, '1')
    const price = screen.getByLabelText('Precio')
    await user.clear(price)
    await user.type(price, '0')
    expect(screen.getByText('El precio debe ser mayor que cero.')).toBeInTheDocument()
    expect(save).toBeDisabled()

    await user.clear(price)
    await user.type(price, '400000')
    expect(save).toBeEnabled()

    await user.selectOptions(screen.getByLabelText('Cuenta'), 'Elige una cuenta')
    expect(screen.getByText('Elige la cuenta donde entra el dinero.')).toBeInTheDocument()
    expect(save).toBeDisabled()

    await user.selectOptions(screen.getByLabelText('Cuenta'), 'Caja General')
    expect(save).toBeEnabled()
  })

  it('no ofrece dos veces el mismo producto', async () => {
    const { user } = await setup()

    await addProduct(user, 'michelin')
    await user.click(screen.getByRole('button', { name: 'Agregar producto' }))
    const combos = screen.getAllByRole('combobox', { name: 'Producto' })
    await user.click(combos[1] as HTMLElement)

    const list = screen.getByRole('listbox', { name: 'Producto' })
    expect(within(list).queryByText('Llanta Michelin 205/55 R16')).not.toBeInTheDocument()
    expect(within(list).getByText('Aceite Mobil Super')).toBeInTheDocument()
  })

  it('avisa de stock bajo y critico con lo que quedaria', async () => {
    const { user } = await setup()

    await addProduct(user, 'mobil', '2')
    expect(await screen.findByText('LUB-012 quedará con 10 unidades después de esta venta.')).toBeInTheDocument()
    expect(screen.getByText('Stock bajo')).toBeInTheDocument()

    await addProduct(user, 'willard', '3')
    expect(screen.getByText('BAT-007 quedará con 1 unidad después de esta venta.')).toBeInTheDocument()
    expect(screen.getByText('Stock crítico')).toBeInTheDocument()
  })

  it('un 409 de stock se muestra sin perder lo digitado', async () => {
    const { user, router } = await setup({
      ...fullRoutes(),
      'POST /api/sales': () => jsonResponse({ error: 'Stock insuficiente para Batería Willard: hay 2 y se piden 3', status: 409 }, 409),
    })

    await user.selectOptions(await screen.findByLabelText('Cuenta'), 'Caja General')
    await addProduct(user, 'willard', '3')
    await user.click(screen.getByRole('button', { name: 'Guardar factura' }))

    const alert = await screen.findByText('Stock insuficiente para Batería Willard: hay 2 y se piden 3')
    expect(alert.closest('[role="alert"]')).toHaveTextContent('No pudimos guardar la factura')
    expect(router.state.location.pathname).toBe('/ventas/nueva')
    expect(screen.getByLabelText('Cantidad')).toHaveValue(3)
    expect(screen.getByLabelText('Cuenta')).toHaveValue('10')
    expect(screen.getByRole('button', { name: 'Guardar factura' })).toBeEnabled()
  })

  it('un 409 de numero repetido se reintenta una sola vez', async () => {
    let calls = 0
    const { fetchMock, user, router } = await setup({
      ...fullRoutes(),
      'POST /api/sales': () => {
        calls += 1
        return calls === 1
          ? jsonResponse({ error: 'Ya existe una factura con el numero FV-0232', status: 409 }, 409)
          : jsonResponse(savedSale('FV-0233'), 201)
      },
    })

    await user.selectOptions(await screen.findByLabelText('Cuenta'), 'Caja General')
    await addProduct(user, 'michelin')
    await user.click(screen.getByRole('button', { name: 'Guardar factura' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/ventas'))
    expect(posts(fetchMock, '/api/sales')).toHaveLength(2)
    expect(await screen.findByText('Factura FV-0233 guardada')).toBeInTheDocument()
  })

  it('si el numero choca dos veces muestra el mensaje y no insiste', async () => {
    const { fetchMock, user } = await setup({
      ...fullRoutes(),
      'POST /api/sales': () => jsonResponse({ error: 'Ya existe una factura con el numero FV-0232', status: 409 }, 409),
    })

    await user.selectOptions(await screen.findByLabelText('Cuenta'), 'Caja General')
    await addProduct(user, 'michelin')
    await user.click(screen.getByRole('button', { name: 'Guardar factura' }))

    expect(await screen.findByText('Ya existe una factura con el numero FV-0232')).toBeInTheDocument()
    expect(posts(fetchMock, '/api/sales')).toHaveLength(2)
  })

  it.each([
    [201, 'nuevo'],
    [200, 'promovido de proveedor'],
  ])('el modal de nuevo cliente selecciona el tercero devuelto con %i (%s)', async (status) => {
    const returned = { id: 7, role: 'AMBOS', name: 'Taller El Cruce S.A.S.', documentType: 'NIT', documentNumber: '800555', email: 'pagos@elcruce.co', phone: null }
    const { fetchMock, user } = await setup({ ...fullRoutes(), 'POST /api/counterparties': () => jsonResponse(returned, status) })

    await user.click(await screen.findByRole('button', { name: 'Nuevo cliente' }))
    const dialog = screen.getByRole('dialog', { name: 'Nuevo cliente' })
    expect(within(dialog).getByLabelText('Nombre o razón social')).toHaveFocus()
    await user.type(within(dialog).getByLabelText('Nombre o razón social'), 'Taller el cruce')
    await user.selectOptions(within(dialog).getByLabelText('Tipo de documento'), 'NIT')
    await user.type(within(dialog).getByLabelText('Número de documento'), '800555')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cliente' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(posts(fetchMock, '/api/counterparties')[0]).toEqual({
      role: 'CLIENTE',
      name: 'Taller el cruce',
      documentType: 'NIT',
      documentNumber: '800555',
    })
    expect(screen.getByRole('combobox', { name: 'Cliente' })).toHaveValue('Taller El Cruce S.A.S.')
    expect(screen.getByLabelText('Correo del cliente')).toHaveValue('pagos@elcruce.co')
  })

  it('el modal de nuevo cliente muestra el 409 del backend y se cierra con Esc', async () => {
    const { user } = await setup({
      ...fullRoutes(),
      'POST /api/counterparties': () =>
        jsonResponse({ error: 'Ya existe un tercero con el documento 900123456 como CLIENTE', status: 409 }, 409),
    })

    await user.click(await screen.findByRole('button', { name: 'Nuevo cliente' }))
    const dialog = screen.getByRole('dialog', { name: 'Nuevo cliente' })
    await user.type(within(dialog).getByLabelText('Nombre o razón social'), 'Otro')
    await user.type(within(dialog).getByLabelText('Número de documento'), '900123456')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cliente' }))

    expect(await within(dialog).findByText('Ya existe un tercero con el documento 900123456 como CLIENTE')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Cliente' })).toHaveValue('Consumidor final')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Cancelar con datos digitados pide confirmar antes de descartar', async () => {
    const { user, router } = await setup()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/ventas'))

    await router.navigate('/ventas/nueva')
    await addProduct(user, 'michelin')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    const dialog = await screen.findByRole('dialog', { name: 'Descartar cambios' })
    expect(within(dialog).getByRole('button', { name: 'Seguir editando' })).toHaveFocus()
    await user.click(within(dialog).getByRole('button', { name: 'Seguir editando' }))
    expect(router.state.location.pathname).toBe('/ventas/nueva')
    expect(screen.getByRole('listitem', { name: 'Línea LL-001' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Inicio' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Descartar cambios' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/inicio'))
  })

  it('con datos digitados el cierre de pestana avisa', async () => {
    const { user } = await setup()
    const event = () => {
      const e = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(e)
      return e.defaultPrevented
    }

    expect(event()).toBe(false)
    fireEvent.change(await screen.findByLabelText('Fecha de factura'), { target: { value: '2026-10-10' } })
    expect(event()).toBe(true)
    await user.click(screen.getByRole('radio', { name: 'Crédito' }))
    expect(screen.getByLabelText('Fecha de vencimiento')).toHaveValue('2026-11-09')
  })

  it('muestra skeleton mientras carga y un error con reintento por bloque', async () => {
    let productCalls = 0
    const { user } = await setup({
      ...fullRoutes(),
      'GET /api/inventory/products': () => {
        productCalls += 1
        return productCalls === 1 ? jsonResponse({ error: 'Error interno', status: 500 }, 500) : jsonResponse(products)
      },
    })

    const productsSection = screen.getByRole('region', { name: 'Productos' })
    expect(await within(productsSection).findByText('No pudimos cargar los productos.')).toBeInTheDocument()
    expect(await screen.findByLabelText('Cuenta')).toBeInTheDocument()

    await user.click(within(productsSection).getByRole('button', { name: 'Reintentar' }))
    expect(await within(productsSection).findByRole('button', { name: 'Agregar producto' })).toBeEnabled()
  })

  it('mientras cargan los datos muestra skeleton', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})))
    renderRoute('/ventas/nueva')

    await screen.findByRole('heading', { name: 'Nueva factura de venta' })
    expect(screen.getByRole('region', { name: 'Datos generales' }).querySelector('[aria-busy]')).not.toBeNull()
    expect(screen.getByRole('region', { name: 'Productos' }).querySelector('[aria-busy]')).not.toBeNull()
  })

  it('sin productos ni cuentas lo dice con un vacio', async () => {
    await setup({
      ...fullRoutes(),
      'GET /api/inventory/products': () => jsonResponse([]),
      'GET /api/treasury/accounts': () => jsonResponse([]),
    })

    expect(await screen.findByText(/Aún no tienes productos en el inventario/)).toBeInTheDocument()
    expect(await screen.findByText(/Aún no tienes cuentas/)).toBeInTheDocument()
  })

  it('los botones del panel y del listado llevan a la nueva factura', async () => {
    mockApi(fullRoutes())
    renderRoute('/ventas')
    const [link] = await screen.findAllByRole('link', { name: 'Nueva factura' })
    expect(link).toHaveAttribute('href', '/ventas/nueva')
  })
})
