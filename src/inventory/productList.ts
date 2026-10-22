import { stockStatus, type StockStatus } from '../lib/stock'
import { normalizeText } from '../lib/text'
import type { InventoryCategory, InventoryProduct } from './inventoryApi'

// Logica del listado de productos. Reglas en docs/ai-context/03-DECISIONS.md.

export type ProductSort = 'codigo' | 'descripcion' | 'stock-asc' | 'stock-desc' | 'precio'

export interface ProductFilters {
  q: string
  /** Id de la categoria de la pestana; null es Todas. */
  categoria: number | null
  estado: StockStatus | ''
  orden: ProductSort
  pagina: number
}

export const DEFAULT_PRODUCT_FILTERS: ProductFilters = { q: '', categoria: null, estado: '', orden: 'codigo', pagina: 1 }

const statuses: StockStatus[] = ['NORMAL', 'BAJO', 'CRITICO', 'SIN_STOCK']
const sorts: ProductSort[] = ['codigo', 'descripcion', 'stock-asc', 'stock-desc', 'precio']

/** Filtros leidos de la query string; un valor desconocido vale lo de por defecto. */
export function parseProductFilters(params: URLSearchParams): ProductFilters {
  const page = Number(params.get('pagina'))
  const category = Number(params.get('categoria'))
  const estado = params.get('estado') as StockStatus
  const orden = params.get('orden') as ProductSort
  return {
    q: params.get('q') ?? '',
    categoria: Number.isInteger(category) && category > 0 ? category : null,
    estado: statuses.includes(estado) ? estado : '',
    orden: sorts.includes(orden) ? orden : DEFAULT_PRODUCT_FILTERS.orden,
    pagina: Number.isInteger(page) && page > 1 ? page : 1,
  }
}

/** Query string de los filtros, sin los valores por defecto. */
export function productFiltersToParams(filters: ProductFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.categoria !== null) params.set('categoria', String(filters.categoria))
  if (filters.estado) params.set('estado', filters.estado)
  if (filters.orden !== DEFAULT_PRODUCT_FILTERS.orden) params.set('orden', filters.orden)
  if (filters.pagina > 1) params.set('pagina', String(filters.pagina))
  return params
}

export type CategoriesById = Map<number, InventoryCategory>

export function categoriesById(categories: InventoryCategory[]): CategoriesById {
  return new Map(categories.map((category) => [category.id, category]))
}

/** Estado de stock con los umbrales de la categoria del producto (o los de Autollantas). */
export function productStatus(product: InventoryProduct, byId: CategoriesById): StockStatus {
  return stockStatus(product.quantity, product.categoryId === null ? undefined : byId.get(product.categoryId))
}

const byCode = (a: InventoryProduct, b: InventoryProduct) =>
  a.code.localeCompare(b.code, 'es', { numeric: true, sensitivity: 'base' })

const comparators: Record<ProductSort, (a: InventoryProduct, b: InventoryProduct) => number> = {
  codigo: byCode,
  descripcion: (a, b) => a.description.localeCompare(b.description, 'es', { sensitivity: 'base' }) || byCode(a, b),
  'stock-asc': (a, b) => (a.quantity ?? 0) - (b.quantity ?? 0) || byCode(a, b),
  'stock-desc': (a, b) => (b.quantity ?? 0) - (a.quantity ?? 0) || byCode(a, b),
  precio: (a, b) => (a.suggestedPrice ?? 0) - (b.suggestedPrice ?? 0) || byCode(a, b),
}

export function sortProducts(products: InventoryProduct[], sort: ProductSort): InventoryProduct[] {
  return [...products].sort(comparators[sort])
}

/** Aplica pestana, busqueda y estado, y ordena. La pagina va aparte. */
export function filterProducts(
  products: InventoryProduct[],
  filters: ProductFilters,
  byId: CategoriesById,
): InventoryProduct[] {
  const query = normalizeText(filters.q)
  return sortProducts(
    products.filter(
      (product) =>
        (filters.categoria === null || product.categoryId === filters.categoria) &&
        (!filters.estado || productStatus(product, byId) === filters.estado) &&
        (!query || normalizeText(product.code).includes(query) || normalizeText(product.description).includes(query)),
    ),
    filters.orden,
  )
}

export interface CategoryTab {
  /** null es Todas. */
  id: number | null
  name: string
  count: number
}

/** Todas y una pestana por categoria, por nombre, con su numero de productos. */
export function categoryTabs(categories: InventoryCategory[], products: InventoryProduct[]): CategoryTab[] {
  const counts = productCounts(products)
  return [
    { id: null, name: 'Todas', count: products.length },
    ...[...categories]
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
      .map((category) => ({ id: category.id, name: category.name, count: counts.get(category.id) ?? 0 })),
  ]
}

/** Productos por id de categoria. */
export function productCounts(products: InventoryProduct[]): Map<number, number> {
  const counts = new Map<number, number>()
  products.forEach((product) => {
    if (product.categoryId !== null) counts.set(product.categoryId, (counts.get(product.categoryId) ?? 0) + 1)
  })
  return counts
}

/** Indicadores sobre todo el inventario, sin pestana ni filtros. */
export function productIndicators(products: InventoryProduct[]) {
  return {
    total: products.length,
    /** Con al menos una unidad, cualquiera sea su estado. */
    inStock: products.filter((product) => (product.quantity ?? 0) > 0).length,
    /** Cantidad por costo de compra (sin IVA); una cantidad nula o negativa no suma. */
    inventoryValue: products.reduce(
      (sum, product) => sum + Math.max(0, product.quantity ?? 0) * (product.purchaseCost ?? 0),
      0,
    ),
  }
}

/** Por debajo del minimo: bajo stock o stock critico, con unidades. Sin stock va aparte. */
export function belowMinimum(products: InventoryProduct[], byId: CategoriesById): number {
  return products.filter((product) => {
    const status = productStatus(product, byId)
    return status === 'BAJO' || status === 'CRITICO'
  }).length
}
