import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { saveToken } from '../auth/session'
import { CATEGORY_COLORS } from '../inventory/categoryForm'
import { emptyStateOf, jsonResponse, primaryActions, renderRoute, validToken } from '../test/utils'

type Handler = (body: unknown) => Response
type Routes = Record<string, Handler>

const iva = { id: 1, name: 'IVA', rate: 0.19, isVat: true }
const consumo = { id: 2, name: 'Impoconsumo', rate: 0.08, isVat: false }

const categories = [
  { id: 7, name: 'REPUESTOS DEMO', color: '#ff3b30', yellowStockMin: 10, redStockMin: 3, targetMargin: 0.3, taxTypes: [iva] },
  { id: 3, name: 'BATERIAS', color: '#1d4ed8', yellowStockMin: 0, redStockMin: 0, targetMargin: 0, taxTypes: [] },
]

const products = [
  { id: 1, code: 'DEMO-001', description: 'Aceite', purchaseCost: 30000, quantity: 50, taxAmount: 5700, suggestedPrice: 42857, categoryId: 7, categoryName: 'REPUESTOS DEMO' },
  { id: 2, code: 'DEMO-002', description: 'Filtro', purchaseCost: 15000, quantity: 12, taxAmount: 2850, suggestedPrice: 21428, categoryId: 7, categoryName: 'REPUESTOS DEMO' },
]

function fullRoutes(): Routes {
  return {
    'GET /api/inventory/categories': () => jsonResponse(categories),
    'GET /api/inventory/products': () => jsonResponse(products),
    'GET /api/inventory/tax-types': () => jsonResponse([consumo, iva]),
    'POST /api/inventory/categories': (body) => jsonResponse({ id: 9, ...(body as object), taxTypes: [] }, 201),
    'PUT /api/inventory/categories/7': (body) => jsonResponse({ id: 7, ...(body as object), taxTypes: [] }),
  }
}

function mockApi(routes: Routes) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const handler = routes[`${init?.method ?? 'GET'} ${url.split('?')[0] ?? ''}`]
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    return Promise.resolve(handler ? handler(body) : jsonResponse({ error: 'Recurso no encontrado', status: 404 }, 404))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function bodies(fetchMock: ReturnType<typeof mockApi>, method: string) {
  return fetchMock.mock.calls
    .filter(([, init]) => init?.method === method)
    .map(([, init]) => JSON.parse(String(init?.body)) as Record<string, unknown>)
}

async function setup(routes: Routes = fullRoutes()) {
  const fetchMock = mockApi(routes)
  const user = userEvent.setup()
  renderRoute('/inventario/categorias')
  await screen.findByRole('button', { name: 'Editar REPUESTOS DEMO' })
  return { fetchMock, user }
}

