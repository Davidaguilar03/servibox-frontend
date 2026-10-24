import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { saveToken } from '../auth/session'
import { jsonResponse, renderRoute, validToken } from '../test/utils'

type Routes = Record<string, () => Response>

const kpis = { totalSales: 48620000, totalPurchases: 29310000, grossProfit: 19310000, operatingExpenses: 4440000, netProfit: 14870000 }
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
  sale(1, '2026-09-20', 'PAGADA'),
  sale(2, '2026-09-28', 'PENDIENTE', 'CREDITO'),
  sale(3, '2026-09-25', 'PAGADA'),
  sale(4, '2026-09-28', 'PAGADA'),
  sale(5, '2026-09-01', 'ANULADA'),
  sale(6, '2026-09-27', 'PAGADA'),
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

  it('muestra los cuatro bloques con datos', async () => {
    const fetchMock = mockApi(fullRoutes())
    renderRoute('/inicio')

    expect(await screen.findByText('$ 48.620.000')).toBeInTheDocument()
    expect(screen.getByText('$ 29.310.000')).toBeInTheDocument()
    expect(screen.getByText('$ 19.310.000')).toBeInTheDocument()
    expect(screen.getByText('$ 14.870.000')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/reporting/kpis?desde=2026-10-01&hasta=2026-10-18', expect.anything())
    expect(screen.getByText(/Resumen de demo · octubre de 2026/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Registrar venta' })).toHaveAttribute('href', '/ventas/nueva')

    const stock = section('Productos con stock bajo')
    await waitFor(() => expect(bodyRows(stock)).toHaveLength(3))
    const stockRows = bodyRows(stock).map((row) => row.textContent)
    expect(stockRows[0]).toContain('LL-004')
    expect(stockRows[0]).toContain('Sin stock')
    expect(stockRows[1]).toContain('LUB-012')
    expect(stockRows[1]).toContain('Stock crítico')
    expect(stockRows[2]).toContain('LL-003')
    expect(stockRows[2]).toContain('Bajo stock')
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
    expect(salesRows[1]).toContain('28/09/2026')
    expect(salesRows[1]).toContain('Crédito')
    expect(salesRows[1]).toContain('$ 2.000')
    expect(salesRows[1]).toContain('Pendiente')
  })

  it('el shell muestra el usuario abajo en la barra lateral, la miga de pan y el tenant', async () => {
    mockApi(fullRoutes())
    saveToken(validToken(), { username: 'laura.gomez', role: 'ADMIN', tenantName: 'Autollantas A&C', tenantSlug: 'autollantas' })
    renderRoute('/inicio')

    const sidebar = screen.getByRole('navigation', { name: 'Principal' }).closest('aside') as HTMLElement
    expect(within(sidebar).getByText('laura.gomez')).toBeInTheDocument()
    expect(within(sidebar).getByText('LG')).toBeInTheDocument()
    expect(within(sidebar).getByText('Administrador')).toBeInTheDocument()
    expect(within(sidebar).getByRole('button', { name: 'Salir' })).toBeInTheDocument()

    const header = screen.getByRole('banner')
    expect(within(header).getByRole('navigation', { name: 'Ruta de navegación' })).toHaveTextContent('Inicio')
    expect(within(header).getByText('Autollantas A&C')).toBeInTheDocument()
    expect(within(header).queryByRole('searchbox')).not.toBeInTheDocument()
    expect(await screen.findByText(/Resumen de Autollantas A&C · octubre de 2026/)).toBeInTheDocument()
  })

  it('Este mes es una etiqueta, no un boton ni un enlace', async () => {
    mockApi(fullRoutes())
    renderRoute('/inicio')

    const label = await screen.findByText('Este mes')
    expect(label.tagName).toBe('SPAN')
    expect(label).not.toHaveAttribute('data-variant')
    expect(screen.queryByRole('button', { name: 'Este mes' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Este mes' })).not.toBeInTheDocument()
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
    expect(stockItems[2]).toHaveTextContent('Bajo stock')

    const salesSection = section('Últimas ventas')
    await waitFor(() => expect(bodyRows(salesSection)).toHaveLength(5))
    expect(within(salesSection).getByRole('table').parentElement).toHaveClass('hidden', 'md:block')
    const salesCards = within(salesSection).getByRole('list', { name: 'Últimas ventas' })
    expect(salesCards).toHaveClass('md:hidden')
    const saleItems = within(salesCards).getAllByRole('listitem')
    expect(saleItems.map((item) => /FV-\d+/.exec(item.textContent ?? '')?.[0])).toEqual(['FV-4', 'FV-2', 'FV-6', 'FV-3', 'FV-1'])
    for (const text of ['FV-2', 'Cliente 2', '28/09/2026', 'Crédito', '$ 2.000', 'Pendiente']) {
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
    expect(await screen.findByText('Aún no registras ventas.')).toBeInTheDocument()
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
    expect(await screen.findByText('$ 48.620.000')).toBeInTheDocument()
    expect(await within(section('Saldos de cuentas')).findByText('Caja General')).toBeInTheDocument()
    expect(within(section('Productos con stock bajo')).queryByRole('alert')).not.toBeInTheDocument()

    await userEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }))

    await waitFor(() => expect(bodyRows(salesSection)).toHaveLength(5))
  })
})
