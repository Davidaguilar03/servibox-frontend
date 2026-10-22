// Fechas de negocio de una factura nueva (venta o compra). Reglas en
// docs/ai-context/03-DECISIONS.md.

/** Zona del negocio, la misma del backend (`servibox.business.time-zone`). */
const BUSINESS_TIME_ZONE = 'America/Bogota'

/** Hoy en la zona del negocio, `yyyy-MM-dd`. */
export function businessToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIME_ZONE }).format(now)
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
