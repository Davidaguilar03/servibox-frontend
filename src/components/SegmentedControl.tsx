import { useRef, type KeyboardEvent, type ReactNode } from 'react'

export interface SegmentOption<T> {
  value: T
  label: ReactNode
}

interface GroupProps<T> {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Nombre del grupo; o `aria-labelledby` si ya hay un rotulo visible. */
  'aria-label'?: string
  'aria-labelledby'?: string
  /** Disposicion del contenedor (por ejemplo `grid grid-cols-2`). */
  className?: string
}

const KEY_STEP: Record<string, 'next' | 'prev' | 'first' | 'last'> = {
  ArrowRight: 'next',
  ArrowDown: 'next',
  ArrowLeft: 'prev',
  ArrowUp: 'prev',
  Home: 'first',
  End: 'last',
}

/**
 * Teclado comun: flechas (con vuelta), Inicio y Fin mueven el foco y eligen la opcion
 * (activacion automatica). Un solo elemento del grupo esta en el orden de tabulacion.
 */
function useRoving<T>(options: SegmentOption<T>[], value: T, onChange: (value: T) => void) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const selectedIndex = options.findIndex((option) => Object.is(option.value, value))
  const tabbable = selectedIndex === -1 ? 0 : selectedIndex

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    const step = KEY_STEP[event.key]
    if (!step) return
    event.preventDefault()
    const last = options.length - 1
    const current = refs.current.findIndex((element) => element === document.activeElement)
    const from = current === -1 ? tabbable : current
    const next = { next: from === last ? 0 : from + 1, prev: from === 0 ? last : from - 1, first: 0, last }[step]
    refs.current[next]?.focus()
    const option = options[next]
    if (option) onChange(option.value)
  }

  const bind = (index: number) => ({
    ref: (element: HTMLButtonElement | null) => {
      refs.current[index] = element
    },
    tabIndex: index === tabbable ? 0 : -1,
  })

  return { onKeyDown, bind }
}

const segment =
  'flex min-h-touch items-center justify-center rounded-pill border px-4 text-button whitespace-nowrap transition-colors duration-(--duration-fast) focus-ring lg:min-h-control'

/**
 * Eleccion de una opcion entre pocas (periodo, tipo de pago, formato): `radiogroup` con
 * `role="radio"` y `aria-checked`. Area de 44 bajo lg y 40 desde lg; envuelve si no cabe.
 */
export function SegmentedControl<T>({ options, value, onChange, className = 'flex flex-wrap', ...labelProps }: GroupProps<T>) {
  const { onKeyDown, bind } = useRoving(options, value, onChange)
  return (
    <div role="radiogroup" {...labelProps} onKeyDown={onKeyDown} className={`gap-2 ${className}`}>
      {options.map((option, index) => {
        const checked = Object.is(option.value, value)
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(option.value)}
            className={`${segment} ${
              checked ? 'border-dark bg-dark text-text-inverse' : 'border-border-control bg-surface text-text hover:bg-neutral-100'
            }`}
            {...bind(index)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

interface TabListProps<T> extends GroupProps<T> {
  /** id de cada pestana y del panel que controla, si hay `tabpanel`. */
  tabId?: (value: T) => string
  panelId?: (value: T) => string
}

/**
 * Pestanas de navegacion de contenido (Configuracion, categorias de Productos): `tablist` con
 * `role="tab"` y `aria-selected`. Se desplaza en horizontal si no cabe.
 */
export function TabList<T>({ options, value, onChange, tabId, panelId, className = '', ...labelProps }: TabListProps<T>) {
  const { onKeyDown, bind } = useRoving(options, value, onChange)
  return (
    <div
      role="tablist"
      {...labelProps}
      onKeyDown={onKeyDown}
      className={`flex gap-6 overflow-x-auto overflow-y-hidden border-b border-border [scrollbar-width:thin] ${className}`}
    >
      {options.map((option, index) => {
        const selected = Object.is(option.value, value)
        return (
          <button
            key={String(option.value)}
            id={tabId?.(option.value)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId?.(option.value)}
            onClick={() => onChange(option.value)}
            className={`-mb-px flex min-h-touch shrink-0 items-center gap-2 rounded-control border-b-2 px-1 text-body whitespace-nowrap transition-colors duration-(--duration-fast) focus-ring lg:min-h-control ${
              selected ? 'border-brand font-medium text-text' : 'border-transparent text-text-muted hover:text-text'
            }`}
            {...bind(index)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
