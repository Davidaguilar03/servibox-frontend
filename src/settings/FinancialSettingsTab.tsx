import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { userMessage } from '../api/errorMessages'
import { useReportedError } from '../api/reportError'
import { Alert } from '../components/Alert'
import { ErrorSummary } from '../components/ErrorSummary'
import { Button } from '../components/Button'
import { TextField } from '../components/TextField'
import { UnsavedChangesGuard } from '../components/UnsavedChangesGuard'
import { ErrorState, Skeleton } from '../components/states'
import { showToast } from '../components/toast'
import { CATEGORIES_KEY, PRODUCTS_KEY, fetchInventoryCategories } from '../inventory/inventoryApi'
import { revealErrors } from '../lib/formErrors'
import { ApiError } from '../lib/api'
import { FINANCIAL_SETTINGS_KEY, fetchFinancialSettings, updateFinancialSettings, type FinancialSettings } from './settingsApi'
import {
  buildFinancialRequest,
  categoriesAtCost,
  financialFormFrom,
  isUnconfigured,
  validateFinancialForm,
  type FinancialField,
  type FinancialFormValues,
} from './settingsForms'
import { READ_ONLY_NOTICE } from './TenantProfileTab'

const card = 'rounded-surface border border-border bg-surface p-6'

// Rotulos y ejemplos de la seccion Deducibles de Autollantas.
const fieldTexts: Record<FinancialField, { label: string; hint: string }> = {
  expensesRate: { label: 'Gastos (%)', hint: 'Gastos del negocio sobre la venta. Por ejemplo, 34,3.' },
  dianRate: {
    label: 'Impuesto de renta deducible (%)',
    hint: 'Se usa en el cálculo del precio sugerido; no es facturación electrónica.',
  },
  icaRate: { label: 'ICA (por mil)', hint: 'Industria y comercio, en por mil. Por ejemplo, 8,2.' },
  cardCommissionRate: {
    label: 'Comisión de tarjeta (%)',
    hint: 'Lo que cobra el datáfono por cada pago con tarjeta. Por ejemplo, 2,5. Se guarda para uso futuro: todavía no se aplica a las ventas ni a los reportes.',
  },
}

interface TabProps {
  readOnly: boolean
  onDirtyChange: (dirty: boolean) => void
}

/** Configuracion financiera: carga la configuracion y monta el formulario con esos valores. */
export function FinancialSettingsTab({ readOnly, onDirtyChange }: TabProps) {
  const settings = useQuery({ queryKey: FINANCIAL_SETTINGS_KEY, queryFn: fetchFinancialSettings })

  if (settings.isError) {
    return (
      <section className={card}>
        <ErrorState message="No pudimos cargar la configuración financiera." onRetry={() => void settings.refetch()} />
      </section>
    )
  }
  if (settings.isPending) {
    return (
      <section className={`${card} grid gap-4 md:grid-cols-2`} aria-busy>
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-control w-full" />
        ))}
      </section>
    )
  }
  return <FinancialForm settings={settings.data} readOnly={readOnly} onDirtyChange={onDirtyChange} />
}

