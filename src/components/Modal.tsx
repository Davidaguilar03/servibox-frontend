import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { IconButton } from './IconButton'
import { iconMd } from './icons'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  /** Botones del pie, alineados a la derecha. */
  footer?: ReactNode
  /** `wide`: mas ancho, para formularios en dos columnas; el cuerpo se desplaza y el pie queda siempre visible. */
  size?: 'default' | 'wide'
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Dialogo modal del manual: fondo `overlay`, sombra `modal`, se cierra con Esc o con la X,
 * atrapa el foco mientras esta abierto y lo devuelve al cerrarse.
 */
export function Modal({ title, onClose, children, footer, size = 'default' }: ModalProps) {
  const wide = size === 'wide'
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/50 px-4"
      // Clic fuera del dialogo: igual que Esc o la X (con cambios, quien usa el modal pregunta).
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCloseRef.current()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`w-full rounded-surface bg-surface shadow-overlay outline-none ${
          wide ? 'flex max-h-[90dvh] max-w-2xl flex-col' : 'max-h-[90vh] max-w-md overflow-y-auto p-6'
        }`}
      >
        <div className={`flex items-start justify-between gap-4 ${wide ? 'px-4 pt-6 sm:px-6' : ''}`}>
          <h2 id={titleId} className="text-section text-text">
            {title}
          </h2>
          <IconButton onClick={onClose} aria-label="Cerrar">
            <X {...iconMd} aria-hidden />
          </IconButton>
        </div>
        <div ref={bodyRef} className={`mt-4 ${wide ? 'min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-6' : ''}`}>
          {children}
        </div>
        {footer && (
          <div ref={footerRef} className={`flex flex-wrap justify-end gap-3 ${wide ? 'border-t border-border px-4 py-4 sm:px-6' : 'mt-6'}`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
