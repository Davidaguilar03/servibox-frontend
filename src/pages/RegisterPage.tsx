import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { MESSAGES } from '../api/errorMessages'
import { reportError } from '../api/reportError'
import workshopPhoto from '../assets/register/register-workshop-v1.webp'
import { submitRegistrationRequest, type RegistrationRequestBody } from '../auth/authApi'
import {
  EMPTY_REGISTER_VALUES,
  normalizeSlugInput,
  suggestSlug,
  toRegisterRequest,
  validateRegister,
  type RegisterField,
  type RegisterValues,
} from '../auth/registerForm'
import { useSession } from '../auth/session'
import { WordmarkLink } from '../brand/WordmarkLink'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { ErrorSummary } from '../components/ErrorSummary'
import { TextField } from '../components/TextField'
import { iconSm } from '../components/icons'
import { SUPPORT_EMAIL } from '../config/contact'
import { GLOSSARY } from '../copy/glossary'
import { LegalLinks } from '../legal/LegalLinks'
import { PRIVACY_POLICY_PATH, TERMS_PATH } from '../legal/legalContent'
import { ApiError } from '../lib/api'
import { revealErrors } from '../lib/formErrors'
import { usePageMeta } from '../lib/usePageMeta'
import './RegisterPage.css'

const linkClass =
  'rounded-control font-semibold text-brand-ink hover:underline focus-ring'

const legendClass = 'text-body font-semibold text-text'

/** Mensajes del backend (RegistrationRequestConflictException) que cambian lo que hace la pantalla. */
const SLUG_TAKEN = /^El codigo solicitado no esta disponible$/
const KEY_REUSED = /^La clave de reintento ya se uso con otros datos$/
/** Los tres 400 de la version de la politica: se resuelven recargando la pagina. */
const POLICY_RELOAD = /^La (?:version de la politica (?:es obligatoria|no es valida)|politica fue actualizada; recarga la pagina para continuar)$/

/** El 409 de un codigo no disponible, atado al slug que lo provoco. */
interface SlugConflict {
  slug: string
  message: string
}

interface Submission {
  body: RegistrationRequestBody
  key: string
}

