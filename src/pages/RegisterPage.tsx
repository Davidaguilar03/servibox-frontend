import { useRef, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { MESSAGES } from '../api/errorMessages'
import { reportError } from '../api/reportError'
import workshopPhoto from '../assets/register/register-workshop-v1.webp'
import { register, startSession } from '../auth/authApi'
import {
  EMPTY_REGISTER_VALUES,
  normalizeSlugInput,
  suggestSlug,
  toRegisterRequest,
  validateRegister,
  type RegisterField,
  type RegisterValues,
} from '../auth/registerForm'
import { rememberTenantSlug, useSession } from '../auth/session'
import { WordmarkLink } from '../brand/WordmarkLink'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { ErrorSummary } from '../components/ErrorSummary'
import { TextField } from '../components/TextField'
import { iconSm } from '../components/icons'
import { showToast } from '../components/toast'
import { GLOSSARY } from '../copy/glossary'
import { ApiError } from '../lib/api'
import { revealErrors } from '../lib/formErrors'
import { usePageMeta } from '../lib/usePageMeta'
import './RegisterPage.css'

const linkClass =
  'rounded-control font-semibold text-brand-ink hover:underline focus-ring'

const legendClass = 'text-body font-semibold text-text'

/** Lo que crea el backend al registrar (TenantRegistrationService), sin el administrador. */
export const REGISTER_SUCCESS =
  'Serviteca creada. Dejamos listas tu Caja General, las categorías base y el IVA del 19 %. Solo falta configurar tus márgenes para el precio sugerido.'

/** El 409 de un identificador repetido, atado al slug que lo provoco. */
interface SlugConflict {
  slug: string
  message: string
}

export function RegisterPage() {
  usePageMeta(
    'Crear cuenta | ServiBox',
    'Registra tu serviteca en ServiBox. Dejamos listas la Caja General, las categorías base y el IVA del 19 %.',
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

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: (response) => {
      rememberTenantSlug(response.tenant.slug)
      showToast(REGISTER_SUCCESS)
      startSession(response)
    },
    onError: (error, request) => {
      if (error instanceof ApiError && error.status === 409) {
        setSlugConflict({ slug: request.slug, message: reportError(error, { inlineOnly: true })! })
        slugRef.current?.focus()
      }
    },
    onSettled: () => {
      submitting.current = false
    },
  })

  // Al guardar la sesion esta misma redireccion lleva a /inicio con replace.
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
    if (!valid || slugError) {
      // Guardar no se deshabilita por errores: al enviar se muestran todos y el foco va al primero.
      revealErrors(() => {
        setSubmitted(true)
        setTouched(Object.fromEntries(Object.keys(values).map((field) => [field, true])))
      }, formRef.current)
      return
    }
    submitting.current = true
    mutation.mutate(toRegisterRequest(values))
  }

  const error = mutation.error
  const reportedError = reportError(error, { inlineOnly: true })
  const errorMessage = reportedError === MESSAGES.network
    ? 'No pudimos completar la acción. Revisa tu conexión e inténtalo de nuevo.'
    : reportedError
  const alert =
    error instanceof ApiError && error.status === 409
      ? null
      : error instanceof ApiError && error.status === 403
        ? {
            title: 'El registro no está disponible',
            body: 'Por ahora no estamos creando servitecas nuevas. Intenta de nuevo más tarde.',
          }
        : error
          ? { title: 'No pudimos crear tu serviteca', body: errorMessage }
          : null

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
        <p className="mb-4 flex items-center gap-3 text-label text-text-muted">
          <span aria-hidden className="size-2 shrink-0 rounded-pill bg-brand" />CREA TU SERVITECA
        </p>
        <h1 className="register-title text-title text-text">Crea tu serviteca</h1>
        <p className="mt-3 text-body text-text-muted">
          Llena los datos del negocio y de quien lo administra. La información de cada serviteca se guarda por separado.
        </p>

        <form ref={formRef} onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-6" aria-label="Crear serviteca" aria-busy={mutation.isPending}>
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
                value={values.adminEmail}
                error={fieldError('adminEmail')}
                onChange={(event) => set('adminEmail', event.target.value)}
                onBlur={() => blur('adminEmail')}
              />
              <TextField
                label="Usuario"
                name="adminUsername"
                autoComplete="username"
                autoCapitalize="none"
                value={values.adminUsername}
                error={fieldError('adminUsername')}
                onChange={(event) => set('adminUsername', event.target.value)}
                onBlur={() => blur('adminUsername')}
              />
              <TextField
                label="Contraseña"
                name="password"
                type="password"
                autoComplete="new-password"
                hint="Mínimo 8 caracteres."
                value={values.password}
                error={fieldError('password')}
                onChange={(event) => set('password', event.target.value)}
                onBlur={() => blur('password')}
              />
            </div>
          </fieldset>

          <Alert tone="info" title="Al crear la cuenta">
            Dejamos listas la Caja General, las categorías base (Llantas, Lubricantes y Baterías), el IVA del 19 % y
            el cliente Consumidor final.
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
                Acepto los{' '}
                <Link to="/terminos" target="_blank" rel="noopener" className={linkClass}>
                  términos de uso y el tratamiento de datos
                </Link>
                .
              </label>
            </div>
            {fieldError('acceptTerms') && (
              <p id="acceptTerms-message" aria-live="polite" className="text-small text-error">
                {fieldError('acceptTerms')}
              </p>
            )}
          </div>

          <ErrorSummary count={submitted ? Object.keys(errors).length + (slugError ? 1 : 0) : 0} />
          <Button type="submit" className="register-submit relative w-full" disabled={mutation.isPending} aria-busy={mutation.isPending || undefined}>
            <span role="status">{mutation.isPending ? 'Creando serviteca…' : 'Crear serviteca'}</span>
            <ArrowRight {...iconSm} aria-hidden className="absolute right-5" />
          </Button>
        </form>

        <p className="mt-6 border-t border-border pt-6 text-center text-small text-text-muted">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className={linkClass}>
            Iniciar sesión
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
