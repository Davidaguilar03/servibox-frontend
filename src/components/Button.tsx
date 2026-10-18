import type { ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'primary' | 'dark' | 'secondary' | 'text' | 'danger'

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-action text-neutral-50 hover:bg-action-hover active:bg-action-active',
  dark: 'bg-dark text-neutral-50 hover:bg-dark-hover active:bg-dark-active',
  secondary: 'border border-border bg-surface text-text hover:bg-neutral-100 active:bg-neutral-200',
  text: 'bg-transparent text-brand-ink hover:bg-neutral-100 active:bg-neutral-200',
  danger: 'bg-danger text-neutral-50 hover:bg-danger-hover active:bg-danger-active',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

/** Una sola accion primaria por pantalla. El estado deshabilitado aplica a todas las variantes. */
export function Button({ variant = 'primary', type = 'button', className = '', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex h-control items-center justify-center gap-2 rounded-control px-button-x font-body text-button font-medium transition-colors duration-(--duration-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:border-transparent disabled:bg-neutral-200 disabled:text-neutral-400 ${variantClasses[variant]} ${className}`}
      {...props}
    />
  )
}
