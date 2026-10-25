import { useSyncExternalStore } from 'react'

/** Desde lg (1024 px), el punto de corte del escritorio. */
export const DESKTOP_QUERY = '(min-width: 1024px)'

/**
 * Si la consulta de medios se cumple, al dia con los cambios de tamano. `fallback` es el valor
 * sin `matchMedia` (jsdom): cada componente elige el que deja su vista principal.
 */
export function useMediaQuery(query: string, fallback: boolean) {
  return useSyncExternalStore(
    (listener) => {
      const list = window.matchMedia?.(query)
      list?.addEventListener('change', listener)
      return () => list?.removeEventListener('change', listener)
    },
    () => window.matchMedia?.(query).matches ?? fallback,
  )
}
