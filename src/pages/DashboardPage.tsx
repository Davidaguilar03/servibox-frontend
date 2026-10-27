import { useState, type ReactNode } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ChartPie, Landmark, Package, Smartphone, TrendingUp, Wallet } from 'lucide-react'
import type { AppShellContext } from '../layout/AppShell'
import { iconMd } from '../components/icons'
import { useSession } from '../auth/session'
import { useReportedError } from '../api/reportError'
import { PeriodPicker } from '../components/PeriodPicker'
import { GLOSSARY } from '../copy/glossary'
import { CellLink } from '../components/CellLink'
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
import { EMPTY_VALUE, formatCurrency, formatDate } from '../lib/format'
import { businessToday } from '../lib/businessDate'
import { rangeLabel, type DateRange } from '../lib/period'
import { useUrlTextParam } from '../lib/useUrlTextParam'
import { validateRange } from '../reports/reports'
import { DEFAULT_FILTERS, filtersToParams, parseFilters, SALES_PERIOD_OPTIONS, salesRange, type Period } from '../sales/salesList'
import { lowStockProducts, stockAlertCounts, type StockStatus } from '../lib/stock'

const ROW_LIMIT = 5

const accountTypeLabels: Record<AccountType, string> = {
  EFECTIVO: 'Efectivo',
  BANCO: 'Banco',
  DIGITAL: 'Digital',
}

const accountIcons = { BANCO: Landmark, EFECTIVO: Wallet, DIGITAL: Smartphone }

function Section({ title, link, children }: { title: string; link: { to: string; label: string }; children: ReactNode }) {
  return (
    <section className="h-full min-w-0 rounded-surface border border-border bg-surface p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-section text-text">{title}</h2>
        <CellLink to={link.to}>{link.label}</CellLink>
      </div>
      {children}
    </section>
  )
}

/** Panel de control: cada bloque tiene su consulta y sus estados de carga, vacio y error. */
export function DashboardPage() {
  const { menuButton } = useOutletContext<AppShellContext>()
  const [today] = useState(() => businessToday())
  const tenantName = useSession()?.tenantName
  const [params, setParams] = useSearchParams()
  const parsed = parseFilters(params)
  const filters = { ...parsed, periodo: parsed.periodo === 'todas' ? 'este-mes' as const : parsed.periodo }
  function update(change: Partial<typeof filters>, replace = false) {
    setParams(filtersToParams({ ...DEFAULT_FILTERS, periodo: filters.periodo, desde: filters.desde, hasta: filters.hasta, ...change }), { replace })
  }
  const desdeField = useUrlTextParam(filters.desde ?? '', (desde) => update({ desde }, true))
  const hastaField = useUrlTextParam(filters.hasta ?? '', (hasta) => update({ hasta }, true))
  const range = salesRange({ ...filters, desde: desdeField.value, hasta: hastaField.value }, today)!
  const { errors, valid } = validateRange(range.desde, range.hasta)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 basis-64 items-start gap-3">
          {menuButton}
          <div>
            <h1 className="text-title text-text">Inicio</h1>
            <p className="mt-1 text-small text-text-muted">
              Resumen {tenantName ? `de ${tenantName} · ` : 'de '}
              {valid ? rangeLabel(range) : 'elige un período válido'}
            </p>
          </div>
        </div>
        <div className={filters.periodo === 'personalizado' ? 'min-w-0 flex-1 basis-[640px]' : 'ml-auto min-w-0 max-w-full'}>
          <PeriodPicker
            layout="inline"
            action={
              <Link to="/ventas/nueva" className={buttonClasses('primary')} data-variant="primary">
                {GLOSSARY.registerSale}
              </Link>
            }
            options={SALES_PERIOD_OPTIONS.filter((option) => option.value !== 'todas')}
            value={filters.periodo}
            onChange={(periodo: Period) => update(periodo === 'personalizado' ? { periodo, ...range } : { periodo: periodo === 'todas' ? 'este-mes' : periodo })}
            range={valid ? range : null}
            custom={{ desde: desdeField, hasta: hastaField, errors }}
          />
        </div>
      </div>

      {valid ? <KpiBlock desde={range.desde} hasta={range.hasta} /> : (
        <p role="alert" className="text-small text-error">Revisa las fechas para ver los indicadores y las ventas del período.</p>
      )}

      <div>
        <p className="mb-4 text-small text-text-muted">Stock y saldos muestran el estado actual y no dependen del período.</p>
        <div className="grid gap-6 xl:grid-cols-5">
          <div className="min-w-0 xl:col-span-3">
            <LowStockBlock />
          </div>
          <div className="min-w-0 xl:col-span-2">
            <AccountsBlock />
          </div>
        </div>
      </div>

      {valid && <LatestSalesBlock range={range} />}
    </div>
  )
}

