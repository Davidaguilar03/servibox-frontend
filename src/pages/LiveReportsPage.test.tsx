import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { saveToken } from '../auth/session'
import { jsonResponse, primaryActions, renderRoute, validToken } from '../test/utils'

type Handler = (url: URL) => Response | Promise<Response>

const sales = {
  desde: '2026-11-01',
  hasta: '2026-11-21',
  corte: null,
  appliedFilters: [],
  summary: { totalSold: 357.6, invoiceCount: 2, averageTicket: 178.8, cashTotal: 119, creditTotal: 238.6, annulledCount: 1 },
  rows: [
    { saleId: 1, invoiceNumber: 'FV-0002', invoiceDate: '2026-11-02', customerId: 5, customerName: 'Ana Ruiz', paymentType: 'CONTADO', status: 'PAGADA', subtotal: 100, iva: 19, total: 119, pendingBalance: 0 },
    { saleId: 2, invoiceNumber: 'FV-0003', invoiceDate: '2026-11-03', customerId: 6, customerName: 'Bruno Díaz', paymentType: 'CREDITO', status: 'ANULADA', subtotal: 500, iva: 95, total: 595, pendingBalance: 0 },
    { saleId: 3, invoiceNumber: 'FV-0001', invoiceDate: '2026-11-01', customerId: 5, customerName: 'Ana Ruiz', paymentType: 'CREDITO', status: 'PENDIENTE', subtotal: 200.5, iva: 38.1, total: 238.6, pendingBalance: 238.6 },
  ],
  series: [{ label: '2026-11-01', value: 238.6 }, { label: '2026-11-02', value: 119 }, { label: '2026-11-03', value: 0 }],
}

const receivables = {
  desde: null,
  hasta: null,
  corte: '2026-11-21',
  appliedFilters: [],
  summary: { totalBalance: 1000, invoiceCount: 1, balance0To30: 0, balance31To60: 0, balance61To90: 0, balanceOver90: 1000 },
  rows: [{ invoiceId: 7, counterpartyId: 5, counterpartyName: 'Ana Ruiz', invoiceNumber: 'FV-0009', invoiceDate: '2026-07-01', dueDate: null, daysOld: 143, agingBucket: '90+', total: 1500, paid: 500, balance: 1000 }],
  series: [{ label: '0-30', value: 0 }, { label: '31-60', value: 0 }, { label: '61-90', value: 0 }, { label: '90+', value: 1000 }],
}

const empty = { desde: '2026-11-01', hasta: '2026-11-21', corte: null, appliedFilters: [], summary: {}, rows: [], series: [] }

const customers = [
  { id: 5, role: 'CLIENTE', name: 'Ana Ruiz', documentType: 'CC', documentNumber: '1010', email: null, phone: null },
  { id: 6, role: 'CLIENTE', name: 'Bruno Díaz', documentType: 'NIT', documentNumber: '900123', email: null, phone: null },
]
const suppliers = [{ id: 11, role: 'PROVEEDOR', name: 'Llantas del Norte', documentType: 'NIT', documentNumber: '800555', email: null, phone: null }]
const categories = [{ id: 3, name: 'LLANTAS', color: '#1d4ed8', yellowStockMin: 5, redStockMin: 2, targetMargin: 0.3, taxTypes: [] }]
const products = [
  { id: 9, code: 'LL-001', description: 'Llanta 175/70 R13', purchaseCost: 1, quantity: 1, taxAmount: 0, suggestedPrice: 1, categoryId: 3, categoryName: 'LLANTAS', itemType: 'PRODUCTO', vatApplies: true },
  { id: 10, code: 'SV-01', description: 'Alineación', purchaseCost: 0, quantity: 0, taxAmount: 0, suggestedPrice: 1, categoryId: 4, categoryName: 'SERVICIOS', itemType: 'SERVICIO', vatApplies: true },
]

function fileResponse(name: string) {
  return new Response(new Blob(['%PDF-1.7']), { status: 200, headers: { 'Content-Disposition': `attachment; filename="${name}"` } })
}

