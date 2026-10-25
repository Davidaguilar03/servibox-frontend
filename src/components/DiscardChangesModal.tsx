import { Button } from './Button'
import { Modal } from './Modal'

interface DiscardChangesModalProps {
  /** Que se pierde, en una frase. */
  message: string
  onKeepEditing: () => void
  onDiscard: () => void
}

/**
 * Confirmacion unica de descartar cambios (modales y paginas con formulario). "Seguir
 * editando" es la accion por defecto: primaria y con el foco; Esc tambien sigue editando.
 */
export function DiscardChangesModal({ message, onKeepEditing, onDiscard }: DiscardChangesModalProps) {
  return (
    <Modal
      title="¿Descartar los cambios?"
      onClose={onKeepEditing}
      footer={
        <>
          <Button onClick={onKeepEditing}>Seguir editando</Button>
          <Button variant="secondary" onClick={onDiscard}>
            Descartar
          </Button>
        </>
      }
    >
      <p className="text-body text-text">{message}</p>
    </Modal>
  )
}
