import type { InputHTMLAttributes, ReactNode } from 'react'
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
  /** Inline reserva una fila horizontal para fechas segun el ancho real del contenedor. */
  layout?: 'stacked' | 'inline' | 'toolbar' | 'form'
  action?: ReactNode
}

/**
 * Selector de periodo unico de los listados y reportes: un selector nativo con los periodos de
 * la pantalla, el rango visible debajo ("1 oct. 2026 al 24 oct. 2026") y, con Personalizado,
 * los campos Desde y Hasta. El calculo del rango (zona del negocio) vive en `lib/period.ts`.
 */
export function PeriodPicker<T extends PeriodKey>({ options, value, onChange, range, custom, label = 'Período', layout = 'stacked', action }: PeriodPickerProps<T>) {
  const showCustom = value === 'personalizado' && custom
  const inline = layout === 'inline'
  const toolbar = layout === 'toolbar'
  return (
    <div className={inline && showCustom ? '@container min-w-0' : 'min-w-0'}>
      <div className={inline || toolbar ? 'flex flex-wrap items-start gap-4' : 'flex min-w-0 flex-col gap-4'}>
        <div className={inline ? 'w-48 max-w-full shrink-0' : toolbar ? 'min-w-0' : ''}>
          <SelectField
            inline={toolbar}
            label={label}
            options={options}
            value={value}
            hint={range ? rangeLabel(range) : undefined}
            onChange={(event) => onChange(event.target.value as T)}
          />
        </div>
        {showCustom && (
          <div className={inline ? 'order-2 grid min-w-0 basis-full grid-cols-[repeat(auto-fit,minmax(min(100%,144px),1fr))] gap-4 @min-[720px]:order-1 @min-[720px]:flex-1 @min-[720px]:basis-80' : toolbar || layout === 'form' ? 'grid min-w-0 basis-full grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))] gap-4' : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-1'}>
            <TextField label="Desde" type="date" {...custom.desde} error={custom.errors.desde} />
            <TextField label="Hasta" type="date" {...custom.hasta} error={custom.errors.hasta} />
          </div>
        )}
        {action && <div className="order-1 shrink-0 pt-6 @min-[720px]:order-2">{action}</div>}
      </div>
    </div>
  )
}
