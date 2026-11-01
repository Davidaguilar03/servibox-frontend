import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { MESSAGES } from '../api/errorMessages'
import { reportError } from '../api/reportError'
import workshopPhoto from '../assets/login/login-workshop-v1.webp'
import { login, startSession } from '../auth/authApi'
import { getRememberedTenantSlug, rememberTenantSlug, takeSessionExpired, useSession } from '../auth/session'
import { WordmarkLink } from '../brand/WordmarkLink'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { TextField } from '../components/TextField'
import { iconSm } from '../components/icons'
import { GLOSSARY } from '../copy/glossary'
import { ApiError } from '../lib/api'
import { usePageMeta } from '../lib/usePageMeta'
import './LoginPage.css'

const linkClass =
  'rounded-control font-semibold text-brand-ink hover:underline focus-ring'

export function LoginPage() {
  usePageMeta('Iniciar sesión | ServiBox', 'Entra a ServiBox con el código de tu serviteca, tu usuario y tu contraseña.')
  const session = useSession()
  const location = useLocation()
  const state = location.state as { from?: string; expired?: boolean } | null
  const from = state?.from ?? '/inicio'
  // Se lee una vez: tras un 401 o con el token perdido, el login avisa que la sesion vencio.
  const [expired] = useState(() => takeSessionExpired() || Boolean(state?.expired))

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
    if (mutation.isPending) return
    mutation.mutate({ tenantSlug: tenantSlug.trim(), username: username.trim(), password })
  }

  const invalidCredentials = mutation.error instanceof ApiError && mutation.error.status === 401
  // 429 de LoginThrottle: el mensaje del backend y, con Retry-After, el tiempo de espera.
  const tooMany = mutation.error instanceof ApiError && mutation.error.status === 429
  const reportedError = reportError(mutation.error, { inlineOnly: true })
  const errorMessage = reportedError === MESSAGES.network
    ? 'No pudimos completar la acción. Revisa tu conexión e inténtalo de nuevo.'
    : reportedError

  return (
    <main id="login" className="bg-neutral-100 text-text">
      <div className="login-scene">
        <img className="login-photo" src={workshopPhoto} alt="" width={1122} height={1402} fetchPriority="high" decoding="async" />
        <div className="login-scene-brand login-brand"><WordmarkLink onDark /></div>
        <div className="login-scene-copy text-text-inverse">
          <p className="login-statement font-display font-semibold">El trabajo sigue.<br />Tu negocio, en orden.</p>
          <p className="mt-3">Ventas, inventario y caja conectados.</p>
        </div>
      </div>
      <div className="login-panel">
        <nav aria-label="Navegación de acceso" className="flex flex-wrap items-center justify-between gap-4">
          <div className="login-mobile-brand login-brand"><WordmarkLink /></div>
          <Link to="/" className="ml-auto inline-flex min-h-touch items-center gap-2 rounded-control text-small text-text focus-ring hover:underline">
            <ArrowLeft {...iconSm} aria-hidden />Volver al inicio
          </Link>
        </nav>
        <div className="login-content">
        <p className="mb-4 flex items-center gap-3 text-label text-text-muted">
          <span aria-hidden className="size-2 shrink-0 rounded-pill bg-brand" />ACCESO A TU SERVITECA
        </p>
        <h1 className="login-title text-title text-text">Inicia sesión</h1>
        <p className="mt-3 text-body text-text-muted">Entra y continúa con tu negocio.</p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6" aria-label="Iniciar sesión" aria-busy={mutation.isPending}>
          {expired && !mutation.isError && <Alert tone="info" title={MESSAGES.session} />}
          {mutation.isError && (
            <Alert
              tone="error"
              title={invalidCredentials ? 'No pudimos iniciar sesión' : tooMany ? 'Espera antes de intentar de nuevo' : 'No pudimos conectar con ServiBox'}
            >
              {invalidCredentials ? 'Revisa tus datos e intenta de nuevo.' : errorMessage}
            </Alert>
          )}
          <TextField
            label={GLOSSARY.tenantCode}
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
          <Button type="submit" className="login-submit relative w-full" disabled={mutation.isPending}>
            <span role="status">{mutation.isPending ? 'Iniciando sesión…' : 'Iniciar sesión'}</span>
            <ArrowRight {...iconSm} aria-hidden className="absolute right-5" />
          </Button>
        </form>

        <p className="mt-6 border-t border-border pt-6 text-center text-small text-text-muted">
          ¿Tu serviteca aún no usa ServiBox?{' '}
          <Link to="/registro" className={linkClass}>
            Solicitar cuenta
          </Link>
        </p>
        </div>
        <footer className="text-right text-small text-text-muted">
          <p className="mb-1">ServiBox · Colombia</p>
          <Link to="/terminos" className="inline-flex min-h-touch items-center rounded-control underline focus-ring">Términos y datos personales</Link>
        </footer>
      </div>
    </main>
  )
}
