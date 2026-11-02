import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useMatches } from 'react-router'
import {
  ChartColumn,
  ChevronDown,
  CirclePlus,
  House,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Settings,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { Wordmark } from '../brand/Wordmark'
import { Toaster } from '../components/Toaster'
import { useBreadcrumbTailValue } from './breadcrumb'
import { SkipLink } from '../components/SkipLink'
import { DESKTOP_QUERY, useMediaQuery } from '../lib/useMediaQuery'
import { UserMenu, type UserMenuAccount } from './UserMenu'
import { iconMd } from '../components/icons'
import { GLOSSARY } from '../copy/glossary'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  children?: NavItem[]
  /** Activo solo en la ruta exacta, no en sus subrutas. */
  end?: boolean
}

const navItems: NavItem[] = [
  { to: '/inicio', label: 'Inicio', icon: House },
  { to: '/ventas', label: GLOSSARY.incomeNavigation, icon: TrendingUp, children: [
    { to: '/ventas', label: 'Facturas de venta', icon: ShoppingCart },
    { to: '/ventas/ingresos', label: GLOSSARY.otherIncome, icon: CirclePlus },
    { to: '/ventas/clientes', label: 'Clientes', icon: Users },
  ] },
  { to: '/compras', label: GLOSSARY.expenseNavigation, icon: TrendingDown, children: [
    { to: '/compras', label: 'Facturas de compra', icon: Truck },
    { to: '/compras/gastos', label: 'Gastos operativos', icon: Receipt },
    { to: '/compras/proveedores', label: 'Proveedores', icon: Truck },
  ] },
  { to: '/inventario', label: 'Inventario', icon: Package },
  { to: '/cuentas', label: GLOSSARY.treasury, icon: Wallet },
  { to: '/reportes', label: 'Reportes', icon: ChartColumn },
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

const focusRing = 'focus-ring'

/** Desde lg la barra lateral es fija; por debajo es un menu que se abre sobre el contenido. */
const useIsDesktop = () => useMediaQuery(DESKTOP_QUERY, false)

/** Desde xl (1280 px) la barra lateral arranca expandida; entre lg y xl, contraida. */
const WIDE_QUERY = '(min-width: 1280px)'
const SIDEBAR_KEY = 'servibox.sidebar'
type SidebarChoice = 'collapsed' | 'expanded'

/** La eleccion del usuario, si la hay. localStorage puede fallar (modo privado): sin eleccion manda el ancho. */
function readSidebarChoice(): SidebarChoice | null {
  try {
    const value = localStorage.getItem(SIDEBAR_KEY)
    return value === 'collapsed' || value === 'expanded' ? value : null
  } catch {
    return null
  }
}

function saveSidebarChoice(choice: SidebarChoice) {
  try {
    localStorage.setItem(SIDEBAR_KEY, choice)
  } catch {
    // Sin almacenamiento la eleccion dura lo que dure la pagina.
  }
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

export interface AppShellContext {
  menuButton: ReactNode
}

interface AppShellProps {
  /** Navegacion principal. Por defecto, la de la serviteca. */
  items?: NavItem[]
  /** Destino de la marca. */
  home?: { to: string; label: string }
  /** Con false no se muestra Configuracion. */
  settings?: boolean
  /** Quien entro; sin el, el menu usa la sesion de serviteca. */
  account?: UserMenuAccount
  /** Con true todas las paginas llevan su encabezado y no se monta la barra superior. */
  headerInPage?: boolean
}

/**
 * Barra lateral, barra superior y area de contenido. Desde lg la barra lateral es fija y
 * se puede contraer; por debajo se abre como menu sobre el contenido.
 */
export function AppShell({
  items = navItems,
  home = { to: '/inicio', label: 'Inicio' },
  settings = true,
  account,
  headerInPage: allHeadersInPage = false,
}: AppShellProps = {}) {
  const breadcrumb = useBreadcrumb()
  const location = useLocation()
  const { pathname } = location
  const activeGroup = items.filter((item) => item.children).map((item) => item.to).find((path) => pathname === path || pathname.startsWith(`${path}/`))
  const [navigation, setNavigation] = useState(() => ({ location, groups: { [activeGroup ?? '']: true } }))
  // Una entrada de historial nueva reabre su grupo, incluso si solo cambia la query.
  if (navigation.location !== location) {
    setNavigation({ location, groups: { ...navigation.groups, ...(activeGroup ? { [activeGroup]: true } : {}) } })
  }
  const headerInPage = allHeadersInPage || /^\/(inicio|inventario|cuentas|reportes|configuracion)\/?$/.test(pathname) || /^\/inventario\/(?:nuevo|categorias|[^/]+\/editar)\/?$/.test(pathname) || /^\/(ventas|compras)(?:\/|$)/.test(pathname)
  const isWide = useMediaQuery(WIDE_QUERY, true)
  const [sidebarChoice, setSidebarChoice] = useState(readSidebarChoice)
  const collapsed = sidebarChoice ? sidebarChoice === 'collapsed' : !isWide
  const [menuOpen, setMenuOpen] = useState(false)
  const isDesktop = useIsDesktop()
  const asideRef = useRef<HTMLElement>(null)
  const sidebarToggleRef = useRef<HTMLButtonElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const menuNavigationRef = useRef<typeof location | null>(null)
  const mainRef = useRef<HTMLElement>(null)
  const wasOpen = useRef(false)
  // El menu movil solo existe bajo lg: cerrado no recibe foco; abierto, el resto queda inerte.
  const mobileMenuOpen = menuOpen && !isDesktop

  useDocumentTitle(breadcrumb.at(-1)?.label)

  useEffect(() => {
    if (collapsed && isDesktop && asideRef.current?.contains(document.activeElement) &&
      document.activeElement?.closest('[data-nav-children]')) {
      sidebarToggleRef.current?.focus()
    }
  }, [collapsed, isDesktop])

  useEffect(() => {
    if (mobileMenuOpen && !wasOpen.current) {
      asideRef.current?.querySelector<HTMLElement>(focusableSelector)?.focus()
    } else if (!mobileMenuOpen && (wasOpen.current || (menuNavigationRef.current && menuNavigationRef.current !== location))) {
      menuButtonRef.current?.focus()
      if (menuNavigationRef.current !== location) menuNavigationRef.current = null
    }
    wasOpen.current = mobileMenuOpen
  }, [mobileMenuOpen, location])

  function closeMenuAfterNavigation() {
    if (mobileMenuOpen) menuNavigationRef.current = location
    setMenuOpen(false)
  }

  // Esc cierra el menu y Tab no sale de el mientras esta abierto.
  function onMenuKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!mobileMenuOpen) return
    if (event.key === 'Escape') {
      setMenuOpen(false)
      return
    }
    if (event.key !== 'Tab') return
    const focusable = [...(asideRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])]
      .filter((element) => !element.closest('[hidden], [inert]'))
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

  const menuButton = (
    <button
      ref={menuButtonRef}
      type="button"
      onClick={() => setMenuOpen(true)}
      aria-label="Abrir menú"
      aria-expanded={mobileMenuOpen}
      aria-controls="menu-lateral"
      className={`flex size-touch shrink-0 items-center justify-center rounded-control text-text hover:bg-neutral-100 lg:hidden ${focusRing}`}
    >
      <Menu {...iconMd} aria-hidden />
    </button>
  )

  return (
    <div className="min-h-screen bg-canvas">
      <SkipLink />

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 bg-overlay/40 lg:hidden" onClick={() => setMenuOpen(false)} aria-hidden />
      )}

      <aside
        id="menu-lateral"
        ref={asideRef}
        inert={!isDesktop && !menuOpen}
        onKeyDown={onMenuKeyDown}
        className={`fixed inset-y-0 left-0 z-40 flex w-sidebar flex-col bg-nav transition-[width,translate] duration-(--duration-base) lg:translate-x-0 ${
          menuOpen ? 'translate-x-0 shadow-overlay lg:shadow-none' : '-translate-x-full'
        } ${collapsed ? 'lg:w-sidebar-collapsed' : ''}`}
      >
        <div role="group" aria-label="Cabecera del menú lateral" className={`flex h-topbar shrink-0 items-center gap-1 px-3 ${collapsed ? 'lg:h-auto lg:flex-col lg:py-2' : ''}`}>
          <Link to={home.to} aria-label={`ServiBox, ir a ${home.label}`} title="ServiBox" onClick={closeMenuAfterNavigation} className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-control focus-ring">
            <Wordmark onDark compact={collapsed && isDesktop} />
          </Link>
          {/* Solo escritorio: en compacto ocupa su propia fila bajo el simbolo. */}
          {isDesktop && (
            <button
              ref={sidebarToggleRef}
              type="button"
              onClick={(event) => {
                event.currentTarget.focus()
                const next: SidebarChoice = collapsed ? 'expanded' : 'collapsed'
                setSidebarChoice(next)
                saveSidebarChoice(next)
              }}
              aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
              title={collapsed ? 'Expandir menú' : 'Contraer menú'}
              aria-expanded={!collapsed}
              className={`ml-auto flex size-touch shrink-0 items-center justify-center rounded-control text-text-subtle transition-colors duration-(--duration-fast) hover:bg-nav-hover hover:text-text-inverse ${focusRing} ${collapsed ? 'lg:ml-0' : ''}`}
            >
              {collapsed ? <PanelLeftOpen {...iconMd} aria-hidden /> : <PanelLeftClose {...iconMd} aria-hidden />}
            </button>
          )}
        </div>

        <nav aria-label="Principal" className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-2 lg:gap-1">
          {items.map(({ to, label, icon: Icon, children, end }) => {
            const groupActive = activeGroup === to
            const expanded = !!navigation.groups[to] && !(collapsed && isDesktop)
            const activeChild = children?.slice(1).find((child) => pathname === child.to || pathname.startsWith(`${child.to}/`))?.to ?? to
            const groupId = `navigation-${to.slice(1)}`
            return <li key={to}>
            {children ? <>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={groupId}
                data-active={groupActive}
                title={collapsed ? label : undefined}
                onClick={(event) => {
                  event.currentTarget.focus()
                  if (collapsed && isDesktop) {
                    setSidebarChoice('expanded')
                    saveSidebarChoice('expanded')
                  }
                  setNavigation({ location, groups: { ...navigation.groups, [to]: !expanded } })
                }}
                className={`flex min-h-touch w-full items-center gap-3 rounded-control border-l-4 px-2 text-small font-semibold transition-colors duration-(--duration-fast) ${focusRing} ${collapsed ? 'lg:justify-center lg:px-0' : ''} ${groupActive ? 'border-brand bg-nav-active text-text-inverse' : 'border-transparent text-neutral-300 hover:bg-nav-hover hover:text-text-inverse'}`}
              >
                <Icon {...iconMd} aria-hidden className={`shrink-0 ${groupActive ? 'text-brand' : ''}`} />
                <span className={collapsed ? 'lg:sr-only' : ''}>{label}</span>
                <ChevronDown {...iconMd} aria-hidden className={`ml-auto shrink-0 transition-transform duration-(--duration-base) ease-standard motion-reduce:transition-none ${expanded ? 'rotate-180' : ''} ${collapsed ? 'lg:hidden' : ''}`} />
              </button>
              <div className={`ml-4 grid transition-[grid-template-rows] duration-(--duration-base) ease-standard motion-reduce:transition-none ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <ul id={groupId} data-nav-children inert={!expanded} aria-hidden={!expanded} className="min-h-0 overflow-hidden">
                {children.map(({ icon: ChildIcon, ...child }) => <li key={child.to} className="px-1 pt-1 last:pb-1">
                  <Link
                    to={child.to}
                    tabIndex={expanded ? undefined : -1}
                    aria-current={groupActive && activeChild === child.to ? 'page' : undefined}
                    onClick={closeMenuAfterNavigation}
                    className={`flex min-h-touch items-center gap-3 rounded-control border-l-4 px-3 text-small font-semibold focus-ring ${groupActive && activeChild === child.to ? 'border-brand bg-nav-active text-text-inverse' : 'border-transparent text-neutral-300 hover:bg-nav-hover hover:text-text-inverse'}`}
                  >
                    <ChildIcon {...iconMd} aria-hidden className="shrink-0" />
                    <span>{child.label}</span>
                  </Link>
                </li>)}
              </ul>
              </div>
            </> :
            <NavLink
              to={to}
              end={end}
              title={collapsed ? label : undefined}
              onClick={closeMenuAfterNavigation}
              className={({ isActive }) =>
                `flex min-h-touch shrink-0 items-center gap-3 rounded-control border-l-4 px-2 text-small font-semibold transition-colors duration-(--duration-fast) ${focusRing} ${
                  collapsed ? 'lg:justify-center lg:px-0' : ''
                } ${isActive ? 'border-brand bg-nav-active text-text-inverse' : 'border-transparent text-neutral-300 hover:bg-nav-hover hover:text-text-inverse'}`
              }
            >
              <Icon {...iconMd} aria-hidden className="shrink-0 [[aria-current=page]_&]:text-brand" />
              <span className={collapsed ? 'lg:sr-only' : ''}>{label}</span>
            </NavLink>
            }
            </li>
          })}
          </ul>
        </nav>

        {settings && <div className="shrink-0 border-t border-nav-hover px-3 pt-2">
          <nav aria-label="Administración">
            <NavLink
              to="/configuracion"
              title="Configuración"
              onClick={closeMenuAfterNavigation}
              className={({ isActive }) =>
                `flex min-h-touch items-center gap-3 rounded-control border-l-4 px-2 text-small font-semibold focus-ring ${collapsed ? 'lg:justify-center lg:px-0' : ''} ${isActive ? 'border-brand bg-nav-active text-text-inverse' : 'border-transparent text-neutral-300 hover:bg-nav-hover hover:text-text-inverse'}`
              }
            >
              <Settings {...iconMd} aria-hidden className="shrink-0 [[aria-current=page]_&]:text-brand" />
              <span className={collapsed ? 'lg:sr-only' : ''}>Configuración</span>
            </NavLink>
          </nav>
        </div>}

        <div className="mx-3 shrink-0 border-t border-nav-hover py-3">
          <UserMenu compact={collapsed && isDesktop} account={account} />
        </div>
      </aside>

      <div
        inert={mobileMenuOpen}
        className={`flex min-h-screen flex-col transition-[padding] duration-(--duration-base) ${
          collapsed ? 'lg:pl-sidebar-collapsed' : 'lg:pl-sidebar'
        }`}
      >
        {!headerInPage && <header className="sticky top-0 z-20 flex h-topbar shrink-0 items-center gap-3 border-b border-border bg-surface px-6 lg:px-8">
          <div className="-ml-3 lg:hidden">{menuButton}</div>
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
                        className={`truncate ${current ? 'font-semibold text-text' : 'text-text-muted'}`}
                        aria-current={current ? 'page' : undefined}
                      >
                        {crumb.label}
                      </span>
                    ) : (
                      <Link
                        to={crumb.to}
                        className={`block truncate rounded-control px-1 leading-11 text-text-muted hover:text-text hover:underline lg:px-0 lg:leading-normal ${focusRing}`}
                      >
                        {crumb.label}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ol>
          </nav>
        </header>}

        <main id="contenido" ref={mainRef} tabIndex={-1} className="mx-auto w-full max-w-content flex-1 px-6 py-6 outline-none lg:px-8 lg:py-8">
          <Outlet context={{ menuButton: headerInPage ? menuButton : null } satisfies AppShellContext} />
        </main>
      </div>
      <Toaster />
    </div>
  )
}
