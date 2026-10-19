import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { saveToken } from '../auth/session'
import { EMPTY_VALUE } from '../lib/format'
import { jsonResponse, renderRoute, validToken } from '../test/utils'

type Routes = Record<string, () => Response>

const sale = (id: number, fields: Record<string, unknown>) => ({
  id,
  invoiceNumber: `FV-${String(id).padStart(4, '0')}`,
  customer: { name: `Cliente ${id}` },
  invoiceDate: '2026-10-01',
  dueDate: null,
  paymentType: 'CONTADO',
  status: 'PAGADA',
  total: 100000,
  pendingBalance: 0,
  ...fields,
})

const sales = [
  sale(1, { customer: { name: 'Carlos Pérez' }, invoiceDate: '2026-10-05', total: 540000 }),
  sale(2, {
    customer: { name: 'Transportes Boyacá S.A.S.' },
    invoiceDate: '2026-10-10',
    dueDate: '2026-11-09',
    paymentType: 'CREDITO',
    status: 'PENDIENTE',
    total: 2380000,
    pendingBalance: 1380000,
  }),
  sale(3, {
    customer: { name: 'María Fernanda Ruiz' },
    invoiceDate: '2026-09-20',
    dueDate: '2026-10-20',
    paymentType: 'CREDITO',
    status: 'PENDIENTE',
    total: 1150000,
    pendingBalance: 1150000,
  }),
  sale(4, { customer: null, invoiceDate: '2026-10-10', status: 'ANULADA', total: 95000 }),
]

const movements = [
  { id: 1, type: 'INGRESO', category: 'RECAUDO_VENTA', amount: 540000, date: '2026-10-05', saleId: 1 },
  { id: 2, type: 'INGRESO', category: 'RECAUDO_VENTA', amount: 1000000, date: '2026-10-12', saleId: 2 },
  { id: 3, type: 'INGRESO', category: 'RECAUDO_VENTA', amount: 200000, date: '2026-10-14', saleId: 3 },
]

