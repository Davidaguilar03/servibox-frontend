import { describe, expect, it } from 'vitest'
import type { InventoryCategory, InventoryProduct } from './inventoryApi'
import {
  DEFAULT_PRODUCT_FILTERS,
  belowMinimum,
  categoriesById,
  categoryTabs,
  filterProducts,
  parseProductFilters,
  productFiltersToParams,
  productIndicators,
  productStatus,
  type ProductFilters,
} from './productList'

const category = (id: number, name: string, yellow: number | null, red: number | null): InventoryCategory => ({
  id,
  name,
  color: '#1d4ed8',
  yellowStockMin: yellow,
  redStockMin: red,
  targetMargin: 0.3,
  taxTypes: [],
})

const product = (id: number, fields: Partial<InventoryProduct>): InventoryProduct => ({
  id,
  code: `P-${id}`,
  description: `Producto ${id}`,
  purchaseCost: 1000,
  quantity: 10,
  taxAmount: 190,
  suggestedPrice: 1500,
  categoryId: 1,
  categoryName: 'LLANTAS',
  ...fields,
})

const categories = [category(1, 'LLANTAS', 10, 3), category(2, 'BATERÍAS', null, null)]
const byId = categoriesById(categories)

const products = [
  product(1, { code: 'LL-010', description: 'Llanta Michelín 205/55 R16', quantity: 24, purchaseCost: 118000, suggestedPrice: 215940 }),
  product(2, { code: 'LL-002', description: 'Llanta Pirelli 225/45 R18', quantity: 0, purchaseCost: 168000, suggestedPrice: 307440 }),
  product(3, { code: 'BAT-004', description: 'Batería MAC 42 Ah', quantity: 2, categoryId: 2, categoryName: 'BATERÍAS', purchaseCost: 210000, suggestedPrice: 333060 }),
  product(4, { code: 'LL-003', description: 'Llanta Goodyear 195/65 R15', quantity: 3, purchaseCost: 105000, suggestedPrice: 192150 }),
  product(5, { code: 'BAT-007', description: 'Batería Willard 55 Ah', quantity: 5, categoryId: 2, categoryName: 'BATERÍAS', purchaseCost: 265000, suggestedPrice: 420290 }),
]

const filters = (change: Partial<ProductFilters>): ProductFilters => ({ ...DEFAULT_PRODUCT_FILTERS, ...change })
const codes = (list: InventoryProduct[]) => list.map((item) => item.code)

describe('estado de stock por producto', () => {
  it('usa los umbrales de su categoria en los limites exactos', () => {
    const status = (quantity: number) => productStatus(product(9, { quantity }), byId)
    expect(status(0)).toBe('SIN_STOCK')
    expect(status(1)).toBe('CRITICO')
    expect(status(3)).toBe('CRITICO')
    expect(status(4)).toBe('BAJO')
    expect(status(10)).toBe('BAJO')
    expect(status(11)).toBe('NORMAL')
  })

  it('sin umbrales en la categoria usa los de Autollantas, amarillo 5 y rojo 2', () => {
    const status = (quantity: number) => productStatus(product(9, { quantity, categoryId: 2 }), byId)
    expect(status(2)).toBe('CRITICO')
    expect(status(3)).toBe('BAJO')
    expect(status(5)).toBe('BAJO')
    expect(status(6)).toBe('NORMAL')
  })
})

