// Copia en el cliente de InventoryService.aplicarPrecios del backend, solo para el panel de
// margen del formulario de producto. El precio que vale es el que calcula el backend al guardar.
// Las pruebas (pricing.test.ts) la ligan a los casos verificados del backend; si cambia la
// formula alla, cambia aqui. Ver docs/ai-context/02-CONVENTIONS.md.

/** Numero racional exacto: numerador y denominador enteros (denominador positivo). */
interface Ratio {
  n: bigint
  d: bigint
}

/**
 * Un double como lo lee BigDecimal.valueOf(double): su representacion decimal corta
 * (String(0.19) es "0.19"), no el binario exacto.
 */
function decimal(value: number): Ratio {
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

const one: Ratio = { n: 1n, d: 1n }
const sub = (a: Ratio, b: Ratio): Ratio => ({ n: a.n * b.d - b.n * a.d, d: a.d * b.d })
const mul = (a: Ratio, b: Ratio): Ratio => ({ n: a.n * b.n, d: a.d * b.d })
const div = (a: Ratio, b: Ratio): Ratio => (b.n < 0n ? { n: -a.n * b.d, d: a.d * -b.n } : { n: a.n * b.d, d: a.d * b.n })

/** Moneda.aPesosEnteros: al peso entero, la mitad hacia arriba (HALF_UP, alejandose de 0). */
function toWholePesos({ n, d }: Ratio): number {
  const negative = n < 0n
  const abs = negative ? -n : n
  const rounded = (2n * abs + d) / (2n * d)
  return Number(negative ? -rounded : rounded)
}

export interface PriceInputs {
  /** Costo de compra sin IVA. */
  purchaseCost: number
  /** Suma de las tasas de la categoria marcadas como IVA (fraccion: 0.19). */
  vatRate: number
  /** Margen objetivo de la categoria (fraccion: 0.30); null cuenta como 0. */
  targetMargin: number | null
  /** Configuracion financiera (fracciones); null cuenta como 0. */
  expensesRate: number | null
  dianRate: number | null
  icaRate: number | null
}

/**
 * IVA del costo y precio sugerido sin IVA, igual que el backend: aritmetica exacta y un solo
 * redondeo al final. k = (1 - gastos) * (1 - DIAN); divisor = k - ICA - margen; precio =
 * costo * k / divisor, o el costo si el divisor no es positivo.
 */
export function suggestedPrice(inputs: PriceInputs) {
  const cost = decimal(inputs.purchaseCost)
  const taxAmount = toWholePesos(mul(cost, decimal(inputs.vatRate)))
  const k = mul(sub(one, decimal(inputs.expensesRate ?? 0)), sub(one, decimal(inputs.dianRate ?? 0)))
  const divisor = sub(sub(k, decimal(inputs.icaRate ?? 0)), decimal(inputs.targetMargin ?? 0))
  const price = divisor.n <= 0n ? cost : div(mul(cost, k), divisor)
  return { taxAmount, suggestedPrice: toWholePesos(price) }
}

/** Tasa de IVA de una categoria: la suma de sus impuestos marcados como IVA (vatRateOf). */
export function vatRateOf(taxTypes: Array<{ rate: number | null; isVat?: boolean | null }>): number {
  let total = 0
  for (const tax of taxTypes) if (tax.isVat === true && tax.rate !== null) total += tax.rate
  return total
}
