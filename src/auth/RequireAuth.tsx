import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { clearSession, useSession } from './session'

/** Guard de las rutas privadas: sin sesion valida manda a /login. */
export function RequireAuth() {
  const session = useSession()
  const location = useLocation()

  // Sin refresh: al vencer el token se cierra la sesion.
  useEffect(() => {
    if (!session) return
    const timer = setTimeout(clearSession, session.expiresAt * 1000 - Date.now())
    return () => clearTimeout(timer)
  }, [session])

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
