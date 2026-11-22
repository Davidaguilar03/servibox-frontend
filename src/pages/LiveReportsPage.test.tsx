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

const accounts = [
  { id: 1, name: 'Caja General', type: 'EFECTIVO', initialBalance: 0, currentBalance: 0, color: null },
  { id: 2, name: 'Bancolombia', type: 'BANCO', initialBalance: 0, currentBalance: 0, color: null },
]
const range = { desde: '2026-11-01', hasta: '2026-11-21', corte: null, appliedFilters: [] }
const inventory = {
  ...range,
  corte: '2026-11-21',
  summary: { productCount: 1, unitsInStock: 2, costValue: 200, saleValue: 300, lowStockCount: 0, criticalStockCount: 1, outOfStockCount: 0, unitsSoldInPeriod: 7 },
  rows: [{ productId: 9, code: 'LL-010', description: 'Llanta 175/70 R13', categoryName: 'LLANTAS', stock: 2, stockStatus: 'CRITICO', unitCost: 100, costValue: 200, salePrice: 150, unitsSold: 7, lastSaleDate: '2026-11-20', daysWithoutSale: 1 }],
  series: [{ label: 'Llanta 175/70 R13', value: 7 }],
}
const cashFlow = {
  ...range,
  summary: { openingBalance: 500, inflows: 1000, outflows: 3000, netFlow: -2000, closingBalance: -1500 },
  rows: [
    { concept: 'VENTAS_CONTADO', label: 'Ventas de contado', direction: 'ENTRADA', movementCount: 2, amount: 1000 },
    { concept: 'GASTOS_OPERATIVOS', label: 'Gastos operativos', direction: 'SALIDA', movementCount: 1, amount: 3000 },
  ],
  series: [{ label: '2026-11-01', value: 1000 }, { label: '2026-11-02', value: -3000 }],
}
const incomeStatement = {
  ...range,
  summary: { revenue: 1000, costOfSales: 600, grossProfit: 400, grossMarginPercent: 40, operatingExpenses: 500, otherIncome: 0, netProfit: -100, netMarginPercent: -10 },
  rows: [
    { line: 'VENTAS', label: 'Ventas sin IVA', amount: 1000, percentOfRevenue: 100 },
    { line: 'COSTO_VENTAS', label: 'Costo de lo vendido', amount: -600, percentOfRevenue: -60 },
    { line: 'UTILIDAD_BRUTA', label: 'Utilidad bruta', amount: 400, percentOfRevenue: 40 },
    { line: 'OTROS_INGRESOS', label: 'Otros ingresos', amount: 0, percentOfRevenue: 0 },
    { line: 'GASTOS_OPERATIVOS', label: 'Gastos operativos', amount: -500, percentOfRevenue: -50 },
    { line: 'UTILIDAD_NETA', label: 'Utilidad neta', amount: -100, percentOfRevenue: -10 },
  ],
  series: [{ label: '2026-11-01', revenue: 600, cost: 400, profit: -50 }, { label: '2026-11-02', revenue: 400, cost: 200, profit: -50 }],
}
const vat = {
  ...range,
  summary: { ivaGenerado: 190, ivaDescontable: 50, ivaNeto: 140, invoicesWithIva: 2 },
  rows: [{ categoryName: 'LLANTAS', ratePercent: 19, taxableBase: 1000, ivaGenerado: 190, ivaDescontable: 50, ivaNeto: 140 }],
  series: [{ label: 'LLANTAS 19 %', value: 140 }],
}
const movements = {
  ...range,
  summary: { inflows: 0, outflows: 300, net: -300, movementCount: 1 },
  rows: [{ movementId: 4, date: '2026-11-03', accountName: 'Caja General', concept: 'Arriendo', reference: 'GASTO OPERATIVO', type: 'EGRESO', category: 'GASTO_OPERATIVO', amount: 300 }],
  series: [{ label: '2026-11-03', value: -300 }],
}

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
    'GET /api/treasury/accounts': () => jsonResponse(accounts),
    'GET /api/reporting/inventory': () => jsonResponse(inventory),
    'GET /api/reporting/cash-flow': () => jsonResponse(cashFlow),
    'GET /api/reporting/income-statement': () => jsonResponse(incomeStatement),
    'GET /api/reporting/vat': () => jsonResponse(vat),
    'GET /api/reporting/movements-report': () => jsonResponse(movements),
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
    await user.click(screen.getByRole('tab', { name: 'Compras y proveedores' }))
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
})

