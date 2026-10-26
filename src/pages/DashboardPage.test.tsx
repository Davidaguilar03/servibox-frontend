import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { saveToken } from '../auth/session'
import { jsonResponse, renderRoute, validToken } from '../test/utils'

type Routes = Record<string, () => Response>

// Cifras de la siembra dev de octubre. totalSales y totalPurchases (con IVA) ya no salen en el panel.
const kpis = {
  totalSales: 24730469,
  totalPurchases: 29310000,
  netSales: 20781907,
  costOfSales: 14055000,
  grossProfit: 6726907,
  otherIncome: 0,
  operatingExpenses: 5192200,
  netProfit: 1534707,
}
const categories = [
  { id: 1, name: 'LLANTAS', yellowStockMin: 5, redStockMin: 2 },
  { id: 2, name: 'ACEITES', yellowStockMin: 0, redStockMin: 0 },
]
const products = [
  { id: 1, code: 'LL-003', description: 'Llanta Goodyear 195/65 R15', quantity: 4, categoryId: 1 },
  { id: 2, code: 'LL-004', description: 'Llanta Pirelli 225/45 R18', quantity: 0, categoryId: 1 },
  { id: 3, code: 'LL-010', description: 'Llanta Michelin', quantity: 30, categoryId: 1 },
  { id: 4, code: 'LUB-012', description: 'Aceite Mobil', quantity: 2, categoryId: 1 },
  { id: 5, code: 'LUB-020', description: 'Aceite Castrol', quantity: 3, categoryId: 2 },
]
const accounts = [
  { id: 1, name: 'Caja General', currentBalance: 3250000, type: 'EFECTIVO' },
  { id: 2, name: 'Bancolombia', currentBalance: 12480000, type: 'BANCO' },
]
const sale = (id: number, invoiceDate: string, status: string, paymentType = 'CONTADO') => ({
  id,
  invoiceNumber: `FV-${id}`,
  customer: { name: `Cliente ${id}` },
  invoiceDate,
  paymentType,
  status,
  total: id * 1000,
})
const sales = [
  sale(1, '2026-10-10', 'PAGADA'),
  sale(2, '2026-10-18', 'PENDIENTE', 'CREDITO'),
  sale(3, '2026-10-15', 'PAGADA'),
  sale(4, '2026-10-18', 'PAGADA'),
  sale(5, '2026-10-01', 'ANULADA'),
  sale(6, '2026-10-17', 'PAGADA'),
]

function fullRoutes(): Routes {
  return {
    '/api/reporting/kpis': () => jsonResponse(kpis),
    '/api/inventory/products': () => jsonResponse(products),
    '/api/inventory/categories': () => jsonResponse(categories),
    '/api/treasury/accounts': () => jsonResponse(accounts),
    '/api/treasury/balance': () => jsonResponse({ total: 15730000 }),
    '/api/sales': () => jsonResponse(sales),
  }
}

