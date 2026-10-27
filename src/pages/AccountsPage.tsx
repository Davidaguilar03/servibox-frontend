import { Fragment, useRef, useState, type ReactNode } from 'react'
import { useOutletContext, useSearchParams } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowDownRight, ArrowUpRight, Check, FileSpreadsheet, Landmark, Layers, Pencil, Smartphone, Wallet } from 'lucide-react'
import { useReportedError } from '../api/reportError'
import { EditAccountModal, NewAccountModal, TransferModal } from '../accounts/AccountModals'
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
  balancesByType,
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
import { ListHeader } from '../components/ListHeader'
import { IconButton } from '../components/IconButton'
import { Pagination } from '../components/Pagination'
import { PeriodPicker } from '../components/PeriodPicker'
import { StatusBadge } from '../components/StatusBadge'
import { EmptyState, ErrorState, Skeleton } from '../components/states'
import { showToast } from '../components/toast'
import { fetchAccounts, fetchBalance, fetchSales, type Account } from '../dashboard/dashboardApi'
import { useBreadcrumbTail } from '../layout/breadcrumb'
import type { AppShellContext } from '../layout/AppShell'
import { apiDownload } from '../lib/api'
import { businessToday } from '../lib/businessDate'
import { formatCurrency, formatDate } from '../lib/format'
import { paginate } from '../lib/pagination'
import { useElementWidth } from '../lib/useElementWidth'
import { useUrlTextParam } from '../lib/useUrlTextParam'
import { REPORT_MAX_DAYS, exportPath } from '../reports/reports'
import { iconLg, iconSm } from '../components/icons'
import { MovementChart } from '../accounts/MovementChart'
import { rangeLabel } from '../lib/period'

/** Ancho del recuadro desde el que caben todas las columnas de movimientos. */
const MOVEMENTS_TABLE_FULL = 800

const card = 'rounded-surface border border-border bg-surface'
const focusRing = 'focus-ring'

type ModalName = 'account' | 'transfer' | null

