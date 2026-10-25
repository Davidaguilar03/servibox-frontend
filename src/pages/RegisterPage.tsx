import { useRef, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { userMessage } from '../api/errorMessages'
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
import { showToast } from '../components/toast'
import { ApiError } from '../lib/api'
import { revealErrors } from '../lib/formErrors'
import { usePageMeta } from '../lib/usePageMeta'

const linkClass =
  'rounded-control font-semibold text-brand-ink hover:underline focus-ring'

const legendClass = 'text-label text-text-muted'

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
        setSlugConflict({ slug: request.slug, message: userMessage(error) })
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
  const alert =
    error instanceof ApiError && error.status === 409
      ? null
      : error instanceof ApiError && error.status === 403
        ? {
            title: 'El registro no está disponible',
            body: 'Por ahora no estamos creando servitecas nuevas. Intenta de nuevo más tarde.',
          }
        : error
          ? { title: 'No pudimos crear tu serviteca', body: userMessage(error) }
          : null

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-12 sm:px-6">
      <div className="mb-8">
        <WordmarkLink />
      </div>
      <div className="w-full max-w-xl rounded-surface border border-border bg-surface p-6 sm:p-8">
        <h1 className="text-title text-text">Crea tu serviteca</h1>
        <p className="mt-1 text-small text-text-muted">
          Llena los datos del negocio y de quien lo administra. La información de cada serviteca se guarda por separado.
        </p>

        <form ref={formRef} onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-6">
          {alert && (
            <Alert tone="error" title={alert.title}>
              {alert.body}
            </Alert>
          )}

          <fieldset className="flex flex-col gap-4">
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
            <div className="grid gap-4 sm:grid-cols-2">
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
              label="Código de tu serviteca"
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

          <fieldset className="flex flex-col gap-4">
            <legend className={`mb-4 ${legendClass}`}>2. Administrador</legend>
            <div className="grid gap-4 sm:grid-cols-2">
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
          <Button type="submit" className="w-full" disabled={mutation.isPending} aria-busy={mutation.isPending || undefined}>
            {mutation.isPending ? 'Creando serviteca…' : 'Crear serviteca'}
          </Button>
        </form>

        <p className="mt-6 border-t border-border pt-6 text-center text-small text-text-muted">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className={linkClass}>
            Iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  )
}
