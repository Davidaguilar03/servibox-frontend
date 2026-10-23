import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { normalizeNit } from '../auth/registerForm'
import { updateTenantName } from '../auth/session'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { TextField } from '../components/TextField'
import { UnsavedChangesGuard } from '../components/UnsavedChangesGuard'
import { ErrorState, Skeleton } from '../components/states'
import { showToast } from '../components/toast'
import { ApiError } from '../lib/api'
import { errorMessage } from '../lib/errorMessage'
import { TENANT_KEY, fetchTenantProfile, updateTenantProfile, type TenantProfile } from './settingsApi'
import {
  buildTenantRequest,
  tenantFormFrom,
  validateTenantForm,
  type TenantFormValues,
} from './settingsForms'

export const READ_ONLY_NOTICE = 'Solo un administrador puede editar estos datos.'

const card = 'rounded-card border border-border bg-surface p-6 shadow-card'

interface TabProps {
  readOnly: boolean
  onDirtyChange: (dirty: boolean) => void
}

/** Datos de la serviteca: carga el perfil y monta el formulario con esos valores. */
export function TenantProfileTab({ readOnly, onDirtyChange }: TabProps) {
  const profile = useQuery({ queryKey: TENANT_KEY, queryFn: fetchTenantProfile })

  if (profile.isError) {
    return (
      <section className={card}>
        <ErrorState message="No pudimos cargar los datos de la serviteca." onRetry={() => void profile.refetch()} />
      </section>
    )
  }
  if (profile.isPending) {
    return (
      <section className={`${card} flex flex-col gap-4`} aria-busy>
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-control w-full" />
        ))}
      </section>
    )
  }
  return <TenantForm profile={profile.data} readOnly={readOnly} onDirtyChange={onDirtyChange} />
}

function TenantForm({ profile, readOnly, onDirtyChange }: TabProps & { profile: TenantProfile }) {
  const queryClient = useQueryClient()
  const [initial, setInitial] = useState(() => tenantFormFrom(profile))
  const [values, setValues] = useState(initial)
  const [touched, setTouched] = useState<Set<keyof TenantFormValues>>(() => new Set())
  const [forbidden, setForbidden] = useState<string | null>(null)
  const sending = useRef(false)
  const allowLeave = useRef(false)

  const locked = readOnly || forbidden !== null
  const errors = validateTenantForm(values)
  const shown = (field: keyof TenantFormValues) => (touched.has(field) ? errors[field] : undefined)
  const dirty = !locked && JSON.stringify(values) !== JSON.stringify(initial)

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])

  const save = useMutation({
    mutationFn: () => updateTenantProfile(buildTenantRequest(values)),
    onSuccess: (saved) => {
      const next = tenantFormFrom(saved)
      setInitial(next)
      setValues(next)
      setTouched(new Set())
      updateTenantName(saved.name)
      queryClient.setQueryData(TENANT_KEY, saved)
      // El nombre del tenant sale en el panel y en los reportes.
      void queryClient.invalidateQueries({ queryKey: ['kpis'] })
      showToast('Datos guardados')
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 403) setForbidden(error.message)
    },
    onSettled: () => {
      sending.current = false
    },
  })

  const change = (field: keyof TenantFormValues) => (value: string) =>
    setValues((current) => ({ ...current, [field]: value }))
  const touch = (field: keyof TenantFormValues) => () => setTouched((current) => new Set(current).add(field))

  function submit() {
    setTouched(new Set<keyof TenantFormValues>(['name', 'nit', 'phone']))
    if (locked || !dirty || Object.keys(errors).length > 0 || sending.current) return
    sending.current = true
    save.mutate()
  }

  const showGeneralError = save.isError && !forbidden

  return (
    <section className={card} aria-labelledby="datos-titulo">
      <h2 id="datos-titulo" className="text-h3 text-text">
        Datos de la serviteca
      </h2>
      <form
        noValidate
        className="mt-4 flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        {forbidden && (
          <Alert tone="error" title="No pudimos guardar los datos">
            {forbidden}
          </Alert>
        )}
        {readOnly && !forbidden && <Alert tone="info" title={READ_ONLY_NOTICE} />}
        {showGeneralError && (
          <Alert tone="error" title="No pudimos guardar los datos">
            {errorMessage(save.error)}
          </Alert>
        )}
        <TextField
          label="Nombre comercial"
          value={values.name}
          onChange={(event) => change('name')(event.target.value)}
          onBlur={touch('name')}
          error={shown('name')}
          disabled={locked}
          autoComplete="organization"
          required
        />
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="NIT (opcional)"
            inputMode="numeric"
            value={values.nit}
            onChange={(event) => change('nit')(event.target.value)}
            onBlur={() => {
              // Puntos y espacios se quitan al salir, como se enviaran.
              change('nit')(normalizeNit(values.nit))
              touch('nit')()
            }}
            error={shown('nit')}
            hint="Puedes escribirlo con puntos. Por ejemplo, 900.123.456-7."
            disabled={locked}
          />
          <TextField
            label="Teléfono (opcional)"
            type="tel"
            autoComplete="tel"
            value={values.phone}
            onChange={(event) => change('phone')(event.target.value)}
            onBlur={touch('phone')}
            error={shown('phone')}
            disabled={locked}
          />
        </div>
        <TextField
          label="Identificador de la serviteca"
          value={profile.slug}
          readOnly
          hint="Es lo que tu equipo escribe en “Serviteca” para iniciar sesión. No se puede cambiar."
        />
        {!locked && (
          <div className="flex justify-end">
            <Button type="submit" disabled={!dirty || Object.keys(errors).length > 0 || save.isPending}>
              {save.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        )}
      </form>
      <UnsavedChangesGuard
        dirty={dirty}
        allowLeave={allowLeave}
        message="Si sales ahora, se pierden los cambios que no guardaste en los datos de la serviteca."
      />
    </section>
  )
}
