import { useId, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string
  options: Array<{ value: string; label: string }>
  hint?: string
  error?: string
}

/** Selector nativo con etiqueta, con el aspecto de los campos del manual. */
export function SelectField({ label, options, hint, error, ...props }: SelectFieldProps) {
  const id = useId()
  const message = error ?? hint
  const hintId = message ? `${id}-hint` : undefined
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-small font-medium text-text">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          aria-describedby={hintId}
          aria-invalid={error ? true : undefined}
          className={`h-control w-full appearance-none rounded-control border bg-surface pr-9 pl-3 text-body text-text outline-none transition-[border-color,box-shadow] duration-(--duration-fast) focus:ring-3 disabled:bg-neutral-200 disabled:text-text-muted ${
            error ? 'border-error focus:ring-error/20' : 'border-border focus:border-brand focus:ring-brand/20'
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
          size={16}
          strokeWidth={1.5}
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