/** Cuentas: saldos, movimientos del periodo, nueva cuenta, transferencia y exportacion. */
export function AccountsPage() {
  const { menuButton } = useOutletContext<AppShellContext>()
  const [today] = useState(() => businessToday())
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = parseAccountsFilters(searchParams)
  const range = activeRange(filters, today)
  const [modal, setModal] = useState<ModalName>(null)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
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
  const typeTotals = accounts.data ? balancesByType(accounts.data) : null
  const accountId = selectedAccountId(filters.cuenta, accountList)
  const selected = accountList.find((account) => account.id === accountId)
  const allSelected = accounts.isSuccess && accountId === null
  useBreadcrumbTail(selected?.name ?? (allSelected && accountList.length > 0 ? 'Todas las cuentas' : undefined), 'append')

  // Las fechas personalizadas reemplazan la entrada del historial, como el buscador.
  function update(change: Partial<AccountsFilters>, replace = false) {
    setSearchParams(accountsFiltersToParams({ ...filters, pagina: 1, ...change }), { replace })
  }
  const desdeField = useUrlTextParam(filters.desde, (desde) => update({ desde }, true))
  const hastaField = useUrlTextParam(filters.hasta, (hasta) => update({ hasta }, true))

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
  const downloadError = useReportedError(download.error)

  function exportExcel() {
    if (!range.valid || exporting.current) return
    exporting.current = true
    download.mutate()
  }

  const canTransfer = accountList.length >= 2
  const scopeMovements = range.valid && movements.data ? accountMovements(movements.data, accountId) : undefined
  const globalTotals = range.valid && movements.data ? periodTotals(movements.data) : undefined
  const totals = scopeMovements ? periodTotals(scopeMovements) : undefined
  const scopeName = selected?.name ?? 'Todas las cuentas'

  const transferButton = (
    <Button
      variant={canTransfer ? 'primary' : 'secondary'}
      onClick={() => setModal('transfer')}
      disabled={!canTransfer}
      aria-describedby={accounts.isSuccess && !canTransfer ? 'transfer-help' : undefined}
    >
      Nueva transferencia
    </Button>
  )
  const newAccountButton = (
    <Button variant={canTransfer ? 'secondary' : 'primary'} onClick={() => setModal('account')}>
      Nueva cuenta
    </Button>
  )

  return (
    <div className="flex flex-col gap-6">
      <ListHeader
        leading={menuButton}
        title="Cuentas"
        subtitle="Saldos de caja y bancos, y el detalle de cada movimiento."
        // El primario depende del estado: sin dos cuentas no hay transferencia y el primario es Nueva cuenta.
        primary={canTransfer ? transferButton : newAccountButton}
        secondary={[
          <Button
            key="exportar"
            variant="secondary"
            onClick={exportExcel}
            disabled={!range.valid || download.isPending}
            aria-busy={download.isPending || undefined}
            aria-describedby={!range.valid ? 'export-help' : undefined}
          >
            <FileSpreadsheet {...iconSm} aria-hidden />
            {download.isPending ? 'Exportando…' : 'Exportar a Excel'}
          </Button>,
          canTransfer ? <Fragment key="cuenta">{newAccountButton}</Fragment> : <Fragment key="transferencia">{transferButton}</Fragment>,
        ]}
        note={
          <>
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
          </>
        }
      />

      {downloadError && download.isError && (
        <Alert tone="error" title="No pudimos generar el reporte">
          {downloadError}
        </Alert>
      )}

      <section className={`${card} p-4 sm:p-6`} aria-labelledby="balance-title">
        <h2 id="balance-title" className="sr-only">Saldos actuales</h2>
        <dl className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-4">
          <SummaryGroup label="Todas las cuentas" icon={Layers} tone="bg-neutral-200 text-text"
            value={balance.data && formatCurrency(balance.data.total)} error={balance.isError} />
          <SummaryGroup label="Efectivo" icon={Wallet} tone="bg-warning-bg text-warning-ink"
            value={typeTotals && formatCurrency(typeTotals.EFECTIVO)} error={accounts.isError} />
          <SummaryGroup label="Bancos" icon={Landmark} tone="bg-info-bg text-info-ink"
            value={typeTotals && formatCurrency(typeTotals.BANCO)} error={accounts.isError} />
          <SummaryGroup label="Digital" icon={Smartphone} tone="bg-violet-bg text-violet-ink"
            value={typeTotals && formatCurrency(typeTotals.DIGITAL)} error={accounts.isError} />
        </dl>
        {balance.isError && <div role="alert" className="mt-2 flex flex-wrap items-center gap-2 text-small text-text">
          No pudimos cargar el total disponible. <Button variant="text" onClick={() => void balance.refetch()}>Reintentar</Button>
        </div>}
        {accounts.isError && <div role="alert" className="mt-2 flex flex-wrap items-center gap-2 text-small text-text">
          No pudimos cargar el reparto por tipo. <Button variant="text" onClick={() => void accounts.refetch()}>Reintentar</Button>
        </div>}
        <div className="mt-5 border-t border-border pt-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 id="period-title" className="text-section text-text">
                  Movimientos del período · Todas las cuentas
                </h2>
              </div>
              <div ref={periodRef} className={filters.periodo === 'personalizado' ? 'w-full min-w-0 lg:w-1/2' : 'w-full min-w-0 sm:w-auto sm:max-w-full'}>
                <PeriodPicker
                  layout="toolbar"
                  options={PERIOD_OPTIONS}
                  value={filters.periodo}
                  onChange={choosePeriod}
                  range={range.valid ? { desde: range.desde, hasta: range.hasta } : null}
                  custom={{
                    desde: { ...desdeField, max: today },
                    hasta: { ...hastaField, max: today },
                    errors: range.errors,
                  }}
                />
              </div>
            </div>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <PeriodTotal label="Ingresos del período" value={globalTotals && formatCurrency(globalTotals.income)} tone="income" unavailable={!range.valid ? 'Rango inválido' : movements.isError ? 'No disponible' : undefined} />
              <PeriodTotal label="Egresos del período" value={globalTotals && formatCurrency(globalTotals.expense)} tone="expense" unavailable={!range.valid ? 'Rango inválido' : movements.isError ? 'No disponible' : undefined} />
            </dl>
            <p className="mt-2 text-small text-text-muted">Sin saldo inicial. Las transferencias entre cuentas aparecen como ingreso y egreso, no como ingresos o gastos del negocio.</p>
            {range.valid && movements.isError && (
              <p className="mt-2 text-small text-text-muted">No pudimos calcular los totales: revisa el bloque de movimientos.</p>
            )}
        </div>
      </section>

      <AccountCards
        accounts={accounts}
        selectedId={accountId}
        allSelected={allSelected}
        onSelect={(cuenta) => update({ cuenta })}
        onNewAccount={() => setModal('account')}
        onEdit={setEditingAccount}
      />

      {accounts.isSuccess && accountList.length > 0 && (
        <>
          <section className={`${card} border-t-2 border-t-border-accent p-4 sm:p-6`} aria-labelledby="scope-title">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 id="scope-title" className="text-section text-text">{scopeName} · Movimientos del período</h2>
                <p className="text-small text-text-muted">{range.valid ? rangeLabel(range) : periodLabel(filters)}</p>
              </div>
              {totals && <dl className="flex flex-wrap gap-4 text-small">
                <div><dt className="text-text-muted">Ingresos</dt><dd className="monto font-semibold text-success-ink">{formatCurrency(totals.income)}</dd></div>
                <div><dt className="text-text-muted">Egresos</dt><dd className="monto font-semibold text-error">{formatCurrency(totals.expense)}</dd></div>
              </dl>}
            </div>
            {scopeMovements ? <div className="mt-5"><MovementChart movements={scopeMovements} desde={range.desde} hasta={range.hasta} /></div>
              : range.valid && !movements.isError ? <Skeleton className="mt-5 h-40 w-full" /> : null}
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
            onChangePeriod={() => periodRef.current?.querySelector<HTMLSelectElement>('select')?.focus()}
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
      {editingAccount && <EditAccountModal account={editingAccount} onClose={() => setEditingAccount(null)} />}
    </div>
  )
}

function PeriodTotal({ label, value, tone, unavailable }: { label: string; value: string | undefined; tone: 'income' | 'expense'; unavailable?: string }) {
  const Icon = tone === 'income' ? ArrowUpRight : ArrowDownRight
  return (
    <div className={`flex min-w-0 items-center gap-3 rounded-control border-l-2 p-4 ${tone === 'income' ? 'border-success bg-success-bg' : 'border-error bg-error-bg'}`}>
      <span className={`flex size-12 shrink-0 items-center justify-center rounded-control ${tone === 'income' ? 'text-success-ink' : 'text-error'}`} aria-hidden><Icon {...iconLg} /></span>
      <div className="min-w-0">
        <dt className="text-small text-text-muted">{label}</dt>
        <dd className={`monto text-figure wrap-anywhere ${tone === 'income' ? 'text-success-ink' : 'text-error'}`}>
          {value?.replace('$ ', '$\u00a0') ?? unavailable ?? <Skeleton className="h-6 w-28" />}
        </dd>
      </div>
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
  selectedId: number | null
  allSelected: boolean
  onSelect: (cuenta: AccountsFilters['cuenta']) => void
  onNewAccount: () => void
  onEdit: (account: Account) => void
}

function SummaryGroup({ label, icon: Icon, tone, value, error }: {
  label: string
  icon: typeof Wallet
  tone: string
  value: string | null | undefined
  error: boolean
}) {
  return <div className="flex min-w-0 items-center gap-3">
    <span className={`flex size-12 shrink-0 items-center justify-center rounded-control ${tone}`} aria-hidden><Icon {...iconLg} /></span>
    <div className="min-w-0">
      <dt className="text-small font-semibold text-text-muted">{label}</dt>
      <dd className="monto text-summary wrap-anywhere text-text">{error ? 'No disponible' : (value?.replace('$ ', '$\u00a0') ?? <Skeleton className="h-6 w-28" />)}</dd>
    </div>
  </div>
}

const ACCOUNT_ACCENTS = [
  { name: 'blue', border: 'border-t-info', outline: 'border-x-info border-b-info', icon: 'bg-info-bg text-info-ink', dot: 'bg-info', selected: 'bg-info-bg', selectedText: 'text-info-ink' },
  { name: 'amber', border: 'border-t-warning-ink', outline: 'border-x-warning-ink border-b-warning-ink', icon: 'bg-warning-bg text-warning-ink', dot: 'bg-warning', selected: 'bg-warning-bg', selectedText: 'text-warning-ink' },
  { name: 'slate', border: 'border-t-neutral-600', outline: 'border-x-neutral-600 border-b-neutral-600', icon: 'bg-neutral-200 text-text', dot: 'bg-neutral-600', selected: 'bg-neutral-100', selectedText: 'text-text' },
] as const

/** Los acentos provisionales dependen solo del id y no expresan estados financieros. */
function accountAccent(id: number) {
  return ACCOUNT_ACCENTS[Math.abs(id) % ACCOUNT_ACCENTS.length]!
}

function AccountCards({ accounts, selectedId, allSelected, onSelect, onNewAccount, onEdit }: AccountCardsProps) {
  if (accounts.isError) {
    return (
      <div className={card}>
        <ErrorState message="No pudimos cargar las cuentas." onRetry={() => void accounts.refetch()} />
      </div>
    )
  }
  if (accounts.isPending || !accounts.data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3" aria-busy>
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-36 rounded-surface" />
        ))}
      </div>
    )
  }
  if (accounts.data.length === 0) {
    return (
      <div className={card}>
        <EmptyState
          message="Aún no tienes cuentas. Crea la caja o el banco donde recibes el dinero."
          action={{ label: 'Nueva cuenta', onClick: onNewAccount }}
        />
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="accounts-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="accounts-title" className="text-section text-text">Tus cuentas</h2>
        <Button variant="secondary" onClick={() => onSelect(ALL_ACCOUNTS)} aria-pressed={allSelected}>
          {allSelected && <Check {...iconSm} aria-hidden />}
          {allSelected ? 'Todas las cuentas seleccionadas' : 'Ver todas las cuentas'}
        </Button>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3" role="group" aria-label="Cuentas">
        {[...accounts.data]
          .sort((a, b) => a.id - b.id)
          .map((account) => {
            const active = account.id === selectedId
            return (
              <li key={account.id}>
                <AccountTile
                  name={account.name}
                  detail={`${ACCOUNT_TYPE_LABELS[account.type]} · Saldo actual`}
                  value={formatCurrency(account.currentBalance)}
                  active={active}
                  included={allSelected}
                  accent={accountAccent(account.id)}
                  icon={account.type === 'BANCO' ? Landmark : account.type === 'DIGITAL' ? Smartphone : Wallet}
                  onSelect={() => onSelect(account.id)}
                  onEdit={() => onEdit(account)}
                />
              </li>
            )
          })}
      </ul>
    </section>
  )
}

