import { useSyncExternalStore } from 'react'

/** Lo que dura un aviso de exito en pantalla antes de cerrarse solo. */
export const TOAST_DURATION_MS = 5000
/** Avisos a la vez: al llegar uno mas se retira el mas antiguo. */
export const MAX_TOASTS = 3

export type ToastTone = 'success' | 'error'

export interface ToastMessage {
  id: number
  message: string
  tone: ToastTone
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

/**
 * Muestra un aviso que sobrevive a la navegacion. El de exito se cierra solo a los 5 s
 * (el temporizador vive en el Toaster y se pausa con el cursor o el foco); el de error queda
 * hasta que se cierra.
 */
export function showToast(message: string, tone: ToastTone = 'success') {
  toasts = [...toasts, { id: nextId++, message, tone }].slice(-MAX_TOASTS)
  emit()
}

export function useToasts(): ToastMessage[] {
  return useSyncExternalStore(subscribe, () => toasts)
}

/** Vacia los avisos (entre pruebas: el almacen es del modulo). */
export function resetToasts() {
  toasts = []
  emit()
}
