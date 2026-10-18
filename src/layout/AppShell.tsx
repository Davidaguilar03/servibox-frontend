import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
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
  User,
  Wallet,
} from 'lucide-react'
import { Wordmark } from '../brand/Wordmark'
import { Button } from '../components/Button'
import { clearSession, getRememberedTenantSlug, useSession } from '../auth/session'

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

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  MECANICO: 'Mecánico',
  CAJERO: 'Cajero',
}

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

/**
 * Barra lateral, barra superior y area de contenido. Desde lg la barra lateral es fija y
 * se puede contraer; por debajo se abre como menu sobre el contenido.
 */
export function AppShell() {
  const session = useSession()
  const [tenantSlug] = useState(getRememberedTenantSlug)
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

        <nav aria-label="Principal" className="flex flex-1 flex-col gap-1 px-3 py-4">
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

        <div className="hidden border-t border-nav-hover p-3 lg:block">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
            className={`flex min-h-touch w-full items-center justify-center rounded-control text-text-subtle transition-colors duration-(--duration-fast) hover:bg-nav-hover hover:text-text-inverse ${focusRing}`}
          >
            {collapsed ? <PanelLeftOpen size={18} strokeWidth={1.5} /> : <PanelLeftClose size={18} strokeWidth={1.5} />}
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
          <div className="ml-auto flex items-center gap-4">
            {/* El backend aun no devuelve el nombre del tenant: se muestra el slug guardado. */}
            {tenantSlug && (
              <span className="hidden rounded-pill bg-neutral-200 px-3 py-1 text-small font-medium text-text md:inline">
                {tenantSlug}
              </span>
            )}
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-pill bg-neutral-200 text-text-muted">
                <User size={16} strokeWidth={1.5} aria-hidden />
              </span>
              <span className="hidden flex-col sm:flex">
                <span className="text-small font-medium text-text">{session?.username}</span>
                <span className="text-small text-text-muted">{roleLabels[session?.role ?? ''] ?? session?.role}</span>
              </span>
            </div>
            <Button variant="secondary" onClick={clearSession}>
              <LogOut size={16} strokeWidth={1.5} aria-hidden />
              Salir
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-content flex-1 px-6 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
