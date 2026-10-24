import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useSession } from '../auth/session'
import { buttonClasses } from '../components/buttonStyles'
import { DataTable, type Column } from '../components/DataTable'
import { IndicatorCard } from '../components/IndicatorCard'
import { StatusBadge } from '../components/StatusBadge'
import { EmptyState, ErrorState, Skeleton } from '../components/states'
import {
  fetchAccounts,
  fetchBalance,
  fetchCategories,
  fetchKpis,
  fetchProducts,
  fetchSales,
  type AccountType,
  type Product,
  type Sale,
} from '../dashboard/dashboardApi'
import { EMPTY_VALUE, formatCurrency, formatDate, formatMonth, monthToDate } from '../lib/format'
import { lowStockProducts, type StockStatus } from '../lib/stock'

const ROW_LIMIT = 5

const accountTypeLabels: Record<AccountType, string> = {
  EFECTIVO: 'Efectivo',
  BANCO: 'Banco',
  DIGITAL: 'Digital',
}

const linkClass =
  'rounded-tag text-small font-medium text-brand-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

function Section({ title, link, children }: { title: string; link: { to: string; label: string }; children: ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-surface p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-h3 text-text">{title}</h2>
        <Link to={link.to} className={linkClass}>
          {link.label}
        </Link>
      </div>
      {children}
    </section>
  )
}

/** Panel de control: cada bloque tiene su consulta y sus estados de carga, vacio y error. */
export function DashboardPage() {
  const [today] = useState(() => new Date())
  const tenantName = useSession()?.tenantName
  const { desde, hasta } = monthToDate(today)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 text-text">Inicio</h1>
          <p className="mt-1 text-small text-text-muted">
            Resumen {tenantName ? `de ${tenantName} · ` : 'de '}
            {formatMonth(today)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Periodo fijo: el selector de periodo queda fuera de esta version. */}
          <span className="text-small font-medium text-text-muted">Este mes</span>
          <Link to="/ventas/nueva" className={buttonClasses('primary')} data-variant="primary">
            Registrar venta
          </Link>
        </div>
      </div>

      <KpiBlock desde={desde} hasta={hasta} />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <LowStockBlock />
        </div>
        <div className="lg:col-span-2">
          <AccountsBlock />
        </div>
      </div>

      <LatestSalesBlock />
    </div>
  )
}

function KpiBlock({ desde, hasta }: { desde: string; hasta: string }) {
  const kpis = useQuery({ queryKey: ['kpis', desde, hasta], queryFn: () => fetchKpis(desde, hasta) })

  if (kpis.isError) {
    return (
      <div className="rounded-card border border-border bg-surface shadow-card">
        <ErrorState message="No pudimos cargar los indicadores del mes." onRetry={() => void kpis.refetch()} />
      </div>
    )
  }

  const value = (pick: (data: NonNullable<typeof kpis.data>) => number) =>
    kpis.data ? formatCurrency(pick(kpis.data)) : undefined

  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      <IndicatorCard label="Ventas totales" value={value((d) => d.totalSales)} />
      <IndicatorCard label="Compras totales" value={value((d) => d.totalPurchases)} />
      <IndicatorCard label="Utilidad bruta" value={value((d) => d.grossProfit)} />
      <IndicatorCard label="Utilidad neta" value={value((d) => d.netProfit)} />
    </div>
  )
}

const stockBadge: Record<Exclude<StockStatus, 'NORMAL'>, 'BAJO_STOCK' | 'STOCK_CRITICO' | 'SIN_STOCK'> = {
  BAJO: 'BAJO_STOCK',
  CRITICO: 'STOCK_CRITICO',
  SIN_STOCK: 'SIN_STOCK',
}

type LowStockRow = Product & { status: StockStatus }

const lowStockColumns: Column<LowStockRow>[] = [
  { header: 'Código', render: (p) => <span className="font-mono">{p.code}</span> },
  { header: 'Producto', render: (p) => p.description },
  {
    header: 'Stock',
    align: 'right',
    render: (p) => <span className={p.status === 'BAJO' ? '' : 'text-error'}>{p.quantity ?? 0}</span>,
  },
  { header: 'Estado', render: (p) => p.status !== 'NORMAL' && <StatusBadge status={stockBadge[p.status]} /> },
]

