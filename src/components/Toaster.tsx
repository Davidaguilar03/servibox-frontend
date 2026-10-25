import { CircleCheck } from 'lucide-react'
import { useToasts } from './toast'
import { iconSm } from './icons'

/**
 * Region de avisos: abajo a la derecha, anunciada con aria-live. Cada aviso entra en 200 ms
 * (`duration-base`) y se cierra solo a los 5 segundos.
 */
export function Toaster() {
  const toasts = useToasts()
  return (
    <div
      aria-live="polite"
      role="status"
      className="pointer-events-none fixed right-4 bottom-4 left-4 z-50 flex flex-col gap-3 sm:left-auto sm:w-full sm:max-w-sm"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex animate-[toast-in_var(--duration-base)_var(--ease-standard)] items-center gap-3 rounded-surface border border-border bg-surface p-4 shadow-raised"
        >
          <CircleCheck {...iconSm} className="shrink-0 text-success" aria-hidden />
          <p className="text-small text-text">{toast.message}</p>
        </div>
      ))}
    </div>
  )
}