function fullRoutes(): Routes {
  return {
    '/api/sales': () => jsonResponse(sales),
    '/api/reporting/kpis': () => jsonResponse({ totalSales: 635000, totalPurchases: 0, grossProfit: 0, operatingExpenses: 0, netProfit: 0 }),
    '/api/treasury/movements': () => jsonResponse(movements),
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

function indicator(label: string) {
  return screen.getByText(label).parentElement as HTMLElement
}

function table() {
  return screen.getByRole('table')
}

function invoiceNumbers() {
  return within(table())
    .getAllByRole('row')
    .slice(1)
    .map((row) => /FV-\d+/.exec(row.textContent ?? '')?.[0])
}

describe('facturas de venta', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-18T15:00:00Z'))
    saveToken(validToken())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('muestra indicadores, filtros y la tabla del mes', async () => {
    const fetchMock = mockApi(fullRoutes())
    renderRoute('/ventas')

    expect(await screen.findByRole('heading', { name: 'Facturas de venta' })).toBeInTheDocument()
    expect(within(screen.getByRole('banner')).getByRole('navigation', { name: 'Miga de pan' })).toHaveTextContent(
      'Ventas/Facturas de venta',
    )
    expect(screen.getByRole('link', { name: 'Nueva factura' })).toHaveAttribute('href', '/ventas/nueva')
    expect(screen.getByRole('link', { name: 'Papelera' })).toHaveAttribute('href', '/ventas/papelera')

    expect(await within(indicator('Ventas del mes')).findByText('$ 635.000')).toBeInTheDocument()
    expect(await within(indicator('Por cobrar')).findByText('$ 2.530.000')).toBeInTheDocument()
    expect(within(indicator('Por cobrar')).getByText('2 facturas pendientes de abono')).toBeInTheDocument()
    expect(await within(indicator('Abonos del mes')).findByText('$ 1.200.000')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/reporting/kpis?desde=2026-10-01&hasta=2026-10-18', expect.anything())
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/treasury/movements?category=RECAUDO_VENTA&desde=2026-10-01&hasta=2026-10-18',
      expect.anything(),
    )
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/sales')).toHaveLength(1)

    expect(screen.getByLabelText('Periodo')).toHaveValue('este-mes')
    await waitFor(() => expect(invoiceNumbers()).toEqual(['FV-0002', 'FV-0001']))
    expect(screen.queryByText('Anulada')).not.toBeInTheDocument()
    expect(within(screen.getByLabelText('Estado')).queryByRole('option', { name: 'Anulada' })).not.toBeInTheDocument()
    const rows = within(table()).getAllByRole('row')
    expect(rows[1]).toHaveTextContent('10/10/2026')
    expect(rows[1]).toHaveTextContent('09/11/2026')
    expect(rows[1]).toHaveTextContent('Crédito')
    expect(rows[1]).toHaveTextContent('$ 2.380.000')
    expect(rows[1]).toHaveTextContent('Pendiente')
    expect(within(rows[2] as HTMLElement).getAllByRole('cell')[3]).toHaveTextContent(EMPTY_VALUE)
    expect(within(rows[2] as HTMLElement).getByRole('link', { name: 'Ver detalle' })).toHaveAttribute('href', '/ventas/1')
    expect(screen.getByText('1 a 2 de 2 facturas')).toBeInTheDocument()

    const cards = screen.getByRole('list', { name: 'Facturas' })
    expect(within(cards).getAllByRole('link')).toHaveLength(2)
  })

  it('lee los filtros de la URL y los escribe al cambiarlos', async () => {
    mockApi(fullRoutes())
    const router = renderRoute('/ventas?estado=PENDIENTE&periodo=todas')
    const user = userEvent.setup()

    await waitFor(() => expect(invoiceNumbers()).toEqual(['FV-0002', 'FV-0003']))
    expect(screen.getByLabelText('Estado')).toHaveValue('PENDIENTE')
    expect(screen.getByLabelText('Periodo')).toHaveValue('todas')

    await user.type(screen.getByLabelText('Buscar'), 'MARIA')
    expect(invoiceNumbers()).toEqual(['FV-0003'])
    expect(router.state.location.search).toBe('?q=MARIA&estado=PENDIENTE&periodo=todas')

    await user.selectOptions(screen.getByLabelText('Forma de pago'), 'CONTADO')
    expect(router.state.location.search).toBe('?q=MARIA&estado=PENDIENTE&pago=CONTADO&periodo=todas')
    expect(screen.getByText('No hay facturas con esos filtros.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(router.state.location.search).toBe('?periodo=todas')
    expect(invoiceNumbers()).toEqual(['FV-0002', 'FV-0001', 'FV-0003'])
    expect(screen.getByLabelText('Buscar')).toHaveValue('')
  })

  it('pagina de 25 en 25 y guarda la pagina en la URL', async () => {
    const many = Array.from({ length: 30 }, (_, index) =>
      sale(index + 1, { invoiceDate: `2026-10-${String((index % 18) + 1).padStart(2, '0')}` }),
    )
    mockApi({ ...fullRoutes(), '/api/sales': () => jsonResponse(many) })
    const router = renderRoute('/ventas')
    const user = userEvent.setup()

    expect(await screen.findByText('1 a 25 de 30 facturas')).toBeInTheDocument()
    expect(invoiceNumbers()).toHaveLength(25)

    await user.click(screen.getByRole('button', { name: 'Página 2' }))
    expect(router.state.location.search).toBe('?pagina=2')
    expect(screen.getByText('26 a 30 de 30 facturas')).toBeInTheDocument()
    expect(invoiceNumbers()).toHaveLength(5)
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled()

    await user.selectOptions(screen.getByLabelText('Estado'), 'PAGADA')
    expect(router.state.location.search).toBe('?estado=PAGADA')
  })

  it('sin ventas invita a crear la primera', async () => {
    mockApi({ ...fullRoutes(), '/api/sales': () => jsonResponse([]), '/api/treasury/movements': () => jsonResponse([]) })
    renderRoute('/ventas')

    expect(await screen.findByText('Aún no registras ventas. Crea tu primera factura.')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Nueva factura' })).toHaveLength(2)
    expect(within(indicator('Por cobrar')).getByText('$ 0')).toBeInTheDocument()
    expect(within(indicator('Por cobrar')).getByText('0 facturas pendientes de abono')).toBeInTheDocument()
  })

  it('un indicador con error no afecta a los demas y se puede reintentar', async () => {
    let calls = 0
    mockApi({
      ...fullRoutes(),
      '/api/treasury/movements': () => {
        calls += 1
        return calls === 1 ? jsonResponse({ error: 'Error interno', status: 500 }, 500) : jsonResponse(movements)
      },
    })
    renderRoute('/ventas')

    const alert = await within(indicator('Abonos del mes')).findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar este dato.')
    expect(await within(indicator('Ventas del mes')).findByText('$ 635.000')).toBeInTheDocument()
    expect(within(indicator('Por cobrar')).getByText('$ 2.530.000')).toBeInTheDocument()
    expect(invoiceNumbers()).toHaveLength(2)

    await userEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }))

    expect(await within(indicator('Abonos del mes')).findByText('$ 1.200.000')).toBeInTheDocument()
  })

  it('si fallan las facturas lo dice y permite reintentar', async () => {
    let calls = 0
    mockApi({
      ...fullRoutes(),
      '/api/sales': () => {
        calls += 1
        return calls === 1 ? jsonResponse({ error: 'Error interno', status: 500 }, 500) : jsonResponse(sales)
      },
    })
    renderRoute('/ventas')

    expect(await screen.findByText('No pudimos cargar las facturas.')).toBeInTheDocument()
    expect(await within(indicator('Ventas del mes')).findByText('$ 635.000')).toBeInTheDocument()

    await userEvent.click(screen.getAllByRole('button', { name: 'Reintentar' })[0] as HTMLElement)

    await waitFor(() => expect(invoiceNumbers()).toHaveLength(2))
  })

  it('las rutas de nueva factura, papelera y detalle son placeholders', async () => {
    mockApi(fullRoutes())
    renderRoute('/ventas/7')

    expect(await screen.findByRole('heading', { name: 'Detalle de factura' })).toBeInTheDocument()
    expect(screen.getByText(/Próximamente/)).toBeInTheDocument()
  })
})
