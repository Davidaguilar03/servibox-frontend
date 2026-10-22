import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { saveToken } from '../auth/session'
import { jsonResponse, renderRoute, validToken } from '../test/utils'

type Handler = () => Response | Promise<Response>
type Routes = Record<string, Handler>

const sale = (id: number, fields: Record<string, unknown> = {}) => ({
  id,
  invoiceNumber: `FV-${String(id).padStart(4, '0')}`,
  customer: { id: 100 + id, role: 'CLIENTE', name: `Cliente ${id}`, documentType: 'CC', documentNumber: String(id), email: null, phone: null },
  invoiceDate: '2026-10-05',
  dueDate: null,
  paymentType: 'CONTADO',
  paymentMethod: 'EFECTIVO',
  status: 'ANULADA',
  subtotal: 100000,
  ivaPorPagar: 19000,
  total: 119000,
  pendingBalance: 0,
  details: [],
  ...fields,
})

const purchase = (id: number, fields: Record<string, unknown> = {}) => ({
  id,
  invoiceNumber: `FC-${id}`,
  supplier: { id: 200 + id, role: 'PROVEEDOR', name: `Proveedor ${id}`, documentType: 'NIT', documentNumber: String(id), email: null, phone: null },
  invoiceDate: '2026-10-05',
  dueDate: null,
  paymentType: 'CONTADO',
  paymentMethod: 'EFECTIVO',
  status: 'ANULADA',
  subtotal: 100000,
  ivaTotal: 19000,
  total: 119000,
  pendingBalance: 0,
  details: [],
  ...fields,
})

const sales = [
  sale(1, { customer: { name: 'José Pérez' }, invoiceDate: '2026-10-12', total: 540000 }),
  sale(2, { customer: { name: 'Transportes Boyacá S.A.S.' }, invoiceDate: '2026-09-20', paymentType: 'CREDITO', total: 2380000 }),
  sale(3, { status: 'PAGADA', invoiceDate: '2026-10-15' }),
  sale(4, { status: 'PENDIENTE', paymentType: 'CREDITO', pendingBalance: 50000 }),
]

function mockApi(table: Routes) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const handler = table[`${init?.method ?? 'GET'} ${url.split('?')[0] ?? ''}`]
    return Promise.resolve(handler ? handler() : jsonResponse({ error: 'Recurso no encontrado', status: 404 }, 404))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function calls(fetchMock: ReturnType<typeof mockApi>, method: string, path: string) {
  return fetchMock.mock.calls.filter(([url, init]) => url.split('?')[0] === path && (init?.method ?? 'GET') === method)
}

/** La tabla y las tarjetas estan las dos en el DOM (jsdom no aplica los puntos de corte). */
function table() {
  return within(screen.getByRole('table'))
}

function numbers() {
  return within(screen.getByRole('table'))
    .getAllByRole('row')
    .slice(1)
    .map((row) => /F[VC]-\d+/.exec(row.textContent ?? '')?.[0])
}

