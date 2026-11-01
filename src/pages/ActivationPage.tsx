import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { INVALID_ACTIVATION_LINK, MESSAGES } from '../api/errorMessages'
import { reportError } from '../api/reportError'
import workshopPhoto from '../assets/register/register-workshop-v1.webp'
import { activateAccount } from '../auth/authApi'
import { passwordError, usernameError } from '../auth/registerForm'
import { rememberTenantSlug } from '../auth/session'
import { WordmarkLink } from '../brand/WordmarkLink'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { ErrorSummary } from '../components/ErrorSummary'
import { TextField } from '../components/TextField'
import { buttonClasses } from '../components/buttonStyles'
import { iconSm } from '../components/icons'
import { SUPPORT_EMAIL } from '../config/contact'
import { GLOSSARY } from '../copy/glossary'
import { ApiError } from '../lib/api'
import { revealErrors } from '../lib/formErrors'
import { usePageMeta } from '../lib/usePageMeta'
import './RegisterPage.css'

const linkClass =
  'rounded-control font-semibold text-brand-ink hover:underline focus-ring'

/** Mensajes de ActivationException del backend: el enlace ya no sirve y el formulario se retira. */
const LINK_INVALID = /^El enlace de activacion no es valido$/
const LINK_EXPIRED = /^El enlace de activacion vencio o fue reemplazado$/
const LINK_USED = /^El enlace de activacion ya fue utilizado; inicia sesion$/

/** Mismo formato que TOKEN en RegistrationActivationService: 32 bytes en Base64 URL sin relleno. */
const TOKEN = /^[A-Za-z0-9_-]{43}$/

type Field = 'username' | 'password' | 'confirmation'
type Values = Record<Field, string>
type LinkProblem = 'invalid' | 'expired' | 'used'

/** El enlace del correo es /activar#token=...: el token va en el fragmento, que no viaja al servidor. */
function tokenFrom(hash: string): string | null {
  const token = new URLSearchParams(hash.replace(/^#/, '')).get('token')
  return token && TOKEN.test(token) ? token : null
}

function validate({ username, password, confirmation }: Values): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {
    username: usernameError(username),
    password: passwordError(password),
    confirmation: !confirmation ? 'Confirma la contraseña.' : confirmation !== password ? 'Las contraseñas no coinciden.' : undefined,
  }
  for (const field of Object.keys(errors) as Field[]) if (!errors[field]) delete errors[field]
  return errors
}

function linkProblemOf(error: unknown): LinkProblem | null {
  if (!(error instanceof ApiError)) return null
  if (error.status === 400 && LINK_INVALID.test(error.message)) return 'invalid'
  if (error.status === 410 && LINK_EXPIRED.test(error.message)) return 'expired'
  if (error.status === 409 && LINK_USED.test(error.message)) return 'used'
  return null
}

/** Activacion de la cuenta con el enlace del correo: crea el usuario administrador, sin iniciar sesion. */
export function ActivationPage() {
  usePageMeta('Activar cuenta | ServiBox', 'Activa la cuenta de tu serviteca en ServiBox y crea tu usuario.')
  useNoReferrer()
  const location = useLocation()
  const navigate = useNavigate()
  // Se lee una sola vez y vive solo en memoria: ni almacenamiento, ni URL, ni registros.
  const [token] = useState(() => tokenFrom(location.hash))
  const [values, setValues] = useState<Values>({ username: '', password: '', confirmation: '' })
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  // Quita el token de la direccion (replace, sin entrada nueva en el historial).
  useEffect(() => {
    if (location.hash) navigate({ pathname: location.pathname, search: location.search }, { replace: true })
  }, [location.hash, location.pathname, location.search, navigate])

  const mutation = useMutation({
    mutationFn: activateAccount,
    onSuccess: (response) => rememberTenantSlug(response.tenantSlug),
  })

  const errors = validate(values)
  const fieldError = (field: Field) => (touched[field] ? errors[field] : undefined)
  const problem: LinkProblem | null = token ? linkProblemOf(mutation.error) : 'invalid'

  function set(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function blur(field: Field) {
    setTouched((current) => ({ ...current, [field]: true }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mutation.isPending || !token) return
    if (Object.keys(errors).length > 0) {
      revealErrors(() => {
        setSubmitted(true)
        setTouched({ username: true, password: true, confirmation: true })
      }, formRef.current)
      return
    }
    mutation.mutate({ token, username: values.username.trim(), password: values.password })
  }

  const error = mutation.error
  const reportedError = reportError(error, { inlineOnly: true, context: 'activation' })
  const tooMany = error instanceof ApiError && error.status === 429

  let content: ReactNode
  if (mutation.data) {
    content = <Activated tenantSlug={mutation.data.tenantSlug} username={mutation.variables?.username ?? ''} />
  } else if (problem) {
    content = <LinkUnavailable problem={problem} message={token ? reportedError! : INVALID_ACTIVATION_LINK} />
  } else {
    content = (
      <>
        <Eyebrow>ACTIVA TU CUENTA</Eyebrow>
        <h1 className="register-title text-title text-text">Activa tu cuenta</h1>
        <p className="mt-3 text-body text-text-muted">
          Tu solicitud fue aprobada. Crea el usuario y la contraseña con los que vas a administrar tu serviteca.
        </p>
        <form ref={formRef} onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-6" aria-label="Activar cuenta" aria-busy={mutation.isPending}>
          {error && (
            <Alert tone="error" title={tooMany ? 'Espera antes de intentar de nuevo' : 'No pudimos activar la cuenta'}>
              {reportedError === MESSAGES.network
                ? 'No pudimos completar la acción. Revisa tu conexión e inténtalo de nuevo.'
                : reportedError}
            </Alert>
          )}
          <TextField
            label="Usuario"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            hint="De 3 a 50 caracteres: letras, números, punto, guion y guion bajo."
            value={values.username}
            error={fieldError('username')}
            onChange={(event) => set('username', event.target.value)}
            onBlur={() => blur('username')}
          />
          <TextField
            label="Contraseña"
            name="password"
            type="password"
            autoComplete="new-password"
            hint="De 8 a 72 caracteres."
            value={values.password}
            error={fieldError('password')}
            onChange={(event) => set('password', event.target.value)}
            onBlur={() => blur('password')}
          />
          <TextField
            label="Confirmar contraseña"
            name="confirmation"
            type="password"
            autoComplete="new-password"
            value={values.confirmation}
            error={fieldError('confirmation')}
            onChange={(event) => set('confirmation', event.target.value)}
            onBlur={() => blur('confirmation')}
          />
          <ErrorSummary count={submitted ? Object.keys(errors).length : 0} />
          <Button type="submit" className="register-submit relative w-full" disabled={mutation.isPending} aria-busy={mutation.isPending || undefined}>
            <span role="status">{mutation.isPending ? 'Activando cuenta…' : 'Activar cuenta'}</span>
            <ArrowRight {...iconSm} aria-hidden className="absolute right-5" />
          </Button>
        </form>
      </>
    )
  }

  return (
    <main id="register" className="bg-neutral-100 text-text">
      <div className="register-scene">
        <img className="register-photo" src={workshopPhoto} alt="" width={1122} height={1402} fetchPriority="high" decoding="async" />
        <div className="register-scene-brand register-brand"><WordmarkLink onDark /></div>
        <div className="register-scene-copy text-text-inverse">
          <p className="register-statement font-display font-semibold">Tu serviteca empieza aquí.</p>
          <p className="mt-3">Ventas, inventario y caja conectados.</p>
        </div>
      </div>
      <div className="register-panel">
        <nav aria-label="Navegación de activación" className="flex flex-wrap items-center justify-between gap-4">
          <div className="register-mobile-brand register-brand"><WordmarkLink /></div>
          <Link to="/" className="ml-auto inline-flex min-h-touch items-center gap-2 rounded-control text-small text-text focus-ring hover:underline">
            <ArrowLeft {...iconSm} aria-hidden />Volver al inicio
          </Link>
        </nav>
        <div className="register-content">{content}</div>
        <footer className="text-right text-small text-text-muted">
          <p className="mb-1">ServiBox · Colombia</p>
          <Link to="/terminos" className="inline-flex min-h-touch items-center rounded-control underline focus-ring">Términos y datos personales</Link>
        </footer>
      </div>
    </main>
  )
}

/** meta referrer no-referrer mientras la pagina esta abierta. */
function useNoReferrer() {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'referrer'
    meta.content = 'no-referrer'
    document.head.append(meta)
    return () => meta.remove()
  }, [])
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-4 flex items-center gap-3 text-label text-text-muted">
      <span aria-hidden className="size-2 shrink-0 rounded-pill bg-brand" />{children}
    </p>
  )
}

