import { useEffect, type ReactNode, type RefObject } from 'react'
import { useBlocker } from 'react-router'
import { DiscardChangesModal } from './DiscardChangesModal'

interface UnsavedChangesGuardProps {
  dirty: boolean
  /** En true deja salir sin preguntar (despues de guardar). Es un ref porque se navega en la misma vuelta. */
  allowLeave: RefObject<boolean>
  /** Texto del aviso; por defecto el de una factura nueva. */
  message?: string
  /** Un formulario en modal: se oculta mientras se muestra el aviso, para no tener dos dialogos abiertos. */
  children?: ReactNode
}

/**
 * Aviso de cambios sin guardar de un formulario de pagina (factura nueva, Configuracion): `useBlocker` para la navegacion
 * interna (Cancelar incluido) y `beforeunload` para recargar o cerrar la pestana.
 */
export function UnsavedChangesGuard({
  dirty,
  allowLeave,
  message = 'Si sales ahora, se pierde lo que digitaste en esta factura.',
  children,
}: UnsavedChangesGuardProps) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !allowLeave.current && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  if (blocker.state !== 'blocked') return children ?? null
  return <DiscardChangesModal message={message} onKeepEditing={() => blocker.reset()} onDiscard={() => blocker.proceed()} />
}
