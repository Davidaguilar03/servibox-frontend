import { useId, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { iconSm } from './icons'

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string
  options: Array<{ value: string; label: string }>
  hint?: string
  error?: string
  inline?: boolean
}

/** Selector nativo con etiqueta, con el aspecto de los campos del manual. */
export function SelectField({ label, options, hint, error, inline = false, ...props }: SelectFieldProps) {
  const id = useId()
  const message = error ?? hint
  const hintId = message ? `${id}-hint` : undefined
  return (
    <div className={inline ? 'flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2' : 'flex flex-col gap-2'}>
      <label htmlFor={id} className="text-label text-text">
        {label}
      </label>
      <div className={inline ? 'relative w-40 max-w-full' : 'relative'}>
        <select
          id={id}
          aria-describedby={hintId}
          aria-invalid={error ? true : undefined}
          className={`h-control-touch lg:h-control w-full appearance-none rounded-control border bg-surface pr-9 pl-3 text-body text-text transition-colors duration-(--duration-fast) focus-ring-field disabled:bg-neutral-200 disabled:text-text-muted ${
            error ? 'border-error' : 'border-border-control'
          }`}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          {...iconSm}
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-text-muted"
        />
      </div>
      {message && (
        <p id={hintId} aria-live={error ? 'polite' : undefined} className={`text-small ${error ? 'text-error' : 'text-text-muted'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
