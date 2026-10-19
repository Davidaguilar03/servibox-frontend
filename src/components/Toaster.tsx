import { CircleCheck } from 'lucide-react'
import { useToasts } from './toast'

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
      className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-full max-w-sm flex-col gap-3"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex animate-[toast-in_var(--duration-base)_ease-out] items-center gap-3 rounded-control border border-border bg-surface p-4 shadow-menu"
        >
          <CircleCheck size={18} strokeWidth={1.5} className="shrink-0 text-success" aria-hidden />
          <p className="text-small text-text">{toast.message}</p>
        </div>
      ))}
    </div>
  )
}