function KpiBlock({ desde, hasta }: { desde: string; hasta: string }) {
  const kpis = useQuery({ queryKey: ['kpis', desde, hasta], queryFn: () => fetchKpis(desde, hasta) })
  useReportedError(kpis.error)

  if (kpis.isError) {
    return (
      <div className="rounded-surface border border-border bg-surface">
        <ErrorState message="No pudimos cargar los indicadores del período." onRetry={() => void kpis.refetch()} />
      </div>
    )
  }

  const value = (pick: (data: NonNullable<typeof kpis.data>) => number) =>
    kpis.data ? formatCurrency(pick(kpis.data)) : undefined

  return (
    <div className="grid gap-6 sm:grid-cols-2 2xl:grid-cols-4">
      <IndicatorCard dense label="Ventas sin IVA" accent="success" icon={TrendingUp} value={value((d) => d.netSales)} detail="Sin IVA y sin facturas anuladas." />
      <IndicatorCard
        dense
        label="Costo de lo vendido"
        accent="warning"
        icon={Package}
        value={value((d) => d.costOfSales)}
        detail="Costo de los productos que vendiste."
      />
      <IndicatorCard
        dense
        label="Utilidad bruta"
        accent="info"
        icon={ChartPie}
        value={value((d) => d.grossProfit)}
        detail="Ventas menos costo de lo vendido."
      />
      <IndicatorCard
        dense
        label="Utilidad neta"
        accent="brand-strong"
        icon={Wallet}
        value={value((d) => d.netProfit)}
        negative={kpis.data ? kpis.data.netProfit < 0 : false}
        detail="Utilidad bruta más otros ingresos, menos gastos."
      />
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
  { header: 'Código', render: (p) => <span className="codigo">{p.code}</span> },
  { header: 'Producto', render: (p) => <span className="wrap-anywhere">{p.description}</span> },
  {
    header: 'Stock',
    align: 'right',
    render: (p) => <span className={p.status === 'BAJO' ? '' : 'text-error'}>{p.quantity ?? 0}</span>,
  },
  { header: 'Estado', render: (p) => p.status !== 'NORMAL' && <StatusBadge status={stockBadge[p.status]} /> },
]

/** La misma fila en tarjeta, bajo md. */
function lowStockCard(p: LowStockRow) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <span className="flex min-w-0 flex-col gap-1">
        <span className="codigo text-small text-text">{p.code}</span>
        <span className="text-body wrap-anywhere text-text">{p.description}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="tabular text-small text-text">
          <span className="text-text-muted">Stock </span>
          <span className={p.status === 'BAJO' ? '' : 'text-error'}>{p.quantity ?? 0}</span>
        </span>
        {p.status !== 'NORMAL' && <StatusBadge status={stockBadge[p.status]} />}
      </span>
    </div>
  )
}

function LowStockBlock() {
  const products = useQuery({ queryKey: ['inventory', 'products'], queryFn: fetchProducts })
  const categories = useQuery({ queryKey: ['inventory', 'categories'], queryFn: fetchCategories })
  useReportedError(products.error)
  useReportedError(categories.error)
  const rows =
    products.data && categories.data ? lowStockProducts(products.data, categories.data, ROW_LIMIT) : undefined
  const alerts = products.data && categories.data ? stockAlertCounts(products.data, categories.data) : undefined

  return (
    <Section title="Productos con stock bajo" link={{ to: '/inventario', label: 'Ver inventario' }}>
      {alerts && alerts.withAlert > 0 && (
        <p className="mb-4 text-small text-text-muted">
          Con alerta de stock: {alerts.withAlert}
          {alerts.outOfStock > 0 && ` · ${alerts.outOfStock} sin stock`}
        </p>
      )}
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
        card={lowStockCard}
        cardsLabel="Productos con stock bajo"
      />
    </Section>
  )
}

