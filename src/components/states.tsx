import { Inbox, TriangleAlert } from 'lucide-react'
import { Button } from './Button'

/** Bloque gris de carga. El tamano lo da quien lo usa. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <span className={`block animate-pulse rounded-tag bg-neutral-200 ${className}`} aria-hidden />
}

/** Estado vacio: que no hay y, si aplica, que hacer. */
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <Inbox size={20} strokeWidth={1.5} className="text-text-subtle" aria-hidden />
      <p className="text-small text-text-muted">{message}</p>
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
