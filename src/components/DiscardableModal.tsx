import { useState, type ReactNode } from 'react'
import { DiscardChangesModal } from './DiscardChangesModal'
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
 * Guardian de cambios de todo modal con formulario: con datos digitados, cerrar (Esc, la X,
 * Cancelar o clic fuera) muestra "¿Descartar los cambios?" en vez de cerrarse; sin cambios
 * cierra de inmediato. Tras guardar, quien lo usa cierra con `onClose` y no pregunta.
 */
export function DiscardableModal({ title, dirty, busy, onClose, discardMessage, footer, children }: DiscardableModalProps) {
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  function requestClose() {
    if (confirmDiscard) setConfirmDiscard(false)
    else if (dirty && !busy) setConfirmDiscard(true)
    else if (!busy) onClose()
  }

  if (confirmDiscard) {
    return <DiscardChangesModal message={discardMessage} onKeepEditing={requestClose} onDiscard={onClose} />
  }

  return (
    <Modal title={title} onClose={requestClose} footer={footer(requestClose)}>
      {children}
    </Modal>
  )
}
