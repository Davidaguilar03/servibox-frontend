import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link, NavLink, Outlet, useLocation, useMatches } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { FileClock, House, LogOut, Menu, ShieldAlert, Store, X } from 'lucide-react'
import { MESSAGES } from '../api/errorMessages'
import { initials } from '../auth/session'
import { Wordmark } from '../brand/Wordmark'
import { Button } from '../components/Button'
import { SkipLink } from '../components/SkipLink'
import { Toaster } from '../components/Toaster'
import { iconLg, iconMd, iconSm } from '../components/icons'
import { GLOSSARY } from '../copy/glossary'
import type { AppShellContext, NavItem, RouteHandle } from '../layout/AppShell'
import { UserMenu, type UserMenuAccount } from '../layout/UserMenu'
import { ApiError } from '../lib/api'
import { DESKTOP_QUERY, useMediaQuery } from '../lib/useMediaQuery'
import { usePageMeta } from '../lib/usePageMeta'
import { fetchPlatformMe, PLATFORM_QUERY_KEY } from './platformApi'
import { clearPlatformSession, usePlatformSession } from './platformSession'

export const PLATFORM_HOME = '/plataforma'
export const PLATFORM_ROLE_LABEL = 'Administrador de plataforma'

const SM_QUERY = '(min-width: 640px)'

const platformNav: NavItem[] = [
  { to: PLATFORM_HOME, label: 'Resumen', icon: House, end: true },
  { to: '/plataforma/solicitudes', label: GLOSSARY.platformRequests, icon: FileClock },
  { to: '/plataforma/servitecas', label: GLOSSARY.platformTenants, icon: Store },
]

/** Titulo del documento con el ultimo tramo de la miga de la ruta, como en el shell de serviteca. */
function useRouteTitle() {
  const matches = useMatches()
  const label = matches.map((match) => (match.handle as RouteHandle | undefined)?.breadcrumb.at(-1)?.label).filter(Boolean).at(-1)
  useEffect(() => {
    if (!label) return
    const previous = document.title
    document.title = `${label} · ServiBox`
    return () => {
      document.title = previous
    }
  }, [label])
}

/**
 * Shell del panel de plataforma: barra superior fija con los colores de la barra lateral de las
 * servitecas (nav, nav-hover, nav-active, acento brand) con la marca, el rotulo Plataforma, las tres ventanas y el menu de
 * usuario; el contenido ocupa todo el ancho hasta max-content. Cada pagina lleva su encabezado.
 * GET /me confirma la identidad; un 403 muestra acceso denegado sin reintentos ni redirecciones.
 */
export function PlatformShell() {
  const session = usePlatformSession()
  const me = useQuery({ queryKey: [PLATFORM_QUERY_KEY, 'me'], queryFn: fetchPlatformMe, retry: false })
  useRouteTitle()

  if (me.error instanceof ApiError && me.error.status === 403) return <PlatformAccessDenied />

  const email = me.data?.email ?? session?.email ?? ''
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <SkipLink />
      <PlatformTopBar
        account={{
          name: email,
          initials: initials({ username: email.split('@')[0] ?? '' }),
          title: email,
          subtitle: PLATFORM_ROLE_LABEL,
          details: [PLATFORM_ROLE_LABEL],
          onSignOut: () => clearPlatformSession(),
        }}
      />
      <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-content flex-1 px-6 py-6 outline-none lg:px-8 lg:py-8">
        <Outlet context={{ menuButton: null } satisfies AppShellContext} />
      </main>
      <Toaster />
    </div>
  )
}

/**
 * Desde lg las tres ventanas van en la barra; por debajo (el mismo corte del menu movil del
 * shell de serviteca) se agrupan en un desplegable con el patron disclosure de UserMenu: Esc lo
 * cierra y devuelve el foco al boton; el clic fuera y el cambio de ruta tambien.
 */