describe('filtros y orden', () => {
  it('busca por codigo o descripcion sin mayusculas ni tildes', () => {
    expect(codes(filterProducts(products, filters({ q: 'bateria' }), byId))).toEqual(['BAT-004', 'BAT-007'])
    expect(codes(filterProducts(products, filters({ q: 'MICHELIN' }), byId))).toEqual(['LL-010'])
    expect(codes(filterProducts(products, filters({ q: 'll-00' }), byId))).toEqual(['LL-002', 'LL-003'])
  })

  it('filtra por estado de stock', () => {
    expect(codes(filterProducts(products, filters({ estado: 'SIN_STOCK' }), byId))).toEqual(['LL-002'])
    expect(codes(filterProducts(products, filters({ estado: 'CRITICO' }), byId))).toEqual(['BAT-004', 'LL-003'])
    expect(codes(filterProducts(products, filters({ estado: 'BAJO' }), byId))).toEqual(['BAT-007'])
    expect(codes(filterProducts(products, filters({ estado: 'NORMAL' }), byId))).toEqual(['LL-010'])
  })

  it('filtra por la pestana de categoria', () => {
    expect(codes(filterProducts(products, filters({ categoria: 2 }), byId))).toEqual(['BAT-004', 'BAT-007'])
  })

  it('ordena por codigo por defecto, con comparacion numerica', () => {
    expect(codes(filterProducts(products, filters({}), byId))).toEqual(['BAT-004', 'BAT-007', 'LL-002', 'LL-003', 'LL-010'])
  })

  it('ordena por descripcion, stock y precio sugerido', () => {
    expect(codes(filterProducts(products, filters({ orden: 'descripcion' }), byId))).toEqual([
      'BAT-004',
      'BAT-007',
      'LL-003',
      'LL-010',
      'LL-002',
    ])
    expect(codes(filterProducts(products, filters({ orden: 'stock-asc' }), byId))).toEqual(['LL-002', 'BAT-004', 'LL-003', 'BAT-007', 'LL-010'])
    expect(codes(filterProducts(products, filters({ orden: 'stock-desc' }), byId))).toEqual(['LL-010', 'BAT-007', 'LL-003', 'BAT-004', 'LL-002'])
    expect(codes(filterProducts(products, filters({ orden: 'precio' }), byId))).toEqual(['LL-003', 'LL-010', 'LL-002', 'BAT-004', 'BAT-007'])
  })
})

describe('query string', () => {
  it('lee los filtros y descarta los valores desconocidos', () => {
    expect(parseProductFilters(new URLSearchParams('q=llanta&categoria=2&estado=BAJO&orden=precio&pagina=3'))).toEqual({
      q: 'llanta',
      categoria: 2,
      estado: 'BAJO',
      orden: 'precio',
      pagina: 3,
    })
    expect(parseProductFilters(new URLSearchParams('categoria=x&estado=OTRO&orden=nada&pagina=-1'))).toEqual(DEFAULT_PRODUCT_FILTERS)
  })

  it('solo escribe los valores distintos de los de por defecto', () => {
    expect(productFiltersToParams(DEFAULT_PRODUCT_FILTERS).toString()).toBe('')
    expect(productFiltersToParams(filters({ q: 'mac', categoria: 1, estado: 'SIN_STOCK', orden: 'stock-asc', pagina: 2 })).toString()).toBe(
      'q=mac&categoria=1&estado=SIN_STOCK&orden=stock-asc&pagina=2',
    )
  })
})

describe('indicadores y pestanas', () => {
  it('cuenta total, en stock y por debajo del minimo, y valoriza al costo', () => {
    expect(productIndicators(products)).toEqual({
      total: 5,
      inStock: 4,
      inventoryValue: 24 * 118000 + 2 * 210000 + 3 * 105000 + 5 * 265000,
    })
    // BAT-004 y LL-003 criticos, BAT-007 bajo; LL-002 sin stock no cuenta.
    expect(belowMinimum(products, byId)).toBe(3)
  })

  it('una cantidad negativa o nula no suma al valor', () => {
    expect(productIndicators([product(1, { quantity: -2 }), product(2, { quantity: null })]).inventoryValue).toBe(0)
  })

  it('arma Todas y una pestana por categoria, por nombre, con su conteo', () => {
    expect(categoryTabs(categories, products)).toEqual([
      { id: null, name: 'Todas', count: 5 },
      { id: 2, name: 'BATERÍAS', count: 2 },
      { id: 1, name: 'LLANTAS', count: 3 },
    ])
  })
})
