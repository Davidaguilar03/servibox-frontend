import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { login } from '../auth/authApi'
import { getRememberedTenantSlug, rememberTenantSlug, saveToken, useSession } from '../auth/session'
import { Wordmark } from '../brand/Wordmark'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { TextField } from '../components/TextField'
import { ApiError } from '../lib/api'

const linkClass =
  'rounded-tag font-medium text-brand-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

export function LoginPage() {
  const session = useSession()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/inicio'

  const [tenantSlug, setTenantSlug] = useState(getRememberedTenantSlug)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: ({ token, user, tenant }, request) => {
      rememberTenantSlug(request.tenantSlug)
      saveToken(token, { username: user.username, role: user.role, tenantName: tenant.name, tenantSlug: tenant.slug })
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
    <div className="flex min-h-screen bg-canvas">
      <section className="relative hidden flex-col overflow-hidden bg-nav p-16 lg:flex lg:w-1/2 xl:w-5/12">
        <div
          className="absolute inset-0 bg-brand/20 [clip-path:polygon(72%_0,100%_0,100%_100%,34%_100%)]"
          aria-hidden
        />
        <div className="relative">
          <Wordmark onDark />
        </div>
        <div className="relative my-auto max-w-md">
          <p className="font-mono text-label uppercase text-text-subtle">Servitecas y talleres</p>
          <h1 className="mt-4 text-display text-text-inverse">Tu negocio en buenas manos.</h1>
          <p className="mt-6 text-body text-text-subtle">
            Registra una venta y el inventario y la caja se actualizan solos. Sin archivos separados ni
            conciliación a fin de mes.
          </p>
        </div>
        <p className="relative text-small text-text-subtle">ServiBox · Plataforma web para servitecas · 2026</p>
      </section>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-8">
        <div className="mb-8 lg:hidden">
          <Wordmark />
        </div>
        <div className="w-full max-w-sm rounded-card border border-border bg-surface p-8 shadow-card">
          <h2 className="text-h2 text-text">Inicia sesión</h2>
          <p className="mt-1 text-small text-text-muted">Ingresa con los datos de tu serviteca.</p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            {mutation.isError && (
              <Alert
                tone="error"
                title={invalidCredentials ? 'No pudimos iniciar sesión' : 'No pudimos conectar con ServiBox'}
              >
                {invalidCredentials ? 'Revisa tus datos e intenta de nuevo.' : 'Intenta de nuevo en unos minutos.'}
              </Alert>
            )}
            <TextField
              label="Serviteca"
              name="tenantSlug"
              hint="Identificador con el que registraste tu serviteca"
              autoComplete="organization"
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
            <div className="text-right text-small">
              <Link to="/recuperar-contrasena" className={linkClass}>
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? 'Ingresando…' : 'Ingresar'}
            </Button>
          </form>

          <p className="mt-6 border-t border-border pt-6 text-center text-small text-text-muted">
            ¿Tu serviteca aún no usa ServiBox?{' '}
            <Link to="/crear-cuenta" className={linkClass}>
              Crea tu cuenta
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
