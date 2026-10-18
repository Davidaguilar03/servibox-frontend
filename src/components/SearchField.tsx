import { useId, type InputHTMLAttributes } from 'react'
import { Search } from 'lucide-react'

interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> {
  label: string
}

/** Campo de busqueda con etiqueta y el icono de lupa. */
export function SearchField({ label, ...props }: SearchFieldProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-small font-medium text-text">
        {label}
      </label>
      <div className="relative">
        <Search
          size={16}
          strokeWidth={1.5}
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-subtle"
        />
        <input
          id={id}
          type="search"
          className="h-control w-full rounded-control border border-border bg-surface pr-3 pl-9 text-body text-text outline-none transition-[border-color,box-shadow] duration-(--duration-fast) placeholder:text-text-subtle focus:border-brand focus:ring-3 focus:ring-brand/20"
          {...props}
        />
      </div>
    </div>
  )
}
