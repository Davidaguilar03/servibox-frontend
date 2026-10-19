import type { Account, AccountType, Category, Product, Sale } from '../dashboard/dashboardApi'
import { ApiError } from '../lib/api'
import { stockStatus } from '../lib/stock'
import type { SaleRequest } from './salesApi'

// Logica de la pantalla Nueva factura de venta. Reglas en docs/ai-context/03-DECISIONS.md.

export interface SaleLine {
  /** Identifica la linea en la interfaz; no viaja al backend. */
  key: number
  productId: number | null
  /** Valores tal como estan en los campos. */
  quantity: string
  price: string
}

export interface SaleForm {
  customerId: number | null
  invoiceDate: string
  paymentType: Sale['paymentType']
  /** Solo cuenta en credito; en contado el vencimiento es la fecha de la factura. */
  dueDate: string
  accountId: number | null
  paymentMethod: string
  lines: SaleLine[]
}

/**
 * Redondeo a 2 decimales, mitad hacia arriba, sobre la representacion decimal del numero:
 * lo que hace la base al guardar un double en una columna NUMERIC(14,2).
 */
export function round2(value: number): number {
  const [digits = '0', exponent = '0'] = String(value).split('e')
  const shifted = Math.round(Number(`${digits}e${Number(exponent) + 2}`))
  const [rDigits = '0', rExponent = '0'] = String(shifted).split('e')
  return Number(`${rDigits}e${Number(rExponent) - 2}`)
}

/** Tasa de IVA de la categoria: suma de las tasas de sus impuestos marcados como IVA. */
export function vatRate(category: Pick<Category, 'taxTypes'> | undefined): number {
  return (category?.taxTypes ?? []).reduce((sum, tax) => (tax.isVat && tax.rate !== null ? sum + tax.rate : sum), 0)
}

export interface PricedLine {
  quantity: number
  price: number
  rate: number
}

/** Base e IVA de una linea, como los guarda el backend (`precio * cantidad` y `base * tasa`). */
export function lineAmounts({ quantity, price, rate }: PricedLine) {
  const base = price * quantity
  return { base: round2(base), iva: round2(base * rate) }
}

/**
 * Espejo de `SalesService.crearFactura`: suma las bases y los IVA en doubles, en el orden
 * de las lineas, y redondea solo al final como la columna NUMERIC(14,2). El IVA que se
 * muestra es total menos subtotal.
 */
export function invoiceTotals(lines: PricedLine[]) {
  let subtotal = 0
  let ivaGenerado = 0
  for (const line of lines) {
    const base = line.price * line.quantity
    subtotal += base
    ivaGenerado += base * line.rate
  }
  const roundedSubtotal = round2(subtotal)
  const total = round2(subtotal + ivaGenerado)
  return { subtotal: roundedSubtotal, iva: round2(total - roundedSubtotal), total }
}

/** Valores de `medio_pago_venta` en el diccionario de datos del backend. */
export type PaymentMethod = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA_DEBITO' | 'TARJETA_CREDITO'

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  TARJETA_DEBITO: 'Tarjeta débito',
  TARJETA_CREDITO: 'Tarjeta crédito',
}

/** El medio sale del tipo de la cuenta, no de su nombre. El primero es el de por defecto. */
export function paymentMethodsFor(type: AccountType | undefined): { options: PaymentMethod[]; locked: boolean } {
  if (type === 'EFECTIVO') return { options: ['EFECTIVO'], locked: true }
  if (type === 'BANCO' || type === 'DIGITAL') {
    return { options: ['TRANSFERENCIA', 'TARJETA_DEBITO', 'TARJETA_CREDITO'], locked: false }
  }
  return { options: [], locked: true }
}

/** La primera cuenta de tipo EFECTIVO por id ascendente: la que se propone para cobrar. */
export function defaultCashAccount(accounts: Account[] | undefined): Account | undefined {
  return [...(accounts ?? [])].sort((a, b) => a.id - b.id).find((account) => account.type === 'EFECTIVO')
}

