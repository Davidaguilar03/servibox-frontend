import { ApiError } from '../lib/api'
import type { InventoryProduct, ProductRequest, ProductUpdateRequest } from './inventoryApi'

// Formulario de producto: valores como texto, validacion y cuerpos del POST y del PUT. Las
// formulas de IVA y precio sugerido no se replican: las calcula el backend al guardar.

export interface ProductFormValues {
  code: string
  description: string
  /** Id de la categoria como texto; vacio es sin elegir. */
  categoryId: string
  purchaseCost: string
  /** Solo al crear. */
  quantity: string
}

export type ProductField = keyof ProductFormValues
export type ProductErrors = Partial<Record<ProductField, string>>

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  code: '',
  description: '',
  categoryId: '',
  purchaseCost: '',
  quantity: '0',
}

/** Valores del formulario a partir de un producto guardado, para editarlo. */
export function productToForm(product: InventoryProduct): ProductFormValues {
  return {
    code: product.code,
    description: product.description,
    categoryId: product.categoryId === null ? '' : String(product.categoryId),
    purchaseCost: String(product.purchaseCost).replace('.', ','),
    quantity: String(product.quantity ?? 0),
  }
}

/**
 * Monto escrito en pesos: el punto es separador de miles y la coma el decimal, como en
 * Autollantas (`180.000` y `180000` son lo mismo; `150000,50` lleva centavos). Se toleran
 * el signo de pesos y los espacios. NaN si no es un numero.
 */
export function parseAmount(text: string): number {
  const clean = text.replace(/[\s$]/g, '').replace(/\./g, '').replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(clean)) return Number.NaN
  return Number(clean)
}

export function validateProduct(values: ProductFormValues, creating: boolean): ProductErrors {
  const errors: ProductErrors = {}
  if (!values.code.trim()) errors.code = 'Escribe el código del producto.'
  if (!values.description.trim()) errors.description = 'Escribe la descripción del producto.'
  if (!values.categoryId) errors.categoryId = 'Elige una categoría.'
  const cost = parseAmount(values.purchaseCost)
  if (!values.purchaseCost.trim()) errors.purchaseCost = 'Escribe el costo de compra.'
  else if (!(cost > 0)) errors.purchaseCost = 'El costo debe ser un valor mayor que cero.'
  if (creating && !/^\d+$/.test(values.quantity.trim()))
    errors.quantity = 'El stock inicial debe ser un número entero mayor o igual a cero.'
  return errors
}

function commonFields(values: ProductFormValues): ProductUpdateRequest {
  return {
    code: values.code.trim(),
    description: values.description.trim(),
    purchaseCost: parseAmount(values.purchaseCost),
    categoryId: Number(values.categoryId),
  }
}

export function buildCreateRequest(values: ProductFormValues): ProductRequest {
  return { ...commonFields(values), quantity: Number(values.quantity.trim()) }
}

/** Sin quantity: el backend la ignoraria y el stock solo cambia con ventas y compras. */
export function buildUpdateRequest(values: ProductFormValues): ProductUpdateRequest {
  return commonFields(values)
}

/**
 * Un 409 del producto es siempre del codigo: repetido en el tenant o bloqueado porque el
 * producto ya tiene facturas. Se muestra bajo el campo Codigo.
 */
export function isCodeConflict(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 409
}

/** Id de ruta valido: entero positivo. */
export function parseProductId(value: string | undefined): number | null {
  const id = Number(value)
  return value && /^\d+$/.test(value) && id > 0 ? id : null
}
