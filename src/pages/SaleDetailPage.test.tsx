import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { saveToken } from '../auth/session'
import { EMPTY_VALUE } from '../lib/format'
import { jsonResponse, renderRoute, validToken } from '../test/utils'

type Handler = (url: URL, body: unknown) => Response
type Routes = Record<string, Handler>

const customer = {
  id: 2,
  role: 'CLIENTE',
  name: 'Transportes Boyacá S.A.S.',
  documentType: 'NIT',
  documentNumber: '900123456',
  email: 'compras@transboyaca.co',
  phone: '3001234567',
}

const details = [
  { id: 1, productId: 1, productCode: 'LL-009', productDescription: 'Llanta Continental', quantity: 8, price: 200000, ivaAmount: 304000 },
  { id: 2, productId: 2, productCode: 'LUB-015', productDescription: 'Aceite Castrol GTX', quantity: 10, price: 40000, ivaAmount: 76000 },
]

function sale(id: number, fields: Record<string, unknown> = {}) {
  return {
    id,
    invoiceNumber: 'FV-0230',
    customer,
    invoiceDate: '2026-10-05',
    dueDate: '2026-11-04',
    paymentType: 'CREDITO',
    paymentMethod: null,
    status: 'PENDIENTE',
    subtotal: 2000000,
    ivaPorPagar: 380000,
    total: 2380000,
    pendingBalance: 1880000,
    details,
    ...fields,
  }
}

const movement = (id: number, date: string, amount: number, accountName = 'Bancolombia') => ({
  id,
  accountId: accountName === 'Bancolombia' ? 11 : 10,
  accountName,
  type: 'INGRESO',
  category: 'RECAUDO_VENTA',
  concept: 'Abono',
  amount,
  date,
  saleId: 5,
})

const accounts = [
  { id: 11, name: 'Bancolombia', type: 'BANCO', currentBalance: 0 },
  { id: 10, name: 'Caja General', type: 'EFECTIVO', currentBalance: 0 },
]

function routes(change: Routes = {}): Routes {
  return {
    'GET /api/sales/5': () => jsonResponse(sale(5)),
    'GET /api/treasury/movements': () => jsonResponse([movement(1, '2026-10-08', 200000), movement(2, '2026-10-12', 300000, 'Caja General')]),
    'GET /api/treasury/accounts': () => jsonResponse(accounts),
    'GET /api/sales': () => jsonResponse([]),
    'GET /api/reporting/kpis': () => jsonResponse({ totalSales: 0 }),
    ...change,
  }
}

function mockApi(table: Routes) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const parsed = new URL(url, 'http://localhost')
    const handler = table[`${init?.method ?? 'GET'} ${parsed.pathname}`]
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    return Promise.resolve(handler ? handler(parsed, body) : jsonResponse({ error: 'Recurso no encontrado', status: 404 }, 404))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function calls(fetchMock: ReturnType<typeof mockApi>, method: string, path: string) {
  return fetchMock.mock.calls.filter(([url, init]) => url.split('?')[0] === path && (init?.method ?? 'GET') === method)
}

function summary() {
  return screen.getByRole('complementary', { name: 'Resumen' })
}

function summaryValue(label: string) {
  return within(summary()).getByText(label).nextElementSibling?.textContent
}

