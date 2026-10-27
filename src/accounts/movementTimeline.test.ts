import { describe, expect, it } from 'vitest'
import { accountMovements, periodTotals } from './accountsView'
import type { TreasuryMovement } from './accountsApi'
import { movementTimeline, timelineBucketLabel } from './movementTimeline'
import { addMoney } from '../lib/money'

function movement(id: number, accountId: number, date: string, type: TreasuryMovement['type'], amount: number, category: TreasuryMovement['category'] = 'INGRESO_OCASIONAL'): TreasuryMovement {
  return { id, accountId, accountName: `Cuenta ${accountId}`, date, type, amount, category, concept: 'Movimiento', notes: null, saleId: null, purchaseId: null, relatedMovementId: null }
}

describe('serie de movimientos', () => {
  it('usa todos los movimientos antes de paginar, conserva centavos y ambas patas de una transferencia', () => {
    const list = Array.from({ length: 30 }, (_, index) => movement(index + 1, 1, '2026-10-02', 'INGRESO', 0.01))
    list.push(movement(31, 1, '2026-10-03', 'EGRESO', 10.25, 'TRANSFERENCIA'))
    list.push(movement(32, 2, '2026-10-03', 'INGRESO', 10.25, 'TRANSFERENCIA'))
    const global = movementTimeline(list, '2026-10-01', '2026-10-04')
    const scope = movementTimeline(accountMovements(list, 1), '2026-10-01', '2026-10-04')
    expect(global.buckets.map(({ income, expense }) => [income, expense])).toEqual([[0, 0], [0.3, 0], [10.25, 10.25], [0, 0]])
    expect(scope.buckets.map(({ income, expense }) => [income, expense])).toEqual([[0, 0], [0.3, 0], [0, 10.25], [0, 0]])
    expect(global.buckets.reduce((sum, bucket) => addMoney(sum, bucket.income), 0)).toBe(periodTotals(list).income)
    expect(global.buckets.reduce((sum, bucket) => addMoney(sum, bucket.expense), 0)).toBe(periodTotals(list).expense)
    expect(global.emptyDays).toBe(2)
  })

  it('marca empates, ausencia de egresos y dias sin movimientos en el rango completo', () => {
    const timeline = movementTimeline([
      movement(1, 1, '2026-10-01', 'INGRESO', 25.5),
      movement(2, 1, '2026-10-03', 'INGRESO', 25.5),
    ], '2026-10-01', '2026-10-04')
    expect(timeline.peakIncome).toEqual({ amount: 25.5, dates: ['2026-10-01', '2026-10-03'] })
    expect(timeline.peakExpense).toBeNull()
    expect(timeline.emptyDays).toBe(2)
    expect(movementTimeline([], '2026-10-01', '2026-10-04').emptyDays).toBe(4)
  })

  it('agrupa rangos largos por semana o mes sin perder las sumas', () => {
    const list = [
      movement(1, 1, '2026-01-01', 'INGRESO', 100.12),
      movement(2, 1, '2026-02-02', 'EGRESO', 30.34),
      movement(3, 1, '2026-06-01', 'INGRESO', 45.67),
    ]
    const weekly = movementTimeline(list, '2026-01-01', '2026-03-01')
    const monthly = movementTimeline(list, '2026-01-01', '2026-06-30')
    expect(weekly.unit).toBe('semana')
    expect(monthly.unit).toBe('mes')
    expect(monthly.buckets.reduce((sum, bucket) => addMoney(sum, bucket.income), 0)).toBe(145.79)
    expect(monthly.buckets.reduce((sum, bucket) => addMoney(sum, bucket.expense), 0)).toBe(30.34)
    expect(timelineBucketLabel(monthly.buckets[0]!, monthly.unit)).toBe('enero de 2026')
    expect(monthly.emptyDays).toBe(178)
  })
})
