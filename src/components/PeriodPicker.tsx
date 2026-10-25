import type { InputHTMLAttributes } from 'react'
import { rangeLabel, type DateRange, type PeriodKey } from '../lib/period'
import { SelectField } from './SelectField'
import { TextField } from './TextField'

type DateFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'>

interface PeriodPickerProps<T extends PeriodKey> {
  /** Periodos de la pantalla, con su texto, en el orden en que se muestran. */
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
  /** Rango activo para la etiqueta; null si no hay (Todas, o Personalizado incompleto). */
  range: DateRange | null
  /** Solo si la pantalla ofrece Personalizado: los campos Desde y Hasta y sus errores. */
  custom?: {
    desde: DateFieldProps
    hasta: DateFieldProps
    errors: { desde?: string; hasta?: string }
  }
  label?: string
}

/**
 * Selector de periodo unico de los listados y reportes: un selector nativo con los periodos de
 * la pantalla, el rango visible debajo ("1 oct. 2026 al 24 oct. 2026") y, con Personalizado,
 * los campos Desde y Hasta. El calculo del rango (zona del negocio) vive en `lib/period.ts`.
 */
export function PeriodPicker<T extends PeriodKey>({ options, value, onChange, range, custom, label = 'Período' }: PeriodPickerProps<T>) {
  const showCustom = value === 'personalizado' && custom
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <SelectField
        label={label}
        options={options}
        value={value}
        hint={range ? rangeLabel(range) : undefined}
        onChange={(event) => onChange(event.target.value as T)}
      />
      {showCustom && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <TextField label="Desde" type="date" {...custom.desde} error={custom.errors.desde} />
          <TextField label="Hasta" type="date" {...custom.hasta} error={custom.errors.hasta} />
        </div>
      )}
    </div>
  )
}
