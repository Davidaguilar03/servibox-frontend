import { useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Button } from '../components/Button'
import { buttonClasses } from '../components/buttonStyles'
import { DataTable, type Column } from '../components/DataTable'
import { IndicatorCard } from '../components/IndicatorCard'
import { Pagination } from '../components/Pagination'
import { SearchField } from '../components/SearchField'
import { SelectField } from '../components/SelectField'
import { StatusBadge } from '../components/StatusBadge'
import { EmptyState, ErrorState } from '../components/states'
import { fetchKpis } from '../dashboard/dashboardApi'
import { businessToday } from '../lib/businessDate'
import { EMPTY_VALUE, formatCurrency, formatDate } from '../lib/format'
import { paginate } from '../lib/pagination'
import { useUrlTextParam } from '../lib/useUrlTextParam'
import { PURCHASES_KEY, fetchPurchaseInvoices, fetchPurchasePayments, type Purchase } from '../purchases/purchasesApi'
import { activePurchases, creditPayments, filterPurchases, payable } from '../purchases/purchasesList'
import { CLEARED_FILTERS, filtersToParams, monthRange, parseFilters, type SalesFilters } from '../sales/salesList'

const paymentTypeLabels: Record<Purchase['paymentType'], string> = {
  CONTADO: 'Contado',
  CREDITO: 'Crédito',
}

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

const periodOptions = [
  { value: 'este-mes', label: 'Este mes' },
  { value: 'mes-anterior', label: 'Mes anterior' },
  { value: 'este-ano', label: 'Este año' },
  { value: 'todas', label: 'Todas' },
]

const linkClass =
  'rounded-tag text-small font-medium whitespace-nowrap text-brand-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

const card = 'rounded-card border border-border bg-surface shadow-card'

const columns: Column<Purchase>[] = [
  { header: 'N.º factura', render: (p) => <span className="font-mono">{p.invoiceNumber}</span> },
  { header: 'Proveedor', render: (p) => p.supplier.name },
  { header: 'Fecha', render: (p) => formatDate(p.invoiceDate) },
  { header: 'Vence', render: (p) => (p.paymentType === 'CONTADO' ? EMPTY_VALUE : formatDate(p.dueDate)) },
  { header: 'Forma de pago', render: (p) => paymentTypeLabels[p.paymentType] ?? EMPTY_VALUE },
  { header: 'Total', align: 'right', render: (p) => formatCurrency(p.total) },
  { header: 'Estado', render: (p) => <StatusBadge status={p.status} /> },
  {
    header: '',
    render: (p) => (
      <Link to={`/compras/${p.id}`} className={linkClass}>
        Ver detalle
      </Link>
    ),
  },
]

