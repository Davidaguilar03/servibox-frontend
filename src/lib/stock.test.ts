import { describe, expect, it } from 'vitest'
import { lowStockProducts, stockStatus } from './stock'

const thresholds = { yellowStockMin: 10, redStockMin: 3 }

describe('stockStatus', () => {
  it('es sin stock solo en cero', () => {
    expect(stockStatus(0, thresholds)).toBe('SIN_STOCK')
    expect(stockStatus(1, thresholds)).toBe('CRITICO')
  })

  it('es critico por encima de cero y hasta el umbral rojo', () => {
    expect(stockStatus(1, thresholds)).toBe('CRITICO')
    expect(stockStatus(3, thresholds)).toBe('CRITICO')
  })

  it('es bajo por encima del rojo y hasta el amarillo', () => {
    expect(stockStatus(4, thresholds)).toBe('BAJO')
    expect(stockStatus(10, thresholds)).toBe('BAJO')
  })

  it('es normal por encima del amarillo', () => {
    expect(stockStatus(11, thresholds)).toBe('NORMAL')
  })

  it('sin umbrales usa los de Autollantas: amarillo 5 y rojo 2', () => {
    expect(stockStatus(0)).toBe('SIN_STOCK')
    expect(stockStatus(2)).toBe('CRITICO')
    expect(stockStatus(3)).toBe('BAJO')
    expect(stockStatus(5)).toBe('BAJO')
    expect(stockStatus(6)).toBe('NORMAL')
    expect(stockStatus(2, { yellowStockMin: null, redStockMin: null })).toBe('CRITICO')
    expect(stockStatus(5, { yellowStockMin: null, redStockMin: null })).toBe('BAJO')
  })

  it('con umbrales en cero solo el stock cero se marca', () => {
    const zero = { yellowStockMin: 0, redStockMin: 0 }
    expect(stockStatus(0, zero)).toBe('SIN_STOCK')
    expect(stockStatus(1, zero)).toBe('NORMAL')
  })

  it('un stock nulo cuenta como cero', () => {
    expect(stockStatus(null, thresholds)).toBe('SIN_STOCK')
  })
})

describe('lowStockProducts', () => {
  const categories = [
    { id: 1, ...thresholds },
    { id: 2, yellowStockMin: 0, redStockMin: 0 },
  ]
  const product = (id: number, quantity: number, categoryId: number) => ({ id, quantity, categoryId })

  it('deja sin stock, criticos y bajos, de menor a mayor stock, hasta el limite', () => {
    const products = [
      product(1, 8, 1),
      product(2, 50, 1),
      product(3, 0, 1),
      product(4, 5, 2),
      product(5, 2, 1),
      product(6, 9, 1),
      product(7, 10, 1),
      product(8, 0, 2),
    ]

    const rows = lowStockProducts(products, categories, 5)

    expect(rows.map((p) => p.id)).toEqual([3, 8, 5, 1, 6])
    expect(rows.map((p) => p.status)).toEqual(['SIN_STOCK', 'SIN_STOCK', 'CRITICO', 'BAJO', 'BAJO'])
  })
})
