import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { saveToken } from '../auth/session'
import { EMPTY_VALUE } from '../lib/format'
import { jsonResponse, renderRoute, validToken } from '../test/utils'

type Handler = (url: URL, body: unknown) => Response | Promise<Response>
type Routes = Record<string, Handler>

const supplier = {
  id: 4,
  role: 'PROVEEDOR',
  name: 'Importadora Andina SAS',
  documentType: 'NIT',
  documentNumber: '900987654',
  email: 'compras@andina.co',
  phone: '3109876543',
}

const details = [
  { id: 1, productId: 3, productCode: 'DEMO-003', productDescription: 'Bateria 12V', quantity: 2, price: 251234.57, ivaAmount: 95469.14 },
]

function purchase(id: number, fields: Record<string, unknown> = {}) {
  return {
    id,
    invoiceNumber: 'IA-777',
    supplier,
    invoiceDate: '2026-10-05',
    dueDate: '2026-12-04',
    paymentType: 'CREDITO',
    paymentMethod: null,
    status: 'PENDIENTE',
    subtotal: 502469.14,
    ivaTotal: 95469.14,
    total: 597938.28,
    pendingBalance: 397938.28,
    details,
    ...fields,
  }
}

const movement = (id: number, date: string, amount: number, accountId = 1, accountName = 'Bancolombia') => ({
  id,
  accountId,
  accountName,
  type: 'EGRESO',
  category: 'PAGO_COMPRA',
  concept: 'Pago compra IA-777',
  amount,
  date,
  notes: null,
  saleId: null,
  purchaseId: 5,
  relatedMovementId: null,
})

const accounts = [
  { id: 1, name: 'Bancolombia', type: 'BANCO', currentBalance: 2000000 },
  { id: 2, name: 'Caja General', type: 'EFECTIVO', currentBalance: 300000 },
]