function mockApi(routes: Routes) {
  const fetchMock = vi.fn((url: string) => {
    const handler = routes[url.split('?')[0] ?? '']
    return Promise.resolve(handler ? handler() : jsonResponse({ error: 'No encontrado', status: 404 }, 404))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** Rotulo, cifra y lineas de cada indicador, en orden. */
function indicators() {
  const grid = screen.getByText('Ventas sin IVA').closest('div')?.parentElement as HTMLElement
  return [...grid.children].map((card) => [...card.querySelectorAll('p')].map((p) => p.textContent?.replaceAll('\u00a0', ' ')))
}

function section(title: string) {
  return screen.getByRole('heading', { name: title }).closest('section') as HTMLElement
}

function bodyRows(container: HTMLElement) {
  return within(container).getAllByRole('row').slice(1)
}

describe('panel de control', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 18, 10, 0))
    saveToken(validToken())
    localStorage.setItem('servibox.tenantSlug', 'demo')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('muestra una perdida de diez centavos en tono negativo', async () => {
    mockApi({ ...fullRoutes(), '/api/reporting/kpis': () => jsonResponse({ ...kpis, netProfit: -0.1 }) })
    renderRoute('/inicio')
    expect(await screen.findByText('$ 0')).toHaveClass('text-error')
  })

  it('muestra los cuatro bloques con datos', async () => {
    const fetchMock = mockApi(fullRoutes())
    renderRoute('/inicio')

    expect(await screen.findByText('$ 20.781.907')).toBeInTheDocument()
    expect(indicators()).toEqual([
      ['Ventas sin IVA', '$ 20.781.907', 'Sin IVA y sin facturas anuladas.'],
      ['Costo de lo vendido', '$ 14.055.000', 'Costo de los productos que vendiste.'],
      ['Utilidad bruta', '$ 6.726.907', '32,4 % de las ventas', 'Ventas menos costo de lo vendido.'],
      ['Utilidad neta', '$ 1.534.707', 'Utilidad bruta más otros ingresos, menos gastos.'],
    ])
    // Compras (y las ventas con IVA) salen del panel: siguen en Facturas de compra.
    expect(screen.queryByText('Compras totales')).not.toBeInTheDocument()
    expect(screen.queryByText('$ 29.310.000')).not.toBeInTheDocument()
    expect(screen.queryByText('$ 24.730.469')).not.toBeInTheDocument()
    expect(screen.getByText('$ 6.726.907')).toHaveClass('text-figure')
    expect(screen.getByText('$ 1.534.707')).toHaveClass('text-text')
    expect(fetchMock).toHaveBeenCalledWith('/api/reporting/kpis?desde=2026-10-01&hasta=2026-10-18', expect.anything())
    expect(screen.getByText(/Resumen de demo · 1 oct. 2026 al 18 oct. 2026/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Registrar venta' })).toHaveAttribute('href', '/ventas/nueva')

    const stock = section('Productos con stock bajo')
    await waitFor(() => expect(bodyRows(stock)).toHaveLength(3))
    expect(within(stock).getByText('Con alerta de stock: 3 · 1 sin stock')).toBeInTheDocument()
    const stockRows = bodyRows(stock).map((row) => row.textContent)
    expect(stockRows[0]).toContain('LL-004')
    expect(stockRows[0]).toContain('Sin stock')
    expect(stockRows[1]).toContain('LUB-012')
    expect(stockRows[1]).toContain('Stock crítico')
    expect(stockRows[2]).toContain('LL-003')
    expect(stockRows[2]).toContain('Stock bajo')
    expect(within(stock).queryByText('LL-010')).not.toBeInTheDocument()
    expect(within(stock).queryByText('LUB-020')).not.toBeInTheDocument()

    const accountsSection = section('Saldos de cuentas')
    expect(await within(accountsSection).findByText('Caja General')).toBeInTheDocument()
    expect(within(accountsSection).getByText('Efectivo')).toBeInTheDocument()
    expect(within(accountsSection).getByText('$ 12.480.000')).toBeInTheDocument()
    expect(within(accountsSection).getByText('$ 15.730.000')).toBeInTheDocument()

    const salesSection = section('Últimas ventas')
    await waitFor(() => expect(bodyRows(salesSection)).toHaveLength(5))
    const salesRows = bodyRows(salesSection).map((row) => row.textContent ?? '')
    expect(salesRows.map((text) => /FV-\d+/.exec(text)?.[0])).toEqual(['FV-4', 'FV-2', 'FV-6', 'FV-3', 'FV-1'])
    expect(salesRows[1]).toContain('18/10/2026')
    expect(salesRows[1]).toContain('Crédito')
    expect(salesRows[1]).toContain('$ 2.000')
    expect(salesRows[1]).toContain('Pendiente')
  })

  it('Inicio conserva usuario lateral, titulo y serviteca sin barra redundante', async () => {
    mockApi(fullRoutes())
    saveToken(validToken(), { username: 'laura.gomez', role: 'ADMIN', tenantName: 'Autollantas A&C', tenantSlug: 'autollantas' })
    renderRoute('/inicio')

    const sidebar = screen.getByRole('navigation', { name: 'Principal' }).closest('aside') as HTMLElement
    expect(within(sidebar).queryByText('laura.gomez')).not.toBeInTheDocument()
    expect(within(sidebar).getByText('LG')).toBeInTheDocument()
    expect(within(sidebar).queryByRole('button', { name: 'Salir' })).not.toBeInTheDocument()

    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Ruta de navegación' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1, name: 'Inicio' })).toHaveLength(1)
    expect(document.title).toBe('Inicio · ServiBox')
    const main = screen.getByRole('main')
    expect(main.parentElement?.firstElementChild).toBe(main)
    expect(within(main).queryByRole('button', { name: /Menú de usuario/ })).not.toBeInTheDocument()
    const userButton = within(sidebar).getByRole('button', { name: 'Menú de usuario de laura.gomez' })
    expect(within(userButton).getByText('LG')).toBeInTheDocument()
    expect(within(userButton).getByText('Autollantas A&C')).toBeInTheDocument()
    expect(within(main).queryByRole('searchbox')).not.toBeInTheDocument()
    expect(await screen.findByText(/Resumen de Autollantas A&C · 1 oct. 2026 al 18 oct. 2026/)).toBeInTheDocument()
  })

  it.each([
    ['BANCO', 'Banco', 'lucide-landmark'],
    ['EFECTIVO', 'Efectivo', 'lucide-wallet'],
    ['DIGITAL', 'Digital', 'lucide-smartphone'],
  ])('la cuenta %s usa icono por tipo aunque su nombre sugiera otro medio', async (type, label, icon) => {
    mockApi({
      ...fullRoutes(),
      '/api/treasury/accounts': () => jsonResponse([{ id: 10, name: 'Cuenta con nombre de otro medio y descripcion extensa', type, currentBalance: 1234567.89 }]),
      '/api/treasury/balance': () => jsonResponse({ total: 1234567.89 }),
    })
    renderRoute('/inicio')
    const block = section('Saldos de cuentas')
    const name = await within(block).findByText('Cuenta con nombre de otro medio y descripcion extensa')
    const row = name.closest('li')!
    expect(within(row).getByText(label)).toBeInTheDocument()
    expect(within(row).getByText('$ 1.234.568')).toBeInTheDocument()
    expect(row.querySelector('svg')).toHaveClass(icon)
    expect(row.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(within(row).queryByRole('img')).not.toBeInTheDocument()
    expect(within(block).getAllByText('$ 1.234.568')).toHaveLength(2)
    expect(within(block).getByRole('link', { name: 'Ver cuentas' })).toHaveAttribute('href', '/cuentas')
  })

  it('inicia en Este mes y ofrece los cinco periodos con una sola accion primaria', async () => {
    mockApi(fullRoutes())
    renderRoute('/inicio')
    const picker = screen.getByLabelText('Período')
    expect(picker).toHaveValue('este-mes')
    expect(within(picker).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Este mes', 'Mes anterior', 'Últimos 30 días', 'Este año', 'Personalizado',
    ])
    expect(document.querySelectorAll('[data-variant="primary"]')).toHaveLength(1)
    expect(await screen.findByText('$ 20.781.907')).toBeInTheDocument()
  })

  it('Stock bajo y Ultimas ventas tienen tabla y tarjetas con la misma informacion', async () => {
    mockApi(fullRoutes())
    renderRoute('/inicio')

    const stock = section('Productos con stock bajo')
    await waitFor(() => expect(bodyRows(stock)).toHaveLength(3))
    expect(within(stock).getByRole('table').parentElement).toHaveClass('hidden', 'md:block')
    const stockCards = within(stock).getByRole('list', { name: 'Productos con stock bajo' })
    expect(stockCards).toHaveClass('md:hidden')
    const stockItems = within(stockCards).getAllByRole('listitem')
    expect(stockItems).toHaveLength(3)
    expect(stockItems[0]).toHaveTextContent('LL-004')
    expect(stockItems[0]).toHaveTextContent('Llanta Pirelli 225/45 R18')
    expect(stockItems[0]).toHaveTextContent('Stock 0')
    expect(stockItems[0]).toHaveTextContent('Sin stock')
    expect(stockItems[2]).toHaveTextContent('Stock bajo')

    const salesSection = section('Últimas ventas')
    await waitFor(() => expect(bodyRows(salesSection)).toHaveLength(5))
    expect(within(salesSection).getByRole('table').parentElement).toHaveClass('hidden', 'md:block')
    const salesCards = within(salesSection).getByRole('list', { name: 'Últimas ventas' })
    expect(salesCards).toHaveClass('md:hidden')
    const saleItems = within(salesCards).getAllByRole('listitem')
    expect(saleItems.map((item) => /FV-\d+/.exec(item.textContent ?? '')?.[0])).toEqual(['FV-4', 'FV-2', 'FV-6', 'FV-3', 'FV-1'])
    for (const text of ['FV-2', 'Cliente 2', '18/10/2026', 'Crédito', '$ 2.000', 'Pendiente']) {
      expect(saleItems[1]).toHaveTextContent(text)
    }
  })

  it('muestra los estados vacios', async () => {
    mockApi({
      ...fullRoutes(),
      '/api/inventory/products': () => jsonResponse([products[2]]),
      '/api/treasury/accounts': () => jsonResponse([]),
      '/api/treasury/balance': () => jsonResponse({ total: 0 }),
      '/api/sales': () => jsonResponse([]),
    })
    renderRoute('/inicio')

    expect(await screen.findByText('No hay productos con stock bajo.')).toBeInTheDocument()
    expect(await screen.findByText('Aún no tienes cuentas.')).toBeInTheDocument()
    expect(await screen.findByText('No hay ventas en el período elegido.')).toBeInTheDocument()
  })

  it('un bloque con error no afecta a los demas y se puede reintentar', async () => {
    let salesCalls = 0
    mockApi({
      ...fullRoutes(),
      '/api/sales': () => {
        salesCalls += 1
        return salesCalls === 1
          ? jsonResponse({ error: 'Error interno', status: 500 }, 500)
          : jsonResponse(sales)
      },
    })
    renderRoute('/inicio')

    const salesSection = section('Últimas ventas')
    const alert = await within(salesSection).findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar esta información.')
    expect(await screen.findByText('$ 20.781.907')).toBeInTheDocument()
    expect(await within(section('Saldos de cuentas')).findByText('Caja General')).toBeInTheDocument()
    expect(within(section('Productos con stock bajo')).queryByRole('alert')).not.toBeInTheDocument()

    await userEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }))

    await waitFor(() => expect(bodyRows(salesSection)).toHaveLength(5))
  })
  it('sin ventas sin IVA el margen bruto no se muestra', async () => {
    mockApi({ ...fullRoutes(), '/api/reporting/kpis': () => jsonResponse({ ...kpis, netSales: 0, costOfSales: 0, grossProfit: 0, netProfit: 0 }) })
    renderRoute('/inicio')

    await waitFor(() => expect(indicators()[2]).toEqual(['Utilidad bruta', '$ 0', 'Ventas menos costo de lo vendido.']))
    expect(screen.queryByText(/% de las ventas/)).not.toBeInTheDocument()
  })

  it.each([
    ['2026-11-01T03:00:00Z', 'este-mes', '2026-10-01', '2026-10-31'],
    ['2026-11-01T05:00:00Z', 'este-mes', '2026-11-01', '2026-11-01'],
    ['2027-01-01T03:00:00Z', 'este-ano', '2026-01-01', '2026-12-31'],
    ['2027-01-01T05:00:00Z', 'este-ano', '2027-01-01', '2027-01-01'],
    ['2027-01-02T15:00:00Z', 'mes-anterior', '2026-12-01', '2026-12-31'],
    ['2026-03-01T15:00:00Z', 'ultimos-30', '2026-01-31', '2026-03-01'],
    ['2028-03-01T15:00:00Z', 'mes-anterior', '2028-02-01', '2028-02-29'],
  ])('consulta el rango de Bogota en %s para %s', async (now, periodo, desde, hasta) => {
    vi.setSystemTime(new Date(now))
    saveToken(validToken())
    const fetchMock = mockApi(fullRoutes())
    renderRoute(`/inicio?periodo=${periodo}`)
    await screen.findByText('$ 20.781.907')
    expect(fetchMock).toHaveBeenCalledWith(`/api/reporting/kpis?desde=${desde}&hasta=${hasta}`, expect.anything())
    expect(screen.getByRole('link', { name: 'Ver todas' })).toHaveAttribute('href', `/ventas?periodo=personalizado&desde=${desde}&hasta=${hasta}`)
  })

  it('cambia URL y consulta sin rotular cifras anteriores ni volver a pedir stock o cuentas', async () => {
    let resolvePrevious!: (response: Response) => void
    const pending = new Promise<Response>((resolve) => { resolvePrevious = resolve })
    const fetchMock = mockApi(fullRoutes())
    const base = fetchMock.getMockImplementation()!
    fetchMock.mockImplementation((url: string) => url.includes('desde=2026-09-01') ? pending.then((response) => response.clone()) : base(url))
    const router = renderRoute('/inicio')
    await screen.findByText('$ 20.781.907')
    await screen.findByText('Caja General')
    await userEvent.selectOptions(screen.getByLabelText('Período'), 'mes-anterior')
    expect(router.state.location.search).toBe('?periodo=mes-anterior')
    expect(screen.queryByText('$ 20.781.907')).not.toBeInTheDocument()
    expect(screen.getByText('Caja General')).toBeInTheDocument()
    await act(async () => { resolvePrevious(jsonResponse({ ...kpis, netSales: 123.45 })) })
    expect(await screen.findByText('$ 123')).toBeInTheDocument()
    for (const path of ['/api/inventory/products', '/api/inventory/categories', '/api/treasury/accounts', '/api/treasury/balance', '/api/sales']) {
      expect(fetchMock.mock.calls.filter(([url]) => url === path)).toHaveLength(1)
    }
    await act(() => router.navigate(-1))
    expect(screen.getByLabelText('Período')).toHaveValue('este-mes')
    expect(await screen.findByText('$ 20.781.907')).toBeInTheDocument()
    await act(() => router.navigate(1))
    expect(screen.getByLabelText('Período')).toHaveValue('mes-anterior')
    expect(await screen.findByText('$ 123')).toBeInTheDocument()
  })

  it.each([
    ['desde=2026-10-01', 'Elige la fecha de fin.'],
    ['hasta=2026-10-18', 'Elige la fecha de inicio.'],
    ['desde=2026-10-18&hasta=2026-10-01', 'Hasta no puede ser anterior a Desde.'],
    ['desde=2025-01-01&hasta=2026-10-18', 'El período no puede pasar de 366 días. Acorta el rango.'],
    ['desde=2026-02-30&hasta=2026-03-10', 'Escribe una fecha válida.'],
    ['desde=ayer&hasta=2026-03-10', 'Escribe una fecha válida.'],
  ])('no consulta indicadores ni muestra datos del rango invalido %s', async (query, message) => {
    const fetchMock = mockApi(fullRoutes())
    renderRoute(`/inicio?periodo=personalizado&${query}`)
    expect(screen.getByText(message)).toBeInTheDocument()
    await screen.findByText('Caja General')
    expect(fetchMock.mock.calls.filter(([url]) => url.includes('/reporting/kpis'))).toHaveLength(0)
    expect(screen.queryByText('Ventas sin IVA')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ver todas' })).not.toBeInTheDocument()
  })

  it('permite editar Personalizado y recargar la URL sin perder el rango', async () => {
    const fetchMock = mockApi(fullRoutes())
    const router = renderRoute('/inicio?periodo=personalizado&desde=2026-09-01&hasta=2026-09-30')
    await screen.findByText('$ 20.781.907')
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-09-10' } })
    fireEvent.blur(screen.getByLabelText('Desde'))
    await waitFor(() => expect(router.state.location.search).toContain('desde=2026-09-10'))
    expect(fetchMock).toHaveBeenCalledWith('/api/reporting/kpis?desde=2026-09-10&hasta=2026-09-30', expect.anything())
    const path = router.state.location.pathname + router.state.location.search
    cleanup()
    renderRoute(path)
    expect(screen.getByLabelText('Desde')).toHaveValue('2026-09-10')
    expect(screen.getByLabelText('Hasta')).toHaveValue('2026-09-30')
    expect(await screen.findByText('No hay ventas en el período elegido.')).toBeInTheDocument()
  })

  it('filtra ventas por ambos extremos, excluye anuladas y limita cinco con desempate por identificador', async () => {
    const rows = [
      sale(99, '2026-10-19', 'PAGADA'), sale(98, '2026-10-09', 'PAGADA'),
      sale(97, '2026-10-18', 'ANULADA'),
      ...[1, 2, 3, 4, 5, 6].map((id) => sale(id, '2026-10-10', 'PAGADA')),
      sale(7, '2026-10-18', 'PENDIENTE'),
    ]
    mockApi({ ...fullRoutes(), '/api/sales': () => jsonResponse(rows) })
    renderRoute('/inicio?periodo=personalizado&desde=2026-10-10&hasta=2026-10-18')
    const block = section('Últimas ventas')
    await waitFor(() => expect(bodyRows(block)).toHaveLength(5))
    expect(bodyRows(block).map((row) => /FV-\d+/.exec(row.textContent ?? '')?.[0])).toEqual(['FV-7', 'FV-6', 'FV-5', 'FV-4', 'FV-3'])
  })

  it.each(['/api/reporting/kpis', '/api/inventory/products', '/api/inventory/categories', '/api/treasury/accounts', '/api/treasury/balance'])('permite reintentar %s sin eliminar ventas sanas', async (path) => {
    let calls = 0
    const routes = fullRoutes()
    const handler = routes[path]!
    mockApi({ ...routes, [path]: () => ++calls === 1 ? jsonResponse({ error: 'SQL tecnico secreto', status: 500 }, 500) : handler() })
    renderRoute('/inicio')
    const block = path.includes('reporting') ? screen : within(section(path.includes('inventory') ? 'Productos con stock bajo' : 'Saldos de cuentas'))
    const alert = (await block.findAllByRole('alert')).find((item) => within(item).queryByRole('button', { name: 'Reintentar' }))!
    expect(alert).not.toHaveTextContent('SQL tecnico secreto')
    await waitFor(() => expect(bodyRows(section('Últimas ventas'))).toHaveLength(5))
    await userEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(calls).toBe(2))
    await waitFor(() => expect(alert).not.toBeInTheDocument())
  })

  it('mantiene carga independiente, datos de API y nombres largos de las respuestas', async () => {
    let resolveKpis!: (response: Response) => void
    const fetchMock = mockApi({ ...fullRoutes(), '/api/treasury/accounts': () => jsonResponse([{ ...accounts[0], name: 'Cuenta de recaudos de la serviteca con un nombre muy largo', currentBalance: 123.45 }]), '/api/treasury/balance': () => jsonResponse({ total: 123.45 }) })
    const base = fetchMock.getMockImplementation()!
    fetchMock.mockImplementation((url: string) => url.includes('/reporting/kpis') ? new Promise<Response>((resolve) => { resolveKpis = resolve }) : base(url))
    renderRoute('/inicio')
    expect(screen.queryByText('$ 20.781.907')).not.toBeInTheDocument()
    expect(await screen.findByText('Cuenta de recaudos de la serviteca con un nombre muy largo')).toBeInTheDocument()
    expect(screen.getAllByText('$ 123')).toHaveLength(2)
    await waitFor(() => expect(bodyRows(section('Últimas ventas'))).toHaveLength(5))
    await act(async () => { resolveKpis(jsonResponse({ ...kpis, netSales: 20781907.45, netProfit: -0.1 })) })
    expect(await screen.findByText('$ 20.781.907')).toBeInTheDocument()
    expect(screen.getByText('$ 0')).toHaveClass('text-error')
  })

  it.each(['/api/inventory/products', '/api/inventory/categories', '/api/treasury/accounts', '/api/treasury/balance', '/api/sales'])('mantiene la carga de %s independiente de los indicadores sanos', async (path) => {
    let resolve!: (response: Response) => void
    const fetchMock = mockApi(fullRoutes())
    const base = fetchMock.getMockImplementation()!
    fetchMock.mockImplementation((url: string) => url === path ? new Promise<Response>((done) => { resolve = done }) : base(url))
    renderRoute('/inicio')
    await screen.findByText('$ 20.781.907')
    const block = section(path.includes('inventory') ? 'Productos con stock bajo' : path.includes('treasury') ? 'Saldos de cuentas' : 'Últimas ventas')
    expect(block.querySelector('[aria-busy="true"]')).toBeInTheDocument()
    expect(within(block).queryByRole('alert')).not.toBeInTheDocument()
    await act(async () => { resolve(fullRoutes()[path]!()) })
    await waitFor(() => expect(block.querySelector('[aria-busy="true"]')).not.toBeInTheDocument())
  })

  it('al borrar una fecha retira los datos previos y no consulta un rango incompleto', async () => {
    const fetchMock = mockApi(fullRoutes())
    renderRoute('/inicio?periodo=personalizado&desde=2026-10-01&hasta=2026-10-18')
    await screen.findByText('$ 20.781.907')
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '' } })
    expect(screen.queryByText('$ 20.781.907')).not.toBeInTheDocument()
    expect(screen.getByText('Elige la fecha de fin.')).toBeInTheDocument()
    fireEvent.blur(screen.getByLabelText('Hasta'))
    await screen.findByText('Caja General')
    expect(fetchMock.mock.calls.filter(([url]) => url.includes('/reporting/kpis'))).toHaveLength(1)
  })

  it('conserva nombres completos y centavos de productos y ventas en tabla y tarjetas', async () => {
    const productName = 'Llanta para transporte intermunicipal con una descripcion completa y extensa'
    const customerName = 'Transportes y servicios automotores de Colombia sociedad por acciones simplificada'
    mockApi({
      ...fullRoutes(),
      '/api/inventory/products': () => jsonResponse([{ ...products[0], description: productName }]),
      '/api/sales': () => jsonResponse([{ ...sale(1, '2026-10-18', 'PAGADA'), customer: { name: customerName }, total: 2180323.95 }]),
    })
    renderRoute('/inicio')
    const stock = section('Productos con stock bajo')
    const recent = section('Últimas ventas')
    expect(await within(stock).findAllByText(productName)).toHaveLength(2)
    expect(await within(recent).findAllByText(customerName)).toHaveLength(2)
    expect(within(recent).getAllByText('$ 2.180.324')).toHaveLength(2)
  })

  it('utilidad neta negativa va en el tono de error y el margen negativo con coma', async () => {
    mockApi({
      ...fullRoutes(),
      '/api/reporting/kpis': () =>
        jsonResponse({ ...kpis, netSales: 1000000, costOfSales: 1123000, grossProfit: -123000, operatingExpenses: 200000, netProfit: -323000 }),
    })
    renderRoute('/inicio')

    expect(await screen.findByText('-$ 323.000')).toHaveClass('text-error')
    expect(screen.getByText('-12,3 % de las ventas')).toBeInTheDocument()
  })
})