function AccountTile({ name, detail, value, active, included, accent, icon: Icon, onSelect, onEdit }: {
  name: string
  detail: string
  value: string | undefined
  active: boolean
  included: boolean
  accent: (typeof ACCOUNT_ACCENTS)[number]
  icon: typeof Wallet
  onSelect: () => void
  onEdit: () => void
}) {
  const marked = active || included
  return (
    <div data-accent={accent.name} className={`relative h-full min-w-0 rounded-surface border-2 transition-colors duration-(--duration-fast) ${accent.border} ${marked ? `${accent.outline} ${accent.selected}` : 'border-x-border border-b-border bg-surface hover:bg-neutral-100'}`}>
      <button type="button" aria-pressed={active} onClick={onSelect} className={`flex h-full w-full min-w-0 items-start gap-3 rounded-surface p-4 text-left ${focusRing}`}>
        <span className={`flex size-12 shrink-0 items-center justify-center rounded-control ${accent.icon}`} aria-hidden><Icon {...iconLg} /></span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="break-words pr-10 text-small font-semibold text-text">{name}</span>
          <span className="monto text-figure wrap-anywhere text-text">{value?.replace('$ ', '$\u00a0') ?? <Skeleton className="h-7 w-32" />}</span>
          <span className="text-small text-text-muted">{detail}</span>
          {marked && <span className={`flex items-center gap-1 text-small font-semibold ${accent.selectedText}`}><Check {...iconSm} aria-hidden />{active ? 'Seleccionada' : 'Incluida en Todas las cuentas'}</span>}
        </span>
      </button>
      <span className={`absolute top-5 right-14 size-3 rounded-pill ${accent.dot}`} aria-hidden />
      <div className="absolute top-2 right-2">
        <IconButton aria-label={`Editar cuenta ${name}`} onClick={onEdit}>
          <Pencil {...iconSm} aria-hidden />
        </IconButton>
      </div>
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

  const amountClass = (movement: TreasuryMovement) => (movement.type === 'INGRESO' ? 'text-success-ink' : 'text-error')
  const [sectionRef, width] = useElementWidth<HTMLElement>()
  // En un recuadro angosto el origen pasa a una segunda linea bajo el concepto.
  const compact = width < MOVEMENTS_TABLE_FULL
  const columns: Column<TreasuryMovement>[] = [
    { header: 'Fecha', render: (m) => <span className="tabular whitespace-nowrap">{formatDate(m.date)}</span> },
    ...(showAccount ? [{ header: 'Cuenta', render: (m: TreasuryMovement) => m.accountName ?? '' }] : []),
    { header: 'Tipo', render: (m) => <StatusBadge status={m.type} /> },
    {
      header: 'Concepto',
      render: (m) =>
        compact ? (
          <span className="flex flex-col">
            <span className="wrap-anywhere">{m.concept}</span>
            <span className="wrap-anywhere text-small text-text-muted">{movementOrigin(m, origin)}</span>
          </span>
        ) : (
          <span className="wrap-anywhere">{m.concept}</span>
        ),
    },
    ...(compact
      ? []
      : [{ header: 'Origen', render: (m: TreasuryMovement) => <span className="wrap-anywhere text-small">{movementOrigin(m, origin)}</span> }]),
    {
      header: 'Monto',
      align: 'right',
      render: (m) => <span className={`monto font-semibold whitespace-nowrap ${amountClass(m)}`}>{formatSignedAmount(m)}</span>,
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
        action={{ label: 'Cambiar el período', onClick: props.onChangePeriod }}
      />
    )
  } else {
    const page = paginate(scopeMovements, filters.pagina)
    content = (
      <>
        {numbersFailed && (
          <div role="status" className="mb-3 flex flex-wrap items-center gap-2 text-small text-text-muted">
            No pudimos cargar los números de factura; Origen muestra solo VENTA o COMPRA.
            <Button variant="text" onClick={onRetryNumbers}>
              Reintentar
            </Button>
          </div>
        )}
        <div className="hidden md:block">
          <DataTable columns={columns} rows={page.rows} rowKey={(m) => m.id} loading={false} error={false} onRetry={() => undefined} emptyMessage="" dense={compact} />
        </div>
        <ul className="flex flex-col gap-3 md:hidden" aria-label="Movimientos">
          {page.rows.map((movement) => (
            <li key={movement.id} className="flex items-start justify-between gap-4 rounded-surface border border-border p-4">
              <span className="flex min-w-0 flex-col gap-1 wrap-anywhere">
                <span className="tabular text-small text-text-muted">
                  {formatDate(movement.date)}
                  {showAccount && movement.accountName ? ` · ${movement.accountName}` : ''}
                </span>
                <span className="text-body text-text">{movement.concept}</span>
                <span className="text-small text-text-muted">{movementOrigin(movement, origin)}</span>
              </span>
              <span className="flex min-w-0 flex-col items-end gap-1">
                <span className={`monto wrap-anywhere text-right text-body font-semibold ${amountClass(movement)}`}>{formatSignedAmount(movement).replace('$ ', '$\u00a0')}</span>
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
    <section ref={sectionRef} className={`${card} border-t-2 border-t-border-accent p-4`} aria-labelledby="movements-title">
      <h2 id="movements-title" className="mb-4 px-2 text-section text-text">
        Movimientos
      </h2>
      {content}
    </section>
  )
}
