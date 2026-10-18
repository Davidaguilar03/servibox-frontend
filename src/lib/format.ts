/** Lo que se muestra cuando no hay valor: una raya, nunca "N/A". */
export const EMPTY_VALUE = String.fromCharCode(0x2014)

const integerFormat = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

/** Moneda colombiana sin decimales: 180000 es "$ 180.000" y -3500 es "-$ 3.500". */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY_VALUE
  const rounded = Math.round(value)
  const sign = rounded < 0 ? '-' : ''
  return `${sign}$ ${integerFormat.format(Math.abs(rounded))}`
}

/**
 * Fecha ISO del backend (`2026-09-28`) como dd/mm/aaaa. Se parte el texto en vez de crear
 * un Date para que la zona horaria no corra el dia.
 */
export function formatDate(value: string | null | undefined): string {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null
  if (!match) return EMPTY_VALUE
  return `${match[3]}/${match[2]}/${match[1]}`
}

/** Fecha local como `yyyy-MM-dd`, el formato ISO que esperan desde y hasta en la API. */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Del primer dia del mes en curso a hoy, en fechas locales. */
export function monthToDate(today = new Date()) {
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  return { desde: toIsoDate(firstDay), hasta: toIsoDate(today) }
}

/** "octubre de 2026". */
export function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(date)
}
