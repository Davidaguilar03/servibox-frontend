import { useState, type ReactNode } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { CreditCard, TrendingUp, Wallet } from 'lucide-react'
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
import { validateRange } from '../reports/reports'
import { INVOICE_TABLE_MEDIUM, useElementWidth } from '../lib/useElementWidth'
import { useUrlTextParam } from '../lib/useUrlTextParam'
import { fetchSaleCollections } from '../sales/salesApi'
import type { AppShellContext } from '../layout/AppShell'
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
  SALES_PERIOD_OPTIONS,
  salesRange,
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

/** Facturas de venta: indicadores, filtros en la URL y listado paginado. */
export function SalesInvoicesPage() {
  const { menuButton } = useOutletContext<AppShellContext>()
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
  const desdeField = useUrlTextParam(filters.desde ?? '', (desde) => updateFilters({ desde }, true))
  const hastaField = useUrlTextParam(filters.hasta ?? '', (hasta) => updateFilters({ hasta }, true))
  const range = salesRange({ ...filters, desde: desdeField.value, hasta: hastaField.value }, today)
  const rangeValidation = range ? validateRange(range.desde, range.hasta) : { valid: true, errors: {} }

  const pending = sales.data ? receivable(sales.data) : undefined

  return (
    <div className="flex flex-col gap-6">
      <ListHeader
        leading={menuButton}
        title="Facturas de venta"
        subtitle="Ventas de contado y a crédito. Las facturas anuladas están en la papelera."
        primary={
          <Link to="/ventas/nueva" className={buttonClasses('primary')} data-variant="primary">
            Registrar venta
          </Link>
        }
        secondary={[
          <Link key="papelera" to="/ventas/papelera" className={buttonClasses('secondary')} data-variant="secondary">
            Papelera
          </Link>,
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
        <IndicatorCard
          compact
          icon={TrendingUp}
          accent="success"
          label="Ventas del mes"
          value={kpis.data ? formatCurrency(kpis.data.totalSales) : undefined}
          error={kpis.isError}
          onRetry={() => void kpis.refetch()}
        />
        <IndicatorCard
          compact
          icon={Wallet}
          accent="warning"
          label="Por cobrar"
          value={pending ? formatCurrency(pending.amount) : undefined}
          detail={pending && `${pending.count} ${pending.count === 1 ? 'factura pendiente' : 'facturas pendientes'} de abono`}
          error={sales.isError}
          onRetry={() => void sales.refetch()}
        />
        <IndicatorCard
          compact
          icon={CreditCard}
          accent="info"
          label="Abonos del mes"
          value={collections.data && sales.data ? formatCurrency(creditCollections(collections.data, sales.data)) : undefined}
          error={collections.isError || sales.isError}
          onRetry={() => {
            if (collections.isError) void collections.refetch()
            if (sales.isError) void sales.refetch()
          }}
        />
      </div>

      <p className="text-small text-text-muted">Ventas y abonos corresponden al mes actual. Por cobrar incluye todas las facturas pendientes.</p>

      <div className="rounded-surface border border-t-2 border-border border-t-border-accent bg-surface">
      <FilterBar embedded sales salesCustom={filters.periodo === 'personalizado'} active={filtersActive(filters)} onClear={clearFilters}>
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
          <div key="periodo" className={filters.periodo === 'personalizado' ? 'min-w-0 2xl:col-span-3' : 'min-w-0'}>
            <PeriodPicker
              layout="inline"
              options={SALES_PERIOD_OPTIONS}
              value={filters.periodo}
              onChange={(periodo) => updateFilters(periodo === 'personalizado' ? { periodo, desde: range?.desde ?? '', hasta: range?.hasta ?? '' } : { periodo })}
              range={rangeValidation.valid ? range : null}
              custom={{ desde: desdeField, hasta: hastaField, errors: rangeValidation.errors }}
            />
          </div>,
        ]}
      </FilterBar>

      {!rangeValidation.valid ? (
        <p role="alert" className="text-small text-error">Revisa las fechas para ver las ventas del período.</p>
      ) : (
        <SalesTable
          sales={sales.data}
          loading={sales.isPending}
          error={sales.isError}
          onRetry={() => void sales.refetch()}
          filters={filters.periodo === 'personalizado' ? { ...filters, desde: desdeField.value, hasta: hastaField.value } : filters}
          today={today}
          onPageChange={(pagina) => setSearchParams(filtersToParams({ ...filters, pagina }))}
          onClear={clearFilters}
        />
      )}
      </div>
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
                  className="flex flex-wrap items-start justify-between gap-4 rounded-surface border border-border p-4 transition-colors duration-(--duration-fast) hover:bg-neutral-100 focus-ring"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="codigo text-small text-text">{sale.invoiceNumber}</span>
                    <span className="wrap-anywhere text-body text-text">{customerName(sale)}</span>
                  </span>
                  <span className="ml-auto flex min-w-0 flex-col items-end gap-1">
                    <span className="monto wrap-anywhere text-right text-body font-semibold text-text">{formatCurrency(sale.total).replace('$ ', '$\u00a0')}</span>
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
    <section ref={sectionRef} className="p-4" aria-label="Listado de ventas">
      {content}
    </section>
  )
}
