import { useEffect, useSyncExternalStore } from 'react'

// Ultimo tramo de la miga de pan que una pagina conoce solo con sus datos (el numero de
// una factura). Mientras la pagina esta montada reemplaza al ultimo tramo de su ruta.

let tail: string | null = null
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function setTail(value: string | null) {
  tail = value
  listeners.forEach((listener) => listener())
}

export function useBreadcrumbTailValue(): string | null {
  return useSyncExternalStore(subscribe, () => tail)
}

/** Reemplaza el ultimo tramo de la miga de pan mientras la pagina este montada. */
export function useBreadcrumbTail(value: string | undefined) {
  useEffect(() => {
    if (!value) return
    setTail(value)
    return () => setTail(null)
  }, [value])
}
