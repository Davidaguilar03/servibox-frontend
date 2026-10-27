import { addDays } from '../lib/businessDate'
import { addMoney } from '../lib/money'
import { shortDate } from '../lib/period'
import type { TreasuryMovement } from './accountsApi'

export type TimelineUnit = 'dia' | 'semana' | 'mes'

export interface TimelineBucket {
  start: string
  end: string
  income: number
  expense: number
}

export interface TimelinePeak {
  amount: number
  dates: string[]
}

/** La API entrega el rango completo; la paginacion de la tabla se aplica despues. */
export function movementTimeline(movements: TreasuryMovement[], desde: string, hasta: string) {
  const daily = new Map<string, { income: number; expense: number }>()
  for (let date = desde; date <= hasta; date = addDays(date, 1)) daily.set(date, { income: 0, expense: 0 })
  for (const movement of movements) {
    const day = daily.get(movement.date)
    if (!day) continue
    if (movement.type === 'INGRESO') day.income = addMoney(day.income, movement.amount)
    else day.expense = addMoney(day.expense, movement.amount)
  }

  const unit: TimelineUnit = daily.size > 120 ? 'mes' : daily.size > 45 ? 'semana' : 'dia'
  const grouped = new Map<string, TimelineBucket>()
  let emptyDays = 0
  let maxIncome = 0
  let maxExpense = 0
  let incomeDates: string[] = []
  let expenseDates: string[] = []
  for (const [date, values] of daily) {
    if (values.income === 0 && values.expense === 0) emptyDays += 1
    if (values.income > maxIncome) { maxIncome = values.income; incomeDates = [date] }
    else if (values.income > 0 && values.income === maxIncome) incomeDates.push(date)
    if (values.expense > maxExpense) { maxExpense = values.expense; expenseDates = [date] }
    else if (values.expense > 0 && values.expense === maxExpense) expenseDates.push(date)

    const weekday = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7
    const key = unit === 'dia' ? date : unit === 'semana' ? addDays(date, -weekday) : date.slice(0, 7)
    const bucket = grouped.get(key)
    if (bucket) {
      bucket.end = date
      bucket.income = addMoney(bucket.income, values.income)
      bucket.expense = addMoney(bucket.expense, values.expense)
    } else grouped.set(key, { start: date, end: date, income: values.income, expense: values.expense })
  }
  return {
    unit,
    buckets: [...grouped.values()],
    emptyDays,
    peakIncome: maxIncome > 0 ? { amount: maxIncome, dates: incomeDates } : null,
    peakExpense: maxExpense > 0 ? { amount: maxExpense, dates: expenseDates } : null,
  }
}

export function timelineBucketLabel(bucket: TimelineBucket, unit: TimelineUnit) {
  if (unit === 'mes') return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${bucket.start}T00:00:00Z`))
  return bucket.start === bucket.end ? shortDate(bucket.start) : `${shortDate(bucket.start)} al ${shortDate(bucket.end)}`
}
