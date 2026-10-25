import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { clearSession, hasStoredIdentity, useSession } from './session'

/** Guard de las rutas privadas: sin sesion valida manda a /login. */
export function RequireAuth() {
  const session = useSession()
  const location = useLocation()

  // Sin refresh: al vencer el token se cierra la sesion.
  useEffect(() => {
    if (!session) return
    const timer = setTimeout(() => clearSession(true), session.expiresAt * 1000 - Date.now())
    return () => clearTimeout(timer)
  }, [session])

  if (!session) {
    // Con identidad guardada y sin token, la sesion se perdio: el login avisa que vencio.
    return <Navigate to="/login" replace state={{ from: location.pathname, expired: hasStoredIdentity() }} />
  }
  return <Outlet />
}
