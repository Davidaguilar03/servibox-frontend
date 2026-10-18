import { describe, expect, it } from 'vitest'
import { EMPTY_VALUE, formatCurrency, formatDate, monthToDate } from './format'

describe('formatCurrency', () => {
  it('formatea pesos sin decimales con punto de miles', () => {
    expect(formatCurrency(180000)).toBe('$ 180.000')
    expect(formatCurrency(48620000)).toBe('$ 48.620.000')
    expect(formatCurrency(1500)).toBe('$ 1.500')
    expect(formatCurrency(0)).toBe('$ 0')
  })

  it('redondea los decimales', () => {
    expect(formatCurrency(180000.5)).toBe('$ 180.001')
    expect(formatCurrency(119000.4)).toBe('$ 119.000')
  })

  it('pone el signo antes del simbolo en negativos', () => {
    expect(formatCurrency(-3500)).toBe('-$ 3.500')
  })

  it('sin valor muestra la raya', () => {
    expect(formatCurrency(null)).toBe(EMPTY_VALUE)
    expect(formatCurrency(undefined)).toBe(EMPTY_VALUE)
    expect(EMPTY_VALUE.charCodeAt(0)).toBe(0x2014)
    expect(EMPTY_VALUE).toHaveLength(1)
  })
})

describe('formatDate', () => {
  it('convierte la fecha ISO a dd/mm/aaaa', () => {
    expect(formatDate('2026-09-28')).toBe('28/09/2026')
    expect(formatDate('2026-01-05')).toBe('05/01/2026')
  })

  it('sin fecha o con una invalida muestra la raya', () => {
    expect(formatDate(null)).toBe(EMPTY_VALUE)
    expect(formatDate('')).toBe(EMPTY_VALUE)
    expect(formatDate('28/09/2026')).toBe(EMPTY_VALUE)
  })
})

describe('monthToDate', () => {
  it('va del primer dia del mes a hoy', () => {
    expect(monthToDate(new Date(2026, 9, 18))).toEqual({ desde: '2026-10-01', hasta: '2026-10-18' })
    expect(monthToDate(new Date(2026, 0, 1))).toEqual({ desde: '2026-01-01', hasta: '2026-01-01' })
  })
})
