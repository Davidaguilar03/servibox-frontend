import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { PLATFORM_QUERY_KEY } from './platformApi'
import { clearPlatformSession, usePlatformSession } from './platformSession'

/**
 * Guard de las rutas de plataforma: sin sesion de plataforma valida manda a su propio acceso.
 * La sesion de serviteca no cuenta. Al quedar sin sesion borra solo la cache de plataforma.
 */
export function PlatformRequireAuth() {
  const session = usePlatformSession()
  const location = useLocation()
  const queryClient = useQueryClient()

  // Sin refresh: al vencer el token se cierra la sesion.
  useEffect(() => {
    if (!session) {
      queryClient.removeQueries({ queryKey: [PLATFORM_QUERY_KEY] })
      return
    }
    const timer = setTimeout(() => clearPlatformSession(true), session.expiresAt * 1000 - Date.now())
    return () => clearTimeout(timer)
  }, [session, queryClient])

  if (!session) return <Navigate to="/plataforma/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}
