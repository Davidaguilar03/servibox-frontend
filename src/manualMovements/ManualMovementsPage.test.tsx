import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { saveToken } from '../auth/session'
import { EMPTY_VALUE } from '../lib/format'
import { emptyStateOf, jsonResponse, primaryActions, renderRoute, validToken } from '../test/utils'

type Handler = (url: URL, body: unknown) => Response | Promise<Response>
type Routes = Record<string, Handler>

const accounts = [
  { id: 2, name: 'Bancolombia', type: 'BANCO', currentBalance: 500000, initialBalance: 0 },
  { id: 1, name: 'Caja General', type: 'EFECTIVO', currentBalance: 100000, initialBalance: 0 },
]

const movement = (id: number, fields: Record<string, unknown> = {}) => ({
  id,
  accountId: 1,
  accountName: 'Caja General',
  type: 'EGRESO',
  category: 'GASTO_OPERATIVO',
  concept: `Gasto ${id}`,
  amount: 1000,
  date: '2026-10-10',
  notes: null,
  saleId: null,
  purchaseId: null,
  relatedMovementId: null,
  ...fields,
})

const expenses = [
  movement(1, { concept: 'Pago de energía', amount: 80000, date: '2026-10-05', notes: 'Factura de octubre' }),
  movement(2, { concept: 'Arriendo del local', amount: 450000, date: '2026-10-08', accountId: 2, accountName: 'Bancolombia' }),
]

const incomes = [
  movement(7, { type: 'INGRESO', category: 'INGRESO_OCASIONAL', concept: 'Venta de chatarra', amount: 180000, date: '2026-10-09' }),
]

function routes(list: unknown[], extra: Routes = {}): Routes {
  return {
    'GET /api/treasury/accounts': () => jsonResponse(accounts),
    'GET /api/treasury/movements': () => jsonResponse(list),
    ...extra,
  }
}

function mockApi(table: Routes) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const parsed = new URL(url, 'http://localhost')
    const handler =
      table[`${init?.method ?? 'GET'} ${parsed.pathname}`] ??
      table[`${init?.method ?? 'GET'} ${parsed.pathname.replace(/\d+$/, ':id')}`]
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    return Promise.resolve(handler ? handler(parsed, body) : jsonResponse({ error: 'Recurso no encontrado', status: 404 }, 404))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const requests = (fetchMock: ReturnType<typeof mockApi>, method: string, prefix: string) =>
  fetchMock.mock.calls
    .filter(([url, init]) => (init?.method ?? 'GET') === method && url.startsWith(prefix))
    .map(([url, init]) => ({ url, body: typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined }))

