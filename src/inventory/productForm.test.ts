import { describe, expect, it } from 'vitest'
import {
  EMPTY_PRODUCT_FORM,
  buildCreateRequest,
  buildUpdateRequest,
  parseAmount,
  parseProductId,
  productToForm,
  validateProduct,
} from './productForm'

const filled = { code: ' LL-020 ', description: ' Llanta Hankook 185/65 R14 ', categoryId: '3', purchaseCost: '98.500', quantity: '6' }

describe('formulario de producto', () => {
  it('exige codigo, descripcion, categoria y costo mayor que cero', () => {
    expect(validateProduct(EMPTY_PRODUCT_FORM, true)).toEqual({
      code: 'Escribe el código del producto.',
      description: 'Escribe la descripción del producto.',
      categoryId: 'Elige una categoría.',
      purchaseCost: 'Escribe el costo de compra.',
    })
    expect(validateProduct({ ...filled, purchaseCost: '0' }, true).purchaseCost).toBe('El costo debe ser un valor mayor que cero.')
    expect(validateProduct({ ...filled, purchaseCost: 'abc' }, true).purchaseCost).toBe('El costo debe ser un valor mayor que cero.')
    expect(validateProduct(filled, true)).toEqual({})
  })

  it('el stock inicial es un entero mayor o igual a cero, y solo al crear', () => {
    const message = 'El stock inicial debe ser un número entero mayor o igual a cero.'
    expect(validateProduct({ ...filled, quantity: '-1' }, true).quantity).toBe(message)
    expect(validateProduct({ ...filled, quantity: '2,5' }, true).quantity).toBe(message)
    expect(validateProduct({ ...filled, quantity: '0' }, true).quantity).toBeUndefined()
    expect(validateProduct({ ...filled, quantity: '-1' }, false).quantity).toBeUndefined()
  })

  it('lee montos con punto de miles y coma decimal', () => {
    expect(parseAmount('180.000')).toBe(180000)
    expect(parseAmount('$ 150.000,50')).toBe(150000.5)
    expect(parseAmount('98500')).toBe(98500)
    expect(parseAmount('')).toBeNaN()
    expect(parseAmount('12a')).toBeNaN()
  })

  it('arma el POST con quantity y el PUT sin quantity', () => {
    expect(buildCreateRequest(filled)).toEqual({
      code: 'LL-020',
      description: 'Llanta Hankook 185/65 R14',
      purchaseCost: 98500,
      quantity: 6,
      categoryId: 3,
    })
    const update = buildUpdateRequest(filled)
    expect(update).toEqual({ code: 'LL-020', description: 'Llanta Hankook 185/65 R14', purchaseCost: 98500, categoryId: 3 })
    expect(update).not.toHaveProperty('quantity')
  })

  it('carga un producto guardado con coma decimal en el costo', () => {
    expect(
      productToForm({
        id: 1,
        code: 'DEMO-001',
        description: 'Aceite',
        purchaseCost: 30000.5,
        quantity: 50,
        taxAmount: 5700,
        suggestedPrice: 42857.14,
        categoryId: 4,
        categoryName: 'REPUESTOS DEMO',
      }),
    ).toEqual({ code: 'DEMO-001', description: 'Aceite', categoryId: '4', purchaseCost: '30000,5', quantity: '50' })
  })

  it('solo acepta ids de ruta enteros positivos', () => {
    expect(parseProductId('12')).toBe(12)
    expect(parseProductId('abc')).toBeNull()
    expect(parseProductId('0')).toBeNull()
    expect(parseProductId('1.5')).toBeNull()
    expect(parseProductId(undefined)).toBeNull()
  })
})
