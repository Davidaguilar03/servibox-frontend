import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { saveToken } from '../auth/session'
import { EMPTY_VALUE } from '../lib/format'
import { emptyStateOf, jsonResponse, primaryActions, renderRoute, validToken } from '../test/utils'

type Handler = (url: URL, body: unknown) => Response | Promise<Response>
type Routes = Record<string, Handler>

const party = (id: number, name: string, fields: Record<string, unknown> = {}) => ({
  id,
  role: 'CLIENTE',
  name,
  documentType: 'CC',
  documentNumber: `10${id}`,
  email: null,
  phone: null,
  ...fields,
})

const consumidorFinal = party(1, 'Consumidor final', { documentType: 'NIT', documentNumber: '222222222222' })
const transportes = party(2, 'Transportes Boyacá S.A.S.', { documentType: 'NIT', documentNumber: '900123456', email: 'compras@transboyaca.co' })
const maria = party(3, 'María Ruiz', { role: 'AMBOS', documentNumber: '52123456', phone: '310 555 1234' })
const oscar = party(4, 'Óscar Peña')
const customers = [consumidorFinal, maria, oscar, transportes]

const sale = (id: number, customer: { id: number } | null, status: string, pendingBalance: number) => ({
  id,
  invoiceNumber: `FV-${id}`,
  customer,
  invoiceDate: '2026-10-10',
  dueDate: null,
  paymentType: 'CREDITO',
  status,
  total: 1000,
  pendingBalance,
})

// Transportes: 1.500.000 + 500.000 en dos pendientes; Maria 300.000 (la anulada no cuenta);
// Consumidor final 100.000; Oscar solo tiene una pagada.
const sales = [
  sale(1, transportes, 'PENDIENTE', 1500000),
  sale(2, transportes, 'PENDIENTE', 500000),
  sale(3, transportes, 'PAGADA', 0),
  sale(4, maria, 'PENDIENTE', 300000),
  sale(5, maria, 'ANULADA', 0),
  sale(6, oscar, 'PAGADA', 0),
  sale(7, consumidorFinal, 'PENDIENTE', 100000),
]

const distrillantas = party(5, 'Distrillantas Boyacá S.A.S.', { role: 'PROVEEDOR', documentType: 'NIT', documentNumber: '900555111' })
const suppliers = [distrillantas, maria]
const purchase = (id: number, supplier: { id: number }, status: string, pendingBalance: number) => ({
  id,
  invoiceNumber: `DB-${id}`,
  supplier,
  invoiceDate: '2026-10-10',
  dueDate: null,
  paymentType: 'CREDITO',
  status,
  total: 1000,
  pendingBalance,
})
const purchases = [
  purchase(1, distrillantas, 'PENDIENTE', 595000),
  purchase(2, distrillantas, 'PAGADA', 0),
  purchase(3, maria, 'PENDIENTE', 100000),
  purchase(4, maria, 'ANULADA', 0),
]

const fail = () => jsonResponse({ error: 'x', status: 500 }, 500)

function customerRoutes(list: unknown[] = customers, extra: Routes = {}): Routes {
  return {
    'GET /api/counterparties': () => jsonResponse(list),
    'GET /api/sales': () => jsonResponse(sales),
    ...extra,
  }
}

