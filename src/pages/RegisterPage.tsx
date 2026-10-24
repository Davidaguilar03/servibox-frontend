import { useRef, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router'
import { useMutation } from '@tanstack/react-query'
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
import { TextField } from '../components/TextField'
import { showToast } from '../components/toast'
import { ApiError } from '../lib/api'
import { errorMessage } from '../lib/errorMessage'
import { usePageMeta } from '../lib/usePageMeta'

const linkClass =
  'rounded-tag font-medium text-brand-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

const legendClass = 'font-mono text-label uppercase text-text-muted'

/** El 409 de un identificador repetido, atado al slug que lo provoco. */
interface SlugConflict {
  slug: string
  message: string
}

export function RegisterPage() {
  usePageMeta(
    'Crea tu serviteca · ServiBox',
    'Registra tu serviteca en ServiBox y empieza hoy. Dejamos lista la caja, las categorías base y el IVA.',
  )
  const session = useSession()
  const [values, setValues] = useState<RegisterValues>(EMPTY_REGISTER_VALUES)
  const [touched, setTouched] = useState<Partial<Record<RegisterField, boolean>>>({})
  const [slugEdited, setSlugEdited] = useState(false)
  const [slugConflict, setSlugConflict] = useState<SlugConflict | null>(null)
  const slugRef = useRef<HTMLInputElement>(null)
  // Evita un segundo envio antes de que isPending llegue al boton.
  const submitting = useRef(false)

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: (response) => {
      rememberTenantSlug(response.tenant.slug)
      showToast('Serviteca creada. Bienvenido a ServiBox.')
      startSession(response)
    },
    onError: (error, request) => {
      if (error instanceof ApiError && error.status === 409) {
        setSlugConflict({ slug: request.slug, message: error.message })
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
    if (!valid || submitting.current) return
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
          ? { title: 'No pudimos crear tu serviteca', body: errorMessage(error) }
          : null

  return (
    <div className="flex min-h-screen bg-canvas">
      <section className="relative hidden flex-col overflow-hidden bg-nav p-16 lg:flex lg:w-1/2 xl:w-5/12">
        <div
          className="absolute inset-0 bg-brand/20 [clip-path:polygon(72%_0,100%_0,100%_100%,34%_100%)]"
          aria-hidden
        />
        <div className="relative">
          <WordmarkLink onDark />
        </div>
        <div className="relative my-auto max-w-md">
          <p className="font-mono text-label uppercase text-text-subtle">Servitecas y talleres</p>
          <p className="mt-4 font-display text-display text-text-inverse">Tu serviteca lista en minutos.</p>
          <p className="mt-6 text-body text-text-subtle">
            Registra una venta y el inventario y la cuenta se actualizan solos. Sin archivos separados ni
            conciliación a fin de mes.
          </p>
        </div>
        <p className="relative text-small text-text-subtle">ServiBox · Plataforma web para servitecas · 2026</p>
      </section>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 lg:hidden">
          <WordmarkLink />
        </div>
        <div className="w-full max-w-xl rounded-card border border-border bg-surface p-6 shadow-card sm:p-8">
          <h1 className="text-h2 text-text">Crea tu serviteca</h1>
          <p className="mt-1 text-small text-text-muted">La información de tu serviteca queda aislada de las demás.</p>

          <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-6">
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
                label="Identificador de la serviteca"
                name="slug"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                hint="Tu equipo lo escribirá en “Serviteca” para iniciar sesión. Solo minúsculas, números y guiones."
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

            <Alert tone="info" title="Dejamos todo listo">
              Creamos la Caja General, las categorías base (Llantas, Lubricantes y Baterías) y el IVA del 19%.
            </Alert>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-start gap-3">
                <input
                  id="acceptTerms"
                  type="checkbox"
                  checked={values.acceptTerms}
                  aria-invalid={fieldError('acceptTerms') ? true : undefined}
                  aria-describedby={fieldError('acceptTerms') ? 'acceptTerms-message' : undefined}
                  onChange={(event) => set('acceptTerms', event.target.checked)}
                  onBlur={() => blur('acceptTerms')}
                  className="mt-0.5 size-4 shrink-0 accent-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                />
                <label htmlFor="acceptTerms" className="text-small text-text">
                  Acepto los{' '}
                  <Link to="/terminos" target="_blank" rel="noopener" className={linkClass}>
                    Términos y condiciones
                  </Link>
                </label>
              </div>
              {fieldError('acceptTerms') && (
                <p id="acceptTerms-message" aria-live="polite" className="text-small text-error">
                  {fieldError('acceptTerms')}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={!valid || Boolean(slugError) || mutation.isPending}>
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
    </div>
  )
}
