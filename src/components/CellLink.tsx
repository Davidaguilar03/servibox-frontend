import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router'

/** Clase unica de los enlaces dentro de celdas y tarjetas de listado. */
export const cellLinkClasses =
  'hit-area rounded-control text-small font-semibold whitespace-nowrap text-brand-ink hover:underline focus-visible:underline focus-ring'

/** Enlace dentro de una celda (Ver detalle, Editar, numero de factura): un solo estilo. */
export function CellLink({ className = '', ...props }: LinkProps) {
  return <Link className={`${cellLinkClasses} ${className}`} {...props} />
}

/** Misma apariencia para una accion de celda que no navega (por ejemplo, Editar en un modal). */
export function CellButton({ className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={`${cellLinkClasses} ${className}`} {...props} />
}
