import { decimal, multiply, roundInteger } from './decimal'

/** Moneda.aCentavos: redondeo decimal HALF_UP, sin residuos del producto binario. */
export function moneyProduct(...values: number[]): number {
  if (values.some((value) => !Number.isFinite(value))) return NaN
  const exact = values.reduce((result, value) => multiply(result, decimal(value)), { n: 100n, d: 1n })
  return roundInteger(exact) / 100
}

export const round2 = (value: number): number => moneyProduct(value)
export function addMoney(a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN
  const first = decimal(a)
  const second = decimal(b)
  return roundInteger({ n: (first.n * second.d + second.n * first.d) * 100n, d: first.d * second.d }) / 100
}

/** Precio escrito en un input numerico: punto decimal y exponente, sin perder digitos. */
export function unitPriceError(text: string): string | undefined {
  const match = /^([+-]?)(\d*\.?\d+|\d+\.?)(?:e([+-]?\d+))?$/i.exec(text.trim())
  if (!match) return 'El precio debe ser mayor que cero.'
  const [, sign, mantissa = '', exponent = '0'] = match
  if (sign === '-' || !/[1-9]/.test(mantissa)) return 'El precio debe ser mayor que cero.'
  const fraction = mantissa.split('.')[1] ?? ''
  const significantScale = fraction.length - (mantissa.match(/0+$/)?.[0].length ?? 0) - Number(exponent)
  if (significantScale > 2) return 'El precio unitario admite como máximo dos decimales.'
  if (!Number.isFinite(Number(text)) || Number(text) <= 0) return 'El precio debe ser mayor que cero.'
}
