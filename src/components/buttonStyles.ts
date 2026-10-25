export type ButtonVariant = 'primary' | 'dark' | 'secondary' | 'text' | 'danger'

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-action text-text-inverse hover:bg-action-hover active:bg-action-active',
  dark: 'bg-dark text-text-inverse hover:bg-dark-hover active:bg-dark-active',
  secondary: 'border border-border-control bg-surface text-text hover:bg-neutral-100 active:bg-neutral-200',
  text: 'bg-transparent text-brand-ink hover:bg-neutral-100 active:bg-neutral-200',
  danger: 'bg-danger text-text-inverse hover:bg-danger-hover active:bg-danger-active',
}

/**
 * Clases de boton, compartidas por Button y por los enlaces que se ven como boton. Todas las
 * variantes miden lo mismo: 44 de alto bajo lg (area tactil), 40 desde lg, y el mismo relleno
 * horizontal; la variante solo cambia fondo, borde y color.
 */
export function buttonClasses(variant: ButtonVariant = 'primary') {
  return `inline-flex h-control-touch lg:h-control items-center justify-center gap-2 rounded-control px-button-x font-body text-button transition-colors duration-(--duration-fast) focus-ring disabled:pointer-events-none disabled:border-transparent disabled:bg-neutral-200 disabled:text-text-subtle ${variantClasses[variant]}`
}
