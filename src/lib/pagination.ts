export const PAGE_SIZE = 25

export interface Page<T> {
  rows: T[]
  /** Pagina actual, ya ajustada al rango valido. */
  page: number
  totalPages: number
  total: number
  /** Posicion (desde 1) de la primera y la ultima fila de la pagina; 0 si no hay filas. */
  from: number
  to: number
}

/** Corta la pagina pedida. Una pagina fuera de rango se lleva a la primera o la ultima. */
export function paginate<T>(items: T[], page: number, pageSize = PAGE_SIZE): Page<T> {
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(Math.max(1, Math.floor(page) || 1), totalPages)
  const start = (current - 1) * pageSize
  const rows = items.slice(start, start + pageSize)
  return { rows, page: current, totalPages, total, from: rows.length ? start + 1 : 0, to: start + rows.length }
}

/**
 * Numeros de pagina a mostrar: todos hasta 7 paginas; con mas, la primera, la ultima y las
 * vecinas de la actual, con un hueco donde se saltan paginas.
 */
export function pageItems(page: number, totalPages: number): Array<number | 'gap'> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)
  const pages = [...new Set([1, page - 1, page, page + 1, totalPages])]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b)
  const items: Array<number | 'gap'> = []
  pages.forEach((value, index) => {
    const previous = pages[index - 1]
    if (previous !== undefined && value - previous > 1) items.push('gap')
    items.push(value)
  })
  return items
}
