import { useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { FileSpreadsheet, Wallet } from 'lucide-react'
import { NewAccountModal, TransferModal } from '../accounts/AccountModals'
import {
  ACCOUNTS_KEY,
  BALANCE_KEY,
  fetchPeriodMovements,
  fetchPurchases,
  type TreasuryMovement,
} from '../accounts/accountsApi'
import {
  ACCOUNT_TYPE_LABELS,
  ALL_ACCOUNTS,
  PERIOD_OPTIONS,
  accountMovements,
  accountsFiltersToParams,
  activeRange,
  formatSignedAmount,
  invoiceNumbers,
  movementOrigin,
  parseAccountsFilters,
  periodLabel,
  periodTotals,
  selectedAccountId,
  type AccountsFilters,
  type OriginContext,
  type PeriodKey,
} from '../accounts/accountsView'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { DataTable, type Column } from '../components/DataTable'
import { Pagination } from '../components/Pagination'
import { StatusBadge } from '../components/StatusBadge'
import { TextField } from '../components/TextField'
import { EmptyState, ErrorState, Skeleton } from '../components/states'
import { showToast } from '../components/toast'
import { fetchAccounts, fetchBalance, fetchSales, type Account } from '../dashboard/dashboardApi'
import { useBreadcrumbTail } from '../layout/breadcrumb'
import { apiDownload } from '../lib/api'
import { errorMessage } from '../lib/errorMessage'
import { formatCurrency, formatDate } from '../lib/format'
import { paginate } from '../lib/pagination'
import { REPORT_MAX_DAYS, exportPath } from '../reports/reports'
import { businessToday } from '../sales/salesList'

const card = 'rounded-card border border-border bg-surface shadow-card'
const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

type ModalName = 'account' | 'transfer' | null

/** Cuentas: saldos, movimientos del periodo, nueva cuenta, transferencia y exportacion. */
export function AccountsPage() {
  const [today] = useState(() => businessToday())
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = parseAccountsFilters(searchParams)
  const range = activeRange(filters, today)
  const [modal, setModal] = useState<ModalName>(null)
  const periodRef = useRef<HTMLDivElement>(null)
  const exporting = useRef(false)

  const accounts = useQuery({ queryKey: ACCOUNTS_KEY, queryFn: fetchAccounts })
  const balance = useQuery({ queryKey: BALANCE_KEY, queryFn: fetchBalance })
  const movements = useQuery({
    queryKey: ['treasury', 'movements', 'periodo', range.desde, range.hasta],
    queryFn: () => fetchPeriodMovements(range.desde, range.hasta),
    enabled: range.valid,
  })
  // Numeros de factura para Origen: solo si el periodo tiene movimientos de ventas o compras.
  const needsSales = movements.data?.some((movement) => movement.saleId !== null) ?? false
  const needsPurchases = movements.data?.some((movement) => movement.purchaseId !== null) ?? false
  const sales = useQuery({ queryKey: ['sales'], queryFn: fetchSales, enabled: needsSales })
  const purchases = useQuery({ queryKey: ['purchases'], queryFn: fetchPurchases, enabled: needsPurchases })

  const accountList = accounts.data ?? []
  const accountId = selectedAccountId(filters.cuenta, accountList)
  const selected = accountList.find((account) => account.id === accountId)
  const allSelected = accounts.isSuccess && accountId === null
  useBreadcrumbTail(selected?.name ?? (allSelected && accountList.length > 0 ? 'Todas las cuentas' : undefined))

  function update(change: Partial<AccountsFilters>) {
    setSearchParams(accountsFiltersToParams({ ...filters, pagina: 1, ...change }))
  }

  function choosePeriod(periodo: PeriodKey) {
    // Personalizado parte del rango que se estaba viendo.
    update(periodo === 'personalizado' ? { periodo, desde: range.desde, hasta: range.hasta } : { periodo })
  }

  const download = useMutation({
    mutationFn: () =>
      apiDownload(exportPath({ type: 'MOVIMIENTOS', format: 'XLSX', desde: range.desde, hasta: range.hasta, accountId })),
    onSuccess: (fileName) => showToast(`Reporte generado: ${fileName}`),
    onSettled: () => {
      exporting.current = false
    },
  })

  function exportExcel() {
    if (!range.valid || exporting.current) return
    exporting.current = true
    download.mutate()
  }

  const canTransfer = accountList.length >= 2
  const scopeMovements = movements.data ? accountMovements(movements.data, accountId) : undefined
  const totals = scopeMovements ? periodTotals(scopeMovements) : undefined
  const scopeName = selected?.name ?? 'Todas las cuentas'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 text-text">Cuentas</h1>
          <p className="mt-1 text-small text-text-muted">Saldos de caja y bancos, y el detalle de cada movimiento.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button
              variant="secondary"
              onClick={exportExcel}
              disabled={!range.valid || download.isPending}
              aria-busy={download.isPending || undefined}
              aria-describedby={!range.valid ? 'export-help' : undefined}
            >
              <FileSpreadsheet size={16} strokeWidth={1.5} aria-hidden />
              {download.isPending ? 'Exportando…' : 'Exportar a Excel'}
            </Button>
            <Button variant="secondary" onClick={() => setModal('account')}>
              Nueva cuenta
            </Button>
            <Button
              onClick={() => setModal('transfer')}
              disabled={!canTransfer}
              aria-describedby={accounts.isSuccess && !canTransfer ? 'transfer-help' : undefined}
            >
              Nueva transferencia
            </Button>
          </div>
          {!range.valid && (
            <p id="export-help" className="text-small text-text-muted">
              Para exportar, elige un período válido de hasta {REPORT_MAX_DAYS} días.
            </p>
          )}
          {accounts.isSuccess && !canTransfer && (
            <p id="transfer-help" className="text-small text-text-muted">
              Necesitas al menos dos cuentas para transferir.
            </p>
          )}
        </div>
      </div>

      {download.isError && (
        <Alert tone="error" title="No pudimos generar el reporte">
          {errorMessage(download.error)}
        </Alert>
      )}

      <AccountCards
        accounts={accounts}
        balance={balance}
        selectedId={accountId}
        allSelected={allSelected}
        onSelect={(cuenta) => update({ cuenta })}
        onNewAccount={() => setModal('account')}
      />

      {accounts.isSuccess && accountList.length > 0 && (
        <>
          <section className={`${card} p-6`} aria-labelledby="period-title">
            <h2 id="period-title" className="text-h3 text-text">
              {scopeName} · {periodLabel(filters)}
            </h2>
            <div ref={periodRef} role="group" aria-label="Período" className="mt-4 flex flex-wrap gap-2">
              {PERIOD_OPTIONS.map((option) => {
                const active = option.value === filters.periodo
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => choosePeriod(option.value)}
                    className={`min-h-touch rounded-pill border px-4 text-small font-medium transition-colors duration-(--duration-fast) ${focusRing} ${
                      active ? 'border-nav bg-nav text-text-inverse' : 'border-border bg-surface text-text hover:bg-neutral-100'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
            {filters.periodo === 'personalizado' && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:max-w-xl">
                <TextField
                  label="Desde"
                  type="date"
                  value={filters.desde}
                  max={today}
                  onChange={(event) => update({ desde: event.target.value })}
                  error={range.errors.desde}
                />
                <TextField
                  label="Hasta"
                  type="date"
                  value={filters.hasta}
                  max={today}
                  onChange={(event) => update({ hasta: event.target.value })}
                  error={range.errors.hasta}
                />
              </div>
            )}
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <PeriodTotal label="Ingresos del período" value={totals && formatCurrency(totals.income)} tone="text-success" />
              <PeriodTotal label="Egresos del período" value={totals && formatCurrency(totals.expense)} tone="text-error" />
            </dl>
            {range.valid && movements.isError && (
              <p className="mt-2 text-small text-text-muted">No pudimos calcular los totales: revisa el bloque de movimientos.</p>
            )}
          </section>

          <MovementsBlock
            filters={filters}
            rangeValid={range.valid}
            movements={movements}
            scopeMovements={scopeMovements}
            showAccount={accountId === null}
            origin={{
              movements: movements.data ?? [],
              saleNumbers: invoiceNumbers(sales.data),
              purchaseNumbers: invoiceNumbers(purchases.data),
            }}
            numbersFailed={sales.isError || purchases.isError}
            onRetryNumbers={() => {
              if (sales.isError) void sales.refetch()
              if (purchases.isError) void purchases.refetch()
            }}
            onPageChange={(pagina) => setSearchParams(accountsFiltersToParams({ ...filters, pagina }))}
            onChangePeriod={() => periodRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus()}
          />
        </>
      )}

      {modal === 'account' && (
        <NewAccountModal
          onClose={() => setModal(null)}
          onCreated={(account) => {
            setModal(null)
            update({ cuenta: account.id })
          }}
        />
      )}
      {modal === 'transfer' && (
        <TransferModal accounts={accountList} defaultOriginId={accountId} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

function PeriodTotal({ label, value, tone }: { label: string; value: string | undefined; tone: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 rounded-control bg-neutral-100 px-4 py-3">
      <dt className="text-small text-text-muted">{label}</dt>
      <dd className={`tabular font-display text-h3 font-bold ${tone}`}>
        {value ?? <Skeleton className="h-6 w-28" />}
      </dd>
    </div>
  )
}

interface QueryState<T> {
  data: T | undefined
  isPending: boolean
  isError: boolean
  refetch: () => unknown
}

interface AccountCardsProps {
  accounts: QueryState<Account[]>
  balance: QueryState<{ total: number }>
  selectedId: number | null
  allSelected: boolean
  onSelect: (cuenta: AccountsFilters['cuenta']) => void
  onNewAccount: () => void
}

/** Todas las cuentas y una tarjeta por cuenta; se desplazan en horizontal si no caben. */
function AccountCards({ accounts, balance, selectedId, allSelected, onSelect, onNewAccount }: AccountCardsProps) {
  if (accounts.isError) {
    return (
      <div className={card}>
        <ErrorState message="No pudimos cargar las cuentas." onRetry={() => void accounts.refetch()} />
      </div>
    )
  }
  if (accounts.isPending || !accounts.data) {
    return (
      <div className="flex gap-4" aria-busy>
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-28 w-64 shrink-0 rounded-card" />
        ))}
      </div>
    )
  }
  if (accounts.data.length === 0) {
    return (
      <div className={card}>
        <EmptyState
          message="Aún no tienes cuentas. Crea la caja o el banco donde recibes el dinero."
          action={<Button onClick={onNewAccount}>Nueva cuenta</Button>}
        />
      </div>
    )
  }

  const tile = (active: boolean) =>
    `flex w-64 shrink-0 flex-col gap-1 rounded-card border bg-surface p-5 text-left shadow-card transition-colors duration-(--duration-fast) hover:bg-neutral-100 ${focusRing} ${
      active ? 'border-brand ring-1 ring-brand' : 'border-border'
    }`

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto pb-1 [scrollbar-width:thin]">
      <ul className="flex min-w-max gap-4 p-0.5" role="group" aria-label="Cuentas">
        <li>
          <button type="button" aria-pressed={allSelected} onClick={() => onSelect(ALL_ACCOUNTS)} className={tile(allSelected)}>
            <span className="flex items-center gap-2 text-small font-medium text-text">
              <Wallet size={16} strokeWidth={1.5} className="text-text-muted" aria-hidden />
              Todas las cuentas
            </span>
            {balance.isError ? (
              <span className="text-small text-text">Total no disponible</span>
            ) : balance.data ? (
              <span className="tabular font-display text-h2 font-bold text-text">{formatCurrency(balance.data.total)}</span>
            ) : (
              <Skeleton className="h-8 w-40" />
            )}
            <span className="text-small text-text-muted">Total disponible</span>
          </button>
        </li>
        {[...accounts.data]
          .sort((a, b) => a.id - b.id)
          .map((account) => {
            const active = account.id === selectedId
            return (
              <li key={account.id}>
                <button type="button" aria-pressed={active} onClick={() => onSelect(account.id)} className={tile(active)}>
                  <span className="flex items-center gap-2 text-small font-medium text-text">
                    <Wallet size={16} strokeWidth={1.5} className={active ? 'text-brand-ink' : 'text-text-muted'} aria-hidden />
                    {account.name}
                  </span>
                  <span className="tabular font-display text-h2 font-bold text-text">{formatCurrency(account.currentBalance)}</span>
                  <span className="text-small text-text-muted">{ACCOUNT_TYPE_LABELS[account.type]} · Saldo actual</span>
                </button>
              </li>
            )
          })}
      </ul>
      </div>
      {balance.isError && (
        <div role="alert" className="flex flex-wrap items-center gap-2">
          <span className="text-small text-text">No pudimos cargar el total disponible.</span>
          <Button variant="text" className="px-2" onClick={() => void balance.refetch()}>
            Reintentar
          </Button>
        </div>
      )}
    </div>
  )
}

interface MovementsBlockProps {
  filters: AccountsFilters
  rangeValid: boolean
  movements: QueryState<TreasuryMovement[]>
  scopeMovements: TreasuryMovement[] | undefined
  showAccount: boolean
  origin: OriginContext
  numbersFailed: boolean
  onRetryNumbers: () => void
  onPageChange: (page: number) => void
  onChangePeriod: () => void
}

function MovementsBlock(props: MovementsBlockProps) {
  const { filters, rangeValid, movements, scopeMovements, showAccount, origin, numbersFailed, onRetryNumbers } = props

  const amountClass = (movement: TreasuryMovement) => (movement.type === 'INGRESO' ? 'text-success' : 'text-error')
  const columns: Column<TreasuryMovement>[] = [
    { header: 'Fecha', render: (m) => <span className="tabular whitespace-nowrap">{formatDate(m.date)}</span> },
    ...(showAccount ? [{ header: 'Cuenta', render: (m: TreasuryMovement) => m.accountName ?? '' }] : []),
    { header: 'Tipo', render: (m) => <StatusBadge status={m.type} /> },
    { header: 'Concepto', render: (m) => m.concept },
    { header: 'Origen', render: (m) => <span className="font-mono text-small whitespace-nowrap">{movementOrigin(m, origin)}</span> },
    {
      header: 'Monto',
      align: 'right',
      render: (m) => <span className={`font-medium whitespace-nowrap ${amountClass(m)}`}>{formatSignedAmount(m)}</span>,
    },
  ]

  let content: ReactNode
  if (!rangeValid) {
    content = <EmptyState message="Corrige el período para ver los movimientos." />
  } else if (movements.isError) {
    content = <ErrorState message="No pudimos cargar los movimientos." onRetry={() => void movements.refetch()} />
  } else if (!scopeMovements) {
    content = (
      <DataTable columns={columns} rows={undefined} rowKey={(m) => m.id} loading error={false} onRetry={() => undefined} emptyMessage="" skeletonRows={6} />
    )
  } else if (scopeMovements.length === 0) {
    content = (
      <EmptyState
        message="No hay movimientos en este período."
        action={
          <Button variant="secondary" onClick={props.onChangePeriod}>
            Cambiar el período
          </Button>
        }
      />
    )
  } else {
    const page = paginate(scopeMovements, filters.pagina)
    content = (
      <>
        {numbersFailed && (
          <div role="status" className="mb-3 flex flex-wrap items-center gap-2 text-small text-text-muted">
            No pudimos cargar los números de factura; Origen muestra solo VENTA o COMPRA.
            <Button variant="text" className="px-2" onClick={onRetryNumbers}>
              Reintentar
            </Button>
          </div>
        )}
        <div className="hidden md:block">
          <DataTable columns={columns} rows={page.rows} rowKey={(m) => m.id} loading={false} error={false} onRetry={() => undefined} emptyMessage="" />
        </div>
        <ul className="flex flex-col gap-3 md:hidden" aria-label="Movimientos">
          {page.rows.map((movement) => (
            <li key={movement.id} className="flex items-start justify-between gap-4 rounded-control border border-border p-4">
              <span className="flex min-w-0 flex-col gap-1">
                <span className="tabular text-small text-text-muted">
                  {formatDate(movement.date)}
                  {showAccount && movement.accountName ? ` · ${movement.accountName}` : ''}
                </span>
                <span className="text-body text-text">{movement.concept}</span>
                <span className="font-mono text-small text-text-muted">{movementOrigin(movement, origin)}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <span className={`tabular text-body font-medium ${amountClass(movement)}`}>{formatSignedAmount(movement)}</span>
                <StatusBadge status={movement.type} />
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t border-border pt-4">
          <Pagination page={page} itemLabel="movimientos" onPageChange={props.onPageChange} />
        </div>
      </>
    )
  }

  return (
    <section className={`${card} p-4`} aria-labelledby="movements-title">
      <h2 id="movements-title" className="mb-4 px-2 text-h3 text-text">
        Movimientos
      </h2>
      {content}
    </section>
  )
}