function FinancialForm({ settings, readOnly, onDirtyChange }: TabProps & { settings: FinancialSettings }) {
  const queryClient = useQueryClient()
  const categories = useQuery({ queryKey: CATEGORIES_KEY, queryFn: fetchInventoryCategories })
  const [initial, setInitial] = useState(() => financialFormFrom(settings))
  const [values, setValues] = useState(initial)
  const [touched, setTouched] = useState<Set<FinancialField>>(() => new Set())
  const [submitted, setSubmitted] = useState(false)
  const [forbidden, setForbidden] = useState<string | null>(null)
  const sending = useRef(false)
  const allowLeave = useRef(false)

  const locked = readOnly || forbidden !== null
  const errors = validateFinancialForm(values)
  const valid = Object.keys(errors).length === 0
  const shown = (field: FinancialField) => (touched.has(field) ? errors[field] : undefined)
  const dirty = !locked && JSON.stringify(values) !== JSON.stringify(initial)
  const atCost = valid && categories.data ? categoriesAtCost(buildFinancialRequest(values), categories.data) : []

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])

  const save = useMutation({
    mutationFn: () => updateFinancialSettings(buildFinancialRequest(values)),
    onSuccess: (saved) => {
      const next = financialFormFrom(saved)
      setInitial(next)
      setValues(next)
      setTouched(new Set())
      queryClient.setQueryData(FINANCIAL_SETTINGS_KEY, saved)
      void queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY })
      void queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY })
      showToast('Configuración guardada. Se recalcularon los precios sugeridos.')
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 403) setForbidden(userMessage(error))
    },
    onSettled: () => {
      sending.current = false
    },
  })
  const saveError = useReportedError(save.error)

  const change = (field: FinancialField) => (value: string) => setValues((current) => ({ ...current, [field]: value }))
  const touch = (field: FinancialField) => () => setTouched((current) => new Set(current).add(field))

  function submit() {
    if (locked || !dirty || sending.current) return
    if (!valid) {
      revealErrors(() => {
        setSubmitted(true)
        setTouched(new Set(Object.keys(values) as FinancialField[]))
      }, document.getElementById('configuracion-financiera'))
      return
    }
    sending.current = true
    save.mutate()
  }

  const fields = Object.keys(fieldTexts) as Array<keyof FinancialFormValues>

  return (
    <section className={card} aria-labelledby="financiera-titulo">
      <h2 id="financiera-titulo" className="text-section text-text">
        Configuración financiera
      </h2>
      <p className="mt-1 text-small text-text-muted">
        Estos valores calculan el precio sugerido de cada producto junto con el margen de su categoría.
      </p>
      <form
        id="configuracion-financiera"
        noValidate
        className="mt-4 flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        {forbidden && (
          <Alert tone="error" title="No pudimos guardar la configuración">
            {forbidden}
          </Alert>
        )}
        {readOnly && !forbidden && <Alert tone="info" title={READ_ONLY_NOTICE} />}
        {isUnconfigured(settings) && <Alert tone="info" title="Aún no has configurado estos valores" />}
        {saveError && save.isError && !forbidden && (
          <Alert tone="error" title="No pudimos guardar la configuración">
            {saveError}
          </Alert>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map((field) => (
            <TextField
              key={field}
              label={fieldTexts[field].label}
              inputMode="decimal"
              value={values[field]}
              onChange={(event) => change(field)(event.target.value)}
              onBlur={touch(field)}
              error={shown(field)}
              hint={fieldTexts[field].hint}
              disabled={locked}
            />
          ))}
        </div>
        {atCost.length > 0 && (
          <Alert tone="warning" title="Con estos valores el precio sugerido de algunas categorías queda igual al costo">
            Gastos, impuesto de renta deducible, ICA y el margen de la categoría no dejan espacio para un precio mayor:{' '}
            {atCost.map((category) => category.name).join(', ')}.
          </Alert>
        )}
        <p className="text-small text-text">Al guardar se recalcula el precio sugerido de todos los productos.</p>
        {!locked && (
          <div className="flex justify-end">
            <ErrorSummary count={submitted ? Object.keys(errors).length : 0} />
            {/* Edicion: sin cambios no hay nada que guardar (la unica excepcion de la regla de Guardar). */}
            <Button type="submit" disabled={!dirty || save.isPending} aria-busy={save.isPending || undefined}>
              {save.isPending ? 'Guardando…' : 'Guardar configuración'}
            </Button>
          </div>
        )}
      </form>
      <UnsavedChangesGuard
        dirty={dirty}
        allowLeave={allowLeave}
        message="Si sales ahora, se pierden los cambios que no guardaste en la configuración financiera."
      />
    </section>
  )
}