function supplierRoutes(list: unknown[] = suppliers, extra: Routes = {}): Routes {
  return {
    'GET /api/counterparties': () => jsonResponse(list),
    'GET /api/purchases': () => jsonResponse(purchases),
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
const rows = () => within(table()).getAllByRole('row').slice(1)
const row = (name: string) => {
  const found = rows().find((item) => item.textContent?.includes(name))
  if (!found) throw new Error(`Sin fila para ${name}`)
  return found
}
const firstCells = () => rows().map((item) => within(item).getAllByRole('cell')[0]?.textContent)
const indicator = (label: string) => screen.getAllByText(label).find((element) => element.tagName === 'P')?.parentElement

async function openClients(path = '/ventas/clientes', routes: Routes = customerRoutes()) {
  const fetchMock = mockApi(routes)
  const router = renderRoute(path)
  await screen.findByRole('heading', { name: 'Clientes' })
  return { fetchMock, router, user: userEvent.setup() }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-23T15:00:00Z'))
  saveToken(validToken())
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Clientes', () => {
  it('muestra indicadores, saldos por cliente, etiquetas y acciones', async () => {
    const { fetchMock } = await openClients()
    await waitFor(() => expect(indicator('Total por cobrar')).toHaveTextContent('$ 2.400.000'))

    expect(requests(fetchMock, 'GET', '/api/counterparties')[0]?.url).toBe('/api/counterparties?role=CLIENTE')
    expect(indicator('Total de clientes')).toHaveTextContent('3')
    expect(indicator('Con saldo pendiente')).toHaveTextContent('3')
    expect(firstCells()).toEqual(['Consumidor finalSistema', 'María RuizCliente y proveedor', 'Óscar Peña', 'Transportes Boyacá S.A.S.'])

    expect(row('Transportes')).toHaveTextContent('$ 2.000.0002 facturas pendientes')
    expect(row('María')).toHaveTextContent('$ 300.0001 factura pendiente')
    expect(row('Óscar')).toHaveTextContent('$ 0')
    expect(row('Óscar')).not.toHaveTextContent('pendiente')
    expect(within(row('Transportes')).getByText('900123456')).toHaveClass('font-mono')
    expect(row('Transportes')).toHaveTextContent('NIT 900123456')
    expect(row('Transportes')).toHaveTextContent('compras@transboyaca.co')
    expect(within(row('Óscar')).getAllByText(EMPTY_VALUE)).toHaveLength(2)
    expect(row('María')).toHaveTextContent('310 555 1234')

    expect(within(row('Consumidor')).queryByRole('button', { name: /Editar/ })).not.toBeInTheDocument()
    expect(within(row('Transportes')).getByRole('button', { name: 'Editar cliente Transportes Boyacá S.A.S.' })).toBeInTheDocument()
    expect(within(row('Transportes')).getByRole('link', { name: 'Nueva factura para Transportes Boyacá S.A.S.' })).toHaveAttribute(
      'href',
      '/ventas/nueva?cliente=2',
    )
    expect(within(row('Consumidor')).getByRole('link', { name: 'Nueva factura para Consumidor final' })).toHaveAttribute(
      'href',
      '/ventas/nueva?cliente=1',
    )
    expect(screen.getByRole('link', { name: 'Volver a Facturas de venta' })).toHaveAttribute('href', '/ventas')
  })

  it('busca sin tildes ni mayusculas, filtra por saldo y ordena, todo en la URL', async () => {
    const { router, user } = await openClients()
    await waitFor(() => expect(indicator('Total por cobrar')).toHaveTextContent('$ 2.400.000'))

    const search = screen.getByLabelText('Buscar')
    fireEvent.change(search, { target: { value: 'OSCAR PENA' } })
    fireEvent.blur(search)
    await waitFor(() => expect(router.state.location.search).toBe('?q=OSCAR+PENA'))
    expect(firstCells()).toEqual(['Óscar Peña'])

    fireEvent.change(search, { target: { value: '90012' } })
    fireEvent.blur(search)
    await waitFor(() => expect(firstCells()).toEqual(['Transportes Boyacá S.A.S.']))
    fireEvent.change(search, { target: { value: 'TRANSBOYACA.CO' } })
    fireEvent.blur(search)
    await waitFor(() => expect(router.state.location.search).toBe('?q=TRANSBOYACA.CO'))
    expect(firstCells()).toEqual(['Transportes Boyacá S.A.S.'])

    await user.click(screen.getByRole('button', { name: 'Limpiar' }))
    expect(router.state.location.search).toBe('')
    fireEvent.change(screen.getByLabelText('Saldo'), { target: { value: 'pendiente' } })
    expect(router.state.location.search).toBe('?saldo=pendiente')
    expect(firstCells()).toHaveLength(3)
    fireEvent.change(screen.getByLabelText('Ordenar por'), { target: { value: 'saldo' } })
    expect(router.state.location.search).toBe('?saldo=pendiente&orden=saldo')
    expect(firstCells()).toEqual(['Transportes Boyacá S.A.S.', 'María RuizCliente y proveedor', 'Consumidor finalSistema'])
    // Los indicadores no dependen de los filtros.
    expect(indicator('Total de clientes')).toHaveTextContent('3')
  })

  it('pagina de a 25 con la pagina en la URL', async () => {
    const many = Array.from({ length: 30 }, (_, index) => party(index + 10, `Cliente ${String(index + 10).padStart(3, '0')}`))
    const { router, user } = await openClients('/ventas/clientes', customerRoutes(many))
    await screen.findAllByText('Cliente 010')

    expect(rows()).toHaveLength(25)
    expect(screen.getByText('1 a 25 de 30 clientes')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Página 2' }))
    expect(router.state.location.search).toBe('?pagina=2')
    expect(firstCells()).toEqual(['Cliente 035', 'Cliente 036', 'Cliente 037', 'Cliente 038', 'Cliente 039'])
  })

  it('sin clientes (solo el Consumidor final) invita a crear el primero', async () => {
    const { user } = await openClients('/ventas/clientes', customerRoutes([consumidorFinal], { 'GET /api/sales': () => jsonResponse([]) }))

    expect(await screen.findByText('Aún no registras clientes. Crea el primero.')).toBeInTheDocument()
    expect(indicator('Total de clientes')).toHaveTextContent('0')
    await user.click(within(screen.getByRole('region', { name: 'Clientes' })).getByRole('button', { name: 'Nuevo cliente' }))
    expect(screen.getByRole('dialog', { name: 'Nuevo cliente' })).toBeInTheDocument()
  })

  it('sin clientes el unico primario es Nuevo cliente del encabezado', async () => {
    await openClients('/ventas/clientes', customerRoutes([consumidorFinal], { 'GET /api/sales': () => jsonResponse([]) }))

    expect(await screen.findByText('Aún no registras clientes. Crea el primero.')).toBeInTheDocument()
    const [primary, ...rest] = primaryActions()
    expect(rest).toHaveLength(0)
    expect(primary).toHaveTextContent('Nuevo cliente')
    expect(emptyStateOf('Aún no registras clientes. Crea el primero.')).not.toContainElement(primary ?? null)
    expect(within(emptyStateOf('Aún no registras clientes. Crea el primero.')).getByRole('button', { name: 'Nuevo cliente' })).toHaveAttribute('data-variant', 'secondary')
  })

  it('vacio por filtros ofrece limpiarlos', async () => {
    const { router, user } = await openClients('/ventas/clientes?q=zzz')

    expect(await screen.findByText('No hay clientes con esos filtros.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(router.state.location.search).toBe('')
    expect(await screen.findAllByText('Óscar Peña')).not.toHaveLength(0)
  })

  it('un error de los clientes se puede reintentar', async () => {
    let calls = 0
    const { user } = await openClients(
      '/ventas/clientes',
      customerRoutes(customers, { 'GET /api/counterparties': () => (++calls === 1 ? fail() : jsonResponse(customers)) }),
    )

    expect(await screen.findByText('No pudimos cargar los clientes.')).toBeInTheDocument()
    await user.click(within(screen.getByRole('region', { name: 'Clientes' })).getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findAllByText('Óscar Peña')).not.toHaveLength(0)
  })

  it('si fallan solo las facturas, la tabla sigue con el saldo en raya y un aviso con reintento', async () => {
    let calls = 0
    const { user } = await openClients(
      '/ventas/clientes',
      customerRoutes(customers, { 'GET /api/sales': () => (++calls === 1 ? fail() : jsonResponse(sales)) }),
    )

    expect(await screen.findByText('No pudimos cargar los saldos.')).toBeInTheDocument()
    expect(within(row('Transportes')).getAllByText(EMPTY_VALUE)).toHaveLength(2)
    expect(indicator('Total de clientes')).toHaveTextContent('3')
    expect(indicator('Total por cobrar')).toHaveTextContent('No pudimos cargar este dato.')

    const section = screen.getByRole('region', { name: 'Clientes' })
    await user.click(within(section).getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(row('Transportes')).toHaveTextContent('$ 2.000.000'))
    expect(screen.queryByText('No pudimos cargar los saldos.')).not.toBeInTheDocument()
  })

  it('crear: valida cada campo, bloquea el documento del Consumidor final y envia el POST exacto', async () => {
    const { fetchMock, user } = await openClients(
      '/ventas/clientes',
      customerRoutes(customers, {
        'POST /api/counterparties': (_, body) => jsonResponse({ id: 30, email: null, phone: null, ...(body as object) }, 201),
      }),
    )
    await screen.findAllByText('Óscar Peña')
    await user.click(screen.getByRole('button', { name: 'Nuevo cliente' }))
    const dialog = screen.getByRole('dialog', { name: 'Nuevo cliente' })
    expect(within(dialog).getByLabelText('Nombre o razón social')).toHaveFocus()
    expect(within(dialog).getByLabelText('Nombre o razón social')).toHaveAttribute('maxLength', '150')
    expect(within(dialog).getByLabelText('Número de documento')).toHaveAttribute('maxLength', '25')
    expect(within(dialog).getByLabelText('Correo')).toHaveAttribute('maxLength', '150')
    expect(within(dialog).getByLabelText('Celular')).toHaveAttribute('maxLength', '25')
    expect(within(dialog).queryByLabelText(/Rol/)).not.toBeInTheDocument()
    expect(within(dialog).getByRole('option', { name: 'Cédula de ciudadanía' })).toHaveValue('CC')

    await user.click(within(dialog).getByRole('button', { name: 'Guardar cliente' }))
    expect(within(dialog).getByText('Escribe el nombre o la razón social.')).toBeInTheDocument()
    expect(within(dialog).getByText('Escribe el número de documento.')).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText('Nombre o razón social'), ' Taller El Cruce ')
    await user.type(within(dialog).getByLabelText('Número de documento'), '222222222222')
    await user.type(within(dialog).getByLabelText('Correo'), 'pagos@elcruce')
    await user.type(within(dialog).getByLabelText('Celular'), '310-ABC')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cliente' }))
    expect(within(dialog).getByText('Ese número es del Consumidor final')).toBeInTheDocument()
    expect(within(dialog).getByText('Escribe un correo válido, como nombre@correo.com.')).toBeInTheDocument()
    expect(within(dialog).getByText('Usa solo números, espacios, +, - y paréntesis.')).toBeInTheDocument()
    expect(requests(fetchMock, 'POST', '/api/counterparties')).toHaveLength(0)

    await user.selectOptions(within(dialog).getByLabelText('Tipo de documento'), 'NIT')
    await user.clear(within(dialog).getByLabelText('Número de documento'))
    await user.type(within(dialog).getByLabelText('Número de documento'), ' 800555 ')
    await user.clear(within(dialog).getByLabelText('Correo'))
    await user.type(within(dialog).getByLabelText('Correo'), 'pagos@elcruce.co')
    await user.clear(within(dialog).getByLabelText('Celular'))
    await user.type(within(dialog).getByLabelText('Celular'), '+57 (310) 555-1234')
    const before = requests(fetchMock, 'GET', '/api/counterparties').length
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cliente' }))

    expect(await screen.findByText('Cliente creado')).toBeInTheDocument()
    expect(requests(fetchMock, 'POST', '/api/counterparties')).toEqual([
      {
        url: '/api/counterparties',
        body: {
          role: 'CLIENTE',
          name: 'Taller El Cruce',
          documentType: 'NIT',
          documentNumber: '800555',
          email: 'pagos@elcruce.co',
          phone: '+57 (310) 555-1234',
        },
      },
    ])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(requests(fetchMock, 'GET', '/api/counterparties').length).toBeGreaterThan(before))
  })

  it('crear con el documento de un proveedor: 200, toast de promocion y aviso de datos conservados', async () => {
    const promoted = { ...distrillantas, role: 'AMBOS' }
    const { user } = await openClients(
      '/ventas/clientes',
      customerRoutes(customers, { 'POST /api/counterparties': () => jsonResponse(promoted, 200) }),
    )
    await screen.findAllByText('Óscar Peña')
    await user.click(screen.getByRole('button', { name: 'Nuevo cliente' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Nombre o razón social'), 'Otro nombre')
    await user.type(within(dialog).getByLabelText('Número de documento'), '900555111')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cliente' }))

    expect(
      await screen.findByText(
        'Ya existía como proveedor: ahora también es cliente. Se conservan el nombre y los datos que ya tenía registrados.',
      ),
    ).toBeInTheDocument()
  })

  it('un 409 de documento va bajo el campo y se limpia al cambiarlo', async () => {
    const message = 'Ya existe un tercero con el documento 900123456 como CLIENTE'
    const { user } = await openClients(
      '/ventas/clientes',
      customerRoutes(customers, { 'POST /api/counterparties': () => jsonResponse({ error: message, status: 409 }, 409) }),
    )
    await screen.findAllByText('Óscar Peña')
    await user.click(screen.getByRole('button', { name: 'Nuevo cliente' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Nombre o razón social'), 'Otro')
    await user.type(within(dialog).getByLabelText('Número de documento'), '900123456')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cliente' }))

    const field = within(dialog).getByLabelText('Número de documento')
    await waitFor(() => expect(field).toHaveAccessibleDescription(message))
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(within(dialog).getByText(message)).toHaveAttribute('aria-live', 'polite')
    expect(within(dialog).getByText('No pudimos crear el cliente')).toBeInTheDocument()
    await user.type(field, '7')
    expect(within(dialog).queryByText(message)).not.toBeInTheDocument()
  })

  it('editar: precarga, avisa que afecta facturas emitidas, envia el PUT exacto y refresca', async () => {
    const { fetchMock, user } = await openClients(
      '/ventas/clientes',
      customerRoutes(customers, {
        'PUT /api/counterparties/:id': (_, body) => jsonResponse({ ...transportes, ...(body as object) }),
      }),
    )
    await waitFor(() => expect(indicator('Total por cobrar')).toHaveTextContent('$ 2.400.000'))
    await user.click(within(row('Transportes')).getByRole('button', { name: 'Editar cliente Transportes Boyacá S.A.S.' }))
    const dialog = screen.getByRole('dialog', { name: 'Editar cliente' })
    expect(within(dialog).getByText('Los cambios también se verán en las facturas ya emitidas.')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Nombre o razón social')).toHaveValue('Transportes Boyacá S.A.S.')
    expect(within(dialog).getByLabelText('Tipo de documento')).toHaveValue('NIT')
    expect(within(dialog).getByLabelText('Número de documento')).toHaveValue('900123456')
    expect(within(dialog).getByLabelText('Correo')).toHaveValue('compras@transboyaca.co')

    await user.clear(within(dialog).getByLabelText('Nombre o razón social'))
    await user.type(within(dialog).getByLabelText('Nombre o razón social'), 'Transportes del Sur')
    await user.clear(within(dialog).getByLabelText('Correo'))
    await user.type(within(dialog).getByLabelText('Celular'), '3105550000')
    const counterpartiesBefore = requests(fetchMock, 'GET', '/api/counterparties').length
    const salesBefore = requests(fetchMock, 'GET', '/api/sales').length
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Cambios guardados')).toBeInTheDocument()
    expect(requests(fetchMock, 'PUT', '/api/counterparties')).toEqual([
      {
        url: '/api/counterparties/2',
        body: { name: 'Transportes del Sur', documentType: 'NIT', documentNumber: '900123456', email: null, phone: '3105550000' },
      },
    ])
    await waitFor(() => expect(requests(fetchMock, 'GET', '/api/counterparties').length).toBeGreaterThan(counterpartiesBefore))
    await waitFor(() => expect(requests(fetchMock, 'GET', '/api/sales').length).toBeGreaterThan(salesBefore))
  })

  it('editar: un 400 queda en el modal, sin doble envio, y un 409 va bajo el documento', async () => {
    let answer: (response: Response) => void = () => {}
    let calls = 0
    const conflict = 'Ya existe un tercero con el documento 52123456'
    const { fetchMock, user } = await openClients(
      '/ventas/clientes',
      customerRoutes(customers, {
        'PUT /api/counterparties/:id': () =>
          ++calls === 1
            ? new Promise<Response>((done) => (answer = done))
            : jsonResponse({ error: conflict, status: 409 }, 409),
      }),
    )
    await screen.findAllByText('Óscar Peña')
    await user.click(within(row('Óscar')).getByRole('button', { name: 'Editar cliente Óscar Peña' }))
    const dialog = screen.getByRole('dialog')

    await user.dblClick(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
    expect(within(dialog).getByRole('button', { name: 'Guardando…' })).toBeDisabled()
    expect(requests(fetchMock, 'PUT', '/api/counterparties')).toHaveLength(1)
    answer(jsonResponse({ error: 'El correo admite hasta 150 caracteres', status: 400 }, 400))
    expect(await within(dialog).findByText('El correo admite hasta 150 caracteres')).toBeInTheDocument()
    expect(within(dialog).getByText('No pudimos guardar los cambios')).toBeInTheDocument()

    await user.clear(within(dialog).getByLabelText('Número de documento'))
    await user.type(within(dialog).getByLabelText('Número de documento'), '52123456')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(within(dialog).getByLabelText('Número de documento')).toHaveAccessibleDescription(conflict))
  })

  it('con datos digitados, Esc pide descartar en crear y en editar', async () => {
    const { user } = await openClients()
    await screen.findAllByText('Óscar Peña')
    await user.click(screen.getByRole('button', { name: 'Nuevo cliente' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Nuevo cliente' }))
    await user.type(screen.getByLabelText('Nombre o razón social'), 'Ana')
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog', { name: 'Descartar cambios' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(screen.getByLabelText('Nombre o razón social')).toHaveValue('Ana')
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Descartar cambios' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(within(row('Óscar')).getByRole('button', { name: 'Editar cliente Óscar Peña' }))
    await user.type(screen.getByLabelText('Celular'), '310')
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog', { name: 'Descartar cambios' })).toBeInTheDocument()
  })
})

describe('Proveedores', () => {
  async function openSuppliers(routes: Routes = supplierRoutes()) {
    const fetchMock = mockApi(routes)
    const router = renderRoute('/compras/proveedores')
    await screen.findByRole('heading', { name: 'Proveedores' })
    return { fetchMock, router, user: userEvent.setup() }
  }

  it('muestra los proveedores y los AMBOS con su saldo por pagar', async () => {
    const { fetchMock } = await openSuppliers()
    await waitFor(() => expect(indicator('Total por pagar')).toHaveTextContent('$ 695.000'))

    expect(requests(fetchMock, 'GET', '/api/counterparties')[0]?.url).toBe('/api/counterparties?role=PROVEEDOR')
    expect(indicator('Total de proveedores')).toHaveTextContent('2')
    expect(indicator('Con saldo pendiente')).toHaveTextContent('2')
    expect(screen.getByRole('columnheader', { name: 'Por pagar' })).toBeInTheDocument()
    expect(firstCells()).toEqual(['Distrillantas Boyacá S.A.S.', 'María RuizCliente y proveedor'])
    expect(row('Distrillantas')).toHaveTextContent('$ 595.0001 factura pendiente')
    expect(row('María')).toHaveTextContent('$ 100.0001 factura pendiente')
    expect(within(row('Distrillantas')).getByRole('button', { name: 'Editar proveedor Distrillantas Boyacá S.A.S.' })).toBeInTheDocument()
    expect(within(row('Distrillantas')).getByRole('link', { name: 'Nueva factura para Distrillantas Boyacá S.A.S.' })).toHaveAttribute(
      'href',
      '/compras/nueva?proveedor=5',
    )
    expect(screen.getByRole('link', { name: 'Volver a Facturas de compra' })).toHaveAttribute('href', '/compras')
  })

  it('vacio sin proveedores invita a crear', async () => {
    await openSuppliers(supplierRoutes([], { 'GET /api/purchases': () => jsonResponse([]) }))
    expect(await screen.findByText('Aún no registras proveedores. Crea el primero.')).toBeInTheDocument()
  })

  it('sin proveedores el unico primario es Nuevo proveedor del encabezado', async () => {
    await openSuppliers(supplierRoutes([], { 'GET /api/purchases': () => jsonResponse([]) }))

    expect(await screen.findByText('Aún no registras proveedores. Crea el primero.')).toBeInTheDocument()
    const [primary, ...rest] = primaryActions()
    expect(rest).toHaveLength(0)
    expect(primary).toHaveTextContent('Nuevo proveedor')
    expect(emptyStateOf('Aún no registras proveedores. Crea el primero.')).not.toContainElement(primary ?? null)
    expect(within(emptyStateOf('Aún no registras proveedores. Crea el primero.')).getByRole('button', { name: 'Nuevo proveedor' })).toHaveAttribute('data-variant', 'secondary')
  })

  it('vacio por filtros con saldo pendiente', async () => {
    await openSuppliers(supplierRoutes(suppliers, { 'GET /api/purchases': () => jsonResponse([]) }))
    await screen.findAllByText('Distrillantas Boyacá S.A.S.')
    fireEvent.change(screen.getByLabelText('Saldo'), { target: { value: 'pendiente' } })
    expect(await screen.findByText('No hay proveedores con esos filtros.')).toBeInTheDocument()
  })

  it('error de los proveedores y error de solo las compras', async () => {
    await openSuppliers(supplierRoutes(suppliers, { 'GET /api/counterparties': fail }))
    expect(await screen.findByText('No pudimos cargar los proveedores.')).toBeInTheDocument()
  })

  it('si fallan las compras la tabla sigue con el saldo en raya', async () => {
    await openSuppliers(supplierRoutes(suppliers, { 'GET /api/purchases': fail }))
    expect(await screen.findByText('No pudimos cargar los saldos.')).toBeInTheDocument()
    expect(within(row('Distrillantas')).getAllByText(EMPTY_VALUE)).toHaveLength(3)
  })

  it('crear un proveedor: POST con PROVEEDOR, 201 y 200 por promocion', async () => {
    let status = 201
    const { fetchMock, user } = await openSuppliers(
      supplierRoutes(suppliers, {
        'POST /api/counterparties': (_, body) =>
          status === 201
            ? jsonResponse({ id: 40, email: null, phone: null, ...(body as object) }, 201)
            : jsonResponse({ ...transportes, role: 'AMBOS' }, 200),
      }),
    )
    await screen.findAllByText('Distrillantas Boyacá S.A.S.')

    await user.click(screen.getByRole('button', { name: 'Nuevo proveedor' }))
    let dialog = screen.getByRole('dialog', { name: 'Nuevo proveedor' })
    await user.type(within(dialog).getByLabelText('Nombre o razón social'), 'Importadora Andina')
    await user.type(within(dialog).getByLabelText('Número de documento'), '900987654')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar proveedor' }))
    expect(await screen.findByText('Proveedor creado')).toBeInTheDocument()
    expect(requests(fetchMock, 'POST', '/api/counterparties')[0]?.body).toEqual({
      role: 'PROVEEDOR',
      name: 'Importadora Andina',
      documentType: 'CC',
      documentNumber: '900987654',
    })

    status = 200
    await user.click(screen.getByRole('button', { name: 'Nuevo proveedor' }))
    dialog = screen.getByRole('dialog', { name: 'Nuevo proveedor' })
    await user.type(within(dialog).getByLabelText('Nombre o razón social'), 'Otro')
    await user.type(within(dialog).getByLabelText('Número de documento'), '900123456')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar proveedor' }))
    expect(
      await screen.findByText(
        'Ya existía como cliente: ahora también es proveedor. Se conservan el nombre y los datos que ya tenía registrados.',
      ),
    ).toBeInTheDocument()
  })
})

describe('Botones de los encabezados', () => {
  it('Facturas de venta lleva a Clientes y Facturas de compra a Proveedores', async () => {
    mockApi({ ...customerRoutes(), 'GET /api/purchases': () => jsonResponse(purchases) })
    const user = userEvent.setup()
    const router = renderRoute('/ventas')
    await screen.findByRole('heading', { name: 'Facturas de venta' })

    await user.click(screen.getByRole('link', { name: 'Clientes' }))
    expect(router.state.location.pathname).toBe('/ventas/clientes')
    expect(await screen.findByRole('heading', { name: 'Clientes' })).toBeInTheDocument()

    await router.navigate('/compras')
    await screen.findByRole('heading', { name: 'Facturas de compra' })
    await user.click(screen.getByRole('link', { name: 'Proveedores' }))
    expect(router.state.location.pathname).toBe('/compras/proveedores')
    expect(await screen.findByRole('heading', { name: 'Proveedores' })).toBeInTheDocument()
  })
})