/** Titulo que recibe el foco al cambiar de estado, para que el lector de pantalla lo anuncie. */
function FocusedTitle({ children }: { children: ReactNode }) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => heading.current?.focus(), [])
  return (
    <h1 ref={heading} tabIndex={-1} className="register-title rounded-control text-title text-text focus-ring">
      {children}
    </h1>
  )
}

function Activated({ tenantSlug, username }: { tenantSlug: string; username: string }) {
  return (
    <section>
      <Eyebrow>CUENTA ACTIVADA</Eyebrow>
      <FocusedTitle>Tu cuenta está activa</FocusedTitle>
      <p className="mt-3 text-body text-text-muted">
        Guarda el código de tu serviteca: lo necesitas, junto con tu usuario y tu contraseña, cada vez que inicies
        sesión.
      </p>
      <dl className="mt-6 flex flex-col gap-4 rounded-surface border border-border bg-surface p-4">
        <div>
          <dt className="text-small text-text-muted">{GLOSSARY.tenantCode}</dt>
          <dd className="text-body font-semibold text-text break-all">{tenantSlug}</dd>
        </div>
        <div>
          <dt className="text-small text-text-muted">Usuario</dt>
          <dd className="text-body text-text break-all">{username}</dd>
        </div>
      </dl>
      <Link to="/login" className={`${buttonClasses('primary')} mt-6 w-full`} data-variant="primary">
        Iniciar sesión<ArrowRight {...iconSm} aria-hidden />
      </Link>
    </section>
  )
}

const PROBLEM_TITLES: Record<LinkProblem, string> = {
  invalid: 'Este enlace no es válido',
  expired: 'Este enlace ya no sirve',
  used: 'Esta cuenta ya está activa',
}

/** El enlace ya no sirve: titulo propio y el mensaje mapeado del backend. */
function LinkUnavailable({ problem, message }: { problem: LinkProblem; message: string }) {
  return (
    <section>
      <Eyebrow>ACTIVA TU CUENTA</Eyebrow>
      <FocusedTitle>{PROBLEM_TITLES[problem]}</FocusedTitle>
      <p className="mt-3 text-body text-text">{message}</p>
      {problem === 'used' ? (
        <Link to="/login" className={`${buttonClasses('primary')} mt-6 w-full`} data-variant="primary">
          Iniciar sesión<ArrowRight {...iconSm} aria-hidden />
        </Link>
      ) : (
        <p className="mt-4 text-small text-text-muted">
          Si el problema sigue, escríbenos a{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>{SUPPORT_EMAIL}</a>.
        </p>
      )}
    </section>
  )
}
