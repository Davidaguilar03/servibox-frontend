import { useId, type InputHTMLAttributes } from 'react'
import { Search } from 'lucide-react'
import { iconSm } from './icons'

interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> {
  label: string
}

/** Campo de busqueda con etiqueta y el icono de lupa. */
export function SearchField({ label, ...props }: SearchFieldProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-label text-text">
        {label}
      </label>
      <div className="relative">
        <Search
          {...iconSm}
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-subtle"
        />
        <input
          id={id}
          type="search"
          className="h-control-touch lg:h-control w-full rounded-control border border-border-control bg-surface pr-3 pl-9 text-body text-text transition-colors duration-(--duration-fast) placeholder:text-text-muted focus-ring-field"
          {...props}
        />
      </div>
    </div>
  )
}
