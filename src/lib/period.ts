import { addDays } from './businessDate'

// Periodos de los filtros por fecha (PeriodPicker). Las fechas son `yyyy-MM-dd` en la zona del
// negocio: `today` sale de `businessToday()`, nunca de un Date local.

/** Todos los periodos que conoce el selector; cada pantalla elige los suyos. */
export type PeriodKey =
  | 'hoy'
  | 'esta-semana'
  | 'este-mes'
  | 'mes-anterior'
  | 'ultimos-30'
  | 'este-ano'
  | 'todas'
  | 'personalizado'

/** Periodo con rango fijo calculado a partir de hoy. */
export type FixedPeriod = Exclude<PeriodKey, 'todas' | 'personalizado'>

export interface DateRange {
  desde: string
  hasta: string
}

/** Lunes 0 a domingo 6 de una fecha `yyyy-MM-dd`, sin pasar por la zona del navegador. */
function weekdayFromMonday(date: string): number {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number)
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7
}

/**
 * Rango de un periodo fijo con `today` en la zona del negocio. Los que empiezan en el pasado
 * terminan hoy; Mes anterior cubre el mes completo; Ultimos 30 dias incluye hoy.
 */
export function periodRange(periodo: FixedPeriod, today: string): DateRange {
  const firstOfMonth = `${today.slice(0, 8)}01`
  switch (periodo) {
    case 'hoy':
      return { desde: today, hasta: today }
    case 'esta-semana':
      return { desde: addDays(today, -weekdayFromMonday(today)), hasta: today }
    case 'este-mes':
      return { desde: firstOfMonth, hasta: today }
    case 'mes-anterior': {
      const lastOfPrevious = addDays(firstOfMonth, -1)
      return { desde: `${lastOfPrevious.slice(0, 8)}01`, hasta: lastOfPrevious }
    }
    case 'ultimos-30':
      return { desde: addDays(today, -29), hasta: today }
    case 'este-ano':
      return { desde: `${today.slice(0, 4)}-01-01`, hasta: today }
  }
}

const MONTHS = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.']

/** "1 oct. 2026", sin pasar por la zona del navegador. */
export function shortDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return `${day} ${MONTHS[(month ?? 1) - 1]} ${year}`
}

/** "1 oct. 2026 al 24 oct. 2026", o la fecha sola si el rango es de un dia. */
export function rangeLabel({ desde, hasta }: DateRange): string {
  return desde === hasta ? shortDate(desde) : `${shortDate(desde)} al ${shortDate(hasta)}`
}
