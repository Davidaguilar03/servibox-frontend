import { useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { buttonClasses } from '../components/buttonStyles'
import { CellLink } from '../components/CellLink'
import { DataTable, type Column } from '../components/DataTable'
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
import { fetchKpis } from '../dashboard/dashboardApi'
import { businessToday } from '../lib/businessDate'
import { EMPTY_VALUE, formatCurrency, formatDate } from '../lib/format'
import { paginate } from '../lib/pagination'
import { periodRange } from '../lib/period'
import { useUrlTextParam } from '../lib/useUrlTextParam'
import { PURCHASES_KEY, fetchPurchaseInvoices, fetchPurchasePayments, type Purchase } from '../purchases/purchasesApi'
import { activePurchases, creditPayments, filterPurchases, payable } from '../purchases/purchasesList'
import { CLEARED_FILTERS, filtersActive, filtersToParams, monthRange, parseFilters, type SalesFilters } from '../sales/salesList'

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

const periodOptions: Array<{ value: SalesFilters['periodo']; label: string }> = [
  { value: 'este-mes', label: 'Este mes' },
  { value: 'mes-anterior', label: 'Mes anterior' },
  { value: 'este-ano', label: 'Este año' },
  { value: 'todas', label: 'Todas' },
]

const card = 'rounded-surface border border-border bg-surface'

const columns: Column<Purchase>[] = [
  { header: 'N.º factura', render: (p) => <span className="codigo">{p.invoiceNumber}</span> },
  { header: 'Fecha', render: (p) => formatDate(p.invoiceDate) },
  { header: 'Proveedor', render: (p) => p.supplier.name },
  { header: 'Vence', render: (p) => (p.paymentType === 'CONTADO' ? EMPTY_VALUE : formatDate(p.dueDate)) },
  { header: 'Forma de pago', render: (p) => paymentTypeLabels[p.paymentType] ?? EMPTY_VALUE },
  { header: 'Estado', render: (p) => <StatusBadge status={p.status} /> },
  { header: 'Total', align: 'right', render: (p) => <span className="monto whitespace-nowrap">{formatCurrency(p.total)}</span> },
  { header: 'Saldo pendiente', align: 'right', render: (p) => <PendingBalance invoice={p} /> },
  { header: '', render: (p) => <CellLink to={`/compras/${p.id}`}>Ver detalle</CellLink> },
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
      <ListHeader
        title="Facturas de compra"
        subtitle="Compras de contado y a crédito. Las facturas anuladas están en la papelera."
        primary={
          <Link to="/compras/nueva" className={buttonClasses('primary')} data-variant="primary">
            Registrar compra
          </Link>
        }
        secondary={[
          <Link key="proveedores" to="/compras/proveedores" className={buttonClasses('secondary')} data-variant="secondary">
            Proveedores
          </Link>,
          <Link key="gastos" to="/compras/gastos" className={buttonClasses('secondary')} data-variant="secondary">
            Gastos operativos
          </Link>,
          <Link key="papelera" to="/compras/papelera" className={buttonClasses('secondary')} data-variant="secondary">
            Papelera
          </Link>,
        ]}
      />

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

      <FilterBar active={filtersActive(filters)} onClear={clearFilters}>
        {[
          <SearchField key="q" label="Buscar" placeholder="Número de factura o proveedor" {...search} />,
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
        message="Aún no registras compras. Registra tu primera compra."
        action={{ label: 'Registrar compra', to: '/compras/nueva' }}
      />
    )
  } else {
    const page = paginate(filterPurchases(purchases, filters, today), filters.pagina)
    content =
      page.total === 0 ? (
        <EmptyState
          message="No hay facturas con esos filtros."
          action={{ label: 'Limpiar filtros', onClick: onClear }}
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
                  className="flex items-start justify-between gap-4 rounded-surface border border-border p-4 transition-colors duration-(--duration-fast) hover:bg-neutral-100 focus-ring"
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="codigo text-small text-text">{purchase.invoiceNumber}</span>
                    <span className="truncate text-body text-text">{purchase.supplier.name}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="monto text-body font-semibold text-text">{formatCurrency(purchase.total)}</span>
                    <StatusBadge status={purchase.status} />
                    <span className="text-small text-text-muted">
                      Saldo pendiente <PendingBalance invoice={purchase} />
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

  return <section className={`${card} p-4`}>{content}</section>
}