function mockApi(change: Record<string, Handler> = {}) {
  const table: Record<string, Handler> = {
    'GET /api/reporting/sales': () => jsonResponse(sales),
    'GET /api/reporting/products-sold': () => jsonResponse(empty),
    'GET /api/reporting/purchases': () => jsonResponse(empty),
    'GET /api/reporting/receivables': () => jsonResponse(receivables),
    'GET /api/reporting/payables': () => jsonResponse({ ...receivables, rows: [] }),
    'GET /api/reporting/export': () => fileResponse('ventas_2026-11-01_2026-11-21.xlsx'),
    'GET /api/counterparties': (url) => jsonResponse(url.searchParams.get('role') === 'PROVEEDOR' ? suppliers : customers),
    'GET /api/inventory/categories': () => jsonResponse(categories),
    'GET /api/inventory/products': () => jsonResponse(products),
    ...change,
  }
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const parsed = new URL(url, 'http://localhost')
    const handler = table[`${init?.method ?? 'GET'} ${parsed.pathname}`]
    return Promise.resolve(handler ? handler(parsed) : jsonResponse({ error: 'No encontrado', status: 404 }, 404))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const calls = (fetchMock: ReturnType<typeof mockApi>, prefix: string) =>
  fetchMock.mock.calls.map(([url]) => url as string).filter((url) => url.startsWith(prefix))

describe('Reportes en vivo', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-21T17:00:00Z'))
    saveToken(validToken())
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:reporte'), revokeObjectURL: vi.fn() }))
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('abre Ventas por defecto con el mes en curso, indicadores, grafica y tabla', async () => {
    const fetchMock = mockApi()
    renderRoute('/reportes')

    expect(screen.getByRole('tab', { name: 'Ventas' })).toHaveAttribute('aria-selected', 'true')
    await screen.findByRole('table')
    expect(calls(fetchMock, '/api/reporting/sales')).toEqual(['/api/reporting/sales?desde=2026-11-01&hasta=2026-11-21'])
    expect(screen.getByText('Total vendido').parentElement).toHaveTextContent('$ 358')
    expect(screen.getByText('Anuladas').parentElement).toHaveTextContent('1')
    expect(screen.getByRole('heading', { name: 'Total vendido por día' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Total vendido por día/ })).toBeInTheDocument()
    expect(screen.getByText('Período: 1 nov. 2026 al 21 nov. 2026')).toBeInTheDocument()
    expect(primaryActions()).toHaveLength(0)
  })

  it.each([
    ['productos-vendidos', 'tipo=SERVICIO&categoria=3&item=10', '/api/reporting/products-sold?desde=2026-11-01&hasta=2026-11-21&itemType=SERVICIO&categoriaId=3&productoId=10'],
    ['compras', 'periodo=mes-anterior&proveedor=11&estado=PENDIENTE', '/api/reporting/purchases?desde=2026-10-01&hasta=2026-10-31&proveedorId=11&estado=PENDIENTE'],
    ['cartera-cobrar', 'cliente=5&antiguedad=0-30', '/api/reporting/receivables?clienteId=5&antiguedad=0-30'],
    ['cartera-pagar', 'proveedor=11&antiguedad=90%2B', '/api/reporting/payables?proveedorId=11&antiguedad=90%2B'],
  ])('%s pide su ruta con los filtros de la URL', async (key, query, expected) => {
    const fetchMock = mockApi()
    renderRoute(`/reportes?reporte=${key}&${query}`)
    await waitFor(() => expect(calls(fetchMock, '/api/reporting/')).toContain(expected))
    expect(calls(fetchMock, '/api/reporting/')).toHaveLength(1)
  })

  it('restaura los filtros de la URL en los controles al cargar', async () => {
    mockApi()
    renderRoute('/reportes?reporte=productos-vendidos&periodo=mes-anterior&tipo=SERVICIO&categoria=3&item=10')
    expect(screen.getByLabelText('Período')).toHaveValue('mes-anterior')
    expect(screen.getByLabelText('Tipo')).toHaveValue('SERVICIO')
    await waitFor(() => expect(screen.getByLabelText('Categoría')).toHaveValue('3'))
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Ítem' })).toHaveValue('Alineación'))
  })

  it('un filtro elegido se escribe en la URL y vuelve a pedir el reporte', async () => {
    const fetchMock = mockApi()
    const user = userEvent.setup()
    const router = renderRoute('/reportes')
    await screen.findByRole('table')

    await user.selectOptions(screen.getByLabelText('Forma de pago'), 'CREDITO')
    await user.selectOptions(screen.getByLabelText('Estado'), 'PENDIENTE')
    const customer = screen.getByRole('combobox', { name: 'Cliente' })
    await user.click(customer)
    await user.type(customer, '900123')
    await user.click(await screen.findByRole('option', { name: /Bruno Díaz/ }))

    expect(router.state.location.search).toBe('?cliente=6&pago=CREDITO&estado=PENDIENTE')
    await waitFor(() => expect(calls(fetchMock, '/api/reporting/sales').at(-1)).toBe(
      '/api/reporting/sales?desde=2026-11-01&hasta=2026-11-21&clienteId=6&formaPago=CREDITO&estado=PENDIENTE',
    ))

    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(router.state.location.search).toBe('')
  })

  it('el periodo sigue al cambiar de reporte y las carteras lo ignoran', async () => {
    mockApi()
    const user = userEvent.setup()
    const router = renderRoute('/reportes?periodo=mes-anterior&pago=CREDITO')
    await screen.findByRole('table')
    await user.click(screen.getByRole('tab', { name: 'Compras' }))
    expect(router.state.location.search).toBe('?reporte=compras&periodo=mes-anterior')
    expect(screen.getByLabelText('Período')).toHaveValue('mes-anterior')
  })

  it('las descargas usan el ReportType y los mismos filtros de la vista', async () => {
    const fetchMock = mockApi()
    const user = userEvent.setup()
    renderRoute('/reportes?periodo=personalizado&desde=2026-10-01&hasta=2026-10-15&pago=CREDITO')
    await screen.findByRole('table')

    await user.click(screen.getByRole('button', { name: 'Descargar Excel' }))
    await user.click(screen.getByRole('button', { name: 'Descargar PDF' }))

    await waitFor(() => expect(calls(fetchMock, '/api/reporting/export')).toEqual([
      '/api/reporting/export?type=VENTAS&format=XLSX&desde=2026-10-01&hasta=2026-10-15&formaPago=CREDITO',
      '/api/reporting/export?type=VENTAS&format=PDF&desde=2026-10-01&hasta=2026-10-15&formaPago=CREDITO',
    ]))
    expect(calls(fetchMock, '/api/reporting/sales')).toEqual(['/api/reporting/sales?desde=2026-10-01&hasta=2026-10-15&formaPago=CREDITO'])
    expect(await screen.findAllByText('Reporte descargado: ventas_2026-11-01_2026-11-21.xlsx')).not.toHaveLength(0)
  })

  it('elegir Mas de 90 dias codifica el + en la URL, la consulta y la descarga', async () => {
    const fetchMock = mockApi({ 'GET /api/reporting/export': () => fileResponse('cartera-por-cobrar_2026-11-21.pdf') })
    const user = userEvent.setup()
    const router = renderRoute('/reportes?reporte=cartera-cobrar')
    await screen.findByRole('table')

    await user.selectOptions(screen.getByLabelText('Antigüedad'), '90+')
    expect(router.state.location.search).toBe('?reporte=cartera-cobrar&antiguedad=90%2B')
    await waitFor(() => expect(calls(fetchMock, '/api/reporting/receivables').at(-1)).toBe('/api/reporting/receivables?antiguedad=90%2B'))
    await user.click(screen.getByRole('button', { name: 'Descargar PDF' }))
    await waitFor(() => expect(calls(fetchMock, '/api/reporting/export')).toEqual(['/api/reporting/export?type=CARTERA_COBRAR&format=PDF&antiguedad=90%2B']))
  })

  it('las carteras no muestran periodo y si el corte', async () => {
    mockApi()
    renderRoute('/reportes?reporte=cartera-cobrar')
    await screen.findByRole('table')
    expect(screen.getByText('Corte al 21/11/2026')).toBeInTheDocument()
    expect(screen.queryByLabelText('Período')).not.toBeInTheDocument()
    expect(screen.queryByText(/^Período:/)).not.toBeInTheDocument()
    expect(screen.getByText('Más de 90 días', { selector: 'p' }).parentElement).toHaveTextContent('$ 1.000')
    expect(screen.getByRole('img', { name: /Más de 90 días: \$ 1\.000/ })).toBeInTheDocument()
    const row = within(screen.getByRole('table')).getAllByRole('row')[1]!
    expect(row).toHaveTextContent('FV-0009')
    expect(row).toHaveTextContent('Más de 90 días')
  })

  it('muestra la carga mientras llega el reporte', async () => {
    mockApi({ 'GET /api/reporting/sales': () => new Promise<Response>(() => undefined) })
    renderRoute('/reportes')
    expect(await screen.findByRole('status', { name: 'Cargando reporte' })).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('sin filas muestra el vacio', async () => {
    mockApi()
    renderRoute('/reportes?reporte=compras')
    expect(await screen.findByText('No hay datos para este período y filtros.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('un 400 muestra el mensaje del mapa y reintentar', async () => {
    let fail = true
    mockApi({
      'GET /api/reporting/sales': () => fail
        ? jsonResponse({ error: 'El reporte tiene mas de 20000 facturas: acota el rango de fechas', status: 400 }, 400)
        : jsonResponse(sales),
    })
    const user = userEvent.setup()
    renderRoute('/reportes')
    expect(await screen.findByRole('alert')).toHaveTextContent('El reporte tiene más de 20.000 facturas: acorta el período.')
    fail = false
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('table')).toBeInTheDocument()
  })

  it('un 500 muestra el error del bloque', async () => {
    mockApi({ 'GET /api/reporting/sales': () => jsonResponse({ error: 'Error interno del servidor', status: 500 }, 500) })
    renderRoute('/reportes')
    expect(await screen.findByText('No pudimos cargar el reporte.')).toBeInTheDocument()
  })

  it('ordena por columna y muestra la fila de totales sin anuladas', async () => {
    mockApi()
    const user = userEvent.setup()
    renderRoute('/reportes')
    const table = await screen.findByRole('table')
    const invoices = () => within(table).getAllByRole('row').slice(1, -1).map((row) => (row as HTMLTableRowElement).cells[0]!.textContent)

    expect(invoices()).toEqual(['FV-0002', 'FV-0003', 'FV-0001'])
    await user.click(within(table).getByRole('button', { name: 'Total' }))
    expect(invoices()).toEqual(['FV-0002', 'FV-0001', 'FV-0003'])
    expect(within(table).getByRole('columnheader', { name: 'Total' })).toHaveAttribute('aria-sort', 'ascending')
    await user.click(within(table).getByRole('button', { name: 'Total' }))
    expect(invoices()).toEqual(['FV-0003', 'FV-0001', 'FV-0002'])

    const footer = within(table).getAllByRole('row').at(-1)!
    expect(within(footer).getByRole('rowheader')).toHaveTextContent('Total')
    expect([...(footer as HTMLTableRowElement).cells].map((cell) => cell.textContent)).toEqual(['Total', '', '', '', '', '$ 301', '$ 57', '$ 358', '$ 239'])
  })

  it('Estado de resultados y movimientos sigue en su pestana', async () => {
    mockApi({ 'GET /api/reporting/kpis': () => jsonResponse({}), 'GET /api/treasury/accounts': () => jsonResponse([]) })
    const user = userEvent.setup()
    const router = renderRoute('/reportes')
    await user.click(screen.getByRole('tab', { name: 'Estado de resultados y movimientos' }))
    expect(router.state.location.search).toBe('?reporte=archivos')
    expect(screen.getByRole('button', { name: 'Generar reporte' })).toBeInTheDocument()
  })
})
