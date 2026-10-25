import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useLocation } from 'react-router'
import { LogOut } from 'lucide-react'
import { clearSession, displayName, initials, roleLabel, useSession } from '../auth/session'
import { iconSm } from '../components/icons'

const focusRing = 'focus-ring'

/**
 * Menu de usuario de la barra superior, con el patron disclosure (no role=menu): el boton
 * muestra las iniciales y, desde md, la serviteca; el panel, quien entro, su rol, la serviteca
 * y Cerrar sesion. Esc lo cierra y devuelve el foco; el clic fuera y el cambio de ruta tambien.
 */
export function UserMenu() {
  const session = useSession()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [openedAt, setOpenedAt] = useState(pathname)
  const panelId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Cambiar de ruta cierra el panel.
  if (openedAt !== pathname) {
    setOpenedAt(pathname)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    panelRef.current?.focus()
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape' || !open) return
    event.stopPropagation()
    setOpen(false)
    buttonRef.current?.focus()
  }

  if (!session) return null

  return (
    <div
      ref={rootRef}
      className="relative"
      onKeyDown={onKeyDown}
      // Si el foco sale del menu (Tab fuera o el menu lateral), el panel se cierra.
      onBlur={(event) => {
        if (open && event.relatedTarget && !rootRef.current?.contains(event.relatedTarget as Node)) setOpen(false)
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Menú de usuario de ${displayName(session)}`}
        className={`flex min-h-touch items-center gap-2 rounded-pill pr-1 pl-1 transition-colors duration-(--duration-fast) hover:bg-neutral-100 md:pr-3 ${focusRing}`}
      >
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-nav text-small font-semibold text-text-inverse"
          aria-hidden
        >
          {initials(session)}
        </span>
        <span className="hidden max-w-48 truncate text-small font-medium text-text md:inline" aria-hidden>
          {session.tenantName}
        </span>
      </button>
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          tabIndex={-1}
          className="absolute top-full right-0 z-30 mt-2 flex w-64 animate-[fade-in_var(--duration-base)_var(--ease-standard)] flex-col gap-1 rounded-surface border border-border bg-surface p-2 shadow-raised outline-none"
        >
          <div className="flex flex-col px-3 py-2">
            <span className="truncate text-body font-medium text-text">{displayName(session)}</span>
            <span className="text-small text-text-muted">{roleLabel(session.role)}</span>
            <span className="truncate text-small text-text-muted">{session.tenantName}</span>
          </div>
          <div className="border-t border-border pt-1">
            <button
              type="button"
              onClick={clearSession}
              className={`flex min-h-touch w-full items-center gap-2 rounded-control px-3 text-button text-text transition-colors duration-(--duration-fast) hover:bg-neutral-100 ${focusRing}`}
            >
              <LogOut {...iconSm} aria-hidden />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
