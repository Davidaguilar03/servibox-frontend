import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  /** Botones del pie, alineados a la derecha. */
  footer?: ReactNode
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Dialogo modal del manual: fondo `overlay`, sombra `modal`, se cierra con Esc o con la X,
 * atrapa el foco mientras esta abierto y lo devuelve al cerrarse.
 */
export function Modal({ title, onClose, children, footer }: ModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    // El foco va al primer campo del contenido o, si no hay, al primer boton del pie (la
    // opcion segura); la X queda para Tab o Esc.
    const first =
      bodyRef.current?.querySelector<HTMLElement>(FOCUSABLE) ?? footerRef.current?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? dialog)?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !dialog) return
      const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)]
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      if (!firstItem || !lastItem) return
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault()
        firstItem.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previous?.focus()
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/50 px-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-card bg-surface p-6 shadow-modal outline-none"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-h3 text-text">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="-mt-1 -mr-2 flex size-9 items-center justify-center rounded-control text-text-muted transition-colors duration-(--duration-fast) hover:bg-neutral-100 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <X size={18} strokeWidth={1.5} aria-hidden />
          </button>
        </div>
        <div ref={bodyRef} className="mt-4">
          {children}
        </div>
        {footer && (
          <div ref={footerRef} className="mt-6 flex flex-wrap justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
