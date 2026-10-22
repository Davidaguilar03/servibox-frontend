import type { AccountType } from '../dashboard/dashboardApi'
import type { InventoryProduct } from '../inventory/inventoryApi'
import { accountPaymentMethods } from '../lib/accountPayment'
import { ApiError } from '../lib/api'
import { round2, type PricedLine } from '../sales/newSale'
import type { Purchase, PurchaseRequest } from './purchasesApi'

// Logica de la pantalla Nueva factura de compra. Reglas en docs/ai-context/03-DECISIONS.md.

/** Largo de `numero_factura_compra` (VARCHAR 50). */
export const INVOICE_NUMBER_MAX = 50

export interface PurchaseLine {
  /** Identifica la linea en la interfaz; no viaja al backend. */
  key: number
  productId: number | null
  /** Valores tal como estan en los campos. */
  quantity: string
  price: string
}

export interface PurchaseForm {
  supplierId: number | null
  invoiceNumber: string
  invoiceDate: string
  paymentType: Purchase['paymentType']
  /** Solo cuenta en credito; en contado el vencimiento es la fecha de la factura. */
  dueDate: string
  accountId: number | null
  paymentMethod: string
  lines: PurchaseLine[]
}

/**
 * Espejo de `PurchasesService.crearFactura`: por linea `base = precio * cantidad` e
 * `iva = base * tasa`, sumados en doubles en el orden de las lineas, y `total = subtotal +
 * iva`. Cada uno se redondea como su columna NUMERIC(14,2). `exactTotal`, sin redondear, es
 * lo que el backend compara con el saldo de la cuenta.
 */
export function purchaseTotals(lines: PricedLine[]) {
  let subtotal = 0
  let iva = 0
  for (const line of lines) {
    const base = line.price * line.quantity
    subtotal += base
    iva += base * line.rate
  }
  return { subtotal: round2(subtotal), iva: round2(iva), total: round2(subtotal + iva), exactTotal: subtotal + iva }
}

/** La regla de `exigirSaldoSuficiente`: no alcanza si el saldo es menor que el total. */
export function insufficientBalance(balance: number, total: number): boolean {
  return balance < total
}

/** Valores de `medio_pago_compra` en el diccionario de datos del backend. */
export type PurchasePaymentMethod = 'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE'

export const purchasePaymentMethodLabels: Record<PurchasePaymentMethod, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  CHEQUE: 'Cheque',
}

/** El medio sale del tipo de la cuenta, con los valores de compra. El primero es el de por defecto. */
export function purchasePaymentMethodsFor(type: AccountType | undefined) {
  return accountPaymentMethods<PurchasePaymentMethod>(type, { cash: 'EFECTIVO', nonCash: ['TRANSFERENCIA', 'CHEQUE'] })
}

export interface LineErrors {
  product?: string
  quantity?: string
  price?: string
}

export interface PurchaseValidation {
  lines: Record<number, LineErrors>
  form: string[]
  valid: boolean
}

/** Lo que falta o esta mal; Guardar solo se habilita con `valid` (y saldo suficiente en contado). */
export function validatePurchase(form: PurchaseForm, productsById: Map<number, InventoryProduct>): PurchaseValidation {
  const lines: Record<number, LineErrors> = {}
  const formErrors: string[] = []

  if (form.supplierId === null) formErrors.push('Elige el proveedor.')
  if (!form.invoiceNumber.trim()) formErrors.push('Escribe el número de factura del proveedor.')
  if (!form.invoiceDate) formErrors.push('Indica la fecha de la factura.')
  if (form.lines.length === 0) formErrors.push('Agrega al menos un producto.')
  if (form.paymentType === 'CONTADO') {
    if (form.accountId === null) formErrors.push('Elige la cuenta de la que sale el dinero.')
    else if (!form.paymentMethod) formErrors.push('Elige el método de pago.')
  } else if (!form.dueDate || form.dueDate < form.invoiceDate) {
    formErrors.push('El vencimiento no puede ser anterior a la fecha de la factura.')
  }

  for (const line of form.lines) {
    const errors: LineErrors = {}
    if (line.productId === null || !productsById.has(line.productId)) errors.product = 'Elige un producto.'
    const quantity = Number(line.quantity)
    if (line.quantity.trim() === '' || !Number.isInteger(quantity) || quantity <= 0) {
      errors.quantity = 'Escribe una cantidad entera mayor que cero.'
    }
    const price = Number(line.price)
    if (line.price.trim() === '' || !Number.isFinite(price) || price <= 0) errors.price = 'El precio debe ser mayor que cero.'
    if (errors.product || errors.quantity || errors.price) lines[line.key] = errors
  }

  return { lines, form: formErrors, valid: formErrors.length === 0 && Object.keys(lines).length === 0 }
}

/** Cuerpo exacto del POST: vencimiento solo en credito, cuenta y medio solo en contado. */
export function buildPurchaseRequest(form: PurchaseForm): PurchaseRequest {
  const request: PurchaseRequest = {
    supplierId: form.supplierId,
    invoiceNumber: form.invoiceNumber.trim(),
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

/** 409 "Ya existe una factura de compra con el numero X": va bajo el campo del numero. */
export function isDuplicatePurchaseNumberError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 409 &&
    error.message.startsWith('Ya existe una factura de compra con el numero')
  )
}

/** 409 "Saldo insuficiente en X: ...": la cuenta cambio desde que se cargo. */
export function isInsufficientBalanceError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409 && error.message.startsWith('Saldo insuficiente')
}
