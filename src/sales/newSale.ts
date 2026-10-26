import type { AccountType, Category, Product, Sale } from '../dashboard/dashboardApi'
import { accountPaymentMethods } from '../lib/accountPayment'
import { ApiError } from '../lib/api'
import { addMoney, moneyProduct, unitPriceError } from '../lib/money'
export { round2 } from '../lib/money'
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

/** Tasa de IVA de la categoria: suma de las tasas de sus impuestos marcados como IVA. */
export function vatRate(category: Pick<Category, 'taxTypes'> | undefined): number {
  return (category?.taxTypes ?? []).reduce((sum, tax) => (tax.isVat && tax.rate !== null ? sum + tax.rate : sum), 0)
}

export interface PricedLine {
  quantity: number
  price: number
  rate: number
}

/** Cantidad antes del redondeo definitivo de cada importe de linea. */
export function lineAmounts({ quantity, price, rate }: PricedLine) {
  return { base: moneyProduct(price, quantity), iva: moneyProduct(price, quantity, rate) }
}

/** Suma los importes definitivos de las lineas, igual que el backend. */
export function invoiceTotals(lines: PricedLine[]) {
  let subtotal = 0
  let iva = 0
  for (const line of lines) {
    const amounts = lineAmounts(line)
    subtotal = addMoney(subtotal, amounts.base)
    iva = addMoney(iva, amounts.iva)
  }
  return { subtotal, iva, total: addMoney(subtotal, iva) }
}

/** Valores de `medio_pago_venta` en el diccionario de datos del backend. */
export type PaymentMethod = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA_DEBITO' | 'TARJETA_CREDITO'

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  TARJETA_DEBITO: 'Tarjeta débito',
  TARJETA_CREDITO: 'Tarjeta crédito',
}

/** El medio sale del tipo de la cuenta, con los valores de venta. El primero es el de por defecto. */
export function paymentMethodsFor(type: AccountType | undefined): { options: PaymentMethod[]; locked: boolean } {
  return accountPaymentMethods<PaymentMethod>(type, {
    cash: 'EFECTIVO',
    nonCash: ['TRANSFERENCIA', 'TARJETA_DEBITO', 'TARJETA_CREDITO'],
  })
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
    errors.price = unitPriceError(line.price)
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
  return error instanceof ApiError && error.status === 409 && /^Ya existe una factura con el numero /.test(error.message)
}
