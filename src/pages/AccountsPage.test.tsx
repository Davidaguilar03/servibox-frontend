import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { saveToken } from '../auth/session'
import { URL_TEXT_DEBOUNCE_MS } from '../lib/useUrlTextParam'
import { emptyStateOf, jsonResponse, primaryActions, renderRoute, validToken } from '../test/utils'

type Handler = (url: URL, body: unknown) => Response | Promise<Response>
type Routes = Record<string, Handler>

const accounts = [
  { id: 2, name: 'Bancolombia', type: 'BANCO', currentBalance: 2230650, initialBalance: 0 },
  { id: 1, name: 'Caja General', type: 'EFECTIVO', currentBalance: 1946250, initialBalance: 0 },
]

const movement = (id: number, fields: Record<string, unknown>) => ({
  id,
  accountId: 1,
  accountName: 'Caja General',
  type: 'INGRESO',
  category: 'INGRESO_OCASIONAL',
  concept: `Movimiento ${id}`,
  amount: 1000,
  date: '2026-10-10',
  notes: null,
  saleId: null,
  purchaseId: null,
  relatedMovementId: null,
  ...fields,
})

const october = [
  movement(1, { category: 'RECAUDO_VENTA', concept: 'Venta de contado', amount: 160650, saleId: 31, date: '2026-10-05' }),
  movement(2, { type: 'EGRESO', category: 'GASTO_OPERATIVO', concept: 'Arriendo', amount: 450000, date: '2026-10-08' }),
  movement(3, { type: 'EGRESO', category: 'TRANSFERENCIA', concept: 'Transferencia a Bancolombia', amount: 300000, date: '2026-10-09' }),
  movement(4, {
    accountId: 2,
    accountName: 'Bancolombia',
    category: 'TRANSFERENCIA',
    concept: 'Transferencia desde Caja General',
    amount: 300000,
    date: '2026-10-09',
    relatedMovementId: 3,
  }),
  movement(5, { accountId: 2, accountName: 'Bancolombia', type: 'EGRESO', category: 'PAGO_COMPRA', concept: 'Compra', amount: 357000, purchaseId: 7, date: '2026-10-12' }),
]

function fullRoutes(list: unknown[] = october): Routes {
  return {
    'GET /api/treasury/accounts': () => jsonResponse(accounts),
    'GET /api/treasury/balance': () => jsonResponse({ total: 4176900 }),
    'GET /api/treasury/movements': () => jsonResponse(list),
    'GET /api/sales': () => jsonResponse([{ id: 31, invoiceNumber: 'FV-0003' }]),
    'GET /api/purchases': () => jsonResponse([{ id: 7, invoiceNumber: 'PROV-1001' }]),
    'POST /api/treasury/accounts': (_, body) => jsonResponse({ id: 9, currentBalance: 0, ...(body as object) }, 201),
    'POST /api/treasury/transfers': () => jsonResponse({ outgoingMovementId: 10, incomingMovementId: 11 }, 201),
    'GET /api/reporting/export': () =>
      new Response(new Blob(['xlsx']), {
        status: 200,
        headers: { 'Content-Disposition': 'attachment; filename="movimientos-cuentas_2026-10-01_2026-10-18.xlsx"' },
      }),
  }
}

function mockApi(routes: Routes) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const parsed = new URL(url, 'http://localhost')
    const handler = routes[`${init?.method ?? 'GET'} ${parsed.pathname}`]
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    return Promise.resolve(handler ? handler(parsed, body) : jsonResponse({ error: 'Recurso no encontrado', status: 404 }, 404))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const calls = (fetchMock: ReturnType<typeof mockApi>, prefix: string) =>
  fetchMock.mock.calls.map(([url]) => url).filter((url) => url.startsWith(prefix))

const posts = (fetchMock: ReturnType<typeof mockApi>, path: string) =>
  fetchMock.mock.calls
    .filter(([url, init]) => url === path && init?.method === 'POST')
    .map(([, init]) => JSON.parse(String(init?.body)) as Record<string, unknown>)

function rows() {
  return within(screen.getByRole('table'))
    .getAllByRole('row')
    .slice(1)
    .map((row) => [...row.querySelectorAll('td')].map((cell) => cell.textContent))
}

function total(label: string) {
  return screen.getByText(label).nextElementSibling?.textContent
}

