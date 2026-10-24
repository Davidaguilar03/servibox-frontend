import { useEffect, useSyncExternalStore } from 'react'

// Ultimo tramo de la miga de pan que una pagina conoce solo con sus datos (el numero de
// una factura). Mientras la pagina esta montada reemplaza al ultimo tramo de su ruta o, con
// `append`, se agrega despues de el (Cuentas / Movimientos / la cuenta elegida).

export interface BreadcrumbTail {
  value: string
  mode: 'replace' | 'append'
}

let tail: BreadcrumbTail | null = null
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function setTail(value: BreadcrumbTail | null) {
  tail = value
  listeners.forEach((listener) => listener())
}

export function useBreadcrumbTailValue(): BreadcrumbTail | null {
  return useSyncExternalStore(subscribe, () => tail)
}

/** Reemplaza (o agrega) el ultimo tramo de la miga de pan mientras la pagina este montada. */
export function useBreadcrumbTail(value: string | undefined, mode: BreadcrumbTail['mode'] = 'replace') {
  useEffect(() => {
    if (!value) return
    setTail({ value, mode })
    return () => setTail(null)
  }, [value, mode])
}
