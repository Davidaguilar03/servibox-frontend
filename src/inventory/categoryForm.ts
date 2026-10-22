import { ApiError } from '../lib/api'
import { normalizeText } from '../lib/text'
import type { CategoryRequest, InventoryCategory, TaxType } from './inventoryApi'

// Formulario de categoria. Reglas en docs/ai-context/03-DECISIONS.md.

/**
 * Paleta fija de colores de categoria. Es la UNICA excepcion a la regla de no escribir
 * hexadecimales fuera de tokens.css: el valor es un dato que se guarda en el backend
 * (`color` de la categoria), no un estilo de la interfaz. Todos tienen contraste de al menos
 * 4.5 a 1 sobre blanco, de sobra para un punto de color (3 a 1).
 */
export const CATEGORY_COLORS = [
  { value: '#d32f2f', label: 'Rojo' },
  { value: '#c2410c', label: 'Naranja' },
  { value: '#a16207', label: 'Ámbar' },
  { value: '#15803d', label: 'Verde' },
  { value: '#0f766e', label: 'Turquesa' },
  { value: '#1d4ed8', label: 'Azul' },
  { value: '#7e22ce', label: 'Violeta' },
  { value: '#4b5563', label: 'Gris' },
] as const

export interface CategoryFormValues {
  name: string
  color: string
  yellowStockMin: string
  redStockMin: string
  /** Porcentaje de 0 a 100 como texto; se envia como fraccion. */
  targetMargin: string
  /** null mientras el usuario no toque los impuestos: se usan los de por defecto. */
  taxTypeIds: number[] | null
}

export type CategoryField = Exclude<keyof CategoryFormValues, 'taxTypeIds'>
export type CategoryErrors = Partial<Record<CategoryField, string>>

/** Valores de una categoria nueva: primer color, umbrales de Autollantas y margen vacio. */
export function emptyCategoryForm(): CategoryFormValues {
  return { name: '', color: CATEGORY_COLORS[0].value, yellowStockMin: '5', redStockMin: '2', targetMargin: '', taxTypeIds: null }
}

/** Fraccion del backend (0.3) a porcentaje para el campo ("30"), con coma decimal. */
export function fractionToPercent(fraction: number | null): string {
  if (fraction === null) return ''
  return String(Math.round(fraction * 1_000_000) / 10_000).replace('.', ',')
}

/** Porcentaje escrito ("32,5") a fraccion con 6 decimales, la escala de la columna. NaN si no es numero. */
export function percentToFraction(text: string): number {
  const clean = text.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(clean)) return Number.NaN
  return Math.round(Number(clean) * 10_000) / 1_000_000
}

export function categoryToForm(category: InventoryCategory): CategoryFormValues {
  return {
    name: category.name,
    color: category.color,
    yellowStockMin: String(category.yellowStockMin ?? ''),
    redStockMin: String(category.redStockMin ?? ''),
    targetMargin: fractionToPercent(category.targetMargin),
    taxTypeIds: category.taxTypes.map((tax) => tax.id).sort((a, b) => a - b),
  }
}

/** Impuestos marcados al crear: los de IVA (el vigente). */
export function defaultTaxTypeIds(taxTypes: TaxType[] | undefined): number[] {
  return (taxTypes ?? []).filter((tax) => tax.isVat).map((tax) => tax.id)
}

const isWholeNumber = (text: string) => /^\d+$/.test(text.trim())

/**
 * Nombre obligatorio y no repetido (el backend lo guarda en mayusculas y el PUT rechaza un
 * repetido con 409; el POST no, por eso el cliente lo revisa tambien al crear). Umbrales
 * enteros mayores o iguales a cero, con el rojo no mayor que el amarillo. Margen de 0 a 100.
 */
export function validateCategory(
  values: CategoryFormValues,
  others: InventoryCategory[],
): CategoryErrors {
  const errors: CategoryErrors = {}
  const name = normalizeText(values.name)
  if (!name) errors.name = 'Escribe el nombre de la categoría.'
  else if (others.some((category) => normalizeText(category.name) === name))
    errors.name = 'Ya existe una categoría con ese nombre.'
  if (!values.color) errors.color = 'Elige un color.'
  const yellowOk = isWholeNumber(values.yellowStockMin)
  if (!yellowOk) errors.yellowStockMin = 'Escribe un número entero mayor o igual a cero.'
  if (!isWholeNumber(values.redStockMin)) errors.redStockMin = 'Escribe un número entero mayor o igual a cero.'
  else if (yellowOk && Number(values.redStockMin) > Number(values.yellowStockMin))
    errors.redStockMin = 'El umbral rojo no puede ser mayor que el amarillo.'
  const margin = percentToFraction(values.targetMargin)
  if (!values.targetMargin.trim()) errors.targetMargin = 'Escribe el margen objetivo.'
  else if (Number.isNaN(margin) || margin > 1) errors.targetMargin = 'El margen debe estar entre 0 y 100.'
  return errors
}

export function buildCategoryRequest(values: CategoryFormValues, taxTypeIds: number[]): CategoryRequest {
  return {
    name: values.name.trim(),
    color: values.color,
    yellowStockMin: Number(values.yellowStockMin),
    redStockMin: Number(values.redStockMin),
    targetMargin: percentToFraction(values.targetMargin),
    taxTypeIds: [...taxTypeIds].sort((a, b) => a - b),
  }
}

/** El unico 409 de categorias es el nombre repetido al editar. */
export function isNameConflict(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 409
}