function LowStockBlock() {
  const products = useQuery({ queryKey: ['inventory', 'products'], queryFn: fetchProducts })
  const categories = useQuery({ queryKey: ['inventory', 'categories'], queryFn: fetchCategories })
  const rows =
    products.data && categories.data ? lowStockProducts(products.data, categories.data, ROW_LIMIT) : undefined

  return (
    <Section title="Productos con stock bajo" link={{ to: '/inventario', label: 'Ver inventario' }}>
      <DataTable
        columns={lowStockColumns}
        rows={rows}
        rowKey={(p) => p.id}
        loading={products.isPending || categories.isPending}
        error={products.isError || categories.isError}
        onRetry={() => {
          void products.refetch()
          void categories.refetch()
        }}
        emptyMessage="No hay productos con stock bajo."
      />
    </Section>
  )
}

function AccountsBlock() {
  const accounts = useQuery({ queryKey: ['treasury', 'accounts'], queryFn: fetchAccounts })
  const balance = useQuery({ queryKey: ['treasury', 'balance'], queryFn: fetchBalance })
  const retry = () => {
    void accounts.refetch()
    void balance.refetch()
  }

  let content: ReactNode
  if (accounts.isError || balance.isError) {
    content = <ErrorState message="No pudimos cargar los saldos." onRetry={retry} />
  } else if (accounts.isPending || balance.isPending) {
    content = (
      <div className="flex flex-col gap-4" aria-busy>
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    )
  } else if (accounts.data.length === 0) {
    content = <EmptyState message="Aún no tienes cuentas." />
  } else {
    content = (
      <div>
        <ul>
          {accounts.data.map((account) => (
            <li key={account.id} className="flex items-center justify-between gap-4 border-b border-border py-3">
              <div>
                <p className="text-body font-medium text-text">{account.name}</p>
                <p className="text-small text-text-muted">{accountTypeLabels[account.type] ?? EMPTY_VALUE}</p>
              </div>
              <span className="tabular text-body text-text">{formatCurrency(account.currentBalance)}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between gap-4 pt-4">
          <span className="text-small text-text-muted">Total disponible</span>
          <span className="tabular font-display text-h3 font-bold text-text">{formatCurrency(balance.data.total)}</span>
        </div>
      </div>
    )
  }

  return (
    <Section title="Saldos de cuentas" link={{ to: '/cuentas', label: 'Ver cuentas' }}>
      {content}
    </Section>
  )
}

const paymentTypeLabels: Record<Sale['paymentType'], string> = {
  CONTADO: 'Contado',
  CREDITO: 'Crédito',
}

const salesColumns: Column<Sale>[] = [
  { header: 'N.º factura', render: (s) => <span className="font-mono">{s.invoiceNumber}</span> },
  { header: 'Cliente', render: (s) => s.customer?.name ?? EMPTY_VALUE },
  { header: 'Fecha', render: (s) => formatDate(s.invoiceDate) },
  { header: 'Forma de pago', render: (s) => paymentTypeLabels[s.paymentType] ?? EMPTY_VALUE },
  { header: 'Total', align: 'right', render: (s) => formatCurrency(s.total) },
  { header: 'Estado', render: (s) => <StatusBadge status={s.status} /> },
]

/** Las mas recientes por fecha de factura; a igual fecha, la de id mayor. */
function latestSales(sales: Sale[]): Sale[] {
  return [...sales]
    .sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate) || b.id - a.id)
    .slice(0, ROW_LIMIT)
}

function LatestSalesBlock() {
  const sales = useQuery({ queryKey: ['sales'], queryFn: fetchSales })

  return (
    <Section title="Últimas ventas" link={{ to: '/ventas', label: 'Ver todas' }}>
      <DataTable
        columns={salesColumns}
        rows={sales.data ? latestSales(sales.data) : undefined}
        rowKey={(s) => s.id}
        loading={sales.isPending}
        error={sales.isError}
        onRetry={() => void sales.refetch()}
        emptyMessage="Aún no registras ventas."
      />
    </Section>
  )
}
