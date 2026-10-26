import type { ReactNode } from 'react'
import { Button } from './Button'

// Columnas desde lg: la busqueda doble y cada filtro igual, mas Limpiar filtros. Clases
// completas para que Tailwind las genere.
const LG_COLUMNS: Record<number, string> = {
  1: 'lg:grid-cols-[minmax(0,2fr)_auto]',
  2: 'lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]',
  3: 'lg:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))_auto]',
  4: 'lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]',
}

interface FilterBarProps {
  /** Busqueda primero; luego selectores, segmentados y PeriodPicker. */
  children: ReactNode[]
  /** Si hay algun filtro distinto del estado limpio: solo entonces se ofrece limpiar. */
  active: boolean
  onClear: () => void
  /** Dentro de una superficie que tambien contiene el listado. */
  embedded?: boolean
  /** Cuatro filtros de Inventario: dos columnas hasta que quepa una fila completa. */
  inventory?: boolean
}

/**
 * Barra de filtros de los listados: misma disposicion y espaciado en todos, apilada en movil,
 * en dos columnas desde sm y en una fila desde lg. "Limpiar filtros" solo con filtros activos.
 */
export function FilterBar({ children, active, onClear, embedded = false, inventory = false }: FilterBarProps) {
  return (
    <div
      className={`grid gap-4 bg-surface p-4 sm:grid-cols-2 lg:items-start ${embedded ? 'border-b border-border' : 'rounded-surface border border-border'} ${inventory ? 'lg:grid-cols-2 2xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]' : LG_COLUMNS[children.length] ?? LG_COLUMNS[4]}`}
    >
      {children}
      {active ? (
        <Button variant="secondary" className={inventory ? '2xl:mt-6' : 'lg:mt-6'} onClick={onClear}>
          Limpiar filtros
        </Button>
      ) : (
        // Reserva la columna para que los filtros no cambien de ancho al aparecer el boton.
        <span className={`hidden ${inventory ? '2xl:block' : 'lg:block'}`} aria-hidden />
      )}
    </div>
  )
}