function PlatformTopBar({ account }: { account: UserMenuAccount }) {
  const wide = useMediaQuery(DESKTOP_QUERY, true)
  // Bajo sm la marca queda en el simbolo para que quepan el rotulo, el usuario y el menu.
  const roomy = useMediaQuery(SM_QUERY, true)
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [openedAt, setOpenedAt] = useState(pathname)
  const headerRef = useRef<HTMLElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const menuOpen = open && !wide

  // Cambiar de ruta cierra el menu.
  if (openedAt !== pathname) {
    setOpenedAt(pathname)
    setOpen(false)
  }

  useEffect(() => {
    if (!menuOpen) return
    function onPointerDown(event: PointerEvent) {
      if (!headerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [menuOpen])

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Escape' || !menuOpen) return
    setOpen(false)
    toggleRef.current?.focus()
  }

  const linkClass = (isActive: boolean) => {
    const tone = isActive
      ? 'border-brand bg-nav-active text-text-inverse'
      : 'border-transparent text-neutral-300 hover:bg-nav-hover hover:text-text-inverse'
    return wide
      ? `flex min-h-touch items-center gap-2 rounded-t-control border-b-2 px-3 text-small font-semibold transition-colors duration-(--duration-fast) focus-ring ${tone}`
      : `flex min-h-touch items-center gap-3 rounded-control border-l-4 px-3 text-small font-semibold transition-colors duration-(--duration-fast) focus-ring ${tone}`
  }

  const navigation = (
    <nav aria-label="Principal">
      <ul className={wide ? 'flex items-center gap-1' : 'flex flex-col gap-1'}>
        {platformNav.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => linkClass(isActive)}>
              <Icon {...iconMd} aria-hidden className="shrink-0 [[aria-current=page]_&]:text-brand" />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )

  return (
    <header ref={headerRef} onKeyDown={onKeyDown} className="sticky top-0 z-30 bg-nav">
      <div className="mx-auto flex h-topbar w-full max-w-content items-center gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex shrink-0 items-center gap-3">
          <Link to={PLATFORM_HOME} aria-label="ServiBox, ir a Resumen" title="ServiBox" className="inline-flex min-h-touch min-w-touch items-center rounded-control focus-ring">
            <Wordmark onDark compact={!roomy} />
          </Link>
          <span className="border-l border-nav-hover pl-3 text-label text-neutral-300">PLATAFORMA</span>
        </div>
        {wide && <div className="ml-4 self-end">{navigation}</div>}
        <div className="ml-auto flex items-center gap-2">
          <div className="w-touch">
            <UserMenu compact placement="below" account={account} />
          </div>
          {!wide && (
            <button
              ref={toggleRef}
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={menuOpen}
              aria-controls="menu-plataforma"
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              className="flex size-touch shrink-0 items-center justify-center rounded-control text-text-inverse transition-colors duration-(--duration-fast) hover:bg-nav-hover focus-ring"
            >
              {menuOpen ? <X {...iconMd} aria-hidden /> : <Menu {...iconMd} aria-hidden />}
            </button>
          )}
        </div>
      </div>
      {menuOpen && (
        <div id="menu-plataforma" className="border-t border-nav-hover px-4 py-3 sm:px-6">
          {navigation}
        </div>
      )}
    </header>
  )
}

function PlatformAccessDenied() {
  usePageMeta('Acceso denegado | ServiBox', 'Panel de plataforma de ServiBox.')
  return (
    <main id="contenido" className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-6 py-12 text-center">
      <Wordmark />
      <ShieldAlert {...iconLg} className="text-error" aria-hidden />
      <h1 className="text-title text-text">Acceso denegado</h1>
      <p className="max-w-md text-body text-text-muted">{MESSAGES.forbidden} Cierra sesión y entra con una cuenta de administrador de plataforma.</p>
      <Button variant="secondary" onClick={() => clearPlatformSession()}>
        <LogOut {...iconSm} aria-hidden />
        Cerrar sesión
      </Button>
    </main>
  )
}
