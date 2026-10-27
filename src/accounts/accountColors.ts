import type { Account } from '../dashboard/dashboardApi'

// Datos persistidos, basados en info, warning-ink, neutral-600 y violet.
export const ACCOUNT_COLORS = [
  { value: '#2563EB', label: 'Azul' },
  { value: '#B45309', label: 'Ámbar' },
  { value: '#4B5563', label: 'Gris' },
  { value: '#7C3AED', label: 'Violeta' },
] as const

export function accountColor(account: Pick<Account, 'id' | 'color'>): string {
  return account.color ?? ACCOUNT_COLORS[Math.abs(account.id) % 3]!.value
}
