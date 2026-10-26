/** Racional exacto, con denominador positivo. */
export interface Ratio {
  n: bigint
  d: bigint
}

/** Representacion decimal corta, igual que BigDecimal.valueOf(double). */
export function decimal(value: number): Ratio {
  const [mantissa = '0', exponent = '0'] = String(value).toLowerCase().split('e')
  const negative = mantissa.startsWith('-')
  const [whole = '0', fraction = ''] = mantissa.replace('-', '').split('.')
  let n = BigInt(whole + fraction) * (negative ? -1n : 1n)
  let d = 10n ** BigInt(fraction.length)
  const exp = Number(exponent)
  if (exp > 0) n *= 10n ** BigInt(exp)
  if (exp < 0) d *= 10n ** BigInt(-exp)
  return { n, d }
}

export const multiply = (a: Ratio, b: Ratio): Ratio => ({ n: a.n * b.n, d: a.d * b.d })

/** HALF_UP: las mitades se alejan de cero. */
export function roundInteger({ n, d }: Ratio): number {
  const negative = n < 0n
  const abs = negative ? -n : n
  const rounded = (2n * abs + d) / (2n * d)
  return Number(negative ? -rounded : rounded)
}