describe('categorias', () => {
  beforeEach(() => {
    saveToken(validToken())
  })

  it('lista umbrales, margen, impuestos y productos por categoria', async () => {
    await setup()

    expect(screen.getByRole('heading', { name: 'Categorías' })).toBeInTheDocument()
    expect(within(screen.getByRole('banner')).getByRole('navigation', { name: 'Miga de pan' })).toHaveTextContent('Inventario/Categorías')
    const row = screen.getByText('REPUESTOS DEMO').closest('tr') as HTMLElement
    expect(await within(row).findByText('2')).toBeInTheDocument()
    expect(within(row).getByText('10')).toBeInTheDocument()
    expect(within(row).getByText('3')).toBeInTheDocument()
    expect(within(row).getByText('30 %')).toBeInTheDocument()
    expect(within(row).getByText('IVA')).toBeInTheDocument()
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    expect(rows.map((item) => item.querySelector('td')?.textContent)).toEqual(['BATERIAS', 'REPUESTOS DEMO'])
  })

  it('crea con el margen como fraccion y el IVA vigente preseleccionado', async () => {
    const { fetchMock, user } = await setup()
    await user.click(screen.getByRole('button', { name: 'Nueva categoría' }))
    const dialog = await screen.findByRole('dialog', { name: 'Nueva categoría' })

    expect(within(dialog).getByLabelText('Nombre')).toHaveFocus()
    expect(await within(dialog).findByRole('checkbox', { name: 'IVA (19 %)' })).toBeChecked()
    expect(within(dialog).getByRole('checkbox', { name: 'Impoconsumo (8 %)' })).not.toBeChecked()
    expect(
      within(dialog).getByText('De 0 a 100. Cambiar el margen actualiza el precio sugerido de los productos de esta categoría.'),
    ).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText('Nombre'), 'Lubricantes')
    await user.click(within(dialog).getByRole('radio', { name: 'Verde' }))
    await user.clear(within(dialog).getByLabelText('Umbral amarillo'))
    await user.type(within(dialog).getByLabelText('Umbral amarillo'), '8')
    await user.type(within(dialog).getByLabelText('Margen objetivo (%)'), '32,5')
    await user.click(within(dialog).getByRole('checkbox', { name: 'Impoconsumo (8 %)' }))
    await user.click(within(dialog).getByRole('button', { name: 'Guardar categoría' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(bodies(fetchMock, 'POST')).toEqual([
      {
        name: 'Lubricantes',
        color: CATEGORY_COLORS.find((color) => color.label === 'Verde')?.value,
        yellowStockMin: 8,
        redStockMin: 2,
        targetMargin: 0.325,
        taxTypeIds: [1, 2],
      },
    ])
    expect(await screen.findByText('Categoría guardada')).toBeInTheDocument()
  })

  it('valida los umbrales y el margen antes de enviar', async () => {
    const { fetchMock, user } = await setup()
    await user.click(screen.getByRole('button', { name: 'Nueva categoría' }))
    const dialog = await screen.findByRole('dialog', { name: 'Nueva categoría' })
    await within(dialog).findByRole('checkbox', { name: 'IVA (19 %)' })

    await user.type(within(dialog).getByLabelText('Nombre'), 'Lubricantes')
    await user.clear(within(dialog).getByLabelText('Umbral rojo'))
    await user.type(within(dialog).getByLabelText('Umbral rojo'), '9')
    await user.tab()
    expect(within(dialog).getByText('El umbral rojo no puede ser mayor que el amarillo.')).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText('Margen objetivo (%)'), '120')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar categoría' }))
    expect(within(dialog).getByText('El margen debe estar entre 0 y 100.')).toBeInTheDocument()
    expect(bodies(fetchMock, 'POST')).toHaveLength(0)
  })

  it('edita con lo guardado y muestra el 409 de nombre bajo el campo Nombre', async () => {
    const { fetchMock, user } = await setup({
      ...fullRoutes(),
      'PUT /api/inventory/categories/7': () => jsonResponse({ error: 'Ya existe una categoria con el nombre FILTROS', status: 409 }, 409),
    })
    await user.click(screen.getByRole('button', { name: 'Editar REPUESTOS DEMO' }))
    const dialog = await screen.findByRole('dialog', { name: 'Editar categoría' })

    expect(within(dialog).getByLabelText('Margen objetivo (%)')).toHaveValue('30')
    expect(within(dialog).getByLabelText('Umbral amarillo')).toHaveValue('10')
    expect(await within(dialog).findByRole('checkbox', { name: 'IVA (19 %)' })).toBeChecked()
    expect(within(dialog).getByRole('radio', { name: 'Color actual' })).toBeChecked()

    await user.clear(within(dialog).getByLabelText('Nombre'))
    await user.type(within(dialog).getByLabelText('Nombre'), 'Filtros')
    await user.clear(within(dialog).getByLabelText('Margen objetivo (%)'))
    await user.type(within(dialog).getByLabelText('Margen objetivo (%)'), '40')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar categoría' }))

    const name = within(dialog).getByLabelText('Nombre')
    await waitFor(() => expect(name).toHaveAccessibleDescription('Ya existe una categoria con el nombre FILTROS'))
    expect(name).toHaveFocus()
    expect(bodies(fetchMock, 'PUT')).toEqual([
      { name: 'Filtros', color: '#ff3b30', yellowStockMin: 10, redStockMin: 3, targetMargin: 0.4, taxTypeIds: [1] },
    ])
  })

  it('avisa un nombre repetido sin llamar al backend', async () => {
    const { fetchMock, user } = await setup()
    await user.click(screen.getByRole('button', { name: 'Nueva categoría' }))
    const dialog = await screen.findByRole('dialog', { name: 'Nueva categoría' })
    await within(dialog).findByRole('checkbox', { name: 'IVA (19 %)' })

    await user.type(within(dialog).getByLabelText('Nombre'), 'baterías')
    await user.type(within(dialog).getByLabelText('Margen objetivo (%)'), '20')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar categoría' }))

    expect(within(dialog).getByLabelText('Nombre')).toHaveAccessibleDescription('Ya existe una categoría con ese nombre.')
    expect(bodies(fetchMock, 'POST')).toHaveLength(0)
  })

  it('Esc con datos digitados pide confirmar; sin datos cierra', async () => {
    const { user } = await setup()
    await user.click(screen.getByRole('button', { name: 'Nueva categoría' }))
    await screen.findByRole('dialog', { name: 'Nueva categoría' })
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Nueva categoría' }))
    await user.type(within(await screen.findByRole('dialog')).getByLabelText('Nombre'), 'Plumillas')
    await user.keyboard('{Escape}')
    const confirm = await screen.findByRole('dialog', { name: 'Descartar cambios' })
    await user.click(within(confirm).getByRole('button', { name: 'Seguir editando' }))
    expect(within(await screen.findByRole('dialog', { name: 'Nueva categoría' })).getByLabelText('Nombre')).toHaveValue('Plumillas')

    await user.keyboard('{Escape}')
    await user.click(within(await screen.findByRole('dialog', { name: 'Descartar cambios' })).getByRole('button', { name: 'Descartar cambios' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('sin categorias el unico primario es Nueva categoria del encabezado', async () => {
    mockApi({ ...fullRoutes(), 'GET /api/inventory/categories': () => jsonResponse([]), 'GET /api/inventory/products': () => jsonResponse([]) })
    renderRoute('/inventario/categorias')

    const message = 'Aún no tienes categorías. Crea la primera para empezar a cargar productos.'
    expect(await screen.findByText(message)).toBeInTheDocument()
    const [primary, ...rest] = primaryActions()
    expect(rest).toHaveLength(0)
    expect(primary).toHaveTextContent('Nueva categoría')
    expect(emptyStateOf(message)).not.toContainElement(primary ?? null)
    expect(within(emptyStateOf(message)).getByRole('button', { name: 'Nueva categoría' })).toHaveAttribute('data-variant', 'secondary')
  })

  it('un error al cargar las categorias ofrece reintentar', async () => {
    let calls = 0
    mockApi({
      ...fullRoutes(),
      'GET /api/inventory/categories': () => {
        calls += 1
        return calls === 1 ? jsonResponse({ error: 'Error interno', status: 500 }, 500) : jsonResponse(categories)
      },
    })
    const user = userEvent.setup()
    renderRoute('/inventario/categorias')

    await user.click(await screen.findByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('button', { name: 'Editar REPUESTOS DEMO' })).toBeInTheDocument()
  })
})
