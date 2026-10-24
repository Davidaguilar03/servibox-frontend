import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Inbox, TriangleAlert } from 'lucide-react'
import { Button } from './Button'
import { buttonClasses } from './buttonStyles'

/** Bloque gris de carga. El tamano lo da quien lo usa. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <span className={`block animate-pulse rounded-tag bg-neutral-200 ${className}`} aria-hidden />
}

export interface EmptyStateAction {
  label: ReactNode
  /**
   * Secundaria por defecto: el primario de la pantalla es el del encabezado. Solo es `primary`
   * cuando el encabezado no tiene primario. Ver docs/ai-context/02-CONVENTIONS.md.
   */
  variant?: 'primary' | 'secondary'
  /** Con `to` la accion es un enlace; si no, un boton con `onClick`. */
  to?: string
  state?: unknown
  onClick?: () => void
}

/** Estado vacio: que no hay y, si aplica, que hacer. */
export function EmptyState({ message, action }: { message: string; action?: EmptyStateAction }) {
  const variant = action?.variant ?? 'secondary'
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <Inbox size={20} strokeWidth={1.5} className="text-text-subtle" aria-hidden />
      <p className="text-small text-text-muted">{message}</p>
      {action && (
        <div className="mt-2">
          {action.to ? (
            <Link to={action.to} state={action.state} className={buttonClasses(variant)} data-variant={variant}>
              {action.label}
            </Link>
          ) : (
            <Button variant={variant} onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

/** Estado de error de un bloque, con la opcion de reintentar solo ese bloque. */
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-4 py-8 text-center">
      <TriangleAlert size={20} strokeWidth={1.5} className="text-error" aria-hidden />
      <p className="text-small text-text">{message}</p>
      <Button variant="secondary" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  )
}
