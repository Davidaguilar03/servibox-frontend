import { useQuery } from '@tanstack/react-query'
import { House, LogOut, ShieldAlert } from 'lucide-react'
import { MESSAGES } from '../api/errorMessages'
import { initials } from '../auth/session'
import { Wordmark } from '../brand/Wordmark'
import { Button } from '../components/Button'
import { iconLg, iconSm } from '../components/icons'
import { AppShell, type NavItem } from '../layout/AppShell'
import { ApiError } from '../lib/api'
import { usePageMeta } from '../lib/usePageMeta'
import { fetchPlatformMe, PLATFORM_QUERY_KEY } from './platformApi'
import { clearPlatformSession, usePlatformSession } from './platformSession'

export const PLATFORM_HOME = '/plataforma'
export const PLATFORM_ROLE_LABEL = 'Administrador de plataforma'

// Solicitudes, Servitecas y su detalle se agregan cuando existan sus pantallas.
const platformNav: NavItem[] = [{ to: PLATFORM_HOME, label: 'Resumen', icon: House, end: true }]

/**
 * Shell del panel de plataforma: el mismo AppShell con su propia navegacion, sin
 * Configuracion ni modulos de la serviteca, y el menu de usuario de la sesion de plataforma.
 * GET /me confirma la identidad; un 403 muestra acceso denegado sin reintentos ni redirecciones.
 */
export function PlatformShell() {
  const session = usePlatformSession()
  const me = useQuery({ queryKey: [PLATFORM_QUERY_KEY, 'me'], queryFn: fetchPlatformMe, retry: false })

  if (me.error instanceof ApiError && me.error.status === 403) return <PlatformAccessDenied />

  const email = me.data?.email ?? session?.email ?? ''
  return (
    <AppShell
      items={platformNav}
      home={{ to: PLATFORM_HOME, label: 'Resumen' }}
      settings={false}
      headerInPage
      account={{
        name: email,
        initials: initials({ username: email.split('@')[0] ?? '' }),
        title: email,
        subtitle: PLATFORM_ROLE_LABEL,
        details: [PLATFORM_ROLE_LABEL],
        onSignOut: () => clearPlatformSession(),
      }}
    />
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
