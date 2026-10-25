import { describe, expect, it } from 'vitest'
import { suggestedPrice, vatRateOf } from './pricing'

const zero = { expensesRate: 0, dianRate: 0, icaRate: 0 }

describe('precio sugerido (copia de InventoryService.aplicarPrecios)', () => {
  it('coincide con los casos verificados del backend', () => {
    expect(suggestedPrice({ purchaseCost: 12345, vatRate: 0.19, targetMargin: 0.3, ...zero })).toEqual({ taxAmount: 2346, suggestedPrice: 17636 })
    // Mitad hacia arriba: 10.350 x 0,19 = 1.966,5 da 1.967.
    expect(suggestedPrice({ purchaseCost: 10350, vatRate: 0.19, targetMargin: 0.3, ...zero })).toEqual({ taxAmount: 1967, suggestedPrice: 14786 })
    expect(
      suggestedPrice({ purchaseCost: 30000, vatRate: 0.19, targetMargin: 0.3, expensesRate: 0.1, dianRate: 0.05, icaRate: 0.0082 }),
    ).toEqual({ taxAmount: 5700, suggestedPrice: 46909 })
  })

  it('con el divisor en 0 o negativo el precio es el costo redondeado', () => {
    expect(suggestedPrice({ purchaseCost: 1000.5, vatRate: 0, targetMargin: 1, ...zero })).toEqual({ taxAmount: 0, suggestedPrice: 1001 })
    expect(suggestedPrice({ purchaseCost: 1000, vatRate: 0.19, targetMargin: 0.95, expensesRate: 0.1, dianRate: 0, icaRate: 0 }).suggestedPrice).toBe(1000)
  })

  it('margen y configuracion nulos cuentan como 0', () => {
    expect(suggestedPrice({ purchaseCost: 5000, vatRate: 0.19, targetMargin: null, expensesRate: null, dianRate: null, icaRate: null })).toEqual({ taxAmount: 950, suggestedPrice: 5000 })
  })

  it('el IVA de la categoria suma solo las tasas marcadas como IVA', () => {
    expect(vatRateOf([{ rate: 0.19, isVat: true }, { rate: 0.04, isVat: false }])).toBe(0.19)
  })
})
