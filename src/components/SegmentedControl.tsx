import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

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
  /**
   * Pocas pestanas: se reparten el ancho por igual y la etiqueta pasa a dos lineas si hace
   * falta (Configuracion). Sin `fill` se desplazan en horizontal (categorias de Productos).
   */
  fill?: boolean
}

/** Mascara del borde derecho: indica que hay mas pestanas al desplazar. */
const FADE_END = '[mask-image:linear-gradient(to_right,black_calc(100%-32px),transparent)]'

/**
 * Pestanas de navegacion de contenido (Configuracion, categorias de Productos): `tablist` con
 * `role="tab"` y `aria-selected`, en rol small. Si no caben se desplazan, con el borde
 * difuminado mientras haya mas a la derecha, y la seleccionada se desplaza a la vista.
 */
export function TabList<T>({ options, value, onChange, tabId, panelId, fill = false, className = '', ...labelProps }: TabListProps<T>) {
  const { onKeyDown, bind } = useRoving(options, value, onChange)
  const listRef = useRef<HTMLDivElement>(null)
  const [moreToRight, setMoreToRight] = useState(false)

  useEffect(() => {
    const list = listRef.current
    if (!list || fill) return
    const update = () => setMoreToRight(list.scrollLeft + list.clientWidth < list.scrollWidth - 1)
    update()
    list.addEventListener('scroll', update)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(list)
    return () => {
      list.removeEventListener('scroll', update)
      observer?.disconnect()
    }
  }, [fill, options.length])

  // La pestana seleccionada siempre a la vista.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [value])

  return (
    <div
      ref={listRef}
      role="tablist"
      {...labelProps}
      onKeyDown={onKeyDown}
      className={`flex border-b border-border ${
        fill ? 'gap-2' : `gap-6 overflow-x-auto overflow-y-hidden [scrollbar-width:thin] ${moreToRight ? FADE_END : ''}`
      } ${className}`}
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
            className={`-mb-px flex min-h-touch items-center gap-2 rounded-control border-b-2 px-1 text-small transition-colors duration-(--duration-fast) focus-ring lg:min-h-control ${
              fill ? 'min-w-0 flex-1 justify-center py-2 text-center' : 'shrink-0 whitespace-nowrap'
            } ${selected ? 'border-brand font-semibold text-text' : 'border-transparent text-text-muted hover:text-text'}`}
            {...bind(index)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
