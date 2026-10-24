import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { saveToken } from '../auth/session'
import { jsonResponse, renderRoute, validToken } from '../test/utils'

type Handler = (body: unknown) => Response | Promise<Response>
type Routes = Record<string, Handler>

const suppliers = [
  { id: 5, role: 'PROVEEDOR', name: 'Distrillantas Boyacá S.A.S.', documentType: 'NIT', documentNumber: '900555111', email: 'ventas@distrillantas.co', phone: null },
  { id: 6, role: 'AMBOS', name: 'Lubricantes del Norte', documentType: 'NIT', documentNumber: '900666222', email: null, phone: null },
]
const accounts = [
  { id: 11, name: 'Bancolombia', type: 'BANCO', currentBalance: 5000000 },
  { id: 10, name: 'Caja General', type: 'EFECTIVO', currentBalance: 10000000 },
  { id: 12, name: 'Caja Menor', type: 'EFECTIVO', currentBalance: 594999 },
]
const iva = { id: 1, name: 'IVA', rate: 0.19, isVat: true }
const categories = [
  { id: 1, name: 'LLANTAS', color: '#1d4ed8', yellowStockMin: 5, redStockMin: 2, targetMargin: 0.3, taxTypes: [iva] },
  { id: 2, name: 'SERVICIOS', color: '#15803d', yellowStockMin: 0, redStockMin: 0, targetMargin: 0.3, taxTypes: [{ id: 2, name: 'ICA', rate: 0.01, isVat: false }] },
]
const product = (id: number, code: string, description: string, purchaseCost: number, categoryId: number) => ({
  id,
  code,
  description,
  purchaseCost,
  quantity: 0,
  taxAmount: null,
  suggestedPrice: null,
  categoryId,
  categoryName: null,
})
const products = [
  product(1, 'LL-004', 'Llanta Pirelli 225/45 R18', 168000, 1),
  product(2, 'BAT-004', 'Batería MAC 42 Ah', 100000, 1),
  product(3, 'VAL-001', 'Válvula de aire', 5000, 2),
]

const savedPurchase = (invoiceNumber = 'DB-18452') => ({ id: 77, invoiceNumber, status: 'PAGADA' })