function AccountsBlock() {
  const accounts = useQuery({ queryKey: ['treasury', 'accounts'], queryFn: fetchAccounts })
  const balance = useQuery({ queryKey: ['treasury', 'balance'], queryFn: fetchBalance })
  useReportedError(accounts.error)
  useReportedError(balance.error)
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
          {accounts.data.map((account) => {
            const Icon = accountIcons[account.type]
            return (
              <li key={account.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-border py-3">
                <div className="flex min-w-0 flex-1 basis-40 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-canvas text-text-muted" aria-hidden>
                    <Icon {...iconMd} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-body font-semibold wrap-anywhere text-text">{account.name}</p>
                    <p className="text-small text-text-muted">{accountTypeLabels[account.type] ?? EMPTY_VALUE}</p>
                  </div>
                </div>
                <span className="monto ml-auto text-body whitespace-nowrap text-text">{formatCurrency(account.currentBalance)}</span>
              </li>
            )
          })}
        </ul>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-control bg-canvas p-4">
          <span className="text-small text-text-muted">Total disponible</span>
          <span className="monto text-figure whitespace-nowrap text-text">{formatCurrency(balance.data.total)}</span>
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
  { header: 'N.º factura', render: (s) => <span className="codigo">{s.invoiceNumber}</span> },
  { header: 'Cliente', render: (s) => <span className="wrap-anywhere">{s.customer?.name ?? EMPTY_VALUE}</span> },
  { header: 'Fecha', render: (s) => formatDate(s.invoiceDate) },
  { header: 'Forma de pago', render: (s) => paymentTypeLabels[s.paymentType] ?? EMPTY_VALUE },
  { header: 'Total', align: 'right', render: (s) => <span className="monto whitespace-nowrap">{formatCurrency(s.total)}</span> },
  { header: 'Estado', render: (s) => <StatusBadge status={s.status} /> },
]

/** La misma fila en tarjeta, bajo md. */
function saleCard(s: Sale) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <span className="flex min-w-0 flex-col gap-1">
        <span className="codigo text-small text-text">{s.invoiceNumber}</span>
        <span className="text-body wrap-anywhere text-text">{s.customer?.name ?? EMPTY_VALUE}</span>
        <span className="text-small text-text-muted">
          {formatDate(s.invoiceDate)} · {paymentTypeLabels[s.paymentType] ?? EMPTY_VALUE}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="monto text-body font-semibold whitespace-nowrap text-text">{formatCurrency(s.total)}</span>
        <StatusBadge status={s.status} />
      </span>
    </div>
  )
}

/** Las mas recientes por fecha de factura; a igual fecha, la de id mayor. */
function latestSales(sales: Sale[], range: DateRange): Sale[] {
  return [...sales]
    .filter((sale) => sale.status !== 'ANULADA' && sale.invoiceDate >= range.desde && sale.invoiceDate <= range.hasta)
    .sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate) || b.id - a.id)
    .slice(0, ROW_LIMIT)
}

function LatestSalesBlock({ range }: { range: DateRange }) {
  const sales = useQuery({ queryKey: ['sales'], queryFn: fetchSales })
  useReportedError(sales.error)

  return (
    <Section title="Últimas ventas" link={{ to: `/ventas?${filtersToParams({ ...DEFAULT_FILTERS, periodo: 'personalizado', ...range })}`, label: 'Ver todas' }}>
      <DataTable
        columns={salesColumns}
        rows={sales.data ? latestSales(sales.data, range) : undefined}
        rowKey={(s) => s.id}
        loading={sales.isPending}
        error={sales.isError}
        onRetry={() => void sales.refetch()}
        emptyMessage="No hay ventas en el período elegido."
        card={saleCard}
        cardsLabel="Últimas ventas"
      />
    </Section>
  )
}
