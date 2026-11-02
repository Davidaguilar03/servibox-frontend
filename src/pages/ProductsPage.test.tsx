import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { saveToken } from '../auth/session'
import { URL_TEXT_DEBOUNCE_MS } from '../lib/useUrlTextParam'
import { emptyStateOf, jsonResponse, primaryActions, renderRoute, typeWithoutPause, validToken } from '../test/utils'

type Routes = Record<string, () => Response>

const categories = [
  { id: 1, name: 'LLANTAS', color: '#d32f2f', yellowStockMin: 10, redStockMin: 3, targetMargin: 0.3, taxTypes: [] },
  { id: 2, name: 'BATERÍAS', color: '#1d4ed8', yellowStockMin: null, redStockMin: null, targetMargin: 0.25, taxTypes: [] },
]

const product = (id: number, fields: Record<string, unknown>) => ({
  id,
  code: `LL-${String(id).padStart(3, '0')}`,
  description: `Llanta ${id}`,
  purchaseCost: 100000,
  quantity: 20,
  taxAmount: 19000,
  suggestedPrice: 180000,
  categoryId: 1,
  categoryName: 'LLANTAS',
  ...fields,
})

const products = [
  product(1, { code: 'LL-004', description: 'Llanta Pirelli 225/45 R18', quantity: 0, purchaseCost: 168000, suggestedPrice: 307440 }),
  product(2, { code: 'BAT-004', description: 'Batería MAC 42 Ah', quantity: 2, categoryId: 2, categoryName: 'BATERÍAS', purchaseCost: 210000, suggestedPrice: 333060 }),
  product(3, { code: 'LL-003', description: 'Llanta Goodyear 195/65 R15', quantity: 5, purchaseCost: 105000, suggestedPrice: 192150 }),
  product(4, { code: 'LL-001', description: 'Llanta Michelín 205/55 R16', quantity: 24, purchaseCost: 118000, suggestedPrice: 215940 }),
]

