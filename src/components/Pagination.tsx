import { ChevronLeft, ChevronRight } from 'lucide-react'
import { pageItems, type Page } from '../lib/pagination'

interface PaginationProps {
  page: Omit<Page<unknown>, 'rows'>
  /** Que se cuenta, en plural: "1 a 25 de 231 facturas". */
  itemLabel: string
  onPageChange: (page: number) => void
}

const pageButton =
  'flex size-9 items-center justify-center rounded-control text-small font-medium transition-colors duration-(--duration-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:text-text-subtle'

/** Texto del rango y botones anterior, numeros y siguiente. */
export function Pagination({ page, itemLabel, onPageChange }: PaginationProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="tabular text-small text-text-muted">
        {page.from} a {page.to} de {page.total} {itemLabel}
      </p>
      {page.totalPages > 1 && (
        <nav aria-label="Paginación">
          <ul className="flex items-center gap-1">
            <li>
              <button
                type="button"
                className={`${pageButton} text-text hover:bg-neutral-100`}
                onClick={() => onPageChange(page.page - 1)}
                disabled={page.page === 1}
                aria-label="Página anterior"
              >
                <ChevronLeft size={16} strokeWidth={1.5} aria-hidden />
              </button>
            </li>
            {pageItems(page.page, page.totalPages).map((item, index) =>
              item === 'gap' ? (
                <li key={`gap-${index}`} className="px-1 text-small text-text-subtle" aria-hidden>
                  …
                </li>
              ) : (
                <li key={item}>
                  <button
                    type="button"
                    className={`${pageButton} tabular ${
                      item === page.page
                        ? 'bg-brand text-text-inverse'
                        : 'border border-border bg-surface text-text hover:bg-neutral-100'
                    }`}
                    onClick={() => onPageChange(item)}
                    aria-label={`Página ${item}`}
                    aria-current={item === page.page ? 'page' : undefined}
                  >
                    {item}
                  </button>
                </li>
              ),
            )}
            <li>
              <button
                type="button"
                className={`${pageButton} text-text hover:bg-neutral-100`}
                onClick={() => onPageChange(page.page + 1)}
                disabled={page.page === page.totalPages}
                aria-label="Página siguiente"
              >
                <ChevronRight size={16} strokeWidth={1.5} aria-hidden />
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  )
}