async function setup(path = '/cuentas', routes: Routes = fullRoutes()) {
  const fetchMock = mockApi(routes)
  const user = userEvent.setup()
  const router = renderRoute(path)
  await screen.findByRole('heading', { name: 'Cuentas' })
  return { fetchMock, user, router }
}

describe('cuentas', () => {
  beforeEach(() => {
    // 03:00 UTC del 19 es el 18 de octubre en Bogota.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-19T03:00:00Z'))
    saveToken(validToken())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('selecciona la caja, pide el mes en Bogota y muestra totales y movimientos con origen', async () => {
    const { fetchMock } = await setup()

    const group = await screen.findByRole('group', { name: 'Cuentas' })
    expect(await within(group).findByRole('button', { name: /Caja General/ })).toHaveAttribute('aria-pressed', 'true')
    expect(within(group).getByRole('button', { name: /Todas las cuentas/ })).toHaveTextContent('$ 4.176.900')
    expect(within(screen.getByRole('banner')).getByRole('navigation', { name: 'Miga de pan' })).toHaveTextContent('Cuentas/Caja General')
    expect(screen.getByRole('heading', { name: 'Caja General · Este mes' })).toBeInTheDocument()
    expect(calls(fetchMock, '/api/treasury/movements')).toEqual(['/api/treasury/movements?desde=2026-10-01&hasta=2026-10-18'])

    await waitFor(() => expect(total('Ingresos del período')).toBe('$ 160.650'))
    expect(total('Egresos del período')).toBe('$ 750.000')
    await waitFor(() =>
      expect(rows()).toEqual([
        ['09/10/2026', 'Egreso', 'Transferencia a Bancolombia', 'TRANSFERENCIA a Bancolombia', '-$ 300.000'],
        ['08/10/2026', 'Egreso', 'Arriendo', 'GASTO OPERATIVO', '-$ 450.000'],
        ['05/10/2026', 'Ingreso', 'Venta de contado', 'VENTA FV-0003', '+$ 160.650'],
      ]),
    )
  })

  it('Todas las cuentas suma todo y agrega la columna Cuenta; la cuenta va en la URL', async () => {
    const { user, router } = await setup()
    await user.click(await screen.findByRole('button', { name: /Todas las cuentas/ }))

    expect(router.state.location.search).toBe('?cuenta=todas')
    expect(total('Ingresos del período')).toBe('$ 460.650')
    expect(total('Egresos del período')).toBe('$ 1.107.000')
    await waitFor(() => expect(rows()[0]).toEqual(['12/10/2026', 'Bancolombia', 'Egreso', 'Compra', 'COMPRA PROV-1001', '-$ 357.000']))
    expect(rows()[1]).toEqual(['09/10/2026', 'Bancolombia', 'Ingreso', 'Transferencia desde Caja General', 'TRANSFERENCIA desde Caja General', '+$ 300.000'])

    await user.click(screen.getByRole('button', { name: /Bancolombia/ }))
    expect(router.state.location.search).toBe('?cuenta=2')
    expect(screen.getByRole('heading', { name: 'Bancolombia · Este mes' })).toBeInTheDocument()
  })

  it('cambiar el periodo cambia la consulta y la URL; personalizado invalido no consulta', async () => {
    const { fetchMock, user, router } = await setup()
    await screen.findByRole('table')

    await user.click(within(screen.getByRole('group', { name: 'Período' })).getByRole('button', { name: 'Esta semana' }))
    expect(router.state.location.search).toBe('?periodo=esta-semana')
    await waitFor(() => expect(calls(fetchMock, '/api/treasury/movements')).toContain('/api/treasury/movements?desde=2026-10-12&hasta=2026-10-18'))

    await user.click(screen.getByRole('button', { name: 'Personalizado' }))
    expect(router.state.location.search).toBe('?periodo=personalizado&desde=2026-10-12&hasta=2026-10-18')

    const before = calls(fetchMock, '/api/treasury/movements').length
    await router.navigate('/cuentas?periodo=personalizado&desde=2026-10-15&hasta=2026-10-01')
    expect(await screen.findByText('Hasta no puede ser anterior a Desde.')).toBeInTheDocument()
    expect(screen.getByText('Corrige el período para ver los movimientos.')).toBeInTheDocument()
    expect(calls(fetchMock, '/api/treasury/movements')).toHaveLength(before)
    expect(screen.getByRole('button', { name: 'Exportar a Excel' })).toBeDisabled()
  })

  it('las fechas personalizadas se escriben en la URL tras la espera, reemplazando la entrada', async () => {
    const { router } = await setup('/cuentas?periodo=personalizado&desde=2026-10-12&hasta=2026-10-18')
    await screen.findByRole('table')

    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'], shouldAdvanceTime: true })
    const desde = screen.getByLabelText<HTMLInputElement>('Desde')
    fireEvent.change(desde, { target: { value: '2026-10-01' } })
    expect(desde).toHaveValue('2026-10-01')
    await act(() => vi.advanceTimersByTimeAsync(URL_TEXT_DEBOUNCE_MS))
    expect(router.state.location.search).toBe('?periodo=personalizado&desde=2026-10-01&hasta=2026-10-18')
    expect(router.state.historyAction).toBe('REPLACE')

    await act(() => router.navigate('/cuentas?periodo=personalizado&desde=2026-10-05&hasta=2026-10-18'))
    expect(desde).toHaveValue('2026-10-05')
  })

  it('pagina de 25 en 25 con la pagina en la URL', async () => {
    const many = Array.from({ length: 30 }, (_, index) => movement(index + 1, { date: `2026-10-${String((index % 18) + 1).padStart(2, '0')}` }))
    const { user, router } = await setup('/cuentas', fullRoutes(many))

    expect(await screen.findByText('1 a 25 de 30 movimientos')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Página 2' }))
    expect(router.state.location.search).toBe('?pagina=2')
    expect(screen.getByText('26 a 30 de 30 movimientos')).toBeInTheDocument()
    expect(rows()).toHaveLength(5)
  })

  it('si fallan las ventas, Origen queda en VENTA sin numero con un aviso', async () => {
    await setup('/cuentas', { ...fullRoutes(), 'GET /api/sales': () => jsonResponse({ error: 'Error interno', status: 500 }, 500) })

    expect(await screen.findByText(/No pudimos cargar los números de factura/)).toBeInTheDocument()
    expect(rows()[2]?.[3]).toBe('VENTA')
    expect(total('Ingresos del período')).toBe('$ 160.650')
  })

  it('sin movimientos ofrece cambiar el periodo; un error de movimientos no tumba las cuentas', async () => {
    let movementCalls = 0
    const { user } = await setup('/cuentas', {
      ...fullRoutes([]),
      'GET /api/treasury/movements': () => {
        movementCalls += 1
        return movementCalls === 1 ? jsonResponse({ error: 'Error interno', status: 500 }, 500) : jsonResponse([])
      },
    })

    expect(await screen.findByText('No pudimos cargar los movimientos.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Caja General/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('No hay movimientos en este período.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cambiar el período' }))
    expect(screen.getByRole('button', { name: 'Este mes' })).toHaveFocus()
  })

  it('sin cuentas muestra el vacio y deshabilita la transferencia', async () => {
    await setup('/cuentas', { ...fullRoutes(), 'GET /api/treasury/accounts': () => jsonResponse([]) })

    expect(await screen.findByText('Aún no tienes cuentas. Crea la caja o el banco donde recibes el dinero.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nueva transferencia' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Nueva transferencia' })).toHaveAccessibleDescription(
      'Necesitas al menos dos cuentas para transferir.',
    )
  })

  it('sin cuentas el unico primario es Nueva cuenta del encabezado', async () => {
    await setup('/cuentas', { ...fullRoutes(), 'GET /api/treasury/accounts': () => jsonResponse([]) })

    const message = 'Aún no tienes cuentas. Crea la caja o el banco donde recibes el dinero.'
    expect(await screen.findByText(message)).toBeInTheDocument()
    const [primary, ...rest] = primaryActions()
    expect(rest).toHaveLength(0)
    expect(primary).toHaveTextContent('Nueva cuenta')
    expect(emptyStateOf(message)).not.toContainElement(primary ?? null)
    expect(within(emptyStateOf(message)).getByRole('button', { name: 'Nueva cuenta' })).toHaveAttribute('data-variant', 'secondary')
    expect(screen.getByRole('button', { name: 'Nueva transferencia' })).toHaveAttribute('data-variant', 'secondary')
    expect(screen.getByRole('button', { name: 'Nueva transferencia' })).toBeDisabled()
  })

  it('con una cuenta el primario es Nueva cuenta y la transferencia queda secundaria', async () => {
    await setup('/cuentas', { ...fullRoutes(), 'GET /api/treasury/accounts': () => jsonResponse([accounts[1]]) })

    expect(await screen.findByRole('button', { name: /Caja General/ })).toBeInTheDocument()
    const [primary, ...rest] = primaryActions()
    expect(rest).toHaveLength(0)
    expect(primary).toHaveTextContent('Nueva cuenta')
    expect(screen.getByRole('button', { name: 'Nueva transferencia' })).toHaveAttribute('data-variant', 'secondary')
    expect(screen.getByRole('button', { name: 'Nueva transferencia' })).toHaveAccessibleDescription(
      'Necesitas al menos dos cuentas para transferir.',
    )
  })

  it('con dos cuentas el primario es Nueva transferencia', async () => {
    await setup()

    expect(await screen.findByRole('button', { name: /Bancolombia/ })).toBeInTheDocument()
    const [primary, ...rest] = primaryActions()
    expect(rest).toHaveLength(0)
    expect(primary).toHaveTextContent('Nueva transferencia')
    expect(primary).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Nueva cuenta' })).toHaveAttribute('data-variant', 'secondary')
  })

  it('exporta a Excel con accountId de la cuenta y sin el con Todas', async () => {
    const createObjectURL = vi.fn(() => 'blob:x')
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }))
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    const { fetchMock, user } = await setup()
    await screen.findByRole('table')

    await user.click(screen.getByRole('button', { name: 'Exportar a Excel' }))
    expect(await screen.findByText('Reporte generado: movimientos-cuentas_2026-10-01_2026-10-18.xlsx')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Todas las cuentas/ }))
    await user.click(screen.getByRole('button', { name: 'Exportar a Excel' }))
    await waitFor(() => expect(calls(fetchMock, '/api/reporting/export')).toHaveLength(2))
    expect(calls(fetchMock, '/api/reporting/export')).toEqual([
      '/api/reporting/export?type=MOVIMIENTOS&format=XLSX&desde=2026-10-01&hasta=2026-10-18&accountId=1',
      '/api/reporting/export?type=MOVIMIENTOS&format=XLSX&desde=2026-10-01&hasta=2026-10-18',
    ])
  })

  it('un error al exportar usa el mensaje generico', async () => {
    await setup('/cuentas', {
      ...fullRoutes(),
      'GET /api/reporting/export': () => new Response('<html>Bad gateway</html>', { status: 502 }),
    })
    const user = userEvent.setup()
    await screen.findByRole('table')
    await user.click(screen.getByRole('button', { name: 'Exportar a Excel' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Algo salió mal de nuestro lado. Intenta de nuevo en unos minutos.')
  })

  it('nueva cuenta: valida, muestra el 409 bajo Nombre y envia el cuerpo exacto', async () => {
    let attempts = 0
    const { fetchMock, user, router } = await setup('/cuentas', {
      ...fullRoutes(),
      'POST /api/treasury/accounts': (_, body) => {
        attempts += 1
        return attempts === 1
          ? jsonResponse({ error: 'Ya existe una cuenta con el nombre Bancolombia', status: 409 }, 409)
          : jsonResponse({ id: 9, currentBalance: 150000, ...(body as object) }, 201)
      },
    })
    await user.click(screen.getByRole('button', { name: 'Nueva cuenta' }))
    const dialog = await screen.findByRole('dialog', { name: 'Nueva cuenta' })

    await user.click(within(dialog).getByRole('button', { name: 'Guardar cuenta' }))
    expect(within(dialog).getByText('Escribe el nombre de la cuenta.')).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText('Nombre'), 'Bancolombia')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cuenta' }))
    const name = within(dialog).getByLabelText('Nombre')
    await waitFor(() => expect(name).toHaveAccessibleDescription('Ya existe una cuenta con el nombre Bancolombia'))

    await user.clear(name)
    await user.type(name, 'Nequi')
    await user.selectOptions(within(dialog).getByLabelText('Tipo'), 'DIGITAL')
    await user.clear(within(dialog).getByLabelText('Saldo inicial'))
    await user.type(within(dialog).getByLabelText('Saldo inicial'), '150.000')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cuenta' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(posts(fetchMock, '/api/treasury/accounts')).toEqual([
      { name: 'Bancolombia', type: 'EFECTIVO', initialBalance: 0 },
      { name: 'Nequi', type: 'DIGITAL', initialBalance: 150000 },
    ])
    expect(router.state.location.search).toBe('?cuenta=9')
    expect(await screen.findByText('Cuenta creada')).toBeInTheDocument()
  })

  it('nueva cuenta con datos pide confirmar al cerrar con Esc', async () => {
    const { user } = await setup()
    await user.click(screen.getByRole('button', { name: 'Nueva cuenta' }))
    await user.type(within(await screen.findByRole('dialog')).getByLabelText('Nombre'), 'Nequi')
    await user.keyboard('{Escape}')
    const confirm = await screen.findByRole('dialog', { name: 'Descartar cambios' })
    await user.click(within(confirm).getByRole('button', { name: 'Descartar cambios' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('transferencia: cuentas distintas, monto contra saldo, cuerpo exacto y sin doble envio', async () => {
    let finish: (response: Response) => void = () => undefined
    const { fetchMock, user } = await setup('/cuentas', {
      ...fullRoutes(),
      'POST /api/treasury/transfers': () => new Promise<Response>((resolve) => (finish = resolve)),
    })
    await screen.findByRole('table')
    await user.click(screen.getByRole('button', { name: 'Nueva transferencia' }))
    const dialog = await screen.findByRole('dialog', { name: 'Nueva transferencia' })

    expect(within(dialog).getByText('Se registra con la fecha de hoy.')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Cuenta de origen')).toHaveValue('1')
    const destination = within(dialog).getByLabelText('Cuenta de destino')
    expect(within(destination).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Elige la cuenta de destino',
      'Bancolombia',
    ])

    await user.selectOptions(destination, '2')
    await user.type(within(dialog).getByLabelText('Monto'), '2.000.000')
    await user.click(within(dialog).getByRole('button', { name: 'Registrar transferencia' }))
    expect(within(dialog).getByText('Fondos insuficientes en Caja General.')).toBeInTheDocument()
    expect(posts(fetchMock, '/api/treasury/transfers')).toHaveLength(0)

    await user.clear(within(dialog).getByLabelText('Monto'))
    await user.type(within(dialog).getByLabelText('Monto'), '500.000')
    await user.type(within(dialog).getByLabelText('Concepto (opcional)'), 'Consignación')
    await user.click(within(dialog).getByRole('button', { name: 'Registrar transferencia' }))
    expect(within(dialog).getByRole('button', { name: 'Registrando…' })).toBeDisabled()
    await user.keyboard('{Enter}')
    expect(posts(fetchMock, '/api/treasury/transfers')).toEqual([
      { originAccountId: 1, destinationAccountId: 2, amount: 500000, concept: 'Consignación' },
    ])

    finish(jsonResponse({ outgoingMovementId: 10, incomingMovementId: 11 }, 201))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('Transferencia registrada')).toBeInTheDocument()
    await waitFor(() => expect(calls(fetchMock, '/api/treasury/accounts').length).toBeGreaterThan(1))
  })

  it('transferencia: un 409 del backend queda en el modal sin perder lo digitado', async () => {
    const { user } = await setup('/cuentas', {
      ...fullRoutes(),
      'POST /api/treasury/transfers': () =>
        jsonResponse({ error: 'Saldo insuficiente en Caja General: hay 100.0 y se requieren 500000.0', status: 409 }, 409),
    })
    await screen.findByRole('table')
    await user.click(screen.getByRole('button', { name: 'Nueva transferencia' }))
    const dialog = await screen.findByRole('dialog', { name: 'Nueva transferencia' })
    await user.selectOptions(within(dialog).getByLabelText('Cuenta de destino'), '2')
    await user.type(within(dialog).getByLabelText('Monto'), '500000')
    await user.click(within(dialog).getByRole('button', { name: 'Registrar transferencia' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Saldo insuficiente en Caja General')
    expect(within(dialog).getByLabelText('Monto')).toHaveValue('500000')
  })
})
