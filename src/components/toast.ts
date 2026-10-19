import { useSyncExternalStore } from 'react'

/** Lo que dura un aviso en pantalla antes de cerrarse solo. */
export const TOAST_DURATION_MS = 5000

export interface ToastMessage {
  id: number
  message: string
}

let toasts: ToastMessage[] = []
let nextId = 1
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function dismissToast(id: number) {
  toasts = toasts.filter((toast) => toast.id !== id)
  emit()
}

/** Muestra un aviso de exito que sobrevive a la navegacion y se cierra solo. */
export function showToast(message: string) {
  const id = nextId++
  toasts = [...toasts, { id, message }]
  emit()
  setTimeout(() => dismissToast(id), TOAST_DURATION_MS)
}

export function useToasts(): ToastMessage[] {
  return useSyncExternalStore(subscribe, () => toasts)
}
