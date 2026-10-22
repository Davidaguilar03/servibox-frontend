import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { saveToken } from '../auth/session'
import { GENERIC_ERROR_MESSAGE } from '../lib/errorMessage'
import { jsonResponse, renderRoute, validToken } from '../test/utils'

type Handler = (body: unknown) => Response
type Routes = Record<string, Handler>

const categories = [
  { id: 4, name: 'REPUESTOS DEMO', color: '#ff3b30', yellowStockMin: 10, redStockMin: 3, targetMargin: 0.3, taxTypes: [] },
  { id: 1, name: 'LLANTAS', color: '#d32f2f', yellowStockMin: 5, redStockMin: 2, targetMargin: 0.25, taxTypes: [] },
]

const demo = {
  id: 1,
  code: 'DEMO-001',
  description: 'Aceite 20W50 galon',
  purchaseCost: 30000,
  quantity: 50,
  taxAmount: 5700,
  suggestedPrice: 42857.14,
  categoryId: 4,
  categoryName: 'REPUESTOS DEMO',
}

function fullRoutes(): Routes {
  return {
    'GET /api/inventory/categories': () => jsonResponse(categories),
    'GET /api/inventory/products': () => jsonResponse([demo]),
    'GET /api/inventory/products/1': () => jsonResponse(demo),
    'POST /api/inventory/products': (body) => jsonResponse({ ...demo, ...(body as object), id: 9 }, 201),
    'PUT /api/inventory/products/1': (body) => jsonResponse({ ...demo, ...(body as object) }),
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

async function fillNew(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Código'), 'LL-020')
  await user.type(screen.getByLabelText('Descripción'), 'Llanta Hankook 185/65 R14')
  await user.selectOptions(await screen.findByLabelText('Categoría'), '1')
  await user.type(screen.getByLabelText('Costo de compra sin IVA'), '98.500')
  await user.clear(screen.getByLabelText('Stock inicial'))
  await user.type(screen.getByLabelText('Stock inicial'), '6')
}

describe('formulario de producto', () => {
  beforeEach(() => {
    saveToken(validToken())
  })

  it('valida al salir del campo y al guardar', async () => {
    const fetchMock = mockApi(fullRoutes())
    const user = userEvent.setup()
    renderRoute('/inventario/nuevo')

    expect(await screen.findByRole('heading', { name: 'Nuevo producto' })).toBeInTheDocument()
    expect(screen.getByLabelText('IVA del costo')).toHaveValue('Se calcula al guardar')
    expect(screen.getByLabelText('Precio sugerido sin IVA')).toHaveValue('Se calcula al guardar')

    await user.click(screen.getByLabelText('Código'))
    await user.tab()
    expect(screen.getByText('Escribe el código del producto.')).toBeInTheDocument()
    expect(screen.queryByText('Escribe la descripción del producto.')).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Costo de compra sin IVA'), '0')
    await user.click(screen.getByRole('button', { name: 'Guardar producto' }))
    expect(screen.getByText('Escribe la descripción del producto.')).toBeInTheDocument()
    expect(screen.getByText('Elige una categoría.')).toBeInTheDocument()
    expect(screen.getByText('El costo debe ser un valor mayor que cero.')).toBeInTheDocument()
    expect(bodies(fetchMock, 'POST')).toHaveLength(0)
  })

  it('crea con el cuerpo exacto y vuelve al listado con sus filtros', async () => {
    const fetchMock = mockApi(fullRoutes())
    const user = userEvent.setup()
    const router = renderRoute('/inventario?estado=BAJO')
    await screen.findByRole('heading', { name: 'Productos' })
    await user.click(screen.getByRole('link', { name: 'Nuevo producto' }))
    await screen.findByRole('heading', { name: 'Nuevo producto' })

    await fillNew(user)
    await user.click(screen.getByRole('button', { name: 'Guardar producto' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/inventario'))
    expect(router.state.location.search).toBe('?estado=BAJO')
    expect(bodies(fetchMock, 'POST')).toEqual([
      { code: 'LL-020', description: 'Llanta Hankook 185/65 R14', purchaseCost: 98500, quantity: 6, categoryId: 1 },
    ])
    expect(await screen.findByText('Producto guardado')).toBeInTheDocument()
  })

  it('edita sin enviar quantity y muestra stock, IVA y precio de solo lectura', async () => {
    const fetchMock = mockApi(fullRoutes())
    const user = userEvent.setup()
    const router = renderRoute('/inventario/1/editar')

    expect(await screen.findByRole('heading', { name: 'Editar producto' })).toBeInTheDocument()
    expect(screen.getByLabelText('Stock')).toHaveValue('50')
    expect(screen.getByLabelText('Stock')).toHaveAttribute('readonly')
    expect(screen.getByText('El stock cambia con las ventas y las compras; no se edita aquí.')).toBeInTheDocument()
    expect(screen.getByLabelText('IVA del costo')).toHaveValue('$ 5.700')
    expect(screen.getByLabelText('Precio sugerido sin IVA')).toHaveValue('$ 42.857')
    expect(await screen.findByLabelText('Categoría')).toHaveValue('4')

    await user.clear(screen.getByLabelText('Costo de compra sin IVA'))
    await user.type(screen.getByLabelText('Costo de compra sin IVA'), '32000')
    await user.click(screen.getByRole('button', { name: 'Guardar producto' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/inventario'))
    const [put] = bodies(fetchMock, 'PUT')
    expect(put).toEqual({ code: 'DEMO-001', description: 'Aceite 20W50 galon', purchaseCost: 32000, categoryId: 4 })
    expect(put).not.toHaveProperty('quantity')
  })

  it('un 409 del codigo se muestra bajo el campo Codigo', async () => {
    mockApi({
      ...fullRoutes(),
      'PUT /api/inventory/products/1': () =>
        jsonResponse({ error: 'El codigo DEMO-001 no se puede cambiar: el producto ya tiene facturas de venta o de compra', status: 409 }, 409),
    })
    const user = userEvent.setup()
    renderRoute('/inventario/1/editar')
    await screen.findByRole('heading', { name: 'Editar producto' })
    await screen.findByLabelText('Categoría')

    await user.clear(screen.getByLabelText('Código'))
    await user.type(screen.getByLabelText('Código'), 'DEMO-100')
    await user.click(screen.getByRole('button', { name: 'Guardar producto' }))

    const code = screen.getByLabelText('Código')
    await waitFor(() => expect(code).toHaveAttribute('aria-invalid', 'true'))
    expect(code).toHaveAccessibleDescription(
      'El codigo DEMO-001 no se puede cambiar: el producto ya tiene facturas de venta o de compra',
    )
    expect(code).toHaveFocus()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await user.type(code, 'X')
    expect(code).not.toHaveAttribute('aria-invalid')
  })

  it('otros errores van en un Alert con el mensaje generico', async () => {
    mockApi({ ...fullRoutes(), 'POST /api/inventory/products': () => jsonResponse({ error: 'Error interno del servidor', status: 500 }, 500) })
    const user = userEvent.setup()
    renderRoute('/inventario/nuevo')
    await screen.findByRole('heading', { name: 'Nuevo producto' })

    await fillNew(user)
    await user.click(screen.getByRole('button', { name: 'Guardar producto' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos guardar el producto')
    expect(alert).toHaveTextContent(GENERIC_ERROR_MESSAGE)
    expect(alert).not.toHaveTextContent('Error interno')
    expect(screen.getByLabelText('Código')).toHaveValue('LL-020')
  })

  it('avisa los cambios sin guardar al salir', async () => {
    mockApi(fullRoutes())
    const user = userEvent.setup()
    const router = renderRoute('/inventario/nuevo')
    await screen.findByRole('heading', { name: 'Nuevo producto' })

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/inventario'))

    await router.navigate('/inventario/nuevo')
    await screen.findByRole('heading', { name: 'Nuevo producto' })
    await user.type(screen.getByLabelText('Descripción'), 'Algo')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    const dialog = await screen.findByRole('dialog', { name: 'Descartar cambios' })
    await user.click(within(dialog).getByRole('button', { name: 'Seguir editando' }))
    expect(router.state.location.pathname).toBe('/inventario/nuevo')
    expect(screen.getByLabelText('Descripción')).toHaveValue('Algo')

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Descartar cambios' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/inventario'))
  })

  it('un id inexistente o no numerico muestra Producto no encontrado', async () => {
    mockApi(fullRoutes())
    const router = renderRoute('/inventario/abc/editar')
    expect(await screen.findByRole('heading', { name: 'Producto no encontrado' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a Productos' })).toHaveAttribute('href', '/inventario')

    await router.navigate('/inventario/77/editar')
    expect(await screen.findByRole('heading', { name: 'Producto no encontrado' })).toBeInTheDocument()
  })
})
