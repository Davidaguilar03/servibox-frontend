import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'

/** Area tactil de 44 bajo lg y 36 desde lg; el icono sigue en 16 o 20. */
export const iconButtonClasses =
  'inline-flex size-touch shrink-0 items-center justify-center rounded-control text-text-muted transition-colors duration-(--duration-fast) hover:bg-neutral-100 hover:text-text focus-ring disabled:pointer-events-none disabled:text-text-subtle lg:size-hit-row'

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'> {
  /** Obligatorio: el boton no tiene texto visible. */
  'aria-label': string
  children: ReactNode
}

/** Boton de solo icono (cerrar, editar, eliminar, quitar). */
export function IconButton({ type = 'button', className = '', ...props }: IconButtonProps) {
  return <button type={type} className={`${iconButtonClasses} ${className}`} {...props} />
}

interface IconLinkProps extends Omit<LinkProps, 'aria-label' | 'children'> {
  'aria-label': string
  children: ReactNode
}

/** Enlace de solo icono con la misma area que IconButton. */
export function IconLink({ className = '', ...props }: IconLinkProps) {
  return <Link className={`${iconButtonClasses} ${className}`} {...props} />
}
