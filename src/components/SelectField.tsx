import { useId, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string
  options: Array<{ value: string; label: string }>
}

/** Selector nativo con etiqueta, con el aspecto de los campos del manual. */
export function SelectField({ label, options, ...props }: SelectFieldProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-small font-medium text-text">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          className="h-control w-full appearance-none rounded-control border border-border bg-surface pr-9 pl-3 text-body text-text outline-none transition-[border-color,box-shadow] duration-(--duration-fast) focus:border-brand focus:ring-3 focus:ring-brand/20"
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
    </div>
  )
}