describe('Reportes en vivo, segunda tanda', () => {
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

  it.each([
    ['inventario', 'categoria=3&stock=CRITICO', '/api/reporting/inventory?desde=2026-11-01&hasta=2026-11-21&categoriaId=3&estadoStock=CRITICO', 'INVENTARIO'],
    ['flujo-caja', 'cuenta=2', '/api/reporting/cash-flow?desde=2026-11-01&hasta=2026-11-21&cuentaId=2', 'FLUJO_CAJA'],
    ['estado-resultados', 'periodo=mes-anterior', '/api/reporting/income-statement?desde=2026-10-01&hasta=2026-10-31', 'ESTADO_RESULTADOS'],
    ['iva', '', '/api/reporting/vat?desde=2026-11-01&hasta=2026-11-21', 'IVA'],
    ['movimientos', 'cuenta=1&movimiento=EGRESO', '/api/reporting/movements-report?desde=2026-11-01&hasta=2026-11-21&cuentaId=1&tipo=EGRESO', 'MOVIMIENTOS'],
  ])('%s pide su ruta con los filtros y descarga con su ReportType', async (key, query, expected, type) => {
    const fetchMock = mockApi()
    const user = userEvent.setup()
    renderRoute(`/reportes?reporte=${key}${query ? `&${query}` : ''}`)
    await screen.findByRole('table')
    // El primero es el del periodo; Estado de resultados pide despues el periodo anterior.
    expect(calls(fetchMock, '/api/reporting/')[0]).toBe(expected)
    await user.click(screen.getByRole('button', { name: 'Descargar PDF' }))
    const apiQuery = expected.split('?')[1]
    await waitFor(() => expect(calls(fetchMock, '/api/reporting/export')).toEqual([`/api/reporting/export?type=${type}&format=PDF&${apiQuery}`]))
  })

  it('inventario: el estado de stock usa las etiquetas y badges de Inicio y la nota del corte', async () => {
    const fetchMock = mockApi()
    const user = userEvent.setup()
    const router = renderRoute('/reportes?reporte=inventario')
    await screen.findByRole('table')
    const select = screen.getByLabelText('Estado de stock')
    expect(within(select).getAllByRole('option').map((option) => [option.getAttribute('value'), option.textContent])).toEqual([
      ['', 'Todos'], ['NORMAL', 'Disponible'], ['BAJO', 'Stock bajo'], ['CRITICO', 'Stock crítico'], ['SIN_STOCK', 'Sin stock'],
    ])
    for (const value of ['NORMAL', 'BAJO', 'CRITICO', 'SIN_STOCK']) {
      await user.selectOptions(screen.getByLabelText('Estado de stock'), value)
      expect(router.state.location.search).toBe(`?reporte=inventario&stock=${value}`)
      await waitFor(() => expect(calls(fetchMock, '/api/reporting/inventory').at(-1)).toContain(`estadoStock=${value}`))
    }
    expect(within(await screen.findByRole('table')).getByText('Stock crítico')).toBeInTheDocument()
    expect(screen.getByText('El stock es al día de hoy; el período aplica a las unidades vendidas.')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Los 10 más vendidos por unidades' })).toHaveTextContent('Llanta 175/70 R13')
  })

  it('estado de resultados: grafica de tres series con leyenda, margenes y subtotales resaltados', async () => {
    mockApi()
    renderRoute('/reportes?reporte=estado-resultados')
    const table = await screen.findByRole('table')
    const legend = screen.getByRole('list', { name: 'Leyenda' })
    expect(within(legend).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Ingresos', 'Costos', 'Utilidad'])
    const chart = screen.getByRole('img', { name: /Ingresos, costos y utilidad/ })
    expect(chart.querySelectorAll('rect[data-series="revenue"]')).toHaveLength(2)
    expect(chart.querySelectorAll('rect[data-series="profit"]')).toHaveLength(2)
    expect(screen.getByText('Utilidad bruta', { selector: 'p' }).parentElement).toHaveTextContent('Margen: 40,0 %')
    expect(screen.getByText('Utilidad neta', { selector: 'p' }).parentElement!.querySelector('.text-error')).toHaveTextContent('-$ 100')
    const row = (name: string) => within(table).getByText(name).closest('tr')!
    expect(row('Utilidad bruta')).toHaveClass('bg-canvas', 'font-semibold')
    expect(row('Utilidad neta')).toHaveClass('bg-canvas')
    expect(row('Otros ingresos')).not.toHaveClass('bg-canvas')
    expect(within(table).queryByRole('button')).not.toBeInTheDocument()
  })

  it('una grafica de una sola serie no lleva leyenda', async () => {
    mockApi()
    renderRoute('/reportes')
    await screen.findByRole('table')
    expect(screen.queryByRole('list', { name: 'Leyenda' })).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Total vendido por día/ }).querySelectorAll('rect[data-series="value"]')).toHaveLength(2)
  })

  it('flujo de caja: los negativos llevan signo, van bajo el eje y la nota sale solo sin cuenta', async () => {
    const fetchMock = mockApi()
    const user = userEvent.setup()
    const router = renderRoute('/reportes?reporte=flujo-caja')
    const table = await screen.findByRole('table')
    const note = 'Las transferencias entre tus cuentas no se cuentan como entradas ni salidas.'
    expect(screen.getByText(note)).toBeInTheDocument()

    const outflow = within(table).getByText('Gastos operativos').closest('tr')!
    expect(outflow).toHaveTextContent('Salida')
    expect(within(outflow).getByText('-$ 3.000')).toHaveClass('text-error')
    expect(within(table).getByText('Ventas de contado').closest('tr')).toHaveTextContent('+$ 1.000')
    expect(within(table).getAllByRole('row').at(-1)).toHaveTextContent('-$ 2.000')
    expect(screen.getByText('Flujo neto', { selector: 'p' }).parentElement!.querySelector('.text-error')).toHaveTextContent('-$ 2.000')

    const chart = screen.getByRole('img', { name: /menor valor el 02\/11\/2026: -\$ 3\.000/ })
    const [positive, negative] = [...chart.querySelectorAll('rect')]
    expect(negative).toHaveClass('fill-error')
    expect(positive).toHaveClass('fill-info')
    // La columna positiva termina en el eje y la negativa empieza ahi.
    expect(Number(negative!.getAttribute('y'))).toBeCloseTo(Number(positive!.getAttribute('y')) + Number(positive!.getAttribute('height')))

    await user.selectOptions(screen.getByLabelText('Cuenta'), '2')
    expect(router.state.location.search).toBe('?reporte=flujo-caja&cuenta=2')
    await waitFor(() => expect(calls(fetchMock, '/api/reporting/cash-flow').at(-1)).toContain('cuentaId=2'))
    expect(screen.queryByText(note)).not.toBeInTheDocument()
  })

  it('iva: generado frente a descontable por tarifa', async () => {
    mockApi()
    renderRoute('/reportes?reporte=iva')
    await screen.findByRole('table')
    expect(screen.getByRole('img', { name: /LLANTAS 19 %: generado \$ 190, descontable \$ 50/ })).toBeInTheDocument()
    expect(screen.getByText('Saldo por pagar', { selector: 'p' }).parentElement).toHaveTextContent('$ 140')
  })

  it('?reporte=archivos lleva a Estado de resultados conservando el periodo', async () => {
    const fetchMock = mockApi()
    const router = renderRoute('/reportes?reporte=archivos&periodo=personalizado&desde=2026-09-01&hasta=2026-10-15')
    await screen.findByRole('table')
    expect(router.state.location.search).toBe('?reporte=estado-resultados&periodo=personalizado&desde=2026-09-01&hasta=2026-10-15')
    expect(screen.getByRole('tab', { name: 'Finanzas' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Estado de resultados' })).toHaveAttribute('aria-selected', 'true')
    expect(calls(fetchMock, '/api/reporting/')[0]).toBe('/api/reporting/income-statement?desde=2026-09-01&hasta=2026-10-15')
  })

  it('la navegacion agrupada se usa con el teclado y conserva el periodo', async () => {
    mockApi()
    const user = userEvent.setup()
    const router = renderRoute('/reportes?periodo=mes-anterior')
    await screen.findByRole('table')
    const areas = screen.getByRole('tablist', { name: 'Área del reporte' })
    expect(within(areas).getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Ventas y cartera', 'Compras y proveedores', 'Inventario', 'Finanzas'])
    expect(within(screen.getByRole('tablist', { name: 'Reportes de Ventas y cartera' })).getAllByRole('tab').map((tab) => tab.textContent))
      .toEqual(['Ventas', 'Productos y servicios vendidos', 'Cartera por cobrar'])

    within(areas).getByRole('tab', { name: 'Ventas y cartera' }).focus()
    await user.keyboard('{End}')
    expect(router.state.location.search).toBe('?reporte=estado-resultados&periodo=mes-anterior')
    expect(within(areas).getByRole('tab', { name: 'Finanzas' })).toHaveFocus()

    within(screen.getByRole('tablist', { name: 'Reportes de Finanzas' })).getByRole('tab', { name: 'Estado de resultados' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(router.state.location.search).toBe('?reporte=flujo-caja&periodo=mes-anterior')
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'reporte-flujo-caja')

    within(areas).getByRole('tab', { name: 'Finanzas' }).focus()
    await user.keyboard('{ArrowLeft}')
    expect(router.state.location.search).toBe('?reporte=inventario&periodo=mes-anterior')
    // Inventario tiene un solo reporte: sin segunda fila de pestanas.
    expect(screen.queryByRole('tablist', { name: /Reportes de/ })).not.toBeInTheDocument()
    // En movil la fila de areas se desplaza en horizontal dentro de su ancho.
    expect(areas).toHaveClass('overflow-x-auto')
  })

  it.each([
    ['mes completo', 'periodo=personalizado&desde=2026-08-01&hasta=2026-08-31', 'desde=2026-07-01&hasta=2026-07-31', 'vs. julio de 2026'],
    ['mes anterior', 'periodo=mes-anterior', 'desde=2026-08-31&hasta=2026-09-30', 'vs. 31/08/2026 a 30/09/2026'],
    ['rango personalizado', 'periodo=personalizado&desde=2026-11-10&hasta=2026-11-19', 'desde=2026-10-31&hasta=2026-11-09', 'vs. 31/10/2026 a 09/11/2026'],
  ])('estado de resultados pide el periodo anterior de igual duracion (%s)', async (_, query, previous, label) => {
    const fetchMock = mockApi()
    renderRoute(`/reportes?reporte=estado-resultados&${query}`)
    await screen.findByRole('table')
    await waitFor(() => expect(calls(fetchMock, '/api/reporting/')).toContain(`/api/reporting/income-statement?${previous}`))
    expect(calls(fetchMock, '/api/reporting/')).toHaveLength(2)
    expect((await screen.findAllByText(label)).length).toBeGreaterThan(0)
  })

  it('estado de resultados muestra la variacion con signo y flecha en cada indicador', async () => {
    const before = { ...incomeStatement.summary, revenue: 800, costOfSales: 750, grossProfit: 400, operatingExpenses: 400, netProfit: -50 }
    mockApi({
      'GET /api/reporting/income-statement': (url) =>
        jsonResponse(url.searchParams.get('desde') === '2026-10-11' ? { ...incomeStatement, summary: before } : incomeStatement),
    })
    renderRoute('/reportes?reporte=estado-resultados')
    await screen.findByRole('table')
    const card = (label: string) => screen.getByText(label, { selector: 'p' }).parentElement!
    await waitFor(() => expect(card('Ingresos')).toHaveTextContent('Subió +25 %'))
    expect(within(card('Ingresos')).getByText('vs. 11/10/2026 a 31/10/2026')).toBeInTheDocument()
    // Costos que bajan son buena noticia: tono de exito aunque la cifra baje.
    expect(card('Costo de ventas')).toHaveTextContent('Bajó -20 %')
    expect(within(card('Costo de ventas')).getByText('-20 %')).toHaveClass('text-success-ink')
    expect(card('Gastos operativos')).toHaveTextContent('Subió +25 %')
    expect(within(card('Gastos operativos')).getByText('+25 %')).toHaveClass('text-error')
    expect(card('Utilidad bruta')).toHaveTextContent('Sin cambio, 0 %')
    expect(card('Utilidad neta')).toHaveTextContent('Bajó -100 %')
  })

  it('si el periodo anterior falla, el estado de resultados se muestra sin variacion', async () => {
    mockApi({
      'GET /api/reporting/income-statement': (url) =>
        url.searchParams.get('desde') === '2026-10-11' ? jsonResponse({ error: 'Error interno del servidor', status: 500 }, 500) : jsonResponse(incomeStatement),
    })
    renderRoute('/reportes?reporte=estado-resultados')
    await screen.findByRole('table')
    await waitFor(() => expect(screen.getByText('Ingresos', { selector: 'p' }).parentElement).toHaveTextContent('$ 1.000'))
    expect(screen.queryByText(/^vs\./)).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('las pestanas activas se centran en su fila al abrir el reporte desde la URL', async () => {
    const original = Element.prototype.scrollIntoView
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    try {
      mockApi()
      renderRoute('/reportes?reporte=movimientos')
      await screen.findByRole('table')
      const centered = scrollIntoView.mock.calls
        .map((call, index) => [call[0], scrollIntoView.mock.contexts[index]] as const)
        .filter(([options]) => options?.inline === 'center')
        .map(([options, element]) => [options, (element as HTMLElement).textContent])
      expect(centered).toEqual(expect.arrayContaining([
        [{ block: 'nearest', inline: 'center' }, 'Finanzas'],
        [{ block: 'nearest', inline: 'center' }, 'Movimientos'],
      ]))
    } finally {
      Element.prototype.scrollIntoView = original
    }
  })

  it('los indicadores usan la tarjeta de Inicio: icono en cuadro tenue, borde de color, titulo, valor y descripcion', async () => {
    mockApi()
    renderRoute('/reportes')
    await screen.findByRole('table')
    const card = (label: string) => screen.getByText(label, { selector: 'p' }).parentElement!
    const total = card('Total vendido')
    expect(total).toHaveClass('border-t-2', 'border-t-success', 'px-6', 'py-4')
    expect(total.querySelector('span[aria-hidden] svg')?.parentElement).toHaveClass('size-8', 'bg-success-bg', 'text-success-ink')
    expect([...total.querySelectorAll('p')].map((p) => p.textContent?.replaceAll(' ', ' '))).toEqual([
      'Total vendido',
      '$ 358',
      'Con IVA y sin facturas anuladas.',
    ])
    expect(total.querySelectorAll('p')[1]).toHaveClass('monto', 'text-figure')
    expect(card('Anuladas')).toHaveClass('border-t-error')
    expect(card('Facturas')).toHaveClass('border-t-neutral-400')
    // Seis indicadores: dos columnas desde sm y tres en escritorio, sin una tarjeta sola al final.
    expect(total.parentElement).toHaveClass('grid', 'sm:grid-cols-2', 'lg:grid-cols-3')
    expect(total.parentElement).not.toHaveClass('grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))]')
  })

  it('estado de resultados: la variacion va en la tarjeta junto al margen y la descripcion', async () => {
    const before = { ...incomeStatement.summary, revenue: 800, grossProfit: 320 }
    mockApi({
      'GET /api/reporting/income-statement': (url) =>
        jsonResponse(url.searchParams.get('desde') === '2026-10-11' ? { ...incomeStatement, summary: before } : incomeStatement),
    })
    renderRoute('/reportes?reporte=estado-resultados')
    await screen.findByRole('table')
    const card = screen.getByText('Utilidad bruta', { selector: 'p' }).parentElement!
    await waitFor(() => expect(card).toHaveTextContent('Subió +25 %'))
    expect([...card.querySelectorAll('p')].map((p) => p.textContent?.replaceAll(' ', ' '))).toEqual([
      'Utilidad bruta',
      '$ 400',
      'Margen: 40,0 %',
      'Ingresos menos costo de ventas.',
    ])
    expect(within(card).getByText('vs. 11/10/2026 a 31/10/2026')).toBeInTheDocument()
    expect(card).toHaveClass('border-t-info')
    // Cinco indicadores: tres y dos en escritorio; en dos columnas la ultima ocupa la fila.
    expect(card.parentElement).toHaveClass('lg:grid-cols-3')
    expect(screen.getByText('Utilidad neta', { selector: 'p' }).parentElement).toHaveClass('sm:max-lg:col-span-2')
  })

  it('el selector usa pildoras: areas con la activa en oscuro y reportes livianos, sin lineas grises', async () => {
    mockApi()
    renderRoute('/reportes?reporte=flujo-caja')
    await screen.findByRole('table')
    const areas = screen.getByRole('tablist', { name: 'Área del reporte' })
    const reports = screen.getByRole('tablist', { name: 'Reportes de Finanzas' })
    for (const list of [areas, reports]) {
      expect(list).not.toHaveClass('border-b')
      expect(list).toHaveClass('overflow-x-auto', 'p-1')
    }
    expect(within(areas).getByRole('tab', { name: 'Finanzas' })).toHaveClass('rounded-pill', 'bg-dark', 'text-text-inverse')
    expect(within(areas).getByRole('tab', { name: 'Inventario' })).toHaveClass('rounded-pill', 'bg-surface', 'text-text')
    const active = within(reports).getByRole('tab', { name: 'Flujo de caja' })
    expect(active).toHaveClass('rounded-pill', 'border-brand', 'text-brand-ink', 'font-semibold', 'text-small')
    expect(active).not.toHaveClass('-mb-px')
    expect(within(reports).getByRole('tab', { name: 'Movimientos' })).toHaveClass('border-transparent', 'text-text-muted')
  })
})

