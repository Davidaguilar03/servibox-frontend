import { apiFetch } from '../lib/api'

// Solo los campos que usan el panel y Ventas. Nombres iguales a los DTO del backend.

export interface Kpis {
  totalSales: number
  totalPurchases: number
  grossProfit: number
  operatingExpenses: number
  netProfit: number
}

export type AccountType = 'EFECTIVO' | 'BANCO' | 'DIGITAL'

export interface Account {
  id: number
  name: string
  currentBalance: number
  type: AccountType
}

export interface Sale {
  id: number
  invoiceNumber: string
  customer: { name: string } | null
  invoiceDate: string
  dueDate: string | null
  paymentType: 'CONTADO' | 'CREDITO'
  status: 'PAGADA' | 'PENDIENTE' | 'ANULADA'
  total: number
  /** Lo que falta por cobrar; 0 en una ANULADA. */
  pendingBalance: number
}

export interface Product {
  id: number
  code: string
  description: string
  quantity: number | null
  categoryId: number | null
}

export interface Category {
  id: number
  name: string
  yellowStockMin: number | null
  redStockMin: number | null
}

/** desde y hasta en `yyyy-MM-dd` (`@DateTimeFormat(iso = DATE)` en el backend). */
export function fetchKpis(desde: string, hasta: string) {
  return apiFetch<Kpis>(`/reporting/kpis?desde=${desde}&hasta=${hasta}`)
}

export const fetchAccounts = () => apiFetch<Account[]>('/treasury/accounts')
export const fetchBalance = () => apiFetch<{ total: number }>('/treasury/balance')
export const fetchSales = () => apiFetch<Sale[]>('/sales')
export const fetchProducts = () => apiFetch<Product[]>('/inventory/products')
export const fetchCategories = () => apiFetch<Category[]>('/inventory/categories')