function mockApi(routes: Routes) {
  const fetchMock = vi.fn((url: string) => {
    const handler = routes[url.split('?')[0] ?? '']
    return Promise.resolve(handler ? handler() : jsonResponse({ error: 'No encontrado', status: 404 }, 404))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const fullRoutes = (list: unknown[] = products): Routes => ({
  '/api/inventory/products': () => jsonResponse(list),
  '/api/inventory/categories': () => jsonResponse(categories),
})

function indicator(label: string) {
  return screen.getByText(label).parentElement as HTMLElement
}

/** La tabla con datos, no el skeleton. */
async function loaded() {
  await screen.findAllByRole('link', { name: /^Editar / })
}

function codes() {
  return within(screen.getByRole('table'))
    .getAllByRole('row')
    .slice(1)
    .map((row) => row.querySelector('td')?.textContent)
}

describe('productos', () => {
  beforeEach(() => {
    saveToken(validToken())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('muestra indicadores, categoria y la tabla con su estado', async () => {
    mockApi(fullRoutes())
    renderRoute('/inventario')

    expect(await screen.findByRole('heading', { name: 'Productos' })).toBeInTheDocument()
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(document.title).toBe('Productos · ServiBox')
    expect(screen.getByRole('link', { name: 'Nuevo producto' })).toHaveAttribute('href', '/inventario/nuevo')
    expect(screen.getByRole('link', { name: 'Categorías' })).toHaveAttribute('href', '/inventario/categorias')

    expect(await within(indicator('Total de productos')).findByText('4')).toBeInTheDocument()
    expect(within(indicator('En stock')).getByText('3')).toBeInTheDocument()
    // LL-004 sin stock, BAT-004 critico (rojo por defecto 2) y LL-003 bajo (amarillo 10).
    expect(await within(indicator('Con alerta de stock')).findByText('3')).toBeInTheDocument()
    expect(within(indicator('Con alerta de stock')).getByText('1 sin stock')).toBeInTheDocument()
    expect(within(indicator('Valor en inventario')).getByText('$ 3.777.000')).toBeInTheDocument()

    const category = screen.getByRole('combobox', { name: 'Categoría' })
    expect(category).toHaveValue('')
    expect(within(category).getAllByRole('option').map((option) => option.textContent)).toEqual(['Todas las categorías', 'BATERÍAS', 'LLANTAS'])

    expect(codes()).toEqual(['BAT-004', 'LL-001', 'LL-003', 'LL-004'])
    const table = screen.getByRole('table')
    expect(within(table).getByRole('columnheader', { name: 'Precio sugerido sin IVA' })).toBeInTheDocument()
    const row = within(table).getByText('LL-004').closest('tr') as HTMLElement
    expect(within(row).getByText('Sin stock')).toBeInTheDocument()
    expect(within(row).getByText('$ 307.440')).toBeInTheDocument()
    expect(within(row).getByRole('link', { name: 'Editar LL-004' })).toHaveAttribute('href', '/inventario/1/editar')
    expect(within(within(table).getByText('BAT-004').closest('tr') as HTMLElement).getByText('Stock crítico')).toBeInTheDocument()
    expect(within(within(table).getByText('LL-003').closest('tr') as HTMLElement).getByText('Stock bajo')).toBeInTheDocument()
    expect(within(within(table).getByText('LL-001').closest('tr') as HTMLElement).getByText('Disponible')).toBeInTheDocument()
    const cards = screen.getByRole('list', { name: 'Productos' })
    const mobileCard = within(cards).getByText('LL-004').closest('li') as HTMLElement
    expect(mobileCard).toHaveTextContent('Costo sin IVA $ 168.000')
    expect(mobileCard).toHaveTextContent('Precio sugerido sin IVA $ 307.440')
    expect(within(mobileCard).getByRole('link', { name: 'Editar LL-004' })).toHaveAttribute('href', '/inventario/1/editar')
  })

  it('muestra completo el valor de inventario redondeado solo al leer y mantiene los conteos', async () => {
    mockApi(fullRoutes([product(1, { quantity: 9, purchaseCost: 12345678.91 })]))
    renderRoute('/inventario')

    expect(await within(indicator('Valor en inventario')).findByText('$ 111.111.110')).toBeInTheDocument()
    expect(within(indicator('Total de productos')).getByText('1')).toBeInTheDocument()
    expect(within(indicator('En stock')).getByText('1')).toBeInTheDocument()
  })

  it('filtra por categoria, estado y busqueda, y lo guarda en la URL', async () => {
    mockApi(fullRoutes())
    const user = userEvent.setup()
    const router = renderRoute('/inventario')
    await loaded()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Categoría' }), '1')
    expect(router.state.location.search).toBe('?categoria=1')
    expect(codes()).toEqual(['LL-001', 'LL-003', 'LL-004'])

    await user.selectOptions(screen.getByLabelText('Estado de stock'), 'SIN_STOCK')
    expect(router.state.location.search).toBe('?categoria=1&estado=SIN_STOCK')
    expect(codes()).toEqual(['LL-004'])

    await user.click(screen.getAllByRole('button', { name: 'Limpiar filtros' }).at(-1)!)
    expect(router.state.location.search).toBe('')
    expect(screen.getByRole('combobox', { name: 'Categoría' })).toHaveValue('')
    // La espera del buscador corre con el reloj simulado; avanza solo para que userEvent siga funcionando.
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'], shouldAdvanceTime: true })
    await user.type(screen.getByLabelText('Buscar'), 'michelin')
    await act(() => vi.advanceTimersByTimeAsync(URL_TEXT_DEBOUNCE_MS))
    expect(codes()).toEqual(['LL-001'])
    expect(router.state.location.search).toBe('?q=michelin')

    await user.selectOptions(screen.getByLabelText('Ordenar por'), 'stock-asc')
    expect(router.state.location.search).toBe('?q=michelin&orden=stock-asc')
  })

  it('lee categoria por id, conserva filtros al cambiarla y restaura la pagina al volver', async () => {
    const many = Array.from({ length: 30 }, (_, index) => product(index + 1, {
      code: `P-${String(index + 1).padStart(2, '0')}`,
      categoryId: index < 15 ? 1 : 2,
    }))
    mockApi(fullRoutes(many))
    const user = userEvent.setup()
    const router = renderRoute('/inventario?q=P&estado=NORMAL&orden=stock-desc&pagina=2')
    await loaded()
    expect(codes()).toHaveLength(5)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Categoría' }), '2')
    expect(router.state.location.search).toBe('?q=P&categoria=2&estado=NORMAL&orden=stock-desc')
    expect(screen.getByRole('combobox', { name: 'Categoría' })).toHaveValue('2')
    expect(codes()).toHaveLength(15)
    expect(within(indicator('Total de productos')).getByText('30')).toBeInTheDocument()

    await act(() => router.navigate(-1))
    expect(router.state.location.search).toBe('?q=P&estado=NORMAL&orden=stock-desc&pagina=2')
    expect(screen.getByRole('combobox', { name: 'Categoría' })).toHaveValue('')
    expect(codes()).toHaveLength(5)
    await act(() => router.navigate(1))
    expect(screen.getByRole('combobox', { name: 'Categoría' })).toHaveValue('2')
  })

  it('acepta URL de categoria existente, y una eliminada se trata como Todas', async () => {
    mockApi(fullRoutes())
    const router = renderRoute('/inventario?categoria=1')
    await loaded()
    expect(screen.getByRole('combobox', { name: 'Categoría' })).toHaveValue('1')
    expect(codes()).toEqual(['LL-001', 'LL-003', 'LL-004'])

    await act(() => router.navigate('/inventario?categoria=999'))
    expect(screen.getByRole('combobox', { name: 'Categoría' })).toHaveValue('')
    expect(codes()).toHaveLength(4)
    expect(router.state.location.search).toBe('?categoria=999')
  })

  it('ofrece muchas categorias y nombres largos en un solo selector', async () => {
    const manyCategories = Array.from({ length: 40 }, (_, index) => ({
      ...categories[0]!, id: index + 1, name: `CATEGORÍA CON UN NOMBRE EXTENSO ${index + 1}`,
    }))
    mockApi({
      '/api/inventory/products': () => jsonResponse(products),
      '/api/inventory/categories': () => jsonResponse(manyCategories),
    })
    const user = userEvent.setup()
    const router = renderRoute('/inventario')
    await loaded()

    const category = screen.getByRole('combobox', { name: 'Categoría' })
    expect(within(category).getAllByRole('option')).toHaveLength(41)
    expect(within(category).getByRole('option', { name: 'CATEGORÍA CON UN NOMBRE EXTENSO 40' })).toHaveValue('40')
    expect(screen.queryByRole('tablist', { name: 'Categorías' })).not.toBeInTheDocument()
    await user.selectOptions(category, '40')
    expect(router.state.location.search).toBe('?categoria=40')
    expect(screen.getByText('No hay productos con esos filtros.')).toBeInTheDocument()
  })

  it('lee los filtros de la URL al entrar y el enlace Editar los conserva', async () => {
    mockApi(fullRoutes())
    const user = userEvent.setup()
    const router = renderRoute('/inventario?orden=stock-desc&estado=NORMAL')

    await loaded()
    expect(screen.getByLabelText('Ordenar por')).toHaveValue('stock-desc')
    expect(codes()).toEqual(['LL-001'])

    await user.click(within(screen.getByRole('table')).getByRole('link', { name: 'Editar LL-001' }))
    expect(router.state.location.pathname).toBe('/inventario/4/editar')
    expect(router.state.location.search).toBe('?orden=stock-desc&estado=NORMAL')
    // El listado de atras del modal sigue con sus filtros.
    expect(codes()).toEqual(['LL-001'])
  })

  it('escribir sin pausa filtra con todo el texto; Limpiar lo vacia y atras lo restaura', async () => {
    mockApi(fullRoutes())
    const router = renderRoute('/inventario')
    await loaded()

    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'], shouldAdvanceTime: true })
    const input = screen.getByLabelText<HTMLInputElement>('Buscar')
    typeWithoutPause(input, 'BAT-004')
    expect(input).toHaveValue('BAT-004')
    await act(() => vi.advanceTimersByTimeAsync(URL_TEXT_DEBOUNCE_MS))
    expect(router.state.location.search).toBe('?q=BAT-004')
    expect(router.state.historyAction).toBe('REPLACE')
    expect(codes()).toEqual(['BAT-004'])

    await userEvent.click(screen.getAllByRole('button', { name: 'Limpiar filtros' }).at(-1)!)
    expect(router.state.location.search).toBe('')
    expect(input).toHaveValue('')

    await act(() => router.navigate(-1))
    expect(router.state.location.search).toBe('?q=BAT-004')
    expect(input).toHaveValue('BAT-004')
    expect(codes()).toEqual(['BAT-004'])
  })

  it('pagina de 25 en 25 con la pagina en la URL', async () => {
    const many = Array.from({ length: 30 }, (_, index) => product(index + 1, { code: `P-${String(index + 1).padStart(2, '0')}` }))
    mockApi(fullRoutes(many))
    const user = userEvent.setup()
    const router = renderRoute('/inventario')

    await loaded()
    expect(codes()).toHaveLength(25)
    expect(screen.getByText('1 a 25 de 30 productos')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Página 2' }))
    expect(router.state.location.search).toBe('?pagina=2')
    expect(codes()).toEqual(['P-26', 'P-27', 'P-28', 'P-29', 'P-30'])
    expect(screen.getByText('26 a 30 de 30 productos')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Estado de stock'), 'NORMAL')
    expect(router.state.location.search).toBe('?estado=NORMAL')
  })

  it('sin productos invita a crear el primero', async () => {
    mockApi(fullRoutes([]))
    renderRoute('/inventario')

    expect(await screen.findByText('Aún no tienes productos. Crea el primero.')).toBeInTheDocument()
    expect(within(indicator('Total de productos')).getByText('0')).toBeInTheDocument()
  })

  it('sin productos el unico primario es Nuevo producto del encabezado', async () => {
    mockApi(fullRoutes([]))
    renderRoute('/inventario')

    expect(await screen.findByText('Aún no tienes productos. Crea el primero.')).toBeInTheDocument()
    const [primary, ...rest] = primaryActions()
    expect(rest).toHaveLength(0)
    expect(primary).toHaveTextContent('Nuevo producto')
    expect(emptyStateOf('Aún no tienes productos. Crea el primero.')).not.toContainElement(primary ?? null)
    expect(within(emptyStateOf('Aún no tienes productos. Crea el primero.')).getByRole('link', { name: 'Nuevo producto' })).toHaveAttribute('data-variant', 'secondary')
  })

  it('sin resultados por filtros ofrece limpiarlos', async () => {
    mockApi(fullRoutes())
    const user = userEvent.setup()
    const router = renderRoute('/inventario?q=zzz')

    expect(await screen.findByText('No hay productos con esos filtros.')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Limpiar filtros' }).at(-1)!)
    expect(router.state.location.search).toBe('')
    expect(codes()).toHaveLength(4)
  })

  it('un error en categorias no tumba los indicadores que solo usan productos', async () => {
    let categoryCalls = 0
    mockApi({
      '/api/inventory/products': () => jsonResponse(products),
      '/api/inventory/categories': () => {
        categoryCalls += 1
        return categoryCalls === 1 ? jsonResponse({ error: 'Error interno', status: 500 }, 500) : jsonResponse(categories)
      },
    })
    const user = userEvent.setup()
    renderRoute('/inventario')

    expect(await within(indicator('Total de productos')).findByText('4')).toBeInTheDocument()
    expect(within(indicator('Con alerta de stock')).getByText('No pudimos cargar este dato.')).toBeInTheDocument()
    expect(screen.getByText('No pudimos cargar las categorías.')).toBeInTheDocument()
    expect(screen.getByText('No pudimos cargar los productos.')).toBeInTheDocument()

    await user.click(within(screen.getByRole('region', { name: 'Listado de productos' })).getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(screen.queryByText('No pudimos cargar los productos.')).not.toBeInTheDocument())
    expect(codes()).toHaveLength(4)
    expect(within(indicator('Con alerta de stock')).getByText('3')).toBeInTheDocument()
  })
})

describe('aviso de configuracion financiera', () => {
  beforeEach(() => {
    saveToken(validToken())
  })

  it('aparece con gastos, renta e ICA en 0 y lleva a la pestana financiera', async () => {
    mockApi({
      ...fullRoutes(),
      '/api/inventory/financial-settings': () => jsonResponse({ expensesRate: 0, dianRate: 0, icaRate: 0, cardCommissionRate: 0 }),
    })
    renderRoute('/inventario')

    const notice = (await screen.findByText(/Tu configuración financiera está en 0 %/)).closest('[role="status"]') as HTMLElement
    expect(notice).toHaveTextContent('por eso el precio sugerido es igual al costo.')
    expect(within(notice).getByRole('link', { name: 'Configuración' })).toHaveAttribute('href', '/configuracion?tab=financiera')
    expect(primaryActions()).toHaveLength(1)
  })

  it('no aparece si alguno es distinto de 0', async () => {
    for (const settings of [
      { expensesRate: 0.343, dianRate: 0, icaRate: 0 },
      { expensesRate: 0, dianRate: 0.35, icaRate: 0 },
      { expensesRate: 0, dianRate: 0, icaRate: 0.0082 },
    ]) {
      const fetchMock = mockApi({ ...fullRoutes(), '/api/inventory/financial-settings': () => jsonResponse({ ...settings, cardCommissionRate: 0 }) })
      renderRoute('/inventario')
      await loaded()
      await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/inventory/financial-settings', expect.anything()))
      expect(screen.queryByText(/Tu configuración financiera está en 0 %/)).not.toBeInTheDocument()
      cleanup()
    }
  })
})
