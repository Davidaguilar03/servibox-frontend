import { useId, useState, type KeyboardEvent } from 'react'
import { ChevronDown } from 'lucide-react'
import { normalizeText } from '../lib/text'

export interface ComboboxOption {
  value: number
  label: string
  /** Texto secundario en la lista (documento, stock). */
  detail?: string
  /** Lo que se busca, ademas de la etiqueta. */
  keywords?: string
}

interface ComboboxFieldProps {
  label: string
  /** Etiqueta visible solo bajo md: desde md la tabla ya tiene encabezado. */
  compactLabel?: boolean
  options: ComboboxOption[]
  value: number | null
  onChange: (value: number) => void
  placeholder?: string
  error?: string
}

/**
 * Selector con busqueda (patron combobox de ARIA): se escribe para filtrar, flechas para
 * moverse, Enter para elegir y Esc para cerrar. Busca sin distinguir mayusculas ni tildes.
 */
export function ComboboxField({ label, compactLabel, options, value, onChange, placeholder, error }: ComboboxFieldProps) {
  const id = useId()
  const listId = `${id}-list`
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const selected = options.find((option) => option.value === value)

  const normalized = normalizeText(query)
  const filtered = normalized
    ? options.filter((option) => normalizeText(`${option.label} ${option.keywords ?? ''}`).includes(normalized))
    : options

  function choose(option: ComboboxOption) {
    onChange(option.value)
    setOpen(false)
    setQuery('')
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!open) setOpen(true)
      else setActive((index) => Math.min(index + 1, filtered.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter' && open) {
      event.preventDefault()
      const option = filtered[active]
      if (option) choose(option)
    } else if (event.key === 'Escape' && open) {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={`text-small font-medium text-text ${compactLabel ? 'md:sr-only' : ''}`}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && filtered[active] ? `${id}-option-${filtered[active].value}` : undefined}
          aria-invalid={error ? true : undefined}
          autoComplete="off"
          placeholder={selected ? undefined : placeholder}
          value={open ? query : (selected?.label ?? '')}
          onChange={(event) => {
            setQuery(event.target.value)
            setActive(0)
            setOpen(true)
          }}
          onFocus={() => setActive(0)}
          onClick={() => setOpen(true)}
          onBlur={() => {
            setOpen(false)
            setQuery('')
          }}
          onKeyDown={handleKeyDown}
          className={`h-control w-full rounded-control border bg-surface pr-9 pl-3 text-body text-text outline-none transition-[border-color,box-shadow] duration-(--duration-fast) placeholder:text-text-subtle focus:ring-3 ${
            error ? 'border-error focus:ring-error/20' : 'border-border focus:border-brand focus:ring-brand/20'
          }`}
        />
        <ChevronDown
          size={16}
          strokeWidth={1.5}
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-text-muted"
        />
        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-label={label}
            className="absolute z-30 mt-1 max-h-64 w-full min-w-64 overflow-y-auto rounded-control border border-border bg-surface py-1 shadow-menu"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-small text-text-muted">Sin resultados.</li>
            ) : (
              filtered.map((option, index) => (
                <li
                  key={option.value}
                  id={`${id}-option-${option.value}`}
                  role="option"
                  aria-selected={option.value === value}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(option)}
                  className={`cursor-pointer px-3 py-2 ${index === active ? 'bg-neutral-100' : ''}`}
                >
                  <span className="block text-small text-text">{option.label}</span>
                  {option.detail && <span className="block text-small text-text-muted">{option.detail}</span>}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      {error && <p className="text-small text-error">{error}</p>}
    </div>
  )
}