export function RegisterPage() {
  usePageMeta(
    'Solicitar cuenta | ServiBox',
    'Solicita la cuenta de tu serviteca en ServiBox. Revisamos cada solicitud y te escribimos al correo para activarla.',
  )
  const session = useSession()
  const [values, setValues] = useState<RegisterValues>(EMPTY_REGISTER_VALUES)
  const [touched, setTouched] = useState<Partial<Record<RegisterField, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const [slugEdited, setSlugEdited] = useState(false)
  const [slugConflict, setSlugConflict] = useState<SlugConflict | null>(null)
  const slugRef = useRef<HTMLInputElement>(null)
  // Evita un segundo envio antes de que isPending llegue al boton.
  const submitting = useRef(false)
  // Clave de reintento: la misma mientras los datos enviados no cambien, una nueva si cambian.
  const attempt = useRef<{ key: string; fingerprint: string } | null>(null)
  const [received, setReceived] = useState<RegistrationRequestBody | null>(null)

  const mutation = useMutation({
    mutationFn: ({ body, key }: Submission) => submitRegistrationRequest(body, key),
    onSuccess: (_response, { body }) => setReceived(body),
    onError: (error, { body }) => {
      if (!(error instanceof ApiError) || error.status !== 409) return
      if (KEY_REUSED.test(error.message)) attempt.current = null
      if (SLUG_TAKEN.test(error.message)) {
        setSlugConflict({ slug: body.slug, message: reportError(error, { inlineOnly: true, context: 'registration' })! })
        slugRef.current?.focus()
      }
    },
    onSettled: () => {
      submitting.current = false
    },
  })

  if (session) return <Navigate to="/inicio" replace />

  const errors = validateRegister(values)
  const valid = Object.keys(errors).length === 0
  const slugError = slugConflict?.slug === values.slug ? slugConflict.message : undefined
  const fieldError = (field: RegisterField) => (touched[field] ? errors[field] : undefined)

  function set<K extends RegisterField>(field: K, value: RegisterValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function blur(field: RegisterField) {
    setTouched((current) => ({ ...current, [field]: true }))
  }

  function changeBusinessName(name: string) {
    setValues((current) => ({ ...current, businessName: name, slug: slugEdited ? current.slug : suggestSlug(name) }))
  }

  function changeSlug(slug: string) {
    setSlugEdited(true)
    set('slug', normalizeSlugInput(slug))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    if (!valid) {
      // Enviar no se deshabilita por errores: al enviar se muestran todos y el foco va al primero.
      revealErrors(() => {
        setSubmitted(true)
        setTouched(Object.fromEntries(Object.keys(values).map((field) => [field, true])))
      }, formRef.current)
      return
    }
    // Un codigo no disponible no bloquea el reenvio: la reserva puede vencer y el backend
    // decide (tambien su limite de tasa). La respuesta nueva reemplaza el aviso del campo.
    setSlugConflict(null)
    const body = toRegisterRequest(values)
    const fingerprint = JSON.stringify(body)
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { key: crypto.randomUUID(), fingerprint }
    submitting.current = true
    mutation.mutate({ body, key: attempt.current.key })
  }

  const error = mutation.error
  const reportedError = reportError(error, { inlineOnly: true, context: 'registration' })
  const status = error instanceof ApiError ? error.status : undefined
  const alert: { title: string; body: ReactNode } | null =
    // El codigo no disponible va bajo su campo.
    !error || (status === 409 && SLUG_TAKEN.test(error.message))
      ? null
      : status === 404
        ? {
            title: 'El registro todavía no está disponible',
            body: (
              <>
                Aún no estamos recibiendo solicitudes de cuenta. Si quieres usar ServiBox en tu serviteca, escríbenos a{' '}
                <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>{SUPPORT_EMAIL}</a>.
              </>
            ),
          }
        : status === 429
          ? { title: 'Espera antes de enviar de nuevo', body: reportedError }
          : status === 400 && POLICY_RELOAD.test(error.message)
            ? {
                title: 'No pudimos enviar la solicitud',
                body: (
                  <>
                    <p>{reportedError}</p>
                    <Button variant="secondary" className="mt-3" onClick={() => window.location.reload()}>Recargar la página</Button>
                  </>
                ),
              }
            : {
                title: 'No pudimos enviar la solicitud',
                body: reportedError === MESSAGES.network
                  ? 'No pudimos completar la acción. Revisa tu conexión e inténtalo de nuevo.'
                  : reportedError,
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
        <nav aria-label="Navegación de registro" className="flex flex-wrap items-center justify-between gap-4">
          <div className="register-mobile-brand register-brand"><WordmarkLink /></div>
          <Link to="/" className="ml-auto inline-flex min-h-touch items-center gap-2 rounded-control text-small text-text focus-ring hover:underline">
            <ArrowLeft {...iconSm} aria-hidden />Volver al inicio
          </Link>
        </nav>
        <div className="register-content">
        {received ? (
          <RequestReceived body={received} />
        ) : (
        <>
        <p className="mb-4 flex items-center gap-3 text-label text-text-muted">
          <span aria-hidden className="size-2 shrink-0 rounded-pill bg-brand" />SOLICITA TU CUENTA
        </p>
        <h1 className="register-title text-title text-text">Solicita tu cuenta</h1>
        <p className="mt-3 text-body text-text-muted">
          Cuéntanos de tu serviteca y de quien la administra. Revisamos cada solicitud y, si la aprobamos, te
          enviamos un correo para activar la cuenta y crear tu usuario.
        </p>

        <form ref={formRef} onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-6" aria-label="Solicitar cuenta" aria-busy={mutation.isPending}>
          {alert && (
            <Alert tone="error" title={alert.title}>
              {alert.body}
            </Alert>
          )}

          <fieldset className="min-w-0 border-t border-border pt-6 flex flex-col gap-4">
            <legend className={`mb-4 ${legendClass}`}>1. Datos de la serviteca</legend>
            <TextField
              label="Nombre comercial"
              name="businessName"
              autoComplete="organization"
              value={values.businessName}
              error={fieldError('businessName')}
              onChange={(event) => changeBusinessName(event.target.value)}
              onBlur={() => blur('businessName')}
            />
            <div className="register-fields grid gap-4">
              <TextField
                label="NIT"
                name="nit"
                inputMode="numeric"
                hint="Por ejemplo, 900123456-7"
                value={values.nit}
                error={fieldError('nit')}
                onChange={(event) => set('nit', event.target.value)}
                onBlur={() => blur('nit')}
              />
              <TextField
                label="Teléfono"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={values.phone}
                error={fieldError('phone')}
                onChange={(event) => set('phone', event.target.value)}
                onBlur={() => blur('phone')}
              />
            </div>
            <TextField
              ref={slugRef}
              label={GLOSSARY.tenantCode}
              name="slug"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              hint="El nombre corto con el que tu equipo inicia sesión. Solo minúsculas, números y guiones."
              value={values.slug}
              error={slugError ?? fieldError('slug')}
              onChange={(event) => changeSlug(event.target.value)}
              onBlur={() => blur('slug')}
            />
          </fieldset>

          <fieldset className="min-w-0 border-t border-border pt-6 flex flex-col gap-4">
            <legend className={`mb-4 ${legendClass}`}>2. Administrador</legend>
            <div className="register-fields grid gap-4">
              <TextField
                label="Nombre completo"
                name="adminFullName"
                autoComplete="name"
                value={values.adminFullName}
                error={fieldError('adminFullName')}
                onChange={(event) => set('adminFullName', event.target.value)}
                onBlur={() => blur('adminFullName')}
              />
              <TextField
                label="Correo"
                name="adminEmail"
                type="email"
                autoComplete="email"
                hint="Aquí te escribimos para activar la cuenta."
                value={values.adminEmail}
                error={fieldError('adminEmail')}
                onChange={(event) => set('adminEmail', event.target.value)}
                onBlur={() => blur('adminEmail')}
              />
            </div>
          </fieldset>

          <Alert tone="info" title="Al activar la cuenta">
            Creas tu usuario y tu contraseña, y dejamos listas la Caja General, las categorías base (Llantas,
            Lubricantes y Baterías), el IVA del 19 % y el cliente Consumidor final.
          </Alert>

          <div className="flex flex-col gap-1">
            <div className="flex items-start gap-3">
              <input
                id="acceptTerms"
                type="checkbox"
                checked={values.acceptTerms}
                aria-invalid={fieldError('acceptTerms') ? true : undefined}
                aria-describedby={fieldError('acceptTerms') ? 'acceptTerms-message' : undefined}
                onChange={(event) => set('acceptTerms', event.target.checked)}
                onBlur={() => blur('acceptTerms')}
                className="mt-4 size-4 shrink-0 accent-brand focus-ring"
              />
              <label htmlFor="acceptTerms" className="min-h-touch flex-1 cursor-pointer py-3 text-small text-text">
                Acepto la{' '}
                <Link to={PRIVACY_POLICY_PATH} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {GLOSSARY.privacyPolicy}
                </Link>
                {' '}y los{' '}
                <Link to={TERMS_PATH} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {GLOSSARY.terms}
                </Link>
              </label>
            </div>
            {fieldError('acceptTerms') && (
              <p id="acceptTerms-message" aria-live="polite" className="text-small text-error">
                {fieldError('acceptTerms')}
              </p>
            )}
          </div>

          <ErrorSummary count={submitted ? Object.keys(errors).length + (slugError ? 1 : 0) : 0} />
          <div className="flex flex-col gap-3">
            <Button type="submit" className="register-submit relative w-full" disabled={mutation.isPending} aria-busy={mutation.isPending || undefined}>
              <span role="status">{mutation.isPending ? 'Enviando solicitud…' : 'Enviar solicitud'}</span>
              <ArrowRight {...iconSm} aria-hidden className="absolute right-5" />
            </Button>
          </div>
        </form>
        </>
        )}

        <p className="mt-6 border-t border-border pt-6 text-center text-small text-text-muted">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className={linkClass}>
            Iniciar sesión
          </Link>
        </p>
        </div>
        <footer className="text-right text-small text-text-muted">
          <p className="mb-1">ServiBox · Colombia</p>
          <LegalLinks />
        </footer>
      </div>
    </main>
  )
}

/** Acuse tras el 202: que sigue, sin prometer plazos ni la llegada del correo. */
function RequestReceived({ body }: { body: RegistrationRequestBody }) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => heading.current?.focus(), [])

  return (
    <section aria-labelledby="request-received-title">
      <p className="mb-4 flex items-center gap-3 text-label text-text-muted">
        <span aria-hidden className="size-2 shrink-0 rounded-pill bg-brand" />SOLICITUD ENVIADA
      </p>
      <h1 id="request-received-title" ref={heading} tabIndex={-1} className="register-title text-title text-text focus-ring rounded-control">
        Recibimos tu solicitud
      </h1>
      <div className="mt-6 flex flex-col gap-4 text-body text-text">
        <p>
          Vamos a revisar los datos de <strong className="font-semibold">{body.businessName}</strong>. Si la aprobamos,
          te enviaremos a <strong className="font-semibold">{body.adminEmail}</strong> un correo con el enlace para
          activar la cuenta y crear tu usuario.
        </p>
        <p className="text-text-muted">
          Si no lo ves en tu bandeja de entrada, revisa la carpeta de spam o de correo no deseado. ¿Tienes preguntas?
          Escríbenos a{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>{SUPPORT_EMAIL}</a>.
        </p>
      </div>
    </section>
  )
}
