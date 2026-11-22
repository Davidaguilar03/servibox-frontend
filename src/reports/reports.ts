import { addDays } from '../lib/businessDate'
import { formatDate } from '../lib/format'

// Rango de fechas de los reportes, periodo anterior y variacion del Estado de resultados. Reglas en docs/ai-context/03-DECISIONS.md.

export type ReportFormat = 'PDF' | 'XLSX'

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
  for (const [field, value] of [['desde', desde], ['hasta', hasta]] as const) {
    if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value)) {
      errors[field] = 'Escribe una fecha válida.'
    }
  }
  if (desde && hasta && !errors.desde && !errors.hasta) {
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
