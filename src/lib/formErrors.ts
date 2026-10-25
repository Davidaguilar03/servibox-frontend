import { flushSync } from 'react-dom'

/**
 * Al enviar con errores: aplica el cambio de estado que los muestra (por ejemplo, marcar todos
 * los campos como tocados) y lleva el foco al primer campo con `aria-invalid`. Si ninguno lo
 * tiene (por ejemplo, una factura sin lineas), al `fallback`.
 */
export function revealErrors(show: () => void, root: HTMLElement | null, fallback?: HTMLElement | null) {
  flushSync(show)
  const first = root?.querySelector<HTMLElement>('[aria-invalid="true"]')
  ;(first ?? fallback)?.focus()
}
