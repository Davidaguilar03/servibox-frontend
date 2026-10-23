import { useState, type ReactNode } from 'react'
import { Button } from './Button'
import { Modal } from './Modal'

interface DiscardableModalProps {
  title: string
  dirty: boolean
  busy: boolean
  onClose: () => void
  /** Texto del aviso de descartar. */
  discardMessage: string
  footer: (requestClose: () => void) => ReactNode
  children: ReactNode
}

/**
 * Modal que, con datos digitados, cambia su contenido a "Descartar cambios" en vez de
 * cerrarse con Esc, la X o Cancelar. Mismo patron que el modal de categoria; lo usan
 * Cuentas y los movimientos manuales.
 */
export function DiscardableModal({ title, dirty, busy, onClose, discardMessage, footer, children }: DiscardableModalProps) {
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  function requestClose() {
    if (confirmDiscard) setConfirmDiscard(false)
    else if (dirty && !busy) setConfirmDiscard(true)
    else if (!busy) onClose()
  }

  if (confirmDiscard) {
    return (
      <Modal
        title="Descartar cambios"
        onClose={requestClose}
        footer={
          <>
            <Button variant="secondary" onClick={requestClose}>
              Seguir editando
            </Button>
            <Button variant="danger" onClick={onClose}>
              Descartar cambios
            </Button>
          </>
        }
      >
        <p className="text-body text-text">{discardMessage}</p>
      </Modal>
    )
  }

  return (
    <Modal title={title} onClose={requestClose} footer={footer(requestClose)}>
      {children}
    </Modal>
  )
}