describe('detalle de factura de venta', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-18T15:00:00Z'))
    saveToken(validToken())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('credito con abonos: datos, productos, abonos y resumen', async () => {
    const fetchMock = mockApi(routes())
    renderRoute('/ventas/5')

    expect(await screen.findByRole('heading', { name: 'FV-0230' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Miga de pan' })).toHaveTextContent('Ventas/Facturas de venta/FV-0230')
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
    expect(screen.getByText('Transportes Boyacá S.A.S. · Crédito · Vence el 04/11/2026')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrar abono' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anular' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /PDF/ })).not.toBeInTheDocument()

    const data = screen.getByRole('region', { name: 'Datos de la factura' })
    expect(within(data).getByText('NIT 900123456')).toBeInTheDocument()
    expect(within(data).getByText('compras@transboyaca.co')).toBeInTheDocument()
    expect(within(data).getByText('3001234567')).toBeInTheDocument()
    expect(within(data).getByText('05/10/2026')).toBeInTheDocument()
    expect(within(data).getByText('04/11/2026')).toBeInTheDocument()
    expect(within(data).queryByText('Método de pago')).not.toBeInTheDocument()

    const products = within(screen.getByRole('region', { name: 'Productos' })).getByRole('table')
    const productRows = within(products).getAllByRole('row').slice(1)
    expect(productRows[0]).toHaveTextContent('LL-009Llanta Continental8$ 200.000$ 304.000$ 1.904.000')
    expect(productRows[1]).toHaveTextContent('$ 476.000')

    const collections = screen.getByRole('region', { name: 'Abonos registrados' })
    const collectionRows = within(within(collections).getByRole('table')).getAllByRole('row').slice(1)
    expect(collectionRows.map((row) => row.textContent)).toEqual(['12/10/2026Caja General$ 300.000', '08/10/2026Bancolombia$ 200.000'])
    expect(within(collections).queryByText(/Método/)).not.toBeInTheDocument()

    expect(summaryValue('Subtotal')).toBe('$ 2.000.000')
    expect(summaryValue('IVA')).toBe('$ 380.000')
    expect(summaryValue('Total')).toBe('$ 2.380.000')
    // Abonado (total menos saldo) coincide con la suma de los abonos: 200.000 + 300.000.
    expect(summaryValue('Abonado')).toBe('$ 500.000')
    expect(summaryValue('Saldo pendiente')).toBe('$ 1.880.000')
    expect(calls(fetchMock, 'GET', '/api/treasury/movements')[0]?.[0]).toBe(
      '/api/treasury/movements?saleId=5&category=RECAUDO_VENTA',
    )
  })

  it('contado pagado: pago recibido y solo Anular', async () => {
    mockApi(
      routes({
        'GET /api/sales/5': () =>
          jsonResponse(sale(5, { paymentType: 'CONTADO', dueDate: null, paymentMethod: 'EFECTIVO', status: 'PAGADA', pendingBalance: 0 })),
        'GET /api/treasury/movements': () => jsonResponse([movement(3, '2026-10-05', 2380000, 'Caja General')]),
      }),
    )
    renderRoute('/ventas/5')

    expect(await screen.findByText('Pagada')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar abono' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anular' })).toBeInTheDocument()
    const data = screen.getByRole('region', { name: 'Datos de la factura' })
    expect(within(data).getByText('Efectivo')).toBeInTheDocument()
    expect(within(data).getByText('Vence').nextElementSibling).toHaveTextContent(EMPTY_VALUE)
    const paid = screen.getByRole('region', { name: 'Pago recibido' })
    expect((await within(paid).findAllByText('$ 2.380.000'))[0]).toBeInTheDocument()
    expect(summaryValue('Abonado')).toBe('$ 2.380.000')
    expect(summaryValue('Saldo pendiente')).toBe('$ 0')
  })

  it('anulada: solo lectura, sin botones', async () => {
    mockApi(
      routes({
        'GET /api/sales/5': () => jsonResponse(sale(5, { status: 'ANULADA', pendingBalance: 0 })),
        'GET /api/treasury/movements': () => jsonResponse([]),
      }),
    )
    renderRoute('/ventas/5')

    expect(await screen.findByText('Anulada')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar abono' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Anular' })).not.toBeInTheDocument()
    expect(screen.getByText(/Está en la papelera/)).toBeInTheDocument()
    expect(await screen.findByText('La factura está anulada: sus pagos se revirtieron.')).toBeInTheDocument()
    expect(summaryValue('Abonado')).toBe(EMPTY_VALUE)
    expect(summaryValue('Saldo pendiente')).toBe(EMPTY_VALUE)
  })

  it('una factura que no existe o un id no numerico muestran Factura no encontrada', async () => {
    const fetchMock = mockApi(routes())
    renderRoute('/ventas/999')
    expect(await screen.findByRole('heading', { name: 'Factura no encontrada' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a Facturas de venta' })).toHaveAttribute('href', '/ventas')

    renderRoute('/ventas/abc')
    expect(await screen.findAllByRole('heading', { name: 'Factura no encontrada' })).toHaveLength(2)
    expect(calls(fetchMock, 'GET', '/api/sales/abc')).toHaveLength(0)
  })

  it('carga con skeleton, y cada bloque falla y se reintenta por separado', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})))
    renderRoute('/ventas/5')
    await waitFor(() => expect(document.querySelector('main [aria-busy]')).not.toBeNull())

    let saleCalls = 0
    let movementCalls = 0
    mockApi(
      routes({
        'GET /api/sales/5': () => {
          saleCalls += 1
          return saleCalls === 1 ? jsonResponse({ error: 'Error interno', status: 500 }, 500) : jsonResponse(sale(5))
        },
        'GET /api/treasury/movements': () => {
          movementCalls += 1
          return movementCalls === 1 ? jsonResponse({ error: 'Error interno', status: 500 }, 500) : jsonResponse([])
        },
      }),
    )
    renderRoute('/ventas/5')
    const user = userEvent.setup()

    await user.click(within(await screen.findByRole('alert')).getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('heading', { name: 'FV-0230' })).toBeInTheDocument()
    const collections = screen.getByRole('region', { name: 'Abonos registrados' })
    await user.click(await within(collections).findByRole('button', { name: 'Reintentar' }))
    expect(await within(collections).findByText(/Aún no hay abonos/)).toBeInTheDocument()
    expect(summaryValue('Saldo pendiente')).toBe('$ 1.880.000')
  })

  it('registra un abono: valores por defecto, validaciones y cuerpo exacto', async () => {
    vi.setSystemTime(new Date('2026-10-19T03:00:00Z'))
    saveToken(validToken())
    let saleCalls = 0
    const fetchMock = mockApi(
      routes({
        'GET /api/sales/5': () => {
          saleCalls += 1
          return jsonResponse(saleCalls === 1 ? sale(5) : sale(5, { pendingBalance: 1380000 }))
        },
        'POST /api/sales/5/collections': () => jsonResponse(movement(9, '2026-10-18', 500000, 'Caja General'), 201),
      }),
    )
    renderRoute('/ventas/5')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Registrar abono' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar abono' })
    expect(within(dialog).getByText('FV-0230 · Transportes Boyacá S.A.S.')).toBeInTheDocument()
    expect(within(dialog).getByText('$ 1.880.000')).toBeInTheDocument()
    expect(await within(dialog).findByLabelText('Cuenta')).toHaveValue('10')
    const amount = within(dialog).getByLabelText('Valor del abono')
    const date = within(dialog).getByLabelText('Fecha')
    expect(amount).toHaveValue(1880000)
    expect(date).toHaveValue('2026-10-18')
    expect(date).toHaveAttribute('min', '2026-10-05')
    expect(date).toHaveAttribute('max', '2026-10-18')
    const save = within(dialog).getByRole('button', { name: 'Registrar abono' })

    await user.clear(amount)
    await user.type(amount, '0')
    expect(within(dialog).getByText('El valor debe ser mayor que cero.')).toBeInTheDocument()
    expect(save).toBeDisabled()
    await user.clear(amount)
    await user.type(amount, '2000000')
    expect(within(dialog).getByText('No puede superar el saldo pendiente de $ 1.880.000')).toBeInTheDocument()
    expect(save).toBeDisabled()
    await user.clear(amount)
    await user.type(amount, '500000')
    fireEvent.change(date, { target: { value: '2026-10-04' } })
    expect(within(dialog).getByText('La fecha debe estar entre el 05/10/2026 y el 18/10/2026.')).toBeInTheDocument()
    fireEvent.change(date, { target: { value: '2026-10-19' } })
    expect(save).toBeDisabled()
    fireEvent.change(date, { target: { value: '2026-10-18' } })
    expect(save).toBeEnabled()

    await user.dblClick(save)

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const posts = calls(fetchMock, 'POST', '/api/sales/5/collections')
    expect(posts).toHaveLength(1)
    expect(JSON.parse(String(posts[0]?.[1]?.body))).toEqual({ accountId: 10, amount: 500000, date: '2026-10-18' })
    expect(await screen.findByText('Abono registrado')).toBeInTheDocument()
    await waitFor(() => expect(summaryValue('Saldo pendiente')).toBe('$ 1.380.000'))
  })

  it('un error del backend se muestra en el modal sin perder lo digitado y refresca la factura', async () => {
    let saleCalls = 0
    mockApi(
      routes({
        'GET /api/sales/5': () => {
          saleCalls += 1
          return jsonResponse(sale(5))
        },
        'POST /api/sales/5/collections': () =>
          jsonResponse({ error: 'Solo se puede abonar a una factura PENDIENTE, y esta esta PAGADA', status: 400 }, 400),
      }),
    )
    renderRoute('/ventas/5')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Registrar abono' }))
    const dialog = screen.getByRole('dialog')
    const amount = within(dialog).getByLabelText('Valor del abono')
    await user.clear(amount)
    await user.type(amount, '700000')
    await user.click(within(dialog).getByRole('button', { name: 'Registrar abono' }))

    expect(await within(dialog).findByText('Solo se puede abonar a una factura PENDIENTE, y esta esta PAGADA')).toBeInTheDocument()
    expect(amount).toHaveValue(700000)
    await waitFor(() => expect(saleCalls).toBeGreaterThan(1))
  })

  it('al saldar la factura pasa a Pagada y desaparece Registrar abono', async () => {
    let paid = false
    mockApi(
      routes({
        'GET /api/sales/5': () => jsonResponse(paid ? sale(5, { status: 'PAGADA', pendingBalance: 0 }) : sale(5)),
        'POST /api/sales/5/collections': () => {
          paid = true
          return jsonResponse(movement(9, '2026-10-18', 1880000), 201)
        },
      }),
    )
    renderRoute('/ventas/5')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Registrar abono' }))
    const dialog = screen.getByRole('dialog')
    await within(dialog).findByLabelText('Cuenta')
    await user.click(within(dialog).getByRole('button', { name: 'Registrar abono' }))

    expect(await screen.findByText('Pagada')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar abono' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anular' })).toBeInTheDocument()
  })

  it('anular: foco en Cancelar, confirma una sola vez y vuelve al listado', async () => {
    const fetchMock = mockApi(
      routes({ 'POST /api/sales/5/annul': () => jsonResponse(sale(5, { status: 'ANULADA', pendingBalance: 0 })) }),
    )
    const router = renderRoute('/ventas/5')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Anular' }))
    let dialog = screen.getByRole('dialog', { name: 'Anular factura FV-0230' })
    expect(within(dialog).getByText(/pasa a la papelera/)).toHaveTextContent('Puedes recuperarla desde la Papelera')
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Anular' }))
    dialog = screen.getByRole('dialog')
    await user.dblClick(within(dialog).getByRole('button', { name: 'Anular factura' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/ventas'))
    expect(calls(fetchMock, 'POST', '/api/sales/5/annul')).toHaveLength(1)
    expect(await screen.findByText('Factura FV-0230 anulada')).toBeInTheDocument()
  })

  it('Ver detalle del listado abre la factura y atras vuelve con los filtros', async () => {
    mockApi(routes({ 'GET /api/sales': () => jsonResponse([sale(5)]) }))
    const router = renderRoute('/ventas?estado=PENDIENTE&periodo=todas')
    const user = userEvent.setup()

    const [link] = await screen.findAllByRole('link', { name: 'Ver detalle' })
    expect(link).toHaveAttribute('href', '/ventas/5')
    await user.click(link as HTMLElement)
    expect(await screen.findByRole('heading', { name: 'FV-0230' })).toBeInTheDocument()

    await router.navigate(-1)
    await waitFor(() => expect(router.state.location.search).toBe('?estado=PENDIENTE&periodo=todas'))
    expect(await screen.findByLabelText('Estado')).toHaveValue('PENDIENTE')
  })

  it('si anular falla, el mensaje queda en el modal', async () => {
    mockApi(
      routes({
        'POST /api/sales/5/annul': () => jsonResponse({ error: 'La factura FV-0230 ya esta anulada', status: 400 }, 400),
      }),
    )
    const router = renderRoute('/ventas/5')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Anular' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Anular factura' }))

    expect(await within(dialog).findByText('La factura FV-0230 ya esta anulada')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/ventas/5')
  })
})
