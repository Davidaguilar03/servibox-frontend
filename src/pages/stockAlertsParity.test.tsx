import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import { saveToken } from '../auth/session'
import { jsonResponse, renderRoute, validToken } from '../test/utils'

// Mismos productos y categorias para Inicio e Inventario, con la forma de la siembra demo:
// BA-007 en cero, LL-010 y BA-004 criticos, LL-007 y LU-010 bajo el minimo.
const categories = [
  { id: 1, name: 'LLANTAS', color: '#d32f2f', yellowStockMin: 10, redStockMin: 3, targetMargin: 0.3, taxTypes: [] },
  { id: 2, name: 'BATERÍAS', color: '#1d4ed8', yellowStockMin: 5, redStockMin: 2, targetMargin: 0.25, taxTypes: [] },
  { id: 3, name: 'LUBRICANTES', color: '#16a34a', yellowStockMin: 12, redStockMin: 4, targetMargin: 0.2, taxTypes: [] },
]
const product = (id: number, code: string, quantity: number, categoryId: number) => ({
  id,
  code,
  description: `Producto ${code}`,
  purchaseCost: 100000,
  quantity,
  taxAmount: 19000,
  suggestedPrice: 150000,
  categoryId,
  categoryName: categories.find((category) => category.id === categoryId)?.name ?? null,
})
const products = [
  product(1, 'BA-007', 0, 2),
  product(2, 'LL-010', 3, 1),
  product(3, 'BA-004', 1, 2),
  product(4, 'LL-007', 10, 1),
  product(5, 'LU-010', 12, 3),
  product(6, 'LL-001', 11, 1),
  product(7, 'BA-001', 6, 2),
  product(8, 'LU-001', 40, 3),
]

function mockApi() {
  const routes: Record<string, unknown> = {
    '/api/inventory/products': products,
    '/api/inventory/categories': categories,
  }
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      const body = routes[url.split('?')[0] ?? '']
      return Promise.resolve(body ? jsonResponse(body) : jsonResponse({ error: 'No encontrado', status: 404 }, 404))
    }),
  )
}

describe('alertas de stock en Inicio e Inventario', () => {
  beforeEach(() => {
    saveToken(validToken())
  })

  it('las dos pantallas dan 5 con alerta y 1 sin stock con los mismos datos', async () => {
    mockApi()
    renderRoute('/inicio')
    expect(await screen.findByText('Con alerta de stock: 5 · 1 sin stock')).toBeInTheDocument()
    cleanup()

    mockApi()
    renderRoute('/inventario')
    const card = (await screen.findByText('Con alerta de stock')).parentElement as HTMLElement
    expect(await within(card).findByText('5')).toBeInTheDocument()
    expect(within(card).getByText('1 sin stock')).toBeInTheDocument()
  })
})