function routes(change: Routes = {}): Routes {
  return {
    'GET /api/purchases/5': () => jsonResponse(purchase(5)),
    'GET /api/treasury/movements': () =>
      jsonResponse([movement(1, '2026-10-08', 150000), movement(2, '2026-10-12', 50000, 2, 'Caja General')]),
    'GET /api/treasury/accounts': () => jsonResponse(accounts),
    'GET /api/purchases': () => jsonResponse([purchase(5)]),
    'GET /api/reporting/kpis': () => jsonResponse({ totalPurchases: 0 }),
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

function summaryValue(label: string) {
  return within(screen.getByRole('complementary', { name: 'Resumen' })).getByText(label).nextElementSibling?.textContent
}

describe('detalle de factura de compra', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-22T15:00:00Z'))
    saveToken(validToken())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('credito con pagos: datos, productos, pagos y resumen', async () => {
    const fetchMock = mockApi(routes())
    renderRoute('/compras/5')

    expect(await screen.findByRole('heading', { name: 'IA-777' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Miga de pan' })).toHaveTextContent('Compras/Facturas de compra/IA-777')
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
    expect(screen.getByText('Importadora Andina SAS · Crédito · Vence el 04/12/2026')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrar pago' })).toHaveClass('bg-action')
    const annulButton = screen.getByRole('button', { name: 'Anular' })
    expect(annulButton).toHaveClass('bg-surface', 'text-text')
    expect(screen.queryByRole('button', { name: /PDF/ })).not.toBeInTheDocument()

    const data = screen.getByRole('region', { name: 'Datos de la factura' })
    expect(within(data).getByText('Importadora Andina SAS')).toBeInTheDocument()
    expect(within(data).getByText('NIT 900987654')).toBeInTheDocument()
    expect(within(data).getByText('compras@andina.co')).toBeInTheDocument()
    expect(within(data).getByText('3109876543')).toBeInTheDocument()
    expect(within(data).getByText('05/10/2026')).toBeInTheDocument()
    expect(within(data).queryByText('Método de pago')).not.toBeInTheDocument()

    const products = within(screen.getByRole('region', { name: 'Productos' })).getByRole('table')
    expect(within(products).getAllByRole('columnheader').map((cell) => cell.textContent)).toContain('Precio sin IVA')
    expect(within(products).getAllByRole('row')[1]).toHaveTextContent('DEMO-003Bateria 12V2$ 251.235$ 95.469$ 502.469')

    const payments = screen.getByRole('region', { name: 'Pagos registrados' })
    const rows = within(within(payments).getByRole('table')).getAllByRole('row').slice(1)
    expect(rows.map((row) => row.textContent)).toEqual(['12/10/2026Caja General$ 50.000', '08/10/2026Bancolombia$ 150.000'])
    expect(within(payments).queryByText(/Método/)).not.toBeInTheDocument()

    expect(summaryValue('Subtotal')).toBe('$ 502.469')
    expect(summaryValue('IVA')).toBe('$ 95.469')
    expect(summaryValue('Total')).toBe('$ 597.938')
    // Pagado (total menos saldo) coincide con la suma de los pagos: 150.000 + 50.000.
    expect(summaryValue('Pagado')).toBe('$ 200.000')
    expect(summaryValue('Saldo pendiente')).toBe('$ 397.938')
    expect(calls(fetchMock, 'GET', '/api/treasury/movements')[0]?.[0]).toBe(
      '/api/treasury/movements?purchaseId=5&category=PAGO_COMPRA',
    )
  })

  it('contado pagado: pago realizado, metodo y solo Anular', async () => {
    mockApi(
      routes({
        'GET /api/purchases/5': () =>
          jsonResponse(purchase(5, { paymentType: 'CONTADO', dueDate: null, paymentMethod: 'CHEQUE', status: 'PAGADA', pendingBalance: 0 })),
        'GET /api/treasury/movements': () => jsonResponse([movement(3, '2026-10-05', 597938.28)]),
      }),
    )
    renderRoute('/compras/5')

    expect(await screen.findByText('Pagada')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar pago' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anular' })).toBeInTheDocument()
    const data = screen.getByRole('region', { name: 'Datos de la factura' })
    expect(within(data).getByText('Cheque')).toBeInTheDocument()
    expect(within(data).getByText('Vence').nextElementSibling).toHaveTextContent(EMPTY_VALUE)
    const paid = screen.getByRole('region', { name: 'Pago realizado' })
    expect(await within(paid).findAllByText('$ 597.938')).not.toHaveLength(0)
    expect(summaryValue('Pagado')).toBe('$ 597.938')
    expect(summaryValue('Saldo pendiente')).toBe('$ 0')
  })

  it('anulada: solo lectura, sin botones', async () => {
    mockApi(
      routes({
        'GET /api/purchases/5': () => jsonResponse(purchase(5, { status: 'ANULADA', pendingBalance: 0 })),
        'GET /api/treasury/movements': () => jsonResponse([]),
      }),
    )
    renderRoute('/compras/5')

    expect(await screen.findByText('Anulada')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar pago' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Anular' })).not.toBeInTheDocument()
    expect(screen.getByText(/Está en la papelera/)).toBeInTheDocument()
    expect(await screen.findByText('La factura está anulada: sus pagos se revirtieron.')).toBeInTheDocument()
    expect(summaryValue('Pagado')).toBe(EMPTY_VALUE)
    expect(summaryValue('Saldo pendiente')).toBe(EMPTY_VALUE)
  })

  it('credito sin pagos muestra el vacio', async () => {
    mockApi(routes({ 'GET /api/treasury/movements': () => jsonResponse([]) }))
    renderRoute('/compras/5')

    expect(await screen.findByText('Aún no hay pagos. Regístralos con Registrar pago.')).toBeInTheDocument()
  })

  it('una factura que no existe o un id no numerico muestran Factura no encontrada', async () => {
    const fetchMock = mockApi(routes())
    renderRoute('/compras/999')
    expect(await screen.findByRole('heading', { name: 'Factura no encontrada' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a Facturas de compra' })).toHaveAttribute('href', '/compras')

    renderRoute('/compras/abc')
    expect(await screen.findAllByRole('heading', { name: 'Factura no encontrada' })).toHaveLength(2)
    expect(calls(fetchMock, 'GET', '/api/purchases/abc')).toHaveLength(0)
  })

  it('carga con skeleton, y cada bloque falla y se reintenta por separado', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})))
    renderRoute('/compras/5')
    await waitFor(() => expect(document.querySelector('main [aria-busy]')).not.toBeNull())

    let purchaseCalls = 0
    let movementCalls = 0
    mockApi(
      routes({
        'GET /api/purchases/5': () => {
          purchaseCalls += 1
          return purchaseCalls === 1 ? jsonResponse({ error: 'Error interno', status: 500 }, 500) : jsonResponse(purchase(5))
        },
        'GET /api/treasury/movements': () => {
          movementCalls += 1
          return movementCalls === 1 ? jsonResponse({ error: 'Error interno', status: 500 }, 500) : jsonResponse([])
        },
      }),
    )
    renderRoute('/compras/5')
    const user = userEvent.setup()

    await user.click(within(await screen.findByRole('alert')).getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('heading', { name: 'IA-777' })).toBeInTheDocument()
    const payments = screen.getByRole('region', { name: 'Pagos registrados' })
    await user.click(await within(payments).findByRole('button', { name: 'Reintentar' }))
    expect(await within(payments).findByText(/Aún no hay pagos/)).toBeInTheDocument()
    expect(summaryValue('Saldo pendiente')).toBe('$ 397.938')
  })

  it('registra un pago: valores por defecto en Bogota, validaciones, saldo de la cuenta y cuerpo exacto', async () => {
    vi.setSystemTime(new Date('2026-10-19T03:00:00Z'))
    saveToken(validToken())
    let purchaseCalls = 0
    const fetchMock = mockApi(
      routes({
        'GET /api/purchases/5': () => {
          purchaseCalls += 1
          return jsonResponse(purchaseCalls === 1 ? purchase(5) : purchase(5, { pendingBalance: 97938.28 }))
        },
        'POST /api/purchases/5/payments': () => jsonResponse(movement(9, '2026-10-18', 300000, 2, 'Caja General'), 201),
      }),
    )
    renderRoute('/compras/5')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Registrar pago' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar pago' })
    expect(within(dialog).getByText('IA-777 · Importadora Andina SAS')).toBeInTheDocument()
    expect(within(dialog).getByText('$ 397.938')).toBeInTheDocument()
    const account = await within(dialog).findByLabelText('Cuenta')
    expect(account).toHaveValue('2')
    expect(within(account).getByRole('option', { name: 'Caja General · $ 300.000' })).toBeInTheDocument()
    expect(within(dialog).queryByLabelText(/Método/)).not.toBeInTheDocument()
    const amount = within(dialog).getByLabelText('Valor del pago')
    const date = within(dialog).getByLabelText('Fecha')
    expect(amount).toHaveValue(397938.28)
    expect(date).toHaveValue('2026-10-18')
    expect(date).toHaveAttribute('min', '2026-10-05')
    expect(date).toHaveAttribute('max', '2026-10-18')
    const save = within(dialog).getByRole('button', { name: 'Registrar pago' })

    // El saldo pendiente (397.938) supera los 300.000 de Caja General.
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'Saldo insuficiente en Caja General: disponible $ 300.000, necesitas $ 397.938',
    )
    expect(save).toBeDisabled()

    await user.clear(amount)
    await user.type(amount, '0')
    expect(within(dialog).getByText('El valor debe ser mayor que cero.')).toBeInTheDocument()
    expect(save).toBeDisabled()
    await user.clear(amount)
    await user.type(amount, '400000')
    expect(within(dialog).getByText('No puede superar el saldo pendiente de $ 397.938')).toBeInTheDocument()
    await user.clear(amount)
    await user.type(amount, '300001')
    expect(within(dialog).getByText(/Saldo insuficiente en Caja General/)).toBeInTheDocument()
    expect(save).toBeDisabled()
    await user.clear(amount)
    await user.type(amount, '300000')
    expect(within(dialog).queryByText(/Saldo insuficiente/)).not.toBeInTheDocument()
    fireEvent.change(date, { target: { value: '2026-10-04' } })
    expect(within(dialog).getByText('La fecha debe estar entre el 05/10/2026 y el 18/10/2026.')).toBeInTheDocument()
    expect(save).toBeDisabled()
    fireEvent.change(date, { target: { value: '2026-10-18' } })
    expect(save).toBeEnabled()

    await user.dblClick(save)

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const posts = calls(fetchMock, 'POST', '/api/purchases/5/payments')
    expect(posts).toHaveLength(1)
    expect(JSON.parse(String(posts[0]?.[1]?.body))).toEqual({ accountId: 2, amount: 300000, date: '2026-10-18' })
    expect(await screen.findByText('Pago registrado')).toBeInTheDocument()
    await waitFor(() => expect(summaryValue('Saldo pendiente')).toBe('$ 97.938'))
  })

  it('un 409 de saldo queda en el modal sin perder lo digitado y refresca cuentas y factura', async () => {
    let purchaseCalls = 0
    const fetchMock = mockApi(
      routes({
        'GET /api/purchases/5': () => {
          purchaseCalls += 1
          return jsonResponse(purchase(5))
        },
        'POST /api/purchases/5/payments': () =>
          jsonResponse({ error: 'Saldo insuficiente en Bancolombia: hay 1000.0 y se requieren 250000.0', status: 409 }, 409),
      }),
    )
    renderRoute('/compras/5')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Registrar pago' }))
    const dialog = screen.getByRole('dialog')
    await user.selectOptions(await within(dialog).findByLabelText('Cuenta'), '1')
    const amount = within(dialog).getByLabelText('Valor del pago')
    await user.clear(amount)
    await user.type(amount, '250000')
    const accountCalls = calls(fetchMock, 'GET', '/api/treasury/accounts').length
    await user.click(within(dialog).getByRole('button', { name: 'Registrar pago' }))

    expect(await within(dialog).findByText('Saldo insuficiente en Bancolombia: hay 1000.0 y se requieren 250000.0')).toBeInTheDocument()
    expect(within(dialog).getByText('No pudimos registrar el pago')).toBeInTheDocument()
    expect(amount).toHaveValue(250000)
    expect(within(dialog).getByLabelText('Cuenta')).toHaveValue('1')
    await waitFor(() => expect(calls(fetchMock, 'GET', '/api/treasury/accounts').length).toBeGreaterThan(accountCalls))
    await waitFor(() => expect(purchaseCalls).toBeGreaterThan(1))
  })

  it('si la factura cambio en otra pestana, el 400 se muestra y los datos se refrescan', async () => {
    let paidElsewhere = false
    mockApi(
      routes({
        'GET /api/purchases/5': () =>
          jsonResponse(paidElsewhere ? purchase(5, { status: 'PAGADA', pendingBalance: 0 }) : purchase(5)),
        'POST /api/purchases/5/payments': () => {
          paidElsewhere = true
          return jsonResponse({ error: 'Solo se puede pagar una compra PENDIENTE, y esta esta PAGADA', status: 400 }, 400)
        },
      }),
    )
    renderRoute('/compras/5')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Registrar pago' }))
    const dialog = screen.getByRole('dialog')
    await user.selectOptions(await within(dialog).findByLabelText('Cuenta'), '1')
    await user.click(within(dialog).getByRole('button', { name: 'Registrar pago' }))

    expect(await within(dialog).findByText('Solo se puede pagar una compra PENDIENTE, y esta esta PAGADA')).toBeInTheDocument()
    expect(await screen.findByText('Pagada')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar pago' })).not.toBeInTheDocument()
  })

  it('al saldar la factura pasa a Pagada y desaparece Registrar pago', async () => {
    let paid = false
    mockApi(
      routes({
        'GET /api/purchases/5': () => jsonResponse(paid ? purchase(5, { status: 'PAGADA', pendingBalance: 0 }) : purchase(5)),
        'POST /api/purchases/5/payments': () => {
          paid = true
          return jsonResponse(movement(9, '2026-10-22', 397938.28), 201)
        },
      }),
    )
    renderRoute('/compras/5')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Registrar pago' }))
    const dialog = screen.getByRole('dialog')
    await user.selectOptions(await within(dialog).findByLabelText('Cuenta'), '1')
    await user.click(within(dialog).getByRole('button', { name: 'Registrar pago' }))

    expect(await screen.findByText('Pagada')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar pago' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anular' })).toBeInTheDocument()
  })

  it('anular: texto verificado, foco en Cancelar, confirma una sola vez y vuelve al listado', async () => {
    const fetchMock = mockApi(
      routes({ 'POST /api/purchases/5/annul': () => jsonResponse(purchase(5, { status: 'ANULADA', pendingBalance: 0 })) }),
    )
    const router = renderRoute('/compras/5')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Anular' }))
    let dialog = screen.getByRole('dialog', { name: 'Anular factura IA-777' })
    expect(within(dialog).getByText(/pasa a la papelera/)).toHaveTextContent(
      'Se descuentan del inventario las unidades que sumó esta compra y se revierten en las cuentas los pagos registrados. Puedes recuperarla desde la Papelera.',
    )
    expect(within(dialog).getByText(/El costo de los productos no vuelve al anterior/)).toHaveTextContent(
      'Si parte de esas unidades ya se vendió, no se puede anular.',
    )
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    expect(within(dialog).getByRole('button', { name: 'Anular factura' })).toHaveClass('bg-danger')
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Anular' }))
    dialog = screen.getByRole('dialog')
    await user.dblClick(within(dialog).getByRole('button', { name: 'Anular factura' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/compras'))
    expect(calls(fetchMock, 'POST', '/api/purchases/5/annul')).toHaveLength(1)
    expect(await screen.findByText('Factura IA-777 anulada')).toBeInTheDocument()
  })

  it('si anular falla por stock vendido, el mensaje queda en el modal', async () => {
    mockApi(
      routes({
        'POST /api/purchases/5/annul': () =>
          jsonResponse(
            {
              error:
                'No se puede anular la compra IA-777: de Bateria 12V quedan 1 unidades y habria que quitar 2. Parte de ese stock ya se vendio.',
              status: 400,
            },
            400,
          ),
      }),
    )
    const router = renderRoute('/compras/5')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Anular' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Anular factura' }))

    expect(await within(dialog).findByText(/Parte de ese stock ya se vendio/)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/compras/5')
  })

  it('Ver detalle del listado abre la factura y atras vuelve con los filtros', async () => {
    mockApi(routes({ 'GET /api/purchases': () => jsonResponse([purchase(5)]) }))
    const router = renderRoute('/compras?estado=PENDIENTE&periodo=todas')
    const user = userEvent.setup()

    const [link] = await screen.findAllByRole('link', { name: 'Ver detalle' })
    expect(link).toHaveAttribute('href', '/compras/5')
    await user.click(link as HTMLElement)
    expect(await screen.findByRole('heading', { name: 'IA-777' })).toBeInTheDocument()

    await router.navigate(-1)
    await waitFor(() => expect(router.state.location.search).toBe('?estado=PENDIENTE&periodo=todas'))
    expect(await screen.findByLabelText('Estado')).toHaveValue('PENDIENTE')
  })
})