/** Fecha `yyyy-MM-dd` mas n dias, sin pasar por la zona horaria. */
export function addDays(date: string, days: number): string {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

export const DEFAULT_CREDIT_DAYS = 30
export const CREDIT_DAY_OPTIONS = [30, 60, 90]

export function defaultDueDate(invoiceDate: string): string {
  return addDays(invoiceDate, DEFAULT_CREDIT_DAYS)
}

export interface LineErrors {
  product?: string
  quantity?: string
  price?: string
}

export interface SaleValidation {
  lines: Record<number, LineErrors>
  form: string[]
  valid: boolean
}

/** Lo que falta o esta mal; Guardar solo se habilita con `valid`. */
export function validateSale(form: SaleForm, productsById: Map<number, Product>): SaleValidation {
  const lines: Record<number, LineErrors> = {}
  const formErrors: string[] = []

  if (!form.invoiceDate) formErrors.push('Indica la fecha de la factura.')
  if (form.lines.length === 0) formErrors.push('Agrega al menos un producto.')
  if (form.paymentType === 'CONTADO') {
    if (form.accountId === null) formErrors.push('Elige la cuenta donde entra el dinero.')
    else if (!form.paymentMethod) formErrors.push('Elige el medio de pago.')
  } else if (!form.dueDate || form.dueDate < form.invoiceDate) {
    formErrors.push('El vencimiento no puede ser anterior a la fecha de la factura.')
  }

  for (const line of form.lines) {
    const errors: LineErrors = {}
    const product = line.productId === null ? undefined : productsById.get(line.productId)
    if (!product) errors.product = 'Elige un producto.'
    const quantity = Number(line.quantity)
    if (line.quantity.trim() === '' || !Number.isInteger(quantity) || quantity <= 0) {
      errors.quantity = 'Escribe una cantidad entera mayor que cero.'
    } else if (product && quantity > (product.quantity ?? 0)) {
      errors.quantity = `Solo hay ${product.quantity ?? 0} unidades disponibles.`
    }
    const price = Number(line.price)
    if (line.price.trim() === '' || !Number.isFinite(price) || price <= 0) errors.price = 'El precio debe ser mayor que cero.'
    if (errors.product || errors.quantity || errors.price) lines[line.key] = errors
  }

  return { lines, form: formErrors, valid: formErrors.length === 0 && Object.keys(lines).length === 0 }
}

/** Cuerpo exacto del POST: sin numero, vencimiento solo en credito, cuenta y medio solo en contado. */
export function buildSaleRequest(form: SaleForm): SaleRequest {
  const request: SaleRequest = {
    customerId: form.customerId,
    invoiceDate: form.invoiceDate,
    paymentType: form.paymentType,
    details: form.lines.map((line) => ({
      productId: line.productId ?? 0,
      quantity: Number(line.quantity),
      price: Number(line.price),
    })),
  }
  if (form.paymentType === 'CREDITO') {
    request.dueDate = form.dueDate
  } else {
    request.accountId = form.accountId ?? undefined
    request.paymentMethod = form.paymentMethod
  }
  return request
}

export interface StockWarning {
  productId: number
  code: string
  remaining: number
  tone: 'warning' | 'error'
  title: string
}

/**
 * Productos que quedarian sin stock, en stock critico o bajo despues de la venta, con la
 * misma regla de `stockStatus`. Lineas con una cantidad invalida no avisan.
 */
export function stockWarnings(
  lines: SaleLine[],
  productsById: Map<number, Product>,
  categoriesById: Map<number, Category>,
): StockWarning[] {
  const warnings: StockWarning[] = []
  for (const line of lines) {
    const product = line.productId === null ? undefined : productsById.get(line.productId)
    const quantity = Number(line.quantity)
    if (!product || !Number.isInteger(quantity) || quantity <= 0 || quantity > (product.quantity ?? 0)) continue
    const remaining = (product.quantity ?? 0) - quantity
    const category = product.categoryId === null ? undefined : categoriesById.get(product.categoryId)
    const status = stockStatus(remaining, category)
    if (status === 'NORMAL') continue
    const title = status === 'BAJO' ? 'Stock bajo' : status === 'CRITICO' ? 'Stock crítico' : 'Sin stock'
    warnings.push({ productId: product.id, code: product.code, remaining, tone: status === 'BAJO' ? 'warning' : 'error', title })
  }
  return warnings
}

/** 409 porque otra factura tomo el mismo consecutivo al tiempo: se puede reintentar. */
export function isDuplicateNumberError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409 && error.message.startsWith('Ya existe una factura con el numero')
}
