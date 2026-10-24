import type { ButtonHTMLAttributes } from 'react'
import { buttonClasses, type ButtonVariant } from './buttonStyles'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

/**
 * Una sola accion primaria por pantalla. El estado deshabilitado aplica a todas las variantes.
 * `data-variant` deja la variante visible para las pruebas.
 */
export function Button({ variant = 'primary', type = 'button', className = '', ...props }: ButtonProps) {
  return <button type={type} className={`${buttonClasses(variant)} ${className}`} data-variant={variant} {...props} />
}