const table = () => screen.getByRole('table')
const rowsText = () => within(table()).getAllByRole('row').slice(1).map((row) => row.textContent)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-19T15:00:00Z'))
  saveToken(validToken())
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Gastos operativos', () => {
  it('pide la categoria y el periodo, y muestra indicadores y montos con signo', async () => {
    const fetchMock = mockApi(routes(expenses))
    renderRoute('/compras/gastos')

    expect(await screen.findByRole('heading', { level: 1, name: 'Gastos operativos' })).toBeInTheDocument()
    await screen.findAllByText('Arriendo del local')
    expect(requests(fetchMock, 'GET', '/api/treasury/movements')[0]?.url).toBe(
      '/api/treasury/movements?category=GASTO_OPERATIVO&desde=2026-10-01&hasta=2026-10-19',
    )
    expect(rowsText()[0]).toContain('08/10/2026')
    expect(rowsText()[0]).toContain('-$ 450.000')
    expect(screen.getAllByText('-$ 80.000')[0]).toHaveClass('text-error')
    expect(rowsText()[0]).toContain(EMPTY_VALUE)
    expect(rowsText()[1]).toContain('Factura de octubre')
    expect(screen.getByText('Total del período').parentElement).toHaveTextContent('$ 530.000')
    expect(screen.getByText('Movimientos').parentElement).toHaveTextContent('2')
    expect(screen.getByRole('navigation', { name: 'Miga de pan' })).toHaveTextContent('Compras/Gastos operativos')
    expect(screen.getByRole('link', { name: 'Volver a Facturas de compra' })).toHaveAttribute('href', '/compras')
  })

  it('filtra por cuenta y concepto en la URL y recalcula los indicadores', async () => {
    mockApi(routes(expenses))
    const router = renderRoute('/compras/gastos')
    await screen.findAllByText('Arriendo del local')

    fireEvent.change(screen.getByLabelText('Cuenta'), { target: { value: '2' } })
    await waitFor(() => expect(router.state.location.search).toBe('?cuenta=2'))
    expect(rowsText()).toHaveLength(1)
    expect(screen.getByText('Total del período').parentElement).toHaveTextContent('$ 450.000')

    fireEvent.change(screen.getByLabelText('Cuenta'), { target: { value: '' } })
    const search = screen.getByLabelText('Buscar')
    fireEvent.change(search, { target: { value: 'ENERGIA' } })
    fireEvent.blur(search)
    await waitFor(() => expect(router.state.location.search).toBe('?q=ENERGIA'))
    expect(rowsText()).toHaveLength(1)
    expect(rowsText()[0]).toContain('Pago de energía')
  })

  it('Todas no manda fechas y Personalizado pide el rango', async () => {
    const fetchMock = mockApi(routes(expenses))
    const router = renderRoute('/compras/gastos?periodo=todas')
    await screen.findAllByText('Arriendo del local')
    expect(requests(fetchMock, 'GET', '/api/treasury/movements')[0]?.url).toBe('/api/treasury/movements?category=GASTO_OPERATIVO')

    fireEvent.change(screen.getByLabelText('Período'), { target: { value: 'personalizado' } })
    expect(await screen.findByText('Elige un período válido para ver los movimientos.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-09-01' } })
    await waitFor(() => expect(router.state.location.search).toBe('?periodo=personalizado&desde=2026-09-01'))
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-09-30' } })
    await waitFor(() =>
      expect(requests(fetchMock, 'GET', '/api/treasury/movements').map((r) => r.url)).toContain(
        '/api/treasury/movements?category=GASTO_OPERATIVO&desde=2026-09-01&hasta=2026-09-30',
      ),
    )
  })

  it('pagina de a 25 con la pagina en la URL', async () => {
    const many = Array.from({ length: 30 }, (_, index) => movement(index + 1, { date: '2026-10-10' }))
    mockApi(routes(many))
    const router = renderRoute('/compras/gastos')
    await screen.findAllByText('Gasto 30')

    expect(rowsText()).toHaveLength(25)
    expect(screen.getByText('1 a 25 de 30 movimientos')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Página 2' }))
    expect(router.state.location.search).toBe('?pagina=2')
    expect(rowsText()).toHaveLength(5)
  })

  it('vacio sin filtros invita a crear', async () => {
    mockApi(routes([]))
    renderRoute('/compras/gastos')

    expect(await screen.findByText('No hay gastos registrados')).toBeInTheDocument()
    const section = screen.getByRole('region', { name: 'Gastos operativos' })
    expect(within(section).getByRole('button', { name: 'Nuevo gasto' })).toBeInTheDocument()
  })

  it('vacio: el unico primario es Nuevo gasto del encabezado', async () => {
    mockApi(routes([]))
    renderRoute('/compras/gastos')

    expect(await screen.findByText('No hay gastos registrados')).toBeInTheDocument()
    const [primary, ...rest] = primaryActions()
    expect(rest).toHaveLength(0)
    expect(primary).toHaveTextContent('Nuevo gasto')
    expect(emptyStateOf('No hay gastos registrados')).not.toContainElement(primary ?? null)
    expect(within(emptyStateOf('No hay gastos registrados')).getByRole('button', { name: 'Nuevo gasto' })).toHaveAttribute('data-variant', 'secondary')
  })

  it('vacio por filtros ofrece limpiarlos', async () => {
    mockApi(routes(expenses))
    const router = renderRoute('/compras/gastos?q=zzz')

    expect(await screen.findByText('No hay gastos con esos filtros.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(router.state.location.search).toBe('')
    expect(await screen.findAllByText('Arriendo del local')).not.toHaveLength(0)
  })

  it('un error en los movimientos no tumba las cuentas, y al reves', async () => {
    mockApi(routes(expenses, { 'GET /api/treasury/movements': () => jsonResponse({ error: 'x', status: 500 }, 500) }))
    renderRoute('/compras/gastos')

    expect(await screen.findByText('No pudimos cargar los movimientos.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('Cuenta')).toBeEnabled())
    expect(screen.getByRole('option', { name: 'Bancolombia' })).toBeInTheDocument()
  })

  it('si fallan las cuentas la tabla sigue y se puede reintentar', async () => {
    mockApi(routes(expenses, { 'GET /api/treasury/accounts': () => jsonResponse({ error: 'x', status: 500 }, 500) }))
    renderRoute('/compras/gastos')

    expect(await screen.findByText('No pudimos cargar las cuentas.')).toBeInTheDocument()
    expect(screen.getAllByText('Arriendo del local')).not.toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('alta: valida, preselecciona efectivo, avisa el saldo sin bloquear y envia el cuerpo exacto', async () => {
    const user = userEvent.setup()
    const fetchMock = mockApi(
      routes(expenses, { 'POST /api/treasury/movements': (_, body) => jsonResponse({ id: 9, ...(body as object) }, 201) }),
    )
    renderRoute('/compras/gastos')
    await screen.findAllByText('Arriendo del local')

    await user.click(screen.getByRole('button', { name: 'Nuevo gasto' }))
    const dialog = screen.getByRole('dialog', { name: 'Nuevo gasto' })
    expect(within(dialog).getByLabelText('Concepto')).toHaveFocus()
    expect(within(dialog).getByLabelText('Cuenta')).toHaveValue('1')
    expect(within(dialog).getByLabelText('Fecha')).toHaveValue('2026-10-19')
    expect(within(dialog).getByLabelText('Fecha')).toHaveAttribute('max', '2026-10-19')

    await user.click(within(dialog).getByRole('button', { name: 'Guardar gasto' }))
    expect(within(dialog).getByText('Escribe el concepto.')).toBeInTheDocument()
    expect(within(dialog).getByText('Escribe el monto.')).toBeInTheDocument()
    expect(requests(fetchMock, 'POST', '/api/treasury/movements')).toHaveLength(0)

    await user.type(within(dialog).getByLabelText('Concepto'), 'Pago de agua')
    await user.type(within(dialog).getByLabelText('Monto'), '100000')
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
    await user.type(within(dialog).getByLabelText('Monto'), '1')
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'Saldo insuficiente en Caja General: disponible $ 100.000, necesitas $ 1.000.001',
    )
    await user.clear(within(dialog).getByLabelText('Monto'))
    await user.type(within(dialog).getByLabelText('Monto'), '150000')
    await user.type(within(dialog).getByLabelText('Observaciones (opcional)'), 'Recibo 44')
    const save = within(dialog).getByRole('button', { name: 'Guardar gasto' })
    expect(save).toBeEnabled()
    const before = requests(fetchMock, 'GET', '/api/treasury/movements').length

    await user.click(save)

    expect(await screen.findByText('Gasto registrado')).toBeInTheDocument()
    expect(requests(fetchMock, 'POST', '/api/treasury/movements')).toEqual([
      {
        url: '/api/treasury/movements',
        body: { accountId: 1, category: 'GASTO_OPERATIVO', concept: 'Pago de agua', amount: 150000, date: '2026-10-19', notes: 'Recibo 44' },
      },
    ])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(requests(fetchMock, 'GET', '/api/treasury/movements').length).toBeGreaterThan(before))
  })

  it('un error del backend queda en el modal sin perder lo digitado y no se envia dos veces', async () => {
    const user = userEvent.setup()
    let answer: (response: Response) => void = () => {}
    const fetchMock = mockApi(
      routes(expenses, { 'POST /api/treasury/movements': () => new Promise<Response>((done) => (answer = done)) }),
    )
    renderRoute('/compras/gastos')
    await screen.findAllByText('Arriendo del local')
    await user.click(screen.getByRole('button', { name: 'Nuevo gasto' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Concepto'), 'Pago de agua')
    await user.type(within(dialog).getByLabelText('Monto'), '5000')

    await user.dblClick(within(dialog).getByRole('button', { name: 'Guardar gasto' }))
    expect(within(dialog).getByRole('button', { name: 'Guardando…' })).toBeDisabled()
    expect(requests(fetchMock, 'POST', '/api/treasury/movements')).toHaveLength(1)
    answer(jsonResponse({ error: 'Cuenta no encontrada: 1', status: 400 }, 400))

    expect(await within(dialog).findByText('Cuenta no encontrada: 1')).toBeInTheDocument()
    expect(within(dialog).getByText('No pudimos registrar el gasto')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Concepto')).toHaveValue('Pago de agua')
  })

  it('con datos digitados, Esc pide descartar', async () => {
    const user = userEvent.setup()
    mockApi(routes(expenses))
    renderRoute('/compras/gastos')
    await screen.findAllByText('Arriendo del local')
    await user.click(screen.getByRole('button', { name: 'Nuevo gasto' }))
    await user.type(screen.getByLabelText('Concepto'), 'Pago')

    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog', { name: 'Descartar cambios' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(screen.getByLabelText('Concepto')).toHaveValue('Pago')

    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Descartar cambios' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('editar precarga el movimiento y envia el PUT completo', async () => {
    const user = userEvent.setup()
    const fetchMock = mockApi(
      routes(expenses, { 'PUT /api/treasury/movements/:id': (_, body) => jsonResponse({ id: 1, ...(body as object) }) }),
    )
    renderRoute('/compras/gastos')
    await screen.findAllByText('Arriendo del local')

    await user.click(screen.getAllByRole('button', { name: 'Editar gasto Pago de energía' })[0]!)
    const dialog = screen.getByRole('dialog', { name: 'Editar gasto' })
    expect(within(dialog).getByLabelText('Concepto')).toHaveValue('Pago de energía')
    expect(within(dialog).getByLabelText('Fecha')).toHaveValue('2026-10-05')
    expect(within(dialog).getByLabelText('Cuenta')).toHaveValue('1')
    expect(within(dialog).getByLabelText('Monto')).toHaveValue('80000')
    expect(within(dialog).getByLabelText('Observaciones (opcional)')).toHaveValue('Factura de octubre')
    // Ya salieron 80.000 de la caja: con el saldo de 100.000 caben 180.000.
    await user.clear(within(dialog).getByLabelText('Monto'))
    await user.type(within(dialog).getByLabelText('Monto'), '180000')
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
    await user.selectOptions(within(dialog).getByLabelText('Cuenta'), '2')

    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Cambios guardados')).toBeInTheDocument()
    expect(requests(fetchMock, 'PUT', '/api/treasury/movements/1')).toEqual([
      {
        url: '/api/treasury/movements/1',
        body: { accountId: 2, category: 'GASTO_OPERATIVO', concept: 'Pago de energía', amount: 180000, date: '2026-10-05', notes: 'Factura de octubre' },
      },
    ])
  })

  it('eliminar: foco en Cancelar, el saldo que queda y DELETE', async () => {
    const user = userEvent.setup()
    const fetchMock = mockApi(routes(expenses, { 'DELETE /api/treasury/movements/:id': () => new Response(null, { status: 204 }) }))
    renderRoute('/compras/gastos')
    await screen.findAllByText('Arriendo del local')

    await user.click(screen.getAllByRole('button', { name: 'Eliminar gasto Pago de energía' })[0]!)
    const dialog = screen.getByRole('dialog', { name: 'Eliminar gasto' })
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    expect(dialog).toHaveTextContent(
      'Vas a eliminar el gasto «Pago de energía» por $ 80.000. Vuelven $ 80.000 a Caja General: su saldo pasa de $ 100.000 a $ 180.000. Esta acción no se puede deshacer.',
    )

    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByText('Registro eliminado')).toBeInTheDocument()
    expect(requests(fetchMock, 'DELETE', '/api/treasury/movements/1')).toHaveLength(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('Ingresos ocasionales', () => {
  it('pide su categoria y muestra el monto en positivo', async () => {
    const fetchMock = mockApi(routes(incomes))
    renderRoute('/ventas/ingresos')

    expect(await screen.findByRole('heading', { level: 1, name: 'Ingresos ocasionales' })).toBeInTheDocument()
    expect((await screen.findAllByText('+$ 180.000'))[0]).toHaveClass('text-success-ink')
    expect(requests(fetchMock, 'GET', '/api/treasury/movements')[0]?.url).toContain('category=INGRESO_OCASIONAL')
    expect(screen.getByRole('navigation', { name: 'Miga de pan' })).toHaveTextContent('Ventas/Ingresos ocasionales')
    expect(screen.getByRole('link', { name: 'Volver a Facturas de venta' })).toHaveAttribute('href', '/ventas')
  })

  it('vacio: el unico primario es Nuevo ingreso del encabezado', async () => {
    mockApi(routes([]))
    renderRoute('/ventas/ingresos')

    expect(await screen.findByText('No hay ingresos registrados')).toBeInTheDocument()
    const [primary, ...rest] = primaryActions()
    expect(rest).toHaveLength(0)
    expect(primary).toHaveTextContent('Nuevo ingreso')
    expect(emptyStateOf('No hay ingresos registrados')).not.toContainElement(primary ?? null)
    expect(within(emptyStateOf('No hay ingresos registrados')).getByRole('button', { name: 'Nuevo ingreso' })).toHaveAttribute('data-variant', 'secondary')
  })

  it('alta con la categoria fija y sin cuenta preseleccionada', async () => {
    const user = userEvent.setup()
    const fetchMock = mockApi(
      routes(incomes, { 'POST /api/treasury/movements': (_, body) => jsonResponse({ id: 9, ...(body as object) }, 201) }),
    )
    renderRoute('/ventas/ingresos')
    await screen.findAllByText('Venta de chatarra')

    await user.click(screen.getByRole('button', { name: 'Nuevo ingreso' }))
    const dialog = screen.getByRole('dialog', { name: 'Nuevo ingreso' })
    expect(within(dialog).getByLabelText('Cuenta')).toHaveValue('')
    await user.type(within(dialog).getByLabelText('Concepto'), 'Reintegro')
    await user.type(within(dialog).getByLabelText('Monto'), '999999999')
    await user.selectOptions(within(dialog).getByLabelText('Cuenta'), '2')
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Guardar ingreso' }))

    expect(await screen.findByText('Ingreso registrado')).toBeInTheDocument()
    expect(requests(fetchMock, 'POST', '/api/treasury/movements')[0]?.body).toEqual({
      accountId: 2,
      category: 'INGRESO_OCASIONAL',
      concept: 'Reintegro',
      amount: 999999999,
      date: '2026-10-19',
      notes: null,
    })
  })

  it('eliminar un ingreso avisa el negativo y un error queda en el modal', async () => {
    const user = userEvent.setup()
    mockApi(
      routes(incomes, {
        'DELETE /api/treasury/movements/:id': () =>
          jsonResponse({ error: 'El movimiento 7 es de categoria RECAUDO_VENTA y se gestiona desde su operacion', status: 400 }, 400),
      }),
    )
    renderRoute('/ventas/ingresos')
    await screen.findAllByText('Venta de chatarra')

    await user.click(screen.getAllByRole('button', { name: 'Eliminar ingreso Venta de chatarra' })[0]!)
    const dialog = screen.getByRole('dialog', { name: 'Eliminar ingreso' })
    expect(dialog).toHaveTextContent(
      'Se descuentan $ 180.000 de Caja General: su saldo pasa de $ 100.000 a -$ 80.000. La cuenta queda en negativo.',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

    expect(await within(dialog).findByText('El movimiento 7 es de categoria RECAUDO_VENTA y se gestiona desde su operacion')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Eliminar ingreso' })).toBeInTheDocument()
  })
})

describe('botones de los listados de facturas', () => {
  it('Facturas de compra enlaza a Gastos operativos', async () => {
    mockApi(routes(expenses, { 'GET /api/purchases': () => jsonResponse([]) }))
    const router = renderRoute('/compras')

    await userEvent.click(await screen.findByRole('link', { name: 'Gastos operativos' }))
    expect(router.state.location.pathname).toBe('/compras/gastos')
    expect(await screen.findByRole('heading', { level: 1, name: 'Gastos operativos' })).toBeInTheDocument()
  })

  it('Facturas de venta enlaza a Ingresos ocasionales', async () => {
    mockApi(routes(incomes, { 'GET /api/sales': () => jsonResponse([]) }))
    const router = renderRoute('/ventas')

    await userEvent.click(await screen.findByRole('link', { name: 'Ingresos ocasionales' }))
    expect(router.state.location.pathname).toBe('/ventas/ingresos')
    expect(await screen.findByRole('heading', { level: 1, name: 'Ingresos ocasionales' })).toBeInTheDocument()
  })
})
