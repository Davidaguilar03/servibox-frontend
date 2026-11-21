import { apiFetch } from '../lib/api'

// Consultas de Inventario. Nombres iguales a los DTO del backend (ProductResponse,
// CategoryResponse, TaxTypeResponse). Las claves de productos y categorias son las mismas
// del panel y de Nueva factura: es la misma respuesta.

export const PRODUCTS_KEY = ['inventory', 'products']
export const CATEGORIES_KEY = ['inventory', 'categories']
export const TAX_TYPES_KEY = ['inventory', 'tax-types']

export interface TaxType {
  id: number
  name: string
  /** Fraccion: 0.19 es 19 por ciento. */
  rate: number
  isVat: boolean
}

/** PRODUCTO lleva stock y costo; SERVICIO tiene precio fijo, sin stock ni compras. No cambia tras crear el item. */
export type ItemType = 'PRODUCTO' | 'SERVICIO'

export interface InventoryProduct {
  id: number
  code: string
  description: string
  /** Costo de compra sin IVA. */
  purchaseCost: number
  quantity: number | null
  /** IVA del costo de compra: costo por la suma de las tasas con isVat de la categoria. */
  taxAmount: number | null
  /** Precio de venta sugerido, sin IVA. */
  suggestedPrice: number | null
  categoryId: number | null
  categoryName: string | null
  itemType: ItemType
}

/** Categoria que el backend asigna a todo servicio; no se ofrece a los productos. */
export const SERVICES_CATEGORY_NAME = 'SERVICIOS'

export const isService = (item: { itemType?: ItemType }) => item.itemType === 'SERVICIO'

export interface InventoryCategory {
  id: number
  name: string
  /** Hexadecimal, por ejemplo `#1d4ed8`. */
  color: string
  yellowStockMin: number | null
  redStockMin: number | null
  /** Fraccion: 0.30 es 30 por ciento. */
  targetMargin: number | null
  taxTypes: TaxType[]
}

/** POST /api/inventory/products. */
export interface ProductRequest {
  code: string
  description: string
  purchaseCost: number
  quantity: number
  categoryId: number
}

/** PUT /api/inventory/products/{id}: sin quantity, el stock solo cambia con ventas y compras. */
export type ProductUpdateRequest = Omit<ProductRequest, 'quantity'>

/**
 * PUT de un servicio. El backend ignora costo, stock y categoria (asigna SERVICIOS). En la
 * respuesta, salePrice llega como suggestedPrice y vatApplies solo se ve en taxAmount (0 sin IVA).
 */
export interface ServiceUpdateRequest {
  code: string
  description: string
  /** Sin IVA; admite centavos. */
  salePrice: number
  vatApplies: boolean
}

/** POST de un servicio. */
export interface ServiceRequest extends ServiceUpdateRequest {
  itemType: 'SERVICIO'
}

/** POST y PUT /api/inventory/categories. */
export interface CategoryRequest {
  name: string
  color: string
  yellowStockMin: number
  redStockMin: number
  targetMargin: number
  taxTypeIds: number[]
}

export const fetchInventoryProducts = () => apiFetch<InventoryProduct[]>('/inventory/products')
/** Listado filtrado por tipo en el backend. */
export const fetchInventoryItems = (itemType: ItemType) =>
  apiFetch<InventoryProduct[]>(`/inventory/products?itemType=${itemType}`)
/** Clave del listado filtrado; la invalida `['inventory']` como a las demas. */
export const itemsKey = (itemType: ItemType) => [...PRODUCTS_KEY, 'tipo', itemType]
export const fetchInventoryProduct = (id: number) => apiFetch<InventoryProduct>(`/inventory/products/${id}`)
export const fetchInventoryCategories = () => apiFetch<InventoryCategory[]>('/inventory/categories')
export const fetchTaxTypes = () => apiFetch<TaxType[]>('/inventory/tax-types')

export const createProduct = (body: ProductRequest | ServiceRequest) =>
  apiFetch<InventoryProduct>('/inventory/products', { method: 'POST', body })
export const updateProduct = (id: number, body: ProductUpdateRequest | ServiceUpdateRequest) =>
  apiFetch<InventoryProduct>(`/inventory/products/${id}`, { method: 'PUT', body })

export const createCategory = (body: CategoryRequest) =>
  apiFetch<InventoryCategory>('/inventory/categories', { method: 'POST', body })
export const updateCategory = (id: number, body: CategoryRequest) =>
  apiFetch<InventoryCategory>(`/inventory/categories/${id}`, { method: 'PUT', body })
