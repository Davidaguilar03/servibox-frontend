import { useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { buttonClasses } from '../components/buttonStyles'
import { invoiceColumns } from '../components/invoiceColumns'
import { DataTable } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { IndicatorCard } from '../components/IndicatorCard'
import { ListHeader } from '../components/ListHeader'
import { Pagination } from '../components/Pagination'
import { PendingBalance } from '../components/PendingBalance'
import { PeriodPicker } from '../components/PeriodPicker'
import { SearchField } from '../components/SearchField'
import { SelectField } from '../components/SelectField'
import { StatusBadge } from '../components/StatusBadge'
import { EmptyState, ErrorState } from '../components/states'
import { fetchKpis, fetchSales, type Sale } from '../dashboard/dashboardApi'
import { businessToday } from '../lib/businessDate'
import { formatCurrency } from '../lib/format'
import { paginate } from '../lib/pagination'
import { periodRange } from '../lib/period'
import { INVOICE_TABLE_MEDIUM, useElementWidth } from '../lib/useElementWidth'
import { useUrlTextParam } from '../lib/useUrlTextParam'
import { fetchSaleCollections } from '../sales/salesApi'
import {
  CLEARED_FILTERS,
  activeSales,
  creditCollections,
  customerName,
  filterSales,
  filtersActive,
  filtersToParams,
  monthRange,
  parseFilters,
  receivable,
  type SalesFilters,
} from '../sales/salesList'

const statusOptions = [
  { value: '', label: 'Todos' },
  { value: 'PAGADA', label: 'Pagada' },
  { value: 'PENDIENTE', label: 'Pendiente' },
]

const paymentOptions = [
  { value: '', label: 'Todas' },
  { value: 'CONTADO', label: 'Contado' },
  { value: 'CREDITO', label: 'Crédito' },
]

const periodOptions: Array<{ value: SalesFilters['periodo']; label: string }> = [
  { value: 'este-mes', label: 'Este mes' },
  { value: 'mes-anterior', label: 'Mes anterior' },
  { value: 'este-ano', label: 'Este año' },
  { value: 'todas', label: 'Todas' },
]

const card = 'rounded-surface border border-border bg-surface'


/** Facturas de venta: indicadores, filtros en la URL y listado paginado. */
export function SalesInvoicesPage() {
  const [today] = useState(() => businessToday())
  const { desde, hasta } = monthRange(today)
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = parseFilters(searchParams)

  const sales = useQuery({ queryKey: ['sales'], queryFn: fetchSales })
  const kpis = useQuery({ queryKey: ['kpis', desde, hasta], queryFn: () => fetchKpis(desde, hasta) })
  const collections = useQuery({
    queryKey: ['treasury', 'movements', 'RECAUDO_VENTA', desde, hasta],
    queryFn: () => fetchSaleCollections(desde, hasta),
  })

  // Cambiar un filtro vuelve a la primera pagina. Escribir en el buscador reemplaza la
  // entrada del historial para no dejar una por letra.
  function updateFilters(change: Partial<SalesFilters>, replace = false) {
    setSearchParams(filtersToParams({ ...filters, pagina: 1, ...change }), { replace })
  }
  const clearFilters = () => updateFilters(CLEARED_FILTERS)
  const search = useUrlTextParam(filters.q, (q) => updateFilters({ q }, true))

  const pending = sales.data ? receivable(sales.data) : undefined

  return (
    <div className="flex flex-col gap-6">
      <ListHeader
        title="Facturas de venta"
        subtitle="Ventas de contado y a crédito. Las facturas anuladas están en la papelera."
        primary={
          <Link to="/ventas/nueva" className={buttonClasses('primary')} data-variant="primary">
            Registrar venta
          </Link>
        }
        secondary={[
          <Link key="clientes" to="/ventas/clientes" className={buttonClasses('secondary')} data-variant="secondary">
            Clientes
          </Link>,
          <Link key="ingresos" to="/ventas/ingresos" className={buttonClasses('secondary')} data-variant="secondary">
            Ingresos ocasionales
          </Link>,
          <Link key="papelera" to="/ventas/papelera" className={buttonClasses('secondary')} data-variant="secondary">
            Papelera
          </Link>,
        ]}
      />

      <div className="grid gap-6 md:grid-cols-3">
        <IndicatorCard
          label="Ventas del mes"
          value={kpis.data ? formatCurrency(kpis.data.totalSales) : undefined}
          error={kpis.isError}
          onRetry={() => void kpis.refetch()}
        />
        <IndicatorCard
          label="Por cobrar"
          value={pending ? formatCurrency(pending.amount) : undefined}
          detail={pending && `${pending.count} ${pending.count === 1 ? 'factura pendiente' : 'facturas pendientes'} de abono`}
          error={sales.isError}
          onRetry={() => void sales.refetch()}
        />
        <IndicatorCard
          label="Abonos del mes"
          value={collections.data && sales.data ? formatCurrency(creditCollections(collections.data, sales.data)) : undefined}
          error={collections.isError || sales.isError}
          onRetry={() => {
            if (collections.isError) void collections.refetch()
            if (sales.isError) void sales.refetch()
          }}
        />
      </div>

      <FilterBar active={filtersActive(filters)} onClear={clearFilters}>
        {[
          <SearchField key="q" label="Buscar" placeholder="Número de factura o cliente" {...search} />,
          <SelectField
            key="estado"
            label="Estado"
            options={statusOptions}
            value={filters.estado}
            onChange={(event) => updateFilters({ estado: event.target.value as SalesFilters['estado'] })}
          />,
          <SelectField
            key="pago"
            label="Forma de pago"
            options={paymentOptions}
            value={filters.pago}
            onChange={(event) => updateFilters({ pago: event.target.value as SalesFilters['pago'] })}
          />,
          <PeriodPicker
            key="periodo"
            options={periodOptions}
            value={filters.periodo}
            onChange={(periodo) => updateFilters({ periodo })}
            range={filters.periodo === 'todas' ? null : periodRange(filters.periodo, today)}
          />,
        ]}
      </FilterBar>

      <SalesTable
        sales={sales.data}
        loading={sales.isPending}
        error={sales.isError}
        onRetry={() => void sales.refetch()}
        filters={filters}
        today={today}
        onPageChange={(pagina) => setSearchParams(filtersToParams({ ...filters, pagina }))}
        onClear={clearFilters}
      />
    </div>
  )
}

interface SalesTableProps {
  sales: Sale[] | undefined
  loading: boolean
  error: boolean
  onRetry: () => void
  filters: SalesFilters
  today: string
  onPageChange: (page: number) => void
  onClear: () => void
}

function SalesTable({ sales, loading, error, onRetry, filters, today, onPageChange, onClear }: SalesTableProps) {
  const [sectionRef, width] = useElementWidth<HTMLElement>()
  const columns = invoiceColumns<Sale>({
    partyLabel: 'Cliente',
    partyName: customerName,
    detailPath: (s) => `/ventas/${s.id}`,
    width,
  })
  let content: ReactNode
  if (error) {
    content = <ErrorState message="No pudimos cargar las facturas." onRetry={onRetry} />
  } else if (loading || !sales) {
    content = (
      <DataTable columns={columns} rows={undefined} rowKey={(s) => s.id} loading error={false} onRetry={onRetry} emptyMessage="" skeletonRows={8} />
    )
  } else if (activeSales(sales).length === 0) {
    content = (
      <EmptyState
        message="Aún no registras ventas. Registra tu primera venta."
        action={{ label: 'Registrar venta', to: '/ventas/nueva' }}
      />
    )
  } else {
    const page = paginate(filterSales(sales, filters, today), filters.pagina)
    content =
      page.total === 0 ? (
        <EmptyState
          message="No hay facturas con esos filtros."
          action={{ label: 'Limpiar filtros', onClick: onClear }}
        />
      ) : (
        <>
          <div className="hidden md:block">
            <DataTable columns={columns} rows={page.rows} rowKey={(s) => s.id} loading={false} error={false} onRetry={onRetry} emptyMessage="" dense={width < INVOICE_TABLE_MEDIUM} />
          </div>
          <ul className="flex flex-col gap-3 md:hidden" aria-label="Facturas">
            {page.rows.map((sale) => (
              <li key={sale.id}>
                <Link
                  to={`/ventas/${sale.id}`}
                  className="flex items-start justify-between gap-4 rounded-surface border border-border p-4 transition-colors duration-(--duration-fast) hover:bg-neutral-100 focus-ring"
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="codigo text-small text-text">{sale.invoiceNumber}</span>
                    <span className="truncate text-body text-text">{customerName(sale)}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="monto text-body font-semibold text-text">{formatCurrency(sale.total)}</span>
                    <StatusBadge status={sale.status} />
                    <span className="text-small text-text-muted">
                      Saldo pendiente <PendingBalance invoice={sale} />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-border pt-4">
            <Pagination page={page} itemLabel="facturas" onPageChange={onPageChange} />
          </div>
        </>
      )
  }

  return (
    <section ref={sectionRef} className={`${card} p-4`}>
      {content}
    </section>
  )
}
