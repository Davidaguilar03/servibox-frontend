import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { saveToken } from '../auth/session'
import { EMPTY_VALUE } from '../lib/format'
import { URL_TEXT_DEBOUNCE_MS } from '../lib/useUrlTextParam'
import { emptyStateOf, jsonResponse, primaryActions, renderRoute, typeWithoutPause, validToken } from '../test/utils'

type Routes = Record<string, () => Response>

const purchase = (id: number, supplierName: string, fields: Record<string, unknown>) => ({
  id,
  invoiceNumber: `FC-${String(id).padStart(4, '0')}`,
  supplier: { id: 100 + id, role: 'PROVEEDOR', name: supplierName, documentType: 'NIT', documentNumber: String(900 + id), email: null, phone: null },
  invoiceDate: '2026-10-01',
  dueDate: null,
  paymentType: 'CONTADO',
  paymentMethod: 'EFECTIVO',
  status: 'PAGADA',
  subtotal: 0,
  ivaTotal: 0,
  total: 100000,
  pendingBalance: 0,
  details: [],
  ...fields,
})

const purchases = [
  purchase(1, 'Distrillantas Boyacá S.A.S.', { invoiceDate: '2026-10-05', total: 4212600 }),
  purchase(2, 'Lubricantes del Norte', {
    invoiceDate: '2026-10-10',
    dueDate: '2026-12-09',
    paymentType: 'CREDITO',
    paymentMethod: null,
    status: 'PENDIENTE',
    total: 2380000,
    pendingBalance: 1380000,
  }),
  purchase(3, 'Baterías MAC', {
    invoiceDate: '2026-09-20',
    dueDate: '2026-10-20',
    paymentType: 'CREDITO',
    paymentMethod: null,
    status: 'PENDIENTE',
    total: 1150000,
    pendingBalance: 1150000,
  }),
  purchase(4, 'Anulado S.A.S.', { invoiceDate: '2026-10-10', status: 'ANULADA', total: 95000 }),
]

const movement = (id: number, purchaseId: number, amount: number) => ({
  id,
  accountId: 1,
  accountName: 'Caja General',
  type: 'EGRESO',
  category: 'PAGO_COMPRA',
  concept: 'Pago',
  amount,
  date: '2026-10-12',
  notes: null,
  saleId: null,
  purchaseId,
  relatedMovementId: null,
})

// El 1 es el egreso de una compra de contado: no es un pago a credito.
const movements = [movement(1, 1, 4212600), movement(2, 2, 1000000), movement(3, 3, 200000)]

