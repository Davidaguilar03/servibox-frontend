import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { MESSAGES } from '../api/errorMessages'
import { reportError } from '../api/reportError'
import { Wordmark } from '../brand/Wordmark'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { TextField } from '../components/TextField'
import { ApiError } from '../lib/api'
import { usePageMeta } from '../lib/usePageMeta'
import { platformLogin, startPlatformSession } from '../platform/platformApi'
import { takePlatformSessionExpired, usePlatformSession } from '../platform/platformSession'
import { PLATFORM_HOME } from '../platform/PlatformShell'

/**
 * Acceso del administrador de plataforma: correo y contrasena, sin codigo de serviteca,
 * registro ni recuperacion. No lo enlaza ninguna pagina publica. La sesion de serviteca no
 * interviene: ni la abre ni la cierra.
 */
export function PlatformLoginPage() {
  usePageMeta('Acceso de plataforma | ServiBox', 'Acceso para administradores de la plataforma ServiBox.')
  const session = usePlatformSession()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  const target = from?.startsWith(PLATFORM_HOME) && from !== '/plataforma/login' ? from : PLATFORM_HOME
  const [expired] = useState(takePlatformSessionExpired)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: () => platformLogin(email.trim(), password),
    onSuccess: startPlatformSession,
  })

  if (session) return <Navigate to={target} replace />

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mutation.isPending) return
    mutation.mutate()
  }

  const invalidCredentials = mutation.error instanceof ApiError && mutation.error.status === 401
  const reportedError = reportError(mutation.error, { inlineOnly: true })
  const errorMessage = reportedError === MESSAGES.network
    ? 'No pudimos completar la acción. Revisa tu conexión e inténtalo de nuevo.'
    : reportedError

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12 text-text">
      <div className="w-full max-w-md rounded-surface border border-border bg-surface p-6 sm:p-8">
        <Wordmark />
        <h1 className="mt-8 text-title text-text">Acceso de plataforma</h1>
        <p className="mt-2 text-body text-text-muted">Solo para administradores de ServiBox.</p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6" aria-label="Iniciar sesión en la plataforma" aria-busy={mutation.isPending}>
          {expired && !mutation.isError && <Alert tone="info" title={MESSAGES.session} />}
          {mutation.isError && (
            <Alert tone="error" title={invalidCredentials ? 'No pudimos iniciar sesión' : 'No pudimos conectar con ServiBox'}>
              {invalidCredentials ? 'Revisa tu correo y tu contraseña.' : errorMessage}
            </Alert>
          )}
          <TextField
            label="Correo"
            name="email"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <TextField
            label="Contraseña"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            <span role="status">{mutation.isPending ? 'Iniciando sesión…' : 'Iniciar sesión'}</span>
          </Button>
        </form>
      </div>
    </main>
  )
}
