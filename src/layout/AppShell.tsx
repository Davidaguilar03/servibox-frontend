import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react'
import { Link, NavLink, Outlet, useMatches } from 'react-router'
import {
  ChartColumn,
  House,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShoppingCart,
  Truck,
  Wallet,
} from 'lucide-react'
import { Wordmark } from '../brand/Wordmark'
import { Toaster } from '../components/Toaster'
import { clearSession, displayName, initials, roleLabel, useSession } from '../auth/session'
import { useBreadcrumbTailValue } from './breadcrumb'

// Clientes vive dentro de Ventas y Proveedores dentro de Compras. Ver 03-DECISIONS.md.
const navItems = [
  { to: '/inicio', label: 'Inicio', icon: House },
  { to: '/inventario', label: 'Inventario', icon: Package },
  { to: '/ventas', label: 'Ventas', icon: ShoppingCart },
  { to: '/compras', label: 'Compras', icon: Truck },
  { to: '/cuentas', label: 'Cuentas', icon: Wallet },
  { to: '/reportes', label: 'Reportes', icon: ChartColumn },
  { to: '/configuracion', label: 'Configuración', icon: Settings },
]

/** Un tramo de la miga de pan; `to` es su destino cuando no es el ultimo. */
export interface Crumb {
  label: string
  to?: string
}

/** Lo que cada ruta declara en su `handle` para la miga de pan. */
export interface RouteHandle {
  breadcrumb: Crumb[]
}

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

const DESKTOP_QUERY = '(min-width: 1024px)'

function subscribeDesktop(listener: () => void) {
  const query = window.matchMedia?.(DESKTOP_QUERY)
  query?.addEventListener('change', listener)
  return () => query?.removeEventListener('change', listener)
}

/** Desde lg la barra lateral es fija; por debajo es un menu que se abre sobre el contenido. */
function useIsDesktop() {
  return useSyncExternalStore(subscribeDesktop, () => window.matchMedia?.(DESKTOP_QUERY).matches ?? false)
}

function useBreadcrumb(): Crumb[] {
  const matches = useMatches()
  const tail = useBreadcrumbTailValue()
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const handle = matches[index]?.handle as RouteHandle | undefined
    if (!handle?.breadcrumb) continue
    if (!tail) return handle.breadcrumb
    if (tail.mode === 'append') return [...handle.breadcrumb, { label: tail.value }]
    return [...handle.breadcrumb.slice(0, -1), { label: tail.value }]
  }
  return []
}

/** Titulo del documento con el ultimo tramo de la miga; al salir del shell vuelve el anterior. */
function useDocumentTitle(label: string | undefined) {
  useEffect(() => {
    if (!label) return
    const previous = document.title
    document.title = `${label} · ServiBox`
    return () => {
      document.title = previous
    }
  }, [label])
}

const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Barra lateral, barra superior y area de contenido. Desde lg la barra lateral es fija y
 * se puede contraer; por debajo se abre como menu sobre el contenido.
 */
