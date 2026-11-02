import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { saveToken } from '../auth/session'
import { URL_TEXT_DEBOUNCE_MS } from '../lib/useUrlTextParam'
import { emptyStateOf, jsonResponse, primaryActions, renderRoute, validToken } from '../test/utils'

type Handler = (url: URL, body: unknown) => Response | Promise<Response>
type Routes = Record<string, Handler>

const accounts = [
  { id: 2, name: 'Bancolombia', type: 'BANCO', currentBalance: 2230650, initialBalance: 0, color: null },
  { id: 1, name: 'Caja General', type: 'EFECTIVO', currentBalance: 1946250, initialBalance: 0, color: null },
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
  return screen.getByText(label).nextElementSibling?.textContent?.replace(/\u00a0/g, ' ')
}

async function setup(path = '/cuentas', routes: Routes = fullRoutes()) {
  const fetchMock = mockApi(routes)
  const user = userEvent.setup()
  const router = renderRoute(path)
  await screen.findByRole('heading', { name: 'Tesorería' })
  return { fetchMock, user, router }
}

describe('cuentas', () => {
  it('alta con color personalizado, respuesta normalizada y recarga desde datos del servidor', async () => {
    let list: Array<Record<string, unknown>> = [...accounts]
    const { user, fetchMock } = await setup('/cuentas', {
      ...fullRoutes(),
      'GET /api/treasury/accounts': () => jsonResponse(list),
      'POST /api/treasury/accounts': (_, body) => {
        const request = body as { name: string; type: string; initialBalance: number; color: string }
        const created = { ...request, id: 9, currentBalance: request.initialBalance, color: request.color.toUpperCase() }
        list = [...list, created]
        return jsonResponse(created, 201)
      },
    })
    await screen.findByRole('button', { name: /^Caja General/ })
    await user.click(screen.getByRole('button', { name: 'Nueva cuenta' }))
    expect(screen.getByRole('button', { name: 'Azul' })).toHaveAttribute('aria-pressed', 'true')
    await user.type(screen.getByLabelText('Nombre'), 'Cuenta color')
    fireEvent.change(screen.getByLabelText('Saldo inicial'), { target: { value: '100,105' } })
    fireEvent.change(screen.getByLabelText('Otro color'), { target: { value: '#abcdef' } })
    await user.click(screen.getByRole('button', { name: 'Guardar cuenta' }))
    const tile = await screen.findByRole('button', { name: /^Cuenta color/ })
    expect(tile.parentElement).toHaveAttribute('data-accent', '#ABCDEF')
    await waitFor(() => expect(tile).toHaveAttribute('aria-pressed', 'true'))
    expect(posts(fetchMock, '/api/treasury/accounts')).toEqual([
      { name: 'Cuenta color', type: 'EFECTIVO', initialBalance: 100.105, color: '#abcdef' },
    ])
    expect(calls(fetchMock, '/api/treasury/accounts').length).toBeGreaterThan(1)
    cleanup()
    renderRoute('/cuentas?cuenta=9')
    const reloaded = await screen.findByRole('button', { name: /^Cuenta color/ })
    expect(reloaded.parentElement).toHaveAttribute('data-accent', '#ABCDEF')
    await user.click(screen.getByRole('button', { name: 'Editar cuenta Cuenta color' }))
    expect(screen.getByLabelText('Otro color')).toHaveValue('#abcdef')
    expect(screen.getByLabelText('Saldo inicial')).toHaveValue('100,105')
  })

  it('editar solo color refresca cache, conserva seleccion agregada y persiste al remontar', async () => {
    let list = accounts.map((account) => ({ ...account, color: account.id === 1 ? '#FFFFFF' : '#000000' }))
    const { user, fetchMock } = await setup('/cuentas?cuenta=todas', {
      ...fullRoutes(),
      'GET /api/treasury/accounts': () => jsonResponse(list),
      'PUT /api/treasury/accounts/1': (_, body) => {
        const request = body as { name: string; initialBalance: number; color: string }
        list = list.map((account) => account.id === 1 ? { ...account, ...request, color: request.color.toUpperCase() } : account)
        return jsonResponse(list.find((account) => account.id === 1))
      },
    })
    const tile = await screen.findByRole('button', { name: /^Caja General/ })
    expect(tile.parentElement).toHaveAttribute('data-accent', '#FFFFFF')
    await user.click(screen.getByRole('button', { name: 'Editar cuenta Caja General' }))
    fireEvent.change(screen.getByLabelText('Otro color'), { target: { value: '#123abc' } })
    expect(tile.parentElement).toHaveAttribute('data-accent', '#FFFFFF')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(tile.parentElement).toHaveAttribute('data-accent', '#123ABC'))
    const bank = screen.getByRole('button', { name: /^Bancolombia/ })
    expect(bank.parentElement).toHaveAttribute('data-accent', '#000000')
    expect(within(tile).getByText('Incluida en Todas las cuentas')).toBeInTheDocument()
    expect(within(bank).getByText('Incluida en Todas las cuentas')).toBeInTheDocument()
    await user.click(bank)
    expect(bank).toHaveAttribute('aria-pressed', 'true')
    expect(tile).toHaveAttribute('aria-pressed', 'false')
    expect(within(tile).queryByText('Incluida en Todas las cuentas')).not.toBeInTheDocument()
    expect(calls(fetchMock, '/api/treasury/accounts').length).toBeGreaterThan(1)
    cleanup()
    renderRoute('/cuentas?cuenta=1')
    expect((await screen.findByRole('button', { name: /^Caja General/ })).parentElement).toHaveAttribute('data-accent', '#123ABC')
  })

  it('cancelar solo color mantiene la tarjeta heredada y no envia PUT', async () => {
    const { user, fetchMock } = await setup()
    const tile = await screen.findByRole('button', { name: /^Caja General/ })
    expect(tile.parentElement).toHaveAttribute('data-accent', '#B45309')
    await user.click(screen.getByRole('button', { name: 'Editar cuenta Caja General' }))
    expect(screen.getByLabelText('Otro color')).toHaveValue('#b45309')
    await user.click(screen.getByRole('button', { name: 'Violeta' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(tile.parentElement).toHaveAttribute('data-accent', '#B45309')
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(false)
  })

  it('cambiar solo color en alta pide descarte y no crea una cuenta', async () => {
    const { user, fetchMock } = await setup()
    await screen.findByRole('button', { name: /^Caja General/ })
    await user.click(screen.getByRole('button', { name: 'Nueva cuenta' }))
    await user.click(screen.getByRole('button', { name: 'Violeta' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(screen.getByLabelText('Otro color')).toHaveValue('#7c3aed')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(posts(fetchMock, '/api/treasury/accounts')).toEqual([])
  })

  it('edita la cuenta indicada, cierra y refresca datos conservando seleccion, periodo y pagina', async () => {
    let list = accounts.map((account) => ({ ...account }))
    const many = Array.from({ length: 30 }, (_, index) => movement(index + 1, { accountId: 2 }))
    const { user, router, fetchMock } = await setup('/cuentas?cuenta=2&periodo=este-ano&pagina=2', {
      ...fullRoutes(many),
      'GET /api/treasury/accounts': () => jsonResponse(list),
      'PUT /api/treasury/accounts/1': (_, body) => {
        list = list.map((account) => account.id === 1 ? { ...account, ...(body as object) } : account).reverse()
        return jsonResponse(list.find((account) => account.id === 1))
      },
    })
    const originalAccent = (await screen.findByRole('button', { name: /^Caja General/ })).parentElement?.getAttribute('data-accent')
    await user.click(await screen.findByRole('button', { name: 'Editar cuenta Caja General' }))
    const dialog = await screen.findByRole('dialog', { name: 'Editar cuenta' })
    expect(within(dialog).getByLabelText('Nombre')).toHaveValue('Caja General')
    expect(within(dialog).getByLabelText('Saldo inicial')).toHaveValue('0')
    expect(within(dialog).getByLabelText('Tipo')).toHaveValue('Efectivo')
    expect(primaryActions().filter((button) => dialog.contains(button))).toHaveLength(1)
    fireEvent.change(within(dialog).getByLabelText('Nombre'), { target: { value: 'Caja nueva' } })
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByRole('button', { name: /^Caja nueva/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Caja nueva/ }).parentElement).toHaveAttribute('data-accent', originalAccent)
    expect(screen.getByRole('button', { name: /^Bancolombia/ })).toHaveAttribute('aria-pressed', 'true')
    expect(router.state.location.search).toBe('?cuenta=2&periodo=este-ano&pagina=2')
    expect(screen.getByText('26 a 30 de 30 movimientos')).toBeInTheDocument()
    expect(calls(fetchMock, '/api/treasury/balance').length).toBeGreaterThan(1)
    expect(calls(fetchMock, '/api/treasury/movements').length).toBeGreaterThan(1)
    expect(await screen.findByText('Cuenta actualizada')).toBeInTheDocument()
  })

  it('401 al editar cierra sesion y muestra el aviso existente en login', async () => {
    const { user, router } = await setup('/cuentas', {
      ...fullRoutes(),
      'PUT /api/treasury/accounts/2': () => jsonResponse({ error: 'No autenticado', status: 401 }, 401),
    })
    await user.click(await screen.findByRole('button', { name: 'Editar cuenta Bancolombia' }))
    await user.type(screen.getByLabelText('Nombre'), ' nuevo')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(await screen.findByText('Tu sesión venció. Inicia sesión de nuevo.')).toBeInTheDocument()
  })

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
    expect(await within(group).findByRole('button', { name: /^Caja General/ })).toHaveAttribute('aria-pressed', 'true')
    expect(within(screen.getByRole('region', { name: 'Saldos actuales' })).getByText('Todas las cuentas').parentElement).toHaveTextContent('$ 4.176.900')
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(document.title).toBe('Caja General · ServiBox')
    expect(screen.getByRole('heading', { name: 'Caja General · Movimientos del período' })).toBeInTheDocument()
    expect(screen.getAllByLabelText('Período')).toHaveLength(1)
    expect(calls(fetchMock, '/api/treasury/movements')).toEqual(['/api/treasury/movements?desde=2026-10-01&hasta=2026-10-18'])

    await waitFor(() => expect(total('Ingresos del período')).toBe('$ 460.650'))
    expect(total('Egresos del período')).toBe('$ 1.107.000')
    expect(screen.getByRole('heading', { name: 'Caja General · Movimientos del período' }).closest('section')).toHaveTextContent('$ 160.650')
    await waitFor(() =>
      expect(rows()).toEqual([
        ['09/10/2026', 'Egreso', 'Transferencia a Bancolombia', 'TRANSFERENCIA a Bancolombia', '-$ 300.000'],
        ['08/10/2026', 'Egreso', 'Arriendo', 'GASTO OPERATIVO', '-$ 450.000'],
        ['05/10/2026', 'Ingreso', 'Venta de contado', 'VENTA FV-0003', '+$ 160.650'],
      ]),
    )
    // Montos con el rol monto en la tabla y en los totales; Origen no es un codigo.
    expect(within(screen.getByRole('table')).getByText('-$ 300.000')).toHaveClass('monto')
    expect(screen.getByText('Ingresos del período').nextElementSibling).toHaveClass('text-figure')
    expect(within(screen.getByRole('table')).getByText('GASTO OPERATIVO')).not.toHaveClass('codigo')
  })

  it('Todas las cuentas suma todo y agrega la columna Cuenta; la cuenta va en la URL', async () => {
    const { user, router } = await setup()
    await user.click(await screen.findByRole('button', { name: 'Ver todas las cuentas' }))

    expect(router.state.location.search).toBe('?cuenta=todas')
    const group = screen.getByRole('group', { name: 'Cuentas' })
    for (const name of ['Caja General', 'Bancolombia']) {
      const card = within(group).getByRole('button', { name: new RegExp(`^${name}`) })
      expect(card).toHaveAttribute('aria-pressed', 'false')
      expect(card).toHaveTextContent('Incluida en Todas las cuentas')
    }
    expect(total('Ingresos del período')).toBe('$ 460.650')
    expect(total('Egresos del período')).toBe('$ 1.107.000')
    await waitFor(() => expect(rows()[0]).toEqual(['12/10/2026', 'Bancolombia', 'Egreso', 'Compra', 'COMPRA PROV-1001', '-$ 357.000']))
    expect(rows()[1]).toEqual(['09/10/2026', 'Bancolombia', 'Ingreso', 'Transferencia desde Caja General', 'TRANSFERENCIA desde Caja General', '+$ 300.000'])

    const bankButton = within(group).getByRole('button', { name: /^Bancolombia/ })
    bankButton.focus()
    await user.keyboard('{Enter}')
    expect(router.state.location.search).toBe('?cuenta=2')
    expect(bankButton).toHaveFocus()
    expect(within(group).getByRole('button', { name: /^Bancolombia/ })).toHaveTextContent('Seleccionada')
    expect(within(group).getByRole('button', { name: /^Caja General/ })).not.toHaveTextContent('Incluida en Todas las cuentas')
    expect(screen.getByRole('heading', { name: 'Bancolombia · Movimientos del período' })).toBeInTheDocument()
    await act(() => router.navigate(-1))
    expect(router.state.location.search).toBe('?cuenta=todas')
    expect(within(group).getByRole('button', { name: /^Caja General/ })).toHaveTextContent('Incluida en Todas las cuentas')
    expect(within(group).getByRole('button', { name: /^Bancolombia/ })).toHaveTextContent('Incluida en Todas las cuentas')
  })

  it('Ver todas desde Tus cuentas conserva el rango y se puede activar con teclado', async () => {
    const { user, router } = await setup('/cuentas?cuenta=1&periodo=personalizado&desde=2026-10-01&hasta=2026-10-18')
    const button = await screen.findByRole('button', { name: 'Ver todas las cuentas' })
    expect(screen.getByRole('heading', { name: 'Tus cuentas' }).parentElement).toContainElement(button)
    button.focus()
    await user.keyboard('{Enter}')
    expect(router.state.location.search).toBe('?cuenta=todas&periodo=personalizado&desde=2026-10-01&hasta=2026-10-18')
    expect(screen.getByRole('button', { name: 'Todas las cuentas seleccionadas' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Todas las cuentas seleccionadas' })).toHaveFocus()
    expect(screen.getByRole('heading', { name: 'Todas las cuentas · Movimientos del período' })).toBeInTheDocument()
  })

  it('muestra saldos actuales completos e iconos por tipo, y editar no cambia la seleccion', async () => {
    const longName = 'Cuenta principal de recaudos digitales de la serviteca'
    const list = [
      { ...accounts[0], name: longName, currentBalance: 123456789012.51 },
      { ...accounts[1], currentBalance: 2500000.49 },
      { id: 3, name: 'Caja virtual', type: 'DIGITAL', currentBalance: 6807530.08, initialBalance: 600000 },
    ]
    const { user, router, fetchMock } = await setup('/cuentas?cuenta=1', {
      ...fullRoutes(),
      'GET /api/treasury/accounts': () => jsonResponse(list),
      'GET /api/treasury/balance': () => jsonResponse({ total: 123466096543.08 }),
    })
    const group = await screen.findByRole('group', { name: 'Cuentas' })
    const bank = within(group).getByRole('button', { name: new RegExp(`^${longName}`) })
    const cash = within(group).getByRole('button', { name: /^Caja General/ })
    const digital = within(group).getByRole('button', { name: /^Caja virtual/ })
    expect(bank).toHaveTextContent('$ 123.456.789.013')
    expect(cash).toHaveTextContent('$ 2.500.000')
    expect(digital).toHaveTextContent('$ 6.807.530')
    expect(bank.querySelector('.lucide-landmark')).toBeInTheDocument()
    expect(cash.querySelector('.lucide-wallet')).toBeInTheDocument()
    expect(digital.querySelector('.lucide-smartphone')).toBeInTheDocument()
    expect(cash).toHaveAttribute('aria-pressed', 'true')
    expect(cash).toHaveTextContent('Seleccionada')
    expect(bank).not.toHaveTextContent('Seleccionada')
    expect(within(screen.getByRole('region', { name: 'Saldos actuales' })).getByText('Todas las cuentas').parentElement).toHaveTextContent('$ 123.466.096.543')
    expect(within(group).queryByRole('button', { name: 'Editar cuenta Todas las cuentas' })).not.toBeInTheDocument()

    await user.click(within(group).getByRole('button', { name: `Editar cuenta ${longName}` }))
    expect(bank).toHaveAttribute('aria-pressed', 'false')
    expect(cash).toHaveAttribute('aria-pressed', 'true')
    expect(router.state.location.search).toBe('?cuenta=1')
    expect(screen.getByRole('dialog', { name: 'Editar cuenta' })).toBeInTheDocument()
    expect(calls(fetchMock, '/api/treasury/movements')).toEqual(['/api/treasury/movements?desde=2026-10-01&hasta=2026-10-18'])
  })

  it('reparte saldos por tipo real, suma cuentas del mismo tipo y conserva negativos', async () => {
    await setup('/cuentas?cuenta=2', {
      ...fullRoutes([]),
      'GET /api/treasury/accounts': () => jsonResponse([
        { id: 1, name: 'Caja', type: 'EFECTIVO', currentBalance: 100, initialBalance: 0 },
        { id: 2, name: 'Otro efectivo', type: 'EFECTIVO', currentBalance: -30.25, initialBalance: 0 },
        { id: 3, name: 'Banco', type: 'BANCO', currentBalance: -50, initialBalance: 0 },
        { id: 4, name: 'Billetera', type: 'DIGITAL', currentBalance: 10, initialBalance: 0 },
      ]),
      'GET /api/treasury/balance': () => jsonResponse({ total: 29.75 }),
    })
    const types = screen.getByRole('region', { name: 'Saldos actuales' })
    expect(within(types).queryByText(/Saldo actual en \d+ cuentas?/)).not.toBeInTheDocument()
    await waitFor(() => expect(within(types).getByText('Efectivo').parentElement).toHaveTextContent('$ 70'))
    expect(within(types).getByText('Efectivo').parentElement?.parentElement?.querySelector('.lucide-wallet')).toBeInTheDocument()
    expect(within(types).getByText('Bancos').parentElement).toHaveTextContent('-$ 50')
    expect(within(types).getByText('Bancos').parentElement?.parentElement?.querySelector('.lucide-landmark')).toBeInTheDocument()
    expect(within(types).getByText('Digital').parentElement).toHaveTextContent('$ 10')
    expect(within(types).getByText('Digital').parentElement?.parentElement?.querySelector('.lucide-smartphone')).toBeInTheDocument()
    expect(within(types).getByText('Todas las cuentas').parentElement).toHaveTextContent('$ 30')
    expect(within(types).getByText('Todas las cuentas').parentElement?.parentElement?.querySelector('.lucide-layers')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Otro efectivo/ })).toHaveTextContent('-$ 30')
  })

  it('el grafico expone grupos completos, fechas vacias y resumen accesible con empates', async () => {
    const list = [
      movement(1, { amount: 10.25, date: '2026-10-01' }),
      movement(2, { amount: 10.25, date: '2026-10-03' }),
    ]
    const { user } = await setup('/cuentas?periodo=personalizado&desde=2026-10-01&hasta=2026-10-04', fullRoutes(list))
    expect(await screen.findByRole('img', { name: /Gráfico de ingresos y egresos por día/ })).toBeInTheDocument()
    expect(screen.getByText(/Mayor ingreso: empate en 2 días/)).toHaveTextContent('$ 10')
    expect(screen.getByText('No hubo egreso en el período.')).toBeInTheDocument()
    expect(screen.getByText('2 días sin movimientos.')).toBeInTheDocument()
    await user.click(screen.getByText('Ver importes por fecha'))
    const detail = screen.getByRole('list', { name: 'Importes por día' })
    expect(within(detail).getAllByRole('listitem')).toHaveLength(4)
    expect(within(detail).getAllByText(/Ingresos:/)).toHaveLength(4)
  })

  it('cambiar periodo conserva los saldos actuales y el historial restaura la cuenta', async () => {
    const { user, router, fetchMock } = await setup()
    const group = await screen.findByRole('group', { name: 'Cuentas' })
    await user.click(await screen.findByRole('button', { name: 'Ver todas las cuentas' }))
    await user.selectOptions(screen.getByLabelText('Período'), 'mes-anterior')
    expect(router.state.location.search).toBe('?cuenta=todas&periodo=mes-anterior')
    expect(within(group).getByRole('button', { name: /^Caja General/ })).toHaveTextContent('$ 1.946.250')
    expect(within(group).getByRole('button', { name: /^Bancolombia/ })).toHaveTextContent('$ 2.230.650')
    expect(calls(fetchMock, '/api/treasury/accounts')).toHaveLength(1)
    expect(calls(fetchMock, '/api/treasury/balance')).toHaveLength(1)
    await act(() => router.navigate(-1))
    expect(router.state.location.search).toBe('?cuenta=todas')
    await act(() => router.navigate(-1))
    expect(within(group).getByRole('button', { name: /^Caja General/ })).toHaveAttribute('aria-pressed', 'true')
    await act(() => router.navigate(1))
    expect(screen.getByRole('button', { name: 'Todas las cuentas seleccionadas' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('cambiar el periodo cambia la consulta y la URL; personalizado invalido no consulta', async () => {
    const { fetchMock, user, router } = await setup()
    await screen.findByRole('table')

    const period = screen.getByLabelText('Período')
    expect(period.closest('div.flex')).toContainElement(document.getElementById(period.getAttribute('aria-describedby') ?? ''))

    await user.selectOptions(screen.getByLabelText('Período'), 'esta-semana')
    expect(router.state.location.search).toBe('?periodo=esta-semana')
    await waitFor(() => expect(calls(fetchMock, '/api/treasury/movements')).toContain('/api/treasury/movements?desde=2026-10-12&hasta=2026-10-18'))

    await user.selectOptions(screen.getByLabelText('Período'), 'personalizado')
    expect(router.state.location.search).toBe('?periodo=personalizado&desde=2026-10-12&hasta=2026-10-18')
    expect(screen.getByLabelText('Desde').parentElement?.parentElement?.parentElement).toContainElement(screen.getByLabelText('Hasta'))

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
    expect(total('Ingresos del período')).toBe('$ 30.000')
    expect(screen.getByRole('heading', { name: 'Caja General · Movimientos del período' }).closest('section')).toHaveTextContent('$ 30.000')
    await user.click(screen.getByRole('button', { name: 'Página 2' }))
    expect(router.state.location.search).toBe('?pagina=2')
    expect(screen.getByText('26 a 30 de 30 movimientos')).toBeInTheDocument()
    expect(rows()).toHaveLength(5)
    expect(screen.getByRole('heading', { name: 'Caja General · Movimientos del período' }).closest('section')).toHaveTextContent('$ 30.000')
  })

  it('si fallan las ventas, Origen queda en VENTA sin numero con un aviso', async () => {
    await setup('/cuentas', { ...fullRoutes(), 'GET /api/sales': () => jsonResponse({ error: 'Error interno', status: 500 }, 500) })

    expect(await screen.findByText(/No pudimos cargar los números de factura/)).toBeInTheDocument()
    expect(rows()[2]?.[3]).toBe('VENTA')
    expect(total('Ingresos del período')).toBe('$ 460.650')
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
    expect(total('Ingresos del período')).toBe('No disponible')
    expect(screen.queryByText(/días sin movimientos/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Caja General/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('No hay movimientos en este período.')).toBeInTheDocument()
    expect(screen.getByText('18 días sin movimientos.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cambiar el período' }))
    expect(screen.getByLabelText('Período')).toHaveFocus()
  })

  it('la carga del rango no presenta ceros hasta recibir todos los movimientos', async () => {
    let respond!: (response: Response) => void
    const pending = new Promise<Response>((resolve) => { respond = resolve })
    await setup('/cuentas', { ...fullRoutes(), 'GET /api/treasury/movements': () => pending })
    await screen.findByRole('button', { name: /^Caja General/ })
    expect(screen.queryByRole('img', { name: /Gráfico de ingresos y egresos/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/días sin movimientos/)).not.toBeInTheDocument()
    await act(async () => { respond(jsonResponse(october)) })
    expect(await screen.findByRole('img', { name: /Gráfico de ingresos y egresos/ })).toBeInTheDocument()
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

    expect(await screen.findByRole('button', { name: /^Caja General/ })).toBeInTheDocument()
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

    expect(await screen.findByRole('button', { name: /^Bancolombia/ })).toBeInTheDocument()
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

    await user.click(screen.getByRole('button', { name: 'Ver todas las cuentas' }))
    await user.click(screen.getByRole('button', { name: 'Exportar a Excel' }))
    await waitFor(() => expect(calls(fetchMock, '/api/reporting/export')).toHaveLength(2))
    expect(calls(fetchMock, '/api/reporting/export')).toEqual([
      '/api/reporting/export?type=MOVIMIENTOS&format=XLSX&desde=2026-10-01&hasta=2026-10-18&accountId=1',
      '/api/reporting/export?type=MOVIMIENTOS&format=XLSX&desde=2026-10-01&hasta=2026-10-18',
    ])
  })

  it('un error al exportar va en un toast con el mensaje generico', async () => {
    await setup('/cuentas', {
      ...fullRoutes(),
      'GET /api/reporting/export': () => new Response('<html>Bad gateway</html>', { status: 502 }),
    })
    const user = userEvent.setup()
    await screen.findByRole('table')
    await user.click(screen.getByRole('button', { name: 'Exportar a Excel' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos completar la acción. Revisa tu conexión e inténtalo de nuevo')
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
    // Con dos cuentas Nueva cuenta pasa a secundaria: se espera a que las cuentas carguen.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Nueva cuenta' })).toHaveAttribute('data-variant', 'secondary'))
    await user.click(screen.getByRole('button', { name: 'Nueva cuenta' }))
    const dialog = await screen.findByRole('dialog', { name: 'Nueva cuenta' })

    await user.click(within(dialog).getByRole('button', { name: 'Guardar cuenta' }))
    expect(within(dialog).getByText('Escribe el nombre de la cuenta.')).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText('Nombre'), 'Bancolombia')
    await user.click(within(dialog).getByRole('button', { name: 'Violeta' }))
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cuenta' }))
    const name = within(dialog).getByLabelText('Nombre')
    await waitFor(() => expect(name).toHaveAccessibleDescription('Ya existe una cuenta con el nombre Bancolombia.'))
    expect(within(dialog).getByLabelText('Otro color')).toHaveValue('#7c3aed')

    await user.clear(name)
    await user.type(name, 'Nequi')
    await user.selectOptions(within(dialog).getByLabelText('Tipo'), 'DIGITAL')
    await user.clear(within(dialog).getByLabelText('Saldo inicial'))
    await user.type(within(dialog).getByLabelText('Saldo inicial'), '150000')
    expect(within(dialog).getByLabelText('Saldo inicial')).toHaveValue('150.000')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cuenta' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(posts(fetchMock, '/api/treasury/accounts')).toEqual([
      { name: 'Bancolombia', type: 'EFECTIVO', initialBalance: 0, color: '#7C3AED' },
      { name: 'Nequi', type: 'DIGITAL', initialBalance: 150000, color: '#7C3AED' },
    ])
    expect(router.state.location.search).toBe('?cuenta=9')
    expect(await screen.findByText('Cuenta creada')).toBeInTheDocument()
  })

  it('nueva cuenta con datos pide confirmar al cerrar con Esc', async () => {
    const { user } = await setup()
    // Con dos cuentas Nueva cuenta pasa a secundaria: se espera a que las cuentas carguen.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Nueva cuenta' })).toHaveAttribute('data-variant', 'secondary'))
    await user.click(screen.getByRole('button', { name: 'Nueva cuenta' }))
    await user.type(within(await screen.findByRole('dialog')).getByLabelText('Nombre'), 'Nequi')
    await user.keyboard('{Escape}')
    const confirm = await screen.findByRole('dialog', { name: '¿Descartar los cambios?' })
    await user.click(within(confirm).getByRole('button', { name: 'Descartar' }))
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
    await user.type(within(dialog).getByLabelText('Monto'), '500000')
    expect(within(dialog).getByLabelText('Monto')).toHaveValue('500.000')
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
    expect(within(dialog).getByLabelText('Monto')).toHaveValue('500.000')
  })
})