describe('papelera de ventas', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-22T15:00:00Z'))
    saveToken(validToken())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('muestra solo las anuladas, con tabla, tarjetas y Recuperar por fila', async () => {
    mockApi({ 'GET /api/sales': () => jsonResponse(sales) })
    renderRoute('/ventas/papelera')

    expect(await screen.findByRole('heading', { name: 'Papelera de ventas' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Miga de pan' })).toHaveTextContent('Ventas/Papelera')
    expect(screen.getByText('Facturas de venta anuladas. Puedes consultarlas o recuperarlas.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a Facturas de venta' })).toHaveAttribute('href', '/ventas')
    expect(screen.getByLabelText('Periodo')).toHaveValue('todas')

    await waitFor(() => expect(numbers()).toEqual(['FV-0001', 'FV-0002']))
    const rows = within(screen.getByRole('table')).getAllByRole('row')
    expect(within(rows[0] as HTMLElement).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'N.º factura',
      'Cliente',
      'Fecha',
      'Forma de pago',
      'Total',
      'Estado',
      '',
    ])
    expect(rows[1]).toHaveTextContent('FV-0001José Pérez12/10/2026Contado$ 540.000Anulada')
    expect(within(rows[1] as HTMLElement).getByRole('link', { name: 'FV-0001' })).toHaveAttribute('href', '/ventas/1')
    expect(within(rows[1] as HTMLElement).getByRole('button', { name: 'Recuperar factura FV-0001' })).toHaveClass('bg-surface')
    expect(rows[2]).toHaveTextContent('Crédito$ 2.380.000')
    expect(screen.queryByText('Pagada')).not.toBeInTheDocument()

    const cards = screen.getByRole('list', { name: 'Facturas anuladas' })
    expect(within(cards).getAllByRole('listitem')).toHaveLength(2)
    expect(within(cards).getAllByRole('button', { name: /Recuperar factura/ })).toHaveLength(2)
    expect(screen.getByText('1 a 2 de 2 facturas')).toBeInTheDocument()
  })

  it('filtros en la URL, busqueda sin tildes y Limpiar', async () => {
    mockApi({ 'GET /api/sales': () => jsonResponse(sales) })
    const router = renderRoute('/ventas/papelera?pago=CREDITO')
    const user = userEvent.setup()

    await waitFor(() => expect(numbers()).toEqual(['FV-0002']))
    expect(screen.getByLabelText('Forma de pago')).toHaveValue('CREDITO')

    await user.selectOptions(screen.getByLabelText('Forma de pago'), '')
    await user.type(screen.getByLabelText('Buscar'), 'JOSE')
    expect(numbers()).toEqual(['FV-0001'])
    expect(router.state.location.search).toBe('?q=JOSE')

    await user.selectOptions(screen.getByLabelText('Periodo'), 'mes-anterior')
    expect(router.state.location.search).toBe('?q=JOSE&periodo=mes-anterior')
    expect(screen.getByText('No hay facturas anuladas con esos filtros.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(router.state.location.search).toBe('')
    expect(numbers()).toEqual(['FV-0001', 'FV-0002'])
  })

  it('pagina de 25 en 25 con la pagina en la URL', async () => {
    const many = Array.from({ length: 30 }, (_, index) =>
      sale(index + 1, { invoiceDate: `2026-10-${String((index % 20) + 1).padStart(2, '0')}` }),
    )
    mockApi({ 'GET /api/sales': () => jsonResponse(many) })
    const router = renderRoute('/ventas/papelera')
    const user = userEvent.setup()

    expect(await screen.findByText('1 a 25 de 30 facturas')).toBeInTheDocument()
    expect(numbers().slice(0, 2)).toEqual(['FV-0020', 'FV-0019'])
    await user.click(screen.getByRole('button', { name: 'Página 2' }))
    expect(router.state.location.search).toBe('?pagina=2')
    expect(screen.getByText('26 a 30 de 30 facturas')).toBeInTheDocument()
  })

  it('sin anuladas dice que la papelera esta vacia', async () => {
    mockApi({ 'GET /api/sales': () => jsonResponse([sale(3, { status: 'PAGADA' })]) })
    renderRoute('/ventas/papelera')

    expect(await screen.findByText('La papelera está vacía.')).toBeInTheDocument()
  })

  it('carga con skeleton y un error se reintenta', async () => {
    let attempts = 0
    mockApi({
      'GET /api/sales': () => {
        attempts += 1
        return attempts === 1 ? jsonResponse({ error: 'Error interno', status: 500 }, 500) : jsonResponse(sales)
      },
    })
    renderRoute('/ventas/papelera')

    expect(document.querySelector('.animate-pulse')).not.toBeNull()
    expect(await screen.findByText('No pudimos cargar la papelera.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(numbers()).toEqual(['FV-0001', 'FV-0002']))
  })

  it('recuperar: foco en Cancelar, una sola peticion, toast y la factura sale de la papelera', async () => {
    let restored = false
    const fetchMock = mockApi({
      'GET /api/sales': () => jsonResponse(restored ? [sale(1, { status: 'PAGADA' }), sales[1]] : sales),
      'POST /api/sales/1/restore': () => {
        restored = true
        return jsonResponse(sale(1, { status: 'PAGADA' }))
      },
    })
    const router = renderRoute('/ventas/papelera')
    const user = userEvent.setup()

    await user.click(await waitFor(() => table().getByRole('button', { name: 'Recuperar factura FV-0001' })))
    let dialog = screen.getByRole('dialog', { name: 'Recuperar factura FV-0001' })
    expect(dialog).toHaveTextContent(
      'La factura vuelve al listado como Pagada o Pendiente, según lo que tenga abonado. Se descuentan otra vez del inventario las unidades vendidas y se restablecen en las cuentas el pago y los abonos que tenía.',
    )
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    expect(within(dialog).getByRole('button', { name: 'Recuperar factura' })).toHaveClass('bg-action')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(table().getByRole('button', { name: 'Recuperar factura FV-0001' }))
    dialog = screen.getByRole('dialog')
    const listCalls = calls(fetchMock, 'GET', '/api/sales').length
    await user.dblClick(within(dialog).getByRole('button', { name: 'Recuperar factura' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(calls(fetchMock, 'POST', '/api/sales/1/restore')).toHaveLength(1)
    expect(await screen.findByText('Factura FV-0001 recuperada')).toBeInTheDocument()
    // La lista se invalida y se vuelve a pedir: la factura ya no esta anulada.
    await waitFor(() => expect(numbers()).toEqual(['FV-0002']))
    expect(calls(fetchMock, 'GET', '/api/sales').length).toBeGreaterThan(listCalls)

    await router.navigate('/ventas?periodo=todas')
    expect(await screen.findAllByText('FV-0001')).not.toHaveLength(0)
  })

  it('si el backend rechaza por stock, el mensaje queda en el modal y los datos se refrescan', async () => {
    const fetchMock = mockApi({
      'GET /api/sales': () => jsonResponse(sales),
      'POST /api/sales/1/restore': () =>
        jsonResponse({ error: 'Stock insuficiente para Bateria 12V: hay 0 y se piden 2', status: 409 }, 409),
    })
    renderRoute('/ventas/papelera')
    const user = userEvent.setup()

    await user.click(await waitFor(() => table().getByRole('button', { name: 'Recuperar factura FV-0001' })))
    const dialog = screen.getByRole('dialog')
    const listCalls = calls(fetchMock, 'GET', '/api/sales').length
    await user.click(within(dialog).getByRole('button', { name: 'Recuperar factura' }))

    expect(await within(dialog).findByText('Stock insuficiente para Bateria 12V: hay 0 y se piden 2')).toBeInTheDocument()
    expect(within(dialog).getByText('No pudimos recuperar la factura')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await waitFor(() => expect(calls(fetchMock, 'GET', '/api/sales').length).toBeGreaterThan(listCalls))
    expect(within(dialog).getByRole('button', { name: 'Recuperar factura' })).toBeEnabled()
  })

  it('el detalle se abre desde la papelera y atras conserva los filtros', async () => {
    mockApi({
      'GET /api/sales': () => jsonResponse(sales),
      'GET /api/sales/2': () => jsonResponse(sale(2, { paymentType: 'CREDITO' })),
      'GET /api/treasury/movements': () => jsonResponse([]),
    })
    const router = renderRoute('/ventas/papelera?pago=CREDITO')
    const user = userEvent.setup()

    await user.click(await waitFor(() => table().getByRole('link', { name: 'FV-0002' })))
    expect(await screen.findByRole('heading', { name: 'FV-0002' })).toBeInTheDocument()
    expect(screen.getByText('Anulada')).toBeInTheDocument()

    await router.navigate(-1)
    await waitFor(() => expect(router.state.location.search).toBe('?pago=CREDITO'))
    expect(await screen.findByLabelText('Forma de pago')).toHaveValue('CREDITO')
  })
})

describe('papelera de compras', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-22T15:00:00Z'))
    saveToken(validToken())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('muestra las compras anuladas con la columna Proveedor y el texto de compras', async () => {
    mockApi({
      'GET /api/purchases': () =>
        jsonResponse([purchase(7, { invoiceDate: '2026-10-20' }), purchase(8, { status: 'PAGADA' }), purchase(6, { paymentType: 'CREDITO' })]),
    })
    renderRoute('/compras/papelera')

    expect(await screen.findByRole('heading', { name: 'Papelera de compras' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Miga de pan' })).toHaveTextContent('Compras/Papelera')
    expect(screen.getByRole('link', { name: 'Volver a Facturas de compra' })).toHaveAttribute('href', '/compras')
    await waitFor(() => expect(numbers()).toEqual(['FC-7', 'FC-6']))
    expect(screen.getByRole('columnheader', { name: 'Proveedor' })).toBeInTheDocument()
    expect(table().getByRole('link', { name: 'FC-7' })).toHaveAttribute('href', '/compras/7')
    expect(screen.getByLabelText('Buscar')).toHaveAttribute('placeholder', 'Número de factura o proveedor')

    await userEvent.click(table().getByRole('button', { name: 'Recuperar factura FC-7' }))
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Se suman otra vez al inventario las unidades compradas y se descuentan de nuevo de las cuentas los pagos que tenía. El costo de los productos queda como está.',
    )
  })

  it('un 409 de saldo al recuperar queda en el modal', async () => {
    mockApi({
      'GET /api/purchases': () => jsonResponse([purchase(7)]),
      'POST /api/purchases/7/restore': () =>
        jsonResponse({ error: 'Saldo insuficiente en Caja General: hay 1000.0 y se requieren 119000.0', status: 409 }, 409),
    })
    renderRoute('/compras/papelera')
    const user = userEvent.setup()

    await user.click(await waitFor(() => table().getByRole('button', { name: 'Recuperar factura FC-7' })))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Recuperar factura' }))

    expect(await within(dialog).findByText('Saldo insuficiente en Caja General: hay 1000.0 y se requieren 119000.0')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('vacia, vacia por filtros y error', async () => {
    mockApi({ 'GET /api/purchases': () => jsonResponse([]) })
    renderRoute('/compras/papelera')
    expect(await screen.findByText('La papelera está vacía.')).toBeInTheDocument()

    mockApi({ 'GET /api/purchases': () => jsonResponse([purchase(7)]) })
    renderRoute('/compras/papelera?pago=CREDITO')
    expect(await screen.findByText('No hay facturas anuladas con esos filtros.')).toBeInTheDocument()

    mockApi({ 'GET /api/purchases': () => jsonResponse({ error: 'Error interno', status: 500 }, 500) })
    renderRoute('/compras/papelera')
    expect(await screen.findByText('No pudimos cargar la papelera.')).toBeInTheDocument()
  })
})
