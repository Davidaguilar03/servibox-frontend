import { useState } from 'react'
import { NavLink, Outlet, useMatches } from 'react-router'
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
import { clearSession, roleLabel, useSession } from '../auth/session'
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

/** Lo que cada ruta declara en su `handle` para la miga de pan. */
export interface RouteHandle {
  breadcrumb: string[]
}

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

function initials(username: string) {
  const parts = username.split(/[\s._-]+/).filter(Boolean)
  const letters = parts.length > 1 ? (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '') : username.slice(0, 2)
  return letters.toUpperCase()
}

function useBreadcrumb(): string[] {
  const matches = useMatches()
  const tail = useBreadcrumbTailValue()
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const handle = matches[index]?.handle as RouteHandle | undefined
    if (handle?.breadcrumb) return tail ? [...handle.breadcrumb.slice(0, -1), tail] : handle.breadcrumb
  }
  return []
}

/**
 * Barra lateral, barra superior y area de contenido. Desde lg la barra lateral es fija y
 * se puede contraer; por debajo se abre como menu sobre el contenido.
 */
export function AppShell() {
  const session = useSession()
  const breadcrumb = useBreadcrumb()
  const [collapsed, setCollapsed] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-canvas">
      {menuOpen && (
        <div className="fixed inset-0 z-30 bg-overlay/40 lg:hidden" onClick={() => setMenuOpen(false)} aria-hidden />
      )}

      <aside
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
                } ${isActive ? 'bg-brand text-text-inverse' : 'text-neutral-300 hover:bg-nav-hover hover:text-text-inverse'}`
              }
            >
              <Icon size={18} strokeWidth={1.5} aria-hidden className="shrink-0" />
              <span className={collapsed ? 'lg:sr-only' : ''}>{label}</span>
            </NavLink>
          ))}
        </nav>

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

        <div
          className={`flex shrink-0 items-center gap-3 border-t border-nav-hover px-4 py-4 ${
            collapsed ? 'lg:flex-col lg:px-0' : ''
          }`}
        >
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-nav-hover text-small font-semibold text-text-inverse"
            aria-hidden
          >
            {initials(session?.username ?? '')}
          </span>
          <span className={`flex min-w-0 flex-1 flex-col ${collapsed ? 'lg:sr-only' : ''}`}>
            <span className="truncate text-small font-medium text-text-inverse">{session?.username}</span>
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
        className={`flex min-h-screen flex-col transition-[padding] duration-(--duration-base) ${
          collapsed ? 'lg:pl-sidebar-collapsed' : 'lg:pl-sidebar'
        }`}
      >
        <header className="sticky top-0 z-20 flex h-topbar shrink-0 items-center gap-3 border-b border-border bg-surface px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
            className={`-ml-3 flex size-touch items-center justify-center rounded-control text-text hover:bg-neutral-100 lg:hidden ${focusRing}`}
          >
            <Menu size={20} strokeWidth={1.5} />
          </button>
          <nav aria-label="Miga de pan" className="min-w-0">
            <ol className="flex items-center gap-2 text-small">
              {breadcrumb.map((crumb, index) => {
                const current = index === breadcrumb.length - 1
                return (
                  <li key={crumb} className="flex min-w-0 items-center gap-2">
                    {index > 0 && (
                      <span className="text-text-subtle" aria-hidden>
                        /
                      </span>
                    )}
                    <span
                      className={`truncate ${current ? 'font-medium text-text' : 'text-text-muted'}`}
                      aria-current={current ? 'page' : undefined}
                    >
                      {crumb}
                    </span>
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

        <main className="mx-auto w-full max-w-content flex-1 px-6 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  )
}
