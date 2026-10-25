import { useEffect, useRef, useState } from 'react'

/**
 * Ancho real de un elemento (su caja de contenido), al dia con ResizeObserver. Sin
 * ResizeObserver (jsdom) o mientras el elemento esta oculto vale `Infinity`: se muestra todo.
 */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(Number.POSITIVE_INFINITY)

  useEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      const next = entry?.contentRect.width ?? 0
      setWidth(next > 0 ? next : Number.POSITIVE_INFINITY)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return [ref, width] as const
}

/** Anchos del recuadro de facturas: con todas las columnas, sin Vence ni Forma de pago, y sin Fecha. */
export const INVOICE_TABLE_FULL = 1120
export const INVOICE_TABLE_MEDIUM = 820
