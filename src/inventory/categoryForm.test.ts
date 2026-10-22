import { describe, expect, it } from 'vitest'
import type { InventoryCategory } from './inventoryApi'
import {
  CATEGORY_COLORS,
  buildCategoryRequest,
  categoryToForm,
  defaultTaxTypeIds,
  emptyCategoryForm,
  fractionToPercent,
  percentToFraction,
  validateCategory,
  type CategoryFormValues,
} from './categoryForm'

const iva = { id: 1, name: 'IVA', rate: 0.19, isVat: true }
const consumo = { id: 2, name: 'Impoconsumo', rate: 0.08, isVat: false }

const existing: InventoryCategory = {
  id: 7,
  name: 'REPUESTOS DEMO',
  color: '#ff3b30',
  yellowStockMin: 10,
  redStockMin: 3,
  targetMargin: 0.3,
  taxTypes: [iva],
}

const values = (change: Partial<CategoryFormValues>): CategoryFormValues => ({
  ...emptyCategoryForm(),
  name: 'Lubricantes',
  targetMargin: '30',
  ...change,
})

describe('formulario de categoria', () => {
  it('el umbral rojo no puede superar al amarillo; iguales si', () => {
    expect(validateCategory(values({ yellowStockMin: '5', redStockMin: '6' }), []).redStockMin).toBe(
      'El umbral rojo no puede ser mayor que el amarillo.',
    )
    expect(validateCategory(values({ yellowStockMin: '5', redStockMin: '5' }), [])).toEqual({})
    expect(validateCategory(values({ yellowStockMin: '0', redStockMin: '0' }), [])).toEqual({})
  })

  it('los umbrales son enteros mayores o iguales a cero', () => {
    const errors = validateCategory(values({ yellowStockMin: '-1', redStockMin: '1,5' }), [])
    expect(errors.yellowStockMin).toBe('Escribe un número entero mayor o igual a cero.')
    expect(errors.redStockMin).toBe('Escribe un número entero mayor o igual a cero.')
  })

  it('el margen va de 0 a 100', () => {
    expect(validateCategory(values({ targetMargin: '' }), []).targetMargin).toBe('Escribe el margen objetivo.')
    expect(validateCategory(values({ targetMargin: '100,5' }), []).targetMargin).toBe('El margen debe estar entre 0 y 100.')
    expect(validateCategory(values({ targetMargin: '-3' }), []).targetMargin).toBe('El margen debe estar entre 0 y 100.')
    expect(validateCategory(values({ targetMargin: '100' }), []).targetMargin).toBeUndefined()
    expect(validateCategory(values({ targetMargin: '0' }), []).targetMargin).toBeUndefined()
  })

  it('avisa un nombre repetido sin distinguir mayusculas ni tildes', () => {
    expect(validateCategory(values({ name: 'repuestos demo' }), [existing]).name).toBe('Ya existe una categoría con ese nombre.')
    expect(validateCategory(values({ name: '  ' }), []).name).toBe('Escribe el nombre de la categoría.')
  })

  it('convierte el porcentaje en fraccion y la fraccion en porcentaje', () => {
    expect(percentToFraction('30')).toBe(0.3)
    expect(percentToFraction('32,5')).toBe(0.325)
    expect(percentToFraction('7')).toBe(0.07)
    expect(percentToFraction('abc')).toBeNaN()
    expect(fractionToPercent(0.3)).toBe('30')
    expect(fractionToPercent(0.325)).toBe('32,5')
    expect(fractionToPercent(0.19)).toBe('19')
  })

  it('arma el cuerpo con el margen como fraccion y los impuestos elegidos', () => {
    expect(buildCategoryRequest(values({ name: ' Lubricantes ', yellowStockMin: '8', redStockMin: '2', targetMargin: '35' }), [2, 1])).toEqual({
      name: 'Lubricantes',
      color: CATEGORY_COLORS[0].value,
      yellowStockMin: 8,
      redStockMin: 2,
      targetMargin: 0.35,
      taxTypeIds: [1, 2],
    })
  })

  it('al crear propone el IVA vigente y al editar carga lo guardado', () => {
    expect(defaultTaxTypeIds([iva, consumo])).toEqual([1])
    expect(categoryToForm(existing)).toEqual({
      name: 'REPUESTOS DEMO',
      color: '#ff3b30',
      yellowStockMin: '10',
      redStockMin: '3',
      targetMargin: '30',
      taxTypeIds: [1],
    })
  })

  it('la paleta tiene 8 colores hexadecimales distintos', () => {
    const hex = CATEGORY_COLORS.map((color) => color.value)
    expect(new Set(hex).size).toBe(8)
    hex.forEach((value) => expect(value).toMatch(/^#[0-9a-f]{6}$/))
  })
})
