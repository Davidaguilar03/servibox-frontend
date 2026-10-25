import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { login, startSession } from '../auth/authApi'
import { getRememberedTenantSlug, rememberTenantSlug, useSession } from '../auth/session'
import { WordmarkLink } from '../brand/WordmarkLink'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { TextField } from '../components/TextField'
import { WHATSAPP_URL } from '../config/contact'
import { ApiError } from '../lib/api'
import { errorMessage } from '../lib/errorMessage'
import { usePageMeta } from '../lib/usePageMeta'

const linkClass =
  'rounded-control font-medium text-brand-ink hover:underline focus-ring'

export function LoginPage() {
  usePageMeta('Iniciar sesión | ServiBox', 'Entra a ServiBox con el código de tu serviteca, tu usuario y tu contraseña.')
  const session = useSession()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/inicio'

  const [tenantSlug, setTenantSlug] = useState(getRememberedTenantSlug)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (response, request) => {
      rememberTenantSlug(request.tenantSlug)
      startSession(response)
    },
  })

  // Al guardar el token la sesion cambia y esta misma redireccion lleva a la pagina pedida.
  if (session) return <Navigate to={from} replace />

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    mutation.mutate({ tenantSlug: tenantSlug.trim(), username: username.trim(), password })
  }

  const invalidCredentials = mutation.error instanceof ApiError && mutation.error.status === 401

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-12 sm:px-6">
      <div className="mb-8">
        <WordmarkLink />
      </div>
      <div className="w-full max-w-sm rounded-surface border border-border bg-surface p-6 sm:p-8">
        <h1 className="text-title text-text">Iniciar sesión</h1>
        <p className="mt-1 text-small text-text-muted">Ventas, inventario y caja en un solo lugar.</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {mutation.isError && (
            <Alert
              tone="error"
              title={invalidCredentials ? 'No pudimos iniciar sesión' : 'No pudimos conectar con ServiBox'}
            >
              {invalidCredentials ? 'Revisa tus datos e intenta de nuevo.' : errorMessage(mutation.error)}
            </Alert>
          )}
          <TextField
            label="Código de tu serviteca"
            name="tenantSlug"
            hint="El nombre corto que elegiste al registrarte."
            autoComplete="organization"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={tenantSlug}
            onChange={(event) => setTenantSlug(event.target.value)}
          />
          <TextField
            label="Usuario"
            name="username"
            autoComplete="username"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
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
            {mutation.isPending ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </Button>
        </form>

        <p className="mt-6 border-t border-border pt-6 text-center text-small text-text-muted">
          ¿Tu serviteca aún no usa ServiBox?{' '}
          <Link to="/registro" className={linkClass}>
            Crear cuenta
          </Link>
        </p>
      </div>
      <p className="mt-6 text-center text-small text-text-muted">
        ¿No puedes entrar?{' '}
        <a href={WHATSAPP_URL} target="_blank" rel="noopener" className={linkClass}>
          Escríbenos por WhatsApp.
        </a>
      </p>
    </main>
  )
}