export function AppShell() {
  const session = useSession()
  const breadcrumb = useBreadcrumb()
  const [collapsed, setCollapsed] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const isDesktop = useIsDesktop()
  const asideRef = useRef<HTMLElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const wasOpen = useRef(false)
  // El menu movil solo existe bajo lg: cerrado no recibe foco; abierto, el resto queda inerte.
  const mobileMenuOpen = menuOpen && !isDesktop

  useDocumentTitle(breadcrumb.at(-1)?.label)

  useEffect(() => {
    if (mobileMenuOpen) {
      asideRef.current?.querySelector<HTMLElement>(focusableSelector)?.focus()
    } else if (wasOpen.current) {
      menuButtonRef.current?.focus()
    }
    wasOpen.current = mobileMenuOpen
  }, [mobileMenuOpen])

  // Esc cierra el menu y Tab no sale de el mientras esta abierto.
  function onMenuKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!mobileMenuOpen) return
    if (event.key === 'Escape') {
      setMenuOpen(false)
      return
    }
    if (event.key !== 'Tab') return
    const focusable = [...(asideRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])]
    const first = focusable[0]
    const last = focusable.at(-1)
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <a
        href="#contenido"
        onClick={(event) => {
          event.preventDefault()
          mainRef.current?.focus()
        }}
        className={`sr-only z-50 rounded-control bg-surface px-4 py-2 text-small font-medium text-text shadow-menu focus:not-sr-only focus:fixed focus:top-2 focus:left-2 ${focusRing}`}
      >
        Saltar al contenido
      </a>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 bg-overlay/40 lg:hidden" onClick={() => setMenuOpen(false)} aria-hidden />
      )}

      <aside
        id="menu-lateral"
        ref={asideRef}
        inert={!isDesktop && !menuOpen}
        onKeyDown={onMenuKeyDown}
        className={`fixed inset-y-0 left-0 z-40 flex w-sidebar flex-col bg-nav transition-[width,translate] duration-(--duration-base) lg:translate-x-0 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'lg:w-sidebar-collapsed' : ''}`}
      >
        <div className={`flex h-topbar shrink-0 items-center px-6 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
          <span className={collapsed ? 'lg:hidden' : ''}>
            <Wordmark onDark />
          </span>
          {collapsed && <span className="hidden font-display text-h3 font-bold text-brand lg:inline">S</span>}
        </div>

        <nav aria-label="Principal" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex min-h-touch items-center gap-3 rounded-control px-3 text-small font-medium transition-colors duration-(--duration-fast) ${focusRing} ${
                  collapsed ? 'lg:justify-center lg:px-0' : ''
                } ${isActive ? 'bg-action text-text-inverse ring-1 ring-brand ring-inset' : 'text-neutral-300 hover:bg-nav-hover hover:text-text-inverse'}`
              }
            >
              <Icon size={18} strokeWidth={1.5} aria-hidden className="shrink-0" />
              <span className={collapsed ? 'lg:sr-only' : ''}>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Contraer solo existe desde lg: asi no cuenta en el foco atrapado del menu movil. */}
        {isDesktop && (
          <div className="hidden px-3 pb-2 lg:block">
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
              className={`flex min-h-touch w-full items-center justify-center rounded-control text-text-subtle transition-colors duration-(--duration-fast) hover:bg-nav-hover hover:text-text-inverse ${focusRing}`}
            >
              {collapsed ? <PanelLeftOpen size={18} strokeWidth={1.5} /> : <PanelLeftClose size={18} strokeWidth={1.5} />}
            </button>
          </div>
        )}

        <div
          className={`flex shrink-0 items-center gap-3 border-t border-nav-hover px-4 py-4 ${
            collapsed ? 'lg:flex-col lg:px-0' : ''
          }`}
        >
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-nav-hover text-small font-semibold text-text-inverse"
            aria-hidden
          >
            {session ? initials(session) : ''}
          </span>
          <span className={`flex min-w-0 flex-1 flex-col ${collapsed ? 'lg:sr-only' : ''}`}>
            <span className="truncate text-small font-medium text-text-inverse">{session && displayName(session)}</span>
            <span className="truncate text-small text-text-subtle">{roleLabel(session?.role ?? '')}</span>
          </span>
          <button
            type="button"
            onClick={clearSession}
            aria-label="Salir"
            title="Salir"
            className={`flex size-touch shrink-0 items-center justify-center rounded-control text-text-subtle transition-colors duration-(--duration-fast) hover:bg-nav-hover hover:text-text-inverse ${focusRing}`}
          >
            <LogOut size={18} strokeWidth={1.5} aria-hidden />
          </button>
        </div>
      </aside>

      <div
        inert={mobileMenuOpen}
        className={`flex min-h-screen flex-col transition-[padding] duration-(--duration-base) ${
          collapsed ? 'lg:pl-sidebar-collapsed' : 'lg:pl-sidebar'
        }`}
      >
        <header className="sticky top-0 z-20 flex h-topbar shrink-0 items-center gap-3 border-b border-border bg-surface px-6 lg:px-8">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={mobileMenuOpen}
            aria-controls="menu-lateral"
            className={`-ml-3 flex size-touch items-center justify-center rounded-control text-text hover:bg-neutral-100 lg:hidden ${focusRing}`}
          >
            <Menu size={20} strokeWidth={1.5} />
          </button>
          <nav aria-label="Ruta de navegación" className="min-w-0">
            <ol className="flex items-center gap-2 text-small">
              {breadcrumb.map((crumb, index) => {
                const current = index === breadcrumb.length - 1
                return (
                  <li key={crumb.label} className="flex min-w-0 items-center gap-2">
                    {index > 0 && (
                      <span className="text-text-muted" aria-hidden>
                        /
                      </span>
                    )}
                    {current || !crumb.to ? (
                      <span
                        className={`truncate ${current ? 'font-medium text-text' : 'text-text-muted'}`}
                        aria-current={current ? 'page' : undefined}
                      >
                        {crumb.label}
                      </span>
                    ) : (
                      <Link to={crumb.to} className={`truncate rounded-tag text-text-muted hover:text-text hover:underline ${focusRing}`}>
                        {crumb.label}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ol>
          </nav>
          {session?.tenantName && (
            <span className="ml-auto hidden shrink-0 rounded-pill bg-neutral-200 px-3 py-1 text-small font-medium text-text sm:inline">
              {session.tenantName}
            </span>
          )}
        </header>

        <main id="contenido" ref={mainRef} tabIndex={-1} className="mx-auto w-full max-w-content flex-1 px-6 py-6 outline-none lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  )
}