function fullRoutes(): Routes {
  return {
    '/api/purchases': () => jsonResponse(purchases),
    '/api/reporting/kpis': () => jsonResponse({ totalSales: 0, totalPurchases: 6592600, grossProfit: 0, operatingExpenses: 0, netProfit: 0 }),
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

function invoiceNumbers() {
  return within(screen.getByRole('table'))
    .getAllByRole('row')
    .slice(1)
    .map((row) => /FC-\d+/.exec(row.textContent ?? '')?.[0])
}

describe('facturas de compra', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-22T15:00:00Z'))
    saveToken(validToken())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('muestra indicadores, filtros y la tabla del mes sin anuladas', async () => {
    const fetchMock = mockApi(fullRoutes())
    renderRoute('/compras')

    expect(await screen.findByRole('heading', { name: 'Facturas de compra' })).toBeInTheDocument()
    expect(screen.getByText('Compras de contado y a crédito. Las facturas anuladas están en la papelera.')).toBeInTheDocument()
    expect(within(screen.getByRole('banner')).getByRole('navigation', { name: 'Miga de pan' })).toHaveTextContent(
      'Compras/Facturas de compra',
    )
    expect(screen.getByRole('link', { name: 'Nueva factura' })).toHaveAttribute('href', '/compras/nueva')
    expect(screen.getByRole('link', { name: 'Papelera' })).toHaveAttribute('href', '/compras/papelera')

    expect(await within(indicator('Compras del mes')).findByText('$ 6.592.600')).toBeInTheDocument()
    expect(await within(indicator('Por pagar')).findByText('$ 2.530.000')).toBeInTheDocument()
    expect(within(indicator('Por pagar')).getByText('2 facturas pendientes de pago')).toBeInTheDocument()
    expect(await within(indicator('Pagos del mes')).findByText('$ 1.200.000')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/reporting/kpis?desde=2026-10-01&hasta=2026-10-22', expect.anything())
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/treasury/movements?category=PAGO_COMPRA&desde=2026-10-01&hasta=2026-10-22',
      expect.anything(),
    )

    await waitFor(() => expect(invoiceNumbers()).toEqual(['FC-0002', 'FC-0001']))
    expect(screen.queryByText('Anulado S.A.S.')).not.toBeInTheDocument()
    expect(within(screen.getByLabelText('Estado')).queryByRole('option', { name: 'Anulada' })).not.toBeInTheDocument()
    const rows = within(screen.getByRole('table')).getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Lubricantes del Norte')
    expect(rows[1]).toHaveTextContent('10/10/2026')
    expect(rows[1]).toHaveTextContent('09/12/2026')
    expect(rows[1]).toHaveTextContent('Crédito')
    expect(rows[1]).toHaveTextContent('$ 2.380.000')
    expect(rows[1]).toHaveTextContent('Pendiente')
    expect(within(rows[2] as HTMLElement).getAllByRole('cell')[3]).toHaveTextContent(EMPTY_VALUE)
    expect(within(rows[2] as HTMLElement).getByRole('link', { name: 'Ver detalle' })).toHaveAttribute('href', '/compras/1')
    expect(screen.getByText('1 a 2 de 2 facturas')).toBeInTheDocument()

    const cards = screen.getByRole('list', { name: 'Facturas' })
    expect(within(cards).getAllByRole('link')).toHaveLength(2)
  })

  it('lee los filtros de la URL, busca sin tildes ni mayusculas y escribe los cambios', async () => {
    mockApi(fullRoutes())
    const router = renderRoute('/compras?estado=PENDIENTE&periodo=todas')
    const user = userEvent.setup()

    await waitFor(() => expect(invoiceNumbers()).toEqual(['FC-0002', 'FC-0003']))
    expect(screen.getByLabelText('Estado')).toHaveValue('PENDIENTE')

    // La espera del buscador corre con el reloj simulado; avanza solo para que userEvent siga funcionando.
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'], shouldAdvanceTime: true })
    await user.type(screen.getByLabelText('Buscar'), 'BATERIAS')
    await act(() => vi.advanceTimersByTimeAsync(URL_TEXT_DEBOUNCE_MS))
    expect(invoiceNumbers()).toEqual(['FC-0003'])
    expect(router.state.location.search).toBe('?q=BATERIAS&estado=PENDIENTE&periodo=todas')

    await user.selectOptions(screen.getByLabelText('Forma de pago'), 'CONTADO')
    expect(router.state.location.search).toBe('?q=BATERIAS&estado=PENDIENTE&pago=CONTADO&periodo=todas')
    expect(screen.getByText('No hay facturas con esos filtros.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(router.state.location.search).toBe('?periodo=todas')
    expect(invoiceNumbers()).toEqual(['FC-0002', 'FC-0001', 'FC-0003'])
  })

  it('escribir sin pausa filtra con todo el texto; Limpiar lo vacia y atras lo restaura', async () => {
    mockApi(fullRoutes())
    const router = renderRoute('/compras?periodo=todas')
    await waitFor(() => expect(invoiceNumbers()).toHaveLength(3))

    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'], shouldAdvanceTime: true })
    const input = screen.getByLabelText<HTMLInputElement>('Buscar')
    typeWithoutPause(input, 'FC-0003')
    expect(input).toHaveValue('FC-0003')
    await act(() => vi.advanceTimersByTimeAsync(URL_TEXT_DEBOUNCE_MS))
    expect(router.state.location.search).toBe('?q=FC-0003&periodo=todas')
    expect(router.state.historyAction).toBe('REPLACE')
    expect(invoiceNumbers()).toEqual(['FC-0003'])

    await userEvent.click(screen.getByRole('button', { name: 'Limpiar' }))
    expect(router.state.location.search).toBe('?periodo=todas')
    expect(input).toHaveValue('')

    await act(() => router.navigate(-1))
    expect(router.state.location.search).toBe('?q=FC-0003&periodo=todas')
    expect(input).toHaveValue('FC-0003')
    expect(invoiceNumbers()).toEqual(['FC-0003'])
  })

  it('pagina de 25 en 25 y guarda la pagina en la URL', async () => {
    const many = Array.from({ length: 30 }, (_, index) =>
      purchase(index + 1, `Proveedor ${index + 1}`, { invoiceDate: `2026-10-${String((index % 20) + 1).padStart(2, '0')}` }),
    )
    mockApi({ ...fullRoutes(), '/api/purchases': () => jsonResponse(many) })
    const router = renderRoute('/compras')
    const user = userEvent.setup()

    expect(await screen.findByText('1 a 25 de 30 facturas')).toBeInTheDocument()
    expect(invoiceNumbers()).toHaveLength(25)
    // A igual fecha, el id mayor primero.
    expect(invoiceNumbers().slice(0, 2)).toEqual(['FC-0020', 'FC-0019'])

    await user.click(screen.getByRole('button', { name: 'Página 2' }))
    expect(router.state.location.search).toBe('?pagina=2')
    expect(screen.getByText('26 a 30 de 30 facturas')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Estado'), 'PAGADA')
    expect(router.state.location.search).toBe('?estado=PAGADA')
  })

  it('sin compras invita a crear la primera', async () => {
    mockApi({ ...fullRoutes(), '/api/purchases': () => jsonResponse([purchases[3]]), '/api/treasury/movements': () => jsonResponse([]) })
    renderRoute('/compras')

    expect(await screen.findByText('Aún no registras compras. Crea tu primera factura de compra.')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Nueva factura' })).toHaveLength(2)
    expect(within(indicator('Por pagar')).getByText('0 facturas pendientes de pago')).toBeInTheDocument()
  })

  it('sin compras el unico primario es Nueva factura del encabezado', async () => {
    mockApi({ ...fullRoutes(), '/api/purchases': () => jsonResponse([purchases[3]]), '/api/treasury/movements': () => jsonResponse([]) })
    renderRoute('/compras')

    expect(await screen.findByText('Aún no registras compras. Crea tu primera factura de compra.')).toBeInTheDocument()
    const [primary, ...rest] = primaryActions()
    expect(rest).toHaveLength(0)
    expect(primary).toHaveTextContent('Nueva factura')
    expect(emptyStateOf('Aún no registras compras. Crea tu primera factura de compra.')).not.toContainElement(primary ?? null)
    expect(within(emptyStateOf('Aún no registras compras. Crea tu primera factura de compra.')).getByRole('link', { name: 'Nueva factura' })).toHaveAttribute('data-variant', 'secondary')
  })

  it('mientras cargan muestra skeleton en cada bloque', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})))
    renderRoute('/compras')

    await screen.findByRole('heading', { name: 'Facturas de compra' })
    expect(document.querySelectorAll('[aria-busy], .animate-pulse').length).toBeGreaterThan(0)
    expect(screen.queryByRole('table')).toBeInTheDocument()
    expect(screen.queryByText(/^\$/)).not.toBeInTheDocument()
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
    renderRoute('/compras')

    const alert = await within(indicator('Pagos del mes')).findByRole('alert')
    expect(await within(indicator('Compras del mes')).findByText('$ 6.592.600')).toBeInTheDocument()
    expect(invoiceNumbers()).toHaveLength(2)

    await userEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }))
    expect(await within(indicator('Pagos del mes')).findByText('$ 1.200.000')).toBeInTheDocument()
  })

  it('si fallan las facturas lo dice y permite reintentar', async () => {
    let calls = 0
    mockApi({
      ...fullRoutes(),
      '/api/purchases': () => {
        calls += 1
        return calls === 1 ? jsonResponse({ error: 'Error interno', status: 500 }, 500) : jsonResponse(purchases)
      },
    })
    renderRoute('/compras')

    expect(await screen.findByText('No pudimos cargar las facturas.')).toBeInTheDocument()
    expect(await within(indicator('Compras del mes')).findByText('$ 6.592.600')).toBeInTheDocument()

    await userEvent.click(screen.getAllByRole('button', { name: 'Reintentar' })[0] as HTMLElement)
    await waitFor(() => expect(invoiceNumbers()).toHaveLength(2))
  })

  it('el boton Papelera lleva a la papelera de compras', async () => {
    mockApi(fullRoutes())
    const router = renderRoute('/compras')

    await userEvent.click(await screen.findByRole('link', { name: 'Papelera' }))
    expect(await screen.findByRole('heading', { name: 'Papelera de compras' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/compras/papelera')
  })
})
