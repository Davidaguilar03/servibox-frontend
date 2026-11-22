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

const filled = { ...EMPTY_PRODUCT_FORM, code: ' LL-020 ', description: ' Llanta Hankook 185/65 R14 ', categoryId: '3', purchaseCost: '98.500', quantity: '6' }

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

  it('carga el costo de un producto guardado con punto de miles', () => {
    const product = { id: 1, code: 'A', description: 'B', purchaseCost: 1234567, quantity: 1, taxAmount: 0, suggestedPrice: 0, categoryId: 1, categoryName: 'C', itemType: 'PRODUCTO' }
    const values = productToForm(product as Parameters<typeof productToForm>[0])
    expect(values.purchaseCost).toBe('1.234.567')
    expect(buildUpdateRequest(values)).toHaveProperty('purchaseCost', 1234567)
    expect(validateProduct(values, false, values.purchaseCost).purchaseCost).toBeUndefined()
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
        itemType: 'PRODUCTO',
        vatApplies: true,
      }),
    ).toEqual({ ...EMPTY_PRODUCT_FORM, code: 'DEMO-001', description: 'Aceite', categoryId: '4', purchaseCost: '30.000,5', quantity: '50' })
  })

  const service = { ...EMPTY_PRODUCT_FORM, itemType: 'SERVICIO' as const, code: ' SV-01 ', description: ' Alineación ', salePrice: '35.000' }

  it('un servicio solo exige codigo, descripcion y precio de venta mayor que cero', () => {
    expect(validateProduct({ ...EMPTY_PRODUCT_FORM, itemType: 'SERVICIO' }, true)).toEqual({
      code: 'Escribe el código del servicio.',
      description: 'Escribe la descripción del servicio.',
      salePrice: 'Escribe el precio de venta.',
    })
    expect(validateProduct({ ...service, salePrice: '0' }, true).salePrice).toBe('El precio debe ser mayor que cero.')
    expect(validateProduct({ ...service, salePrice: '35.000,505' }, true).salePrice).toBe('El precio unitario admite como máximo dos decimales.')
    expect(validateProduct({ ...service, salePrice: '35.000,50' }, true)).toEqual({})
  })

  it('el POST de un servicio lleva itemType, precio e IVA, sin costo, stock ni categoria; el PUT sin itemType', () => {
    expect(buildCreateRequest({ ...service, vatApplies: false, salePrice: '20.000,5' })).toEqual({
      itemType: 'SERVICIO',
      code: 'SV-01',
      description: 'Alineación',
      salePrice: 20000.5,
      vatApplies: false,
    })
    expect(buildUpdateRequest(service)).toEqual({ code: 'SV-01', description: 'Alineación', salePrice: 35000, vatApplies: true })
  })

  it('carga un servicio guardado: el precio viene en suggestedPrice y el IVA se lee de vatApplies', () => {
    const saved = { id: 9, code: 'SV-02', description: 'Balanceo', purchaseCost: 0, quantity: 0, suggestedPrice: 20000.5, categoryId: 4, categoryName: 'SERVICIOS', itemType: 'SERVICIO' as const }
    expect(productToForm({ ...saved, taxAmount: 0, vatApplies: false })).toMatchObject({ itemType: 'SERVICIO', salePrice: '20.000,5', vatApplies: false })
    expect(productToForm({ ...saved, taxAmount: 3800, vatApplies: true }).vatApplies).toBe(true)
    // Con IVA del tenant en 0 % el servicio sigue con IVA: manda vatApplies, no taxAmount.
    expect(productToForm({ ...saved, taxAmount: 0, vatApplies: true }).vatApplies).toBe(true)
  })

  it('solo acepta ids de ruta enteros positivos', () => {
    expect(parseProductId('12')).toBe(12)
    expect(parseProductId('abc')).toBeNull()
    expect(parseProductId('0')).toBeNull()
    expect(parseProductId('1.5')).toBeNull()
    expect(parseProductId(undefined)).toBeNull()
  })
})
