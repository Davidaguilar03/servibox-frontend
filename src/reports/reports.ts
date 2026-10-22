import type { Kpis } from '../dashboard/dashboardApi'
import { addDays } from '../lib/businessDate'
import { formatDate } from '../lib/format'

// Logica de la pantalla Reportes. Reglas en docs/ai-context/03-DECISIONS.md.

/** Valores de `type` en `GET /api/reporting/export`, mas los que el backend aun no exporta. */
export type ReportType = 'ESTADO_RESULTADOS' | 'VENTAS' | 'COMPRAS' | 'MOVIMIENTOS'
export type ReportFormat = 'PDF' | 'XLSX'

export interface ReportOption {
  type: ReportType
  title: string
  description: string
  /** false: se muestra con "Proximamente" y no se puede elegir. */
  available: boolean
}

export const REPORT_OPTIONS: ReportOption[] = [
  {
    type: 'ESTADO_RESULTADOS',
    title: 'Estado de resultados',
    description: 'Ventas, compras, gastos y utilidad del período',
    available: true,
  },
  { type: 'VENTAS', title: 'Ventas', description: 'Facturas de venta por cliente y estado', available: false },
  { type: 'COMPRAS', title: 'Compras', description: 'Facturas de proveedor y pagos', available: false },
  { type: 'MOVIMIENTOS', title: 'Movimientos de cuentas', description: 'Ingresos y egresos por cuenta', available: true },
]

/** Rango maximo de un reporte, contando los dos extremos (`ReportExportService.MAX_DIAS`). */
export const REPORT_MAX_DAYS = 366

function utcDay(date: string): number {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

/** Dias del rango contando los dos extremos: del 01/10 al 01/10 es 1. */
export function rangeDays(desde: string, hasta: string): number {
  return Math.round((utcDay(hasta) - utcDay(desde)) / 86_400_000) + 1
}

export interface RangeErrors {
  desde?: string
  hasta?: string
}

/** Las mismas reglas del backend, para no llamarlo con un rango que va a rechazar. */
export function validateRange(desde: string, hasta: string) {
  const errors: RangeErrors = {}
  if (!desde) errors.desde = 'Elige la fecha de inicio.'
  if (!hasta) errors.hasta = 'Elige la fecha de fin.'
  if (desde && hasta) {
    if (desde > hasta) errors.hasta = 'Hasta no puede ser anterior a Desde.'
    else if (rangeDays(desde, hasta) > REPORT_MAX_DAYS) {
      errors.hasta = `El período no puede pasar de ${REPORT_MAX_DAYS} días. Acorta el rango.`
    }
  }
  return { errors, valid: Object.keys(errors).length === 0 }
}

/** El periodo de igual duracion que termina el dia anterior a desde. */
export function previousPeriod(desde: string, hasta: string) {
  const previousHasta = addDays(desde, -1)
  return { desde: addDays(previousHasta, 1 - rangeDays(desde, hasta)), hasta: previousHasta }
}

/**
 * Variacion entera en porcentaje: (actual menos anterior) sobre el valor absoluto del
 * anterior. null si el anterior es 0: no hay contra que comparar.
 */
export function variation(current: number, previous: number): number | null {
  if (previous === 0) return null
  // `|| 0` evita mostrar -0.
  return Math.round(((current - previous) / Math.abs(previous)) * 100) || 0
}

/** Del primer al ultimo dia de un mismo mes. */
export function isFullCalendarMonth(desde: string, hasta: string): boolean {
  if (!desde || !hasta || desde.slice(0, 7) !== hasta.slice(0, 7) || !desde.endsWith('-01')) return false
  return addDays(hasta, 1).endsWith('-01')
}

const monthTitleFormat = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' })

/** "Octubre de 2026" para un mes completo; si no, "01/10/2026 a 19/10/2026". */
export function periodTitle(desde: string, hasta: string): string {
  if (isFullCalendarMonth(desde, hasta)) {
    const title = monthTitleFormat.format(new Date(utcDay(desde)))
    return title.charAt(0).toUpperCase() + title.slice(1)
  }
  return `${formatDate(desde)} a ${formatDate(hasta)}`
}

export interface ExportRequest {
  type: ReportType
  format: ReportFormat
  desde: string
  hasta: string
  /** Solo en MOVIMIENTOS; null es Todas las cuentas. */
  accountId: number | null
}

/** Ruta de `GET /api/reporting/export` (sin la base /api), con los parametros del backend. */
export function exportPath({ type, format, desde, hasta, accountId }: ExportRequest): string {
  const params = new URLSearchParams({ type, format, desde, hasta })
  if (type === 'MOVIMIENTOS' && accountId !== null) params.set('accountId', String(accountId))
  return `/reporting/export?${params.toString()}`
}

export interface StatementRow {
  concept: string
  value: number
  total?: boolean
}

/** Las cinco filas del archivo exportado, con compras y gastos en negativo. */
export function incomeStatementRows(kpis: Kpis): StatementRow[] {
  return [
    { concept: 'Ventas totales', value: kpis.totalSales },
    { concept: 'Compras totales', value: -kpis.totalPurchases },
    { concept: 'Utilidad bruta', value: kpis.grossProfit },
    { concept: 'Gastos operativos', value: -kpis.operatingExpenses },
    { concept: 'Utilidad neta', value: kpis.netProfit, total: true },
  ]
}