/** Facturas de compra: indicadores, filtros en la URL y listado paginado. */
export function PurchaseInvoicesPage() {
  const [today] = useState(() => businessToday())
  const { desde, hasta } = monthRange(today)
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = parseFilters(searchParams)

  const purchases = useQuery({ queryKey: PURCHASES_KEY, queryFn: fetchPurchaseInvoices })
  const kpis = useQuery({ queryKey: ['kpis', desde, hasta], queryFn: () => fetchKpis(desde, hasta) })
  const payments = useQuery({
    queryKey: ['treasury', 'movements', 'PAGO_COMPRA', desde, hasta],
    queryFn: () => fetchPurchasePayments(desde, hasta),
  })

  // Cambiar un filtro vuelve a la primera pagina. Escribir en el buscador reemplaza la
  // entrada del historial para no dejar una por letra.
  function updateFilters(change: Partial<SalesFilters>, replace = false) {
    setSearchParams(filtersToParams({ ...filters, pagina: 1, ...change }), { replace })
  }
  const clearFilters = () => updateFilters(CLEARED_FILTERS)
  const search = useUrlTextParam(filters.q, (q) => updateFilters({ q }, true))

  const pending = purchases.data ? payable(purchases.data) : undefined

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 text-text">Facturas de compra</h1>
          <p className="mt-1 text-small text-text-muted">
            Compras de contado y a crédito. Las facturas anuladas están en la papelera.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/compras/gastos" className={buttonClasses('secondary')}>
            Gastos operativos
          </Link>
          <Link to="/compras/papelera" className={buttonClasses('secondary')}>
            Papelera
          </Link>
          <Link to="/compras/nueva" className={buttonClasses('primary')}>
            Nueva factura
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <IndicatorCard
          label="Compras del mes"
          value={kpis.data ? formatCurrency(kpis.data.totalPurchases) : undefined}
          error={kpis.isError}
          onRetry={() => void kpis.refetch()}
        />
        <IndicatorCard
          label="Por pagar"
          value={pending ? formatCurrency(pending.amount) : undefined}
          detail={pending && `${pending.count} ${pending.count === 1 ? 'factura pendiente' : 'facturas pendientes'} de pago`}
          error={purchases.isError}
          onRetry={() => void purchases.refetch()}
        />
        <IndicatorCard
          label="Pagos del mes"
          value={payments.data && purchases.data ? formatCurrency(creditPayments(payments.data, purchases.data)) : undefined}
          error={payments.isError || purchases.isError}
          onRetry={() => {
            if (payments.isError) void payments.refetch()
            if (purchases.isError) void purchases.refetch()
          }}
        />
      </div>

      <div className={`${card} grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto] lg:items-end`}>
        <SearchField
          label="Buscar"
          placeholder="Número de factura o proveedor"
          {...search}
        />
        <SelectField
          label="Estado"
          options={statusOptions}
          value={filters.estado}
          onChange={(event) => updateFilters({ estado: event.target.value as SalesFilters['estado'] })}
        />
        <SelectField
          label="Forma de pago"
          options={paymentOptions}
          value={filters.pago}
          onChange={(event) => updateFilters({ pago: event.target.value as SalesFilters['pago'] })}
        />
        <SelectField
          label="Periodo"
          options={periodOptions}
          value={filters.periodo}
          onChange={(event) => updateFilters({ periodo: event.target.value as SalesFilters['periodo'] })}
        />
        <Button variant="secondary" onClick={clearFilters}>
          Limpiar
        </Button>
      </div>

      <PurchasesTable
        purchases={purchases.data}
        loading={purchases.isPending}
        error={purchases.isError}
        onRetry={() => void purchases.refetch()}
        filters={filters}
        today={today}
        onPageChange={(pagina) => setSearchParams(filtersToParams({ ...filters, pagina }))}
        onClear={clearFilters}
      />
    </div>
  )
}

interface PurchasesTableProps {
  purchases: Purchase[] | undefined
  loading: boolean
  error: boolean
  onRetry: () => void
  filters: SalesFilters
  today: string
  onPageChange: (page: number) => void
  onClear: () => void
}

function PurchasesTable({ purchases, loading, error, onRetry, filters, today, onPageChange, onClear }: PurchasesTableProps) {
  let content: ReactNode
  if (error) {
    content = <ErrorState message="No pudimos cargar las facturas." onRetry={onRetry} />
  } else if (loading || !purchases) {
    content = (
      <DataTable columns={columns} rows={undefined} rowKey={(p) => p.id} loading error={false} onRetry={onRetry} emptyMessage="" skeletonRows={8} />
    )
  } else if (activePurchases(purchases).length === 0) {
    content = (
      <EmptyState
        message="Aún no registras compras. Crea tu primera factura de compra."
        action={
          <Link to="/compras/nueva" className={buttonClasses('primary')}>
            Nueva factura
          </Link>
        }
      />
    )
  } else {
    const page = paginate(filterPurchases(purchases, filters, today), filters.pagina)
    content =
      page.total === 0 ? (
        <EmptyState
          message="No hay facturas con esos filtros."
          action={
            <Button variant="secondary" onClick={onClear}>
              Limpiar filtros
            </Button>
          }
        />
      ) : (
        <>
          <div className="hidden md:block">
            <DataTable columns={columns} rows={page.rows} rowKey={(p) => p.id} loading={false} error={false} onRetry={onRetry} emptyMessage="" />
          </div>
          <ul className="flex flex-col gap-3 md:hidden" aria-label="Facturas">
            {page.rows.map((purchase) => (
              <li key={purchase.id}>
                <Link
                  to={`/compras/${purchase.id}`}
                  className="flex items-start justify-between gap-4 rounded-control border border-border p-4 transition-colors duration-(--duration-fast) hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="font-mono text-small text-text">{purchase.invoiceNumber}</span>
                    <span className="truncate text-body text-text">{purchase.supplier.name}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="tabular text-body font-medium text-text">{formatCurrency(purchase.total)}</span>
                    <StatusBadge status={purchase.status} />
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

  return <section className={`${card} p-4`}>{content}</section>
}