function fullRoutes(): Routes {
  return {
    'GET /api/counterparties': () => jsonResponse(suppliers),
    'GET /api/treasury/accounts': () => jsonResponse(accounts),
    'GET /api/inventory/products': () => jsonResponse(products),
    'GET /api/inventory/categories': () => jsonResponse(categories),
    'POST /api/purchases': () => jsonResponse(savedPurchase(), 201),
    'GET /api/purchases': () => jsonResponse([]),
    'GET /api/reporting/kpis': () => jsonResponse({ totalPurchases: 0 }),
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
  const router = renderRoute('/compras/nueva')
  await screen.findByRole('heading', { name: 'Nueva factura de compra' })
  return { fetchMock, user, router }
}

type User = ReturnType<typeof userEvent.setup>

async function chooseSupplier(user: User, search: string) {
  const combo = await screen.findByRole('combobox', { name: 'Proveedor' })
  await user.click(combo)
  await user.type(combo, search)
  await user.keyboard('{Enter}')
}

async function addProduct(user: User, search: string, quantity?: string, price?: string) {
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
  if (price !== undefined) {
    const inputs = screen.getAllByLabelText('Precio sin IVA')
    const input = inputs[inputs.length - 1] as HTMLElement
    await user.clear(input)
    await user.type(input, price)
  }
}

/** Proveedor, numero y una linea de BAT-004: 5 x 100.000 al 19 % = 595.000. */
async function fillValid(user: User, number = 'DB-18452') {
  await chooseSupplier(user, 'distri')
  await user.type(screen.getByLabelText('N.º factura del proveedor'), number)
  await addProduct(user, 'BAT-004', '5')
}

function summary() {
  return screen.getByRole('complementary', { name: 'Resumen' })
}

function summaryValue(label: string) {
  return within(summary()).getByText(label).nextElementSibling as HTMLElement
}

describe('nueva factura de compra', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-23T03:00:00Z'))
    saveToken(validToken())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('arranca sin proveedor, con la fecha de hoy en Bogota y la caja de efectivo propuesta', async () => {
    await setup()

    expect(await screen.findByRole('combobox', { name: 'Proveedor' })).toHaveValue('')
    expect(screen.getByLabelText('N.º factura del proveedor')).toHaveValue('')
    expect(screen.getByLabelText('N.º factura del proveedor')).toHaveAttribute('maxLength', '50')
    expect(screen.getByLabelText('Fecha de compra')).toHaveValue('2026-10-22')
    expect(screen.getByLabelText('Cuenta')).toHaveValue('10')
    expect(screen.getByRole('option', { name: 'Caja General · $ 10.000.000' })).toBeInTheDocument()
    expect(screen.getByText('Saldo disponible: $ 10.000.000')).toBeInTheDocument()
    expect(screen.getByLabelText('Método de pago')).toHaveValue('EFECTIVO')
    expect(screen.getByLabelText('Método de pago')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Guardar compra' })).toBeDisabled()
    expect(screen.getByText('Elige el proveedor.')).toBeInTheDocument()
    expect(screen.getByText('Escribe el número de factura del proveedor.')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Ruta de navegación' })).toHaveTextContent('Compras/Facturas de compra/Nueva factura')
  })

  it('cada linea tiene sus campos accesibles y la rejilla solo desde xl', async () => {
    const { user } = await setup()
    await addProduct(user, 'pirelli', '12')
    await addProduct(user, 'VAL-001', '3')

    const lines = screen.getAllByRole('listitem', { name: /^Línea / })
    expect(lines).toHaveLength(2)
    for (const line of lines) {
      expect(within(line).getByRole('combobox', { name: 'Producto' })).toBeInTheDocument()
      expect(within(line).getByLabelText('Cantidad')).toBeInTheDocument()
      expect(within(line).getByLabelText('Precio sin IVA')).toBeInTheDocument()
      expect(within(line).getByText('IVA')).toBeInTheDocument()
      expect(within(line).getByText('Total')).toBeInTheDocument()
      expect(within(line).getByRole('button', { name: /^Quitar / })).toBeInTheDocument()
      expect(line).toHaveClass('flex', 'flex-col', 'xl:grid')
      expect(line.className).not.toMatch(/(^|\s)md:grid/)
    }
  })

  it('una cuenta de banco ofrece Transferencia y Cheque', async () => {
    const { user } = await setup()

    await user.selectOptions(await screen.findByLabelText('Cuenta'), '11')
    const method = screen.getByLabelText('Método de pago')
    expect(method).toBeEnabled()
    expect(method).toHaveValue('TRANSFERENCIA')
    expect(within(method).getAllByRole('option').map((option) => option.textContent)).toEqual(['Transferencia', 'Cheque'])
  })

  it('calcula en vivo con el costo del producto, IVA descontable y producto sin IVA, y guarda de contado', async () => {
    const { user, fetchMock, router } = await setup()

    await chooseSupplier(user, '900555')
    expect(screen.getByRole('combobox', { name: 'Proveedor' })).toHaveValue('Distrillantas Boyacá S.A.S.')
    expect(screen.getByLabelText('Documento')).toHaveValue('NIT 900555111')
    expect(screen.getByLabelText('Correo del proveedor')).toHaveValue('ventas@distrillantas.co')
    await user.type(screen.getByLabelText('N.º factura del proveedor'), ' DB-18452 ')

    await addProduct(user, 'pirelli', '12')
    expect(screen.getByLabelText('Precio sin IVA')).toHaveValue(168000)
    await addProduct(user, 'VAL-001', '3')

    const pirelli = screen.getByRole('listitem', { name: 'Línea LL-004' })
    expect(pirelli).toHaveTextContent('$ 383.040')
    expect(pirelli).toHaveTextContent('$ 2.016.000')
    const valve = screen.getByRole('listitem', { name: 'Línea VAL-001' })
    expect(valve).toHaveTextContent('IVA $ 0')
    expect(valve).toHaveTextContent('$ 15.000')
    expect(screen.getByText(/el costo de cada producto pasa a ser el precio de esta compra/)).toBeInTheDocument()

    expect(summaryValue('Subtotal')).toHaveTextContent('$ 2.031.000')
    expect(summaryValue('IVA descontable')).toHaveTextContent('$ 383.040')
    expect(summaryValue('Total')).toHaveTextContent('$ 2.414.040')
    expect(summaryValue('Saldo de Caja General')).toHaveTextContent('$ 10.000.000')
    expect(summaryValue('Saldo después de la compra')).toHaveTextContent('$ 7.585.960')

    const save = screen.getByRole('button', { name: 'Guardar compra' })
    expect(save).toBeEnabled()
    await user.click(save)

    await waitFor(() => expect(router.state.location.pathname).toBe('/compras'))
    expect(posts(fetchMock, '/api/purchases')).toEqual([
      {
        supplierId: 5,
        invoiceNumber: 'DB-18452',
        invoiceDate: '2026-10-22',
        paymentType: 'CONTADO',
        accountId: 10,
        paymentMethod: 'EFECTIVO',
        details: [
          { productId: 1, quantity: 12, price: 168000 },
          { productId: 3, quantity: 3, price: 5000 },
        ],
      },
    ])
    expect(await screen.findByText('Factura DB-18452 guardada')).toBeInTheDocument()
  })

  it('a credito con 60 dias envia el vencimiento y no envia cuenta ni medio', async () => {
    const { user, fetchMock, router } = await setup()
    await fillValid(user)

    await user.click(screen.getByRole('radio', { name: 'Crédito' }))
    expect(screen.queryByLabelText('Cuenta')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Método de pago')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Fecha de vencimiento')).toHaveValue('2026-11-21')
    await user.click(screen.getByRole('button', { name: '60 días' }))
    expect(screen.getByLabelText('Fecha de vencimiento')).toHaveValue('2026-12-21')
    fireEvent.change(screen.getByLabelText('Fecha de vencimiento'), { target: { value: '2026-10-01' } })
    expect(screen.getByText('El vencimiento no puede ser anterior a la fecha de la factura.', { selector: 'p[aria-live]' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar compra' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: '60 días' }))

    await user.click(screen.getByRole('button', { name: 'Guardar compra' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/compras'))
    expect(posts(fetchMock, '/api/purchases')).toEqual([
      {
        supplierId: 5,
        invoiceNumber: 'DB-18452',
        invoiceDate: '2026-10-22',
        dueDate: '2026-12-21',
        paymentType: 'CREDITO',
        details: [{ productId: 2, quantity: 5, price: 100000 }],
      },
    ])
  })

  it('con saldo igual al total deja guardar y con un peso menos avisa y bloquea', async () => {
    const { user } = await setup({
      ...fullRoutes(),
      'GET /api/treasury/accounts': () =>
        jsonResponse([
          { id: 10, name: 'Caja General', type: 'EFECTIVO', currentBalance: 595000 },
          { id: 12, name: 'Caja Menor', type: 'EFECTIVO', currentBalance: 594999 },
        ]),
    })
    await fillValid(user)

    expect(summaryValue('Total')).toHaveTextContent('$ 595.000')
    expect(screen.queryByText(/Saldo insuficiente/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar compra' })).toBeEnabled()
    expect(summaryValue('Saldo después de la compra')).toHaveTextContent('$ 0')

    await user.selectOptions(screen.getByLabelText('Cuenta'), '12')
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Saldo insuficiente en Caja Menor')
    expect(alert).toHaveTextContent('Disponible $ 594.999, necesitas $ 595.000.')
    expect(screen.getByLabelText('Cuenta')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('button', { name: 'Guardar compra' })).toBeDisabled()
    expect(summaryValue('Saldo después de la compra')).toHaveTextContent('-$ 1')

    await user.click(screen.getByRole('radio', { name: 'Crédito' }))
    expect(screen.queryByText(/Saldo insuficiente/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar compra' })).toBeEnabled()
  })

  it('un 409 de numero repetido se muestra bajo el campo y se limpia al cambiarlo', async () => {
    const { user } = await setup({
      ...fullRoutes(),
      'POST /api/purchases': () =>
        jsonResponse({ error: 'Ya existe una factura de compra con el numero DB-18452', status: 409 }, 409),
    })
    await fillValid(user)

    await user.click(screen.getByRole('button', { name: 'Guardar compra' }))

    const field = screen.getByLabelText('N.º factura del proveedor')
    expect(await screen.findByText('Ya existe una factura de compra con el numero DB-18452')).toHaveAttribute('aria-live', 'polite')
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(field).toHaveFocus()
    expect(screen.queryByText('No pudimos guardar la factura')).not.toBeInTheDocument()

    await user.type(field, '-B')
    expect(field).not.toHaveAttribute('aria-invalid')
    expect(screen.queryByText('Ya existe una factura de compra con el numero DB-18452')).not.toBeInTheDocument()
  })

  it('un 409 de saldo se muestra en un Alert, conserva lo digitado y refresca las cuentas', async () => {
    const { user, fetchMock } = await setup({
      ...fullRoutes(),
      'POST /api/purchases': () =>
        jsonResponse({ error: 'Saldo insuficiente en Caja General: hay 100.0 y se requieren 595000.0', status: 409 }, 409),
    })
    await fillValid(user)
    const accountCalls = () => fetchMock.mock.calls.filter(([url]) => url === '/api/treasury/accounts').length
    expect(accountCalls()).toBe(1)

    await user.click(screen.getByRole('button', { name: 'Guardar compra' }))

    const alert = await screen.findByText('Saldo insuficiente en Caja General: hay 100.0 y se requieren 595000.0')
    expect(alert.closest('[role="alert"]')).toHaveTextContent('No pudimos guardar la factura')
    await waitFor(() => expect(accountCalls()).toBe(2))
    expect(screen.getByLabelText('N.º factura del proveedor')).toHaveValue('DB-18452')
    expect(screen.getByRole('combobox', { name: 'Proveedor' })).toHaveValue('Distrillantas Boyacá S.A.S.')
    expect(screen.getByRole('listitem', { name: 'Línea BAT-004' })).toBeInTheDocument()
  })

  it('no envia dos veces si se pulsa Guardar mientras guarda', async () => {
    let resolve: (response: Response) => void = () => {}
    const { user, fetchMock } = await setup({
      ...fullRoutes(),
      'POST /api/purchases': () => new Promise<Response>((done) => (resolve = done)),
    })
    await fillValid(user)

    const save = screen.getByRole('button', { name: 'Guardar compra' })
    await user.click(save)
    expect(await screen.findByRole('button', { name: 'Guardando…' })).toBeDisabled()
    fireEvent.submit(save.closest('form') as HTMLFormElement)
    expect(posts(fetchMock, '/api/purchases')).toHaveLength(1)
    resolve(jsonResponse(savedPurchase(), 201))
  })

  it('no ofrece dos veces el mismo producto ni pone tope de stock a la cantidad', async () => {
    const { user } = await setup()
    await addProduct(user, 'pirelli', '500')

    expect(screen.queryByText(/disponibles/)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Cantidad')).not.toHaveAttribute('max')
    await user.click(screen.getByRole('button', { name: 'Agregar producto' }))
    const combos = screen.getAllByRole('combobox', { name: 'Producto' })
    await user.click(combos[1] as HTMLElement)
    const listbox = screen.getByRole('listbox')
    expect(within(listbox).queryByText('Llanta Pirelli 225/45 R18')).not.toBeInTheDocument()
    expect(within(listbox).getAllByRole('option')).toHaveLength(2)
  })

  it('el modal de nuevo proveedor selecciona el tercero de la respuesta con 201 y con 200', async () => {
    const created = { id: 40, role: 'PROVEEDOR', name: 'Importadora Andina S.A.S.', documentType: 'NIT', documentNumber: '900987654', email: 'compras@andina.co', phone: null }
    const existing = { id: 41, role: 'AMBOS', name: 'Taller El Cruce S.A.S.', documentType: 'NIT', documentNumber: '800111222', email: 'pagos@elcruce.co', phone: null }
    let status = 201
    const { user, fetchMock } = await setup({
      ...fullRoutes(),
      'POST /api/counterparties': () => jsonResponse(status === 201 ? created : existing, status),
    })

    await user.click(await screen.findByRole('button', { name: 'Nuevo proveedor' }))
    let dialog = screen.getByRole('dialog', { name: 'Nuevo proveedor' })
    await user.type(within(dialog).getByLabelText('Nombre o razón social'), 'importadora andina')
    await user.type(within(dialog).getByLabelText('Número de documento'), '900987654')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar proveedor' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('combobox', { name: 'Proveedor' })).toHaveValue('Importadora Andina S.A.S.')
    expect(screen.getByLabelText('Correo del proveedor')).toHaveValue('compras@andina.co')
    expect(posts(fetchMock, '/api/counterparties')[0]).toEqual({
      role: 'PROVEEDOR',
      name: 'importadora andina',
      documentType: 'CC',
      documentNumber: '900987654',
    })

    status = 200
    await user.click(screen.getByRole('button', { name: 'Nuevo proveedor' }))
    dialog = screen.getByRole('dialog', { name: 'Nuevo proveedor' })
    await user.type(within(dialog).getByLabelText('Nombre o razón social'), 'Otro nombre')
    await user.type(within(dialog).getByLabelText('Número de documento'), '800111222')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar proveedor' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('combobox', { name: 'Proveedor' })).toHaveValue('Taller El Cruce S.A.S.')
    expect(screen.getByLabelText('Documento')).toHaveValue('NIT 800111222')
  })

  it('el modal de nuevo proveedor muestra el 409 del backend dentro del modal', async () => {
    const { user } = await setup({
      ...fullRoutes(),
      'POST /api/counterparties': () =>
        jsonResponse({ error: 'Ya existe un tercero con el documento 900555111 como PROVEEDOR', status: 409 }, 409),
    })

    await user.click(await screen.findByRole('button', { name: 'Nuevo proveedor' }))
    const dialog = screen.getByRole('dialog', { name: 'Nuevo proveedor' })
    await user.type(within(dialog).getByLabelText('Nombre o razón social'), 'Distrillantas')
    await user.type(within(dialog).getByLabelText('Número de documento'), '900555111')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar proveedor' }))

    expect(await within(dialog).findByText('Ya existe un tercero con el documento 900555111 como PROVEEDOR')).toBeInTheDocument()
    expect(within(dialog).getByText('No pudimos crear el proveedor')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Proveedor' })).toHaveValue('')
  })

  it('Cancelar con datos digitados pide confirmar y el cierre de pestana avisa', async () => {
    const { user, router } = await setup()
    const unload = () => {
      const event = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(event)
      return event.defaultPrevented
    }

    expect(unload()).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/compras'))

    await router.navigate('/compras/nueva')
    await user.type(await screen.findByLabelText('N.º factura del proveedor'), 'X-1')
    expect(unload()).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    const dialog = await screen.findByRole('dialog', { name: 'Descartar cambios' })
    await user.click(within(dialog).getByRole('button', { name: 'Seguir editando' }))
    expect(router.state.location.pathname).toBe('/compras/nueva')
    expect(screen.getByLabelText('N.º factura del proveedor')).toHaveValue('X-1')

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Descartar cambios' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/compras'))
  })

  it('mientras cargan los datos muestra skeleton', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})))
    renderRoute('/compras/nueva')

    await screen.findByRole('heading', { name: 'Nueva factura de compra' })
    expect(screen.getByRole('region', { name: 'Datos generales' }).querySelector('[aria-busy]')).not.toBeNull()
    expect(screen.getByRole('region', { name: 'Productos' }).querySelector('[aria-busy]')).not.toBeNull()
  })

  it('un error por bloque se reintenta sin afectar al otro', async () => {
    let supplierCalls = 0
    const { user } = await setup({
      ...fullRoutes(),
      'GET /api/counterparties': () => {
        supplierCalls += 1
        return supplierCalls === 1 ? jsonResponse({ error: 'Error interno', status: 500 }, 500) : jsonResponse(suppliers)
      },
    })

    const general = screen.getByRole('region', { name: 'Datos generales' })
    expect(await within(general).findByText('No pudimos cargar los proveedores y las cuentas.')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Agregar producto' })).toBeEnabled()

    await user.click(within(general).getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('combobox', { name: 'Proveedor' })).toBeInTheDocument()
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

  it('el boton Nueva factura del listado lleva a esta pantalla', async () => {
    mockApi(fullRoutes())
    const router = renderRoute('/compras')
    const user = userEvent.setup()

    const [link] = await screen.findAllByRole('link', { name: 'Nueva factura' })
    await user.click(link as HTMLElement)
    expect(await screen.findByRole('heading', { name: 'Nueva factura de compra' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/compras/nueva')
  })
})
