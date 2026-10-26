import { Children, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { ChevronDown } from 'lucide-react'
import { DESKTOP_QUERY, useMediaQuery } from '../lib/useMediaQuery'
import { buttonClasses } from './buttonStyles'
import { iconSm } from './icons'

interface ListHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  /** Acceso al menu movil cuando el shell no monta barra superior. */
  leading?: ReactNode
  /** La unica accion primaria del listado (boton o enlace con `data-variant="primary"`). */
  primary?: ReactNode
  /** Acciones secundarias (botones o enlaces secundarios o de texto), en orden. */
  secondary?: ReactNode[]
  /** Texto de ayuda bajo las acciones (por ejemplo, por que una accion esta deshabilitada). */
  note?: ReactNode
}

/**
 * Encabezado de pagina de los listados: titulo, subtitulo, una sola accion primaria y las
 * secundarias en un grupo. Desde 2 secundarias, bajo lg van en el menu "Más" (patron
 * disclosure, como UserMenu: Esc lo cierra y devuelve el foco, clic fuera tambien); desde lg
 * van en linea. Sin `matchMedia` (pruebas) se comporta como escritorio.
 */
export function ListHeader({ title, subtitle, leading, primary, secondary = [], note }: ListHeaderProps) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY, true)
  const actions = Children.toArray(secondary)
  const grouped = !isDesktop && actions.length >= 2

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        {leading}
        <div className="min-w-0">
          <h1 className="text-title text-text">{title}</h1>
          {subtitle && <p className="mt-1 text-small text-text-muted">{subtitle}</p>}
        </div>
      </div>
      {(primary || actions.length > 0) && (
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            {grouped ? <MoreMenu>{actions}</MoreMenu> : actions}
            {primary}
          </div>
          {note}
        </div>
      )}
    </div>
  )
}

function MoreMenu({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [openedAt, setOpenedAt] = useState(pathname)
  const panelId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Cambiar de ruta cierra el panel.
  if (openedAt !== pathname) {
    setOpenedAt(pathname)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
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

  return (
    <div
      ref={rootRef}
      className="relative"
      onKeyDown={onKeyDown}
      onBlur={(event) => {
        if (open && event.relatedTarget && !rootRef.current?.contains(event.relatedTarget as Node)) setOpen(false)
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={buttonClasses('secondary')}
        data-variant="secondary"
      >
        Más
        <ChevronDown {...iconSm} aria-hidden />
      </button>
      {open && (
        <div
          id={panelId}
          // Un clic en una accion la ejecuta y cierra el panel.
          onClick={() => setOpen(false)}
          className="absolute top-full left-0 z-30 mt-2 flex w-64 flex-col gap-2 rounded-surface border border-border bg-surface p-2 shadow-raised sm:right-0 sm:left-auto [&>*]:w-full"
        >
          {children}
        </div>
      )}
    </div>
  )
}
