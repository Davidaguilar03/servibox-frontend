import { useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'
import { ACCOUNTS_KEY, type TreasuryMovement } from '../accounts/accountsApi'
import { formatSignedAmount } from '../accounts/accountsView'
import { Button } from '../components/Button'
import { buttonClasses } from '../components/buttonStyles'
import { DataTable, type Column } from '../components/DataTable'
import { IndicatorCard } from '../components/IndicatorCard'
import { Pagination } from '../components/Pagination'
import { SearchField } from '../components/SearchField'
import { SelectField } from '../components/SelectField'
import { TextField } from '../components/TextField'
import { EmptyState, ErrorState } from '../components/states'
import { showToast } from '../components/toast'
import { fetchAccounts } from '../dashboard/dashboardApi'
import { businessToday } from '../lib/businessDate'
import { EMPTY_VALUE, formatCurrency, formatDate } from '../lib/format'
import { paginate } from '../lib/pagination'
import { useUrlTextParam } from '../lib/useUrlTextParam'
import { DeleteManualMovementModal, ManualMovementFormModal } from './ManualMovementModals'
import {
  DEFAULT_MANUAL_FILTERS,
  MANUAL_PERIOD_OPTIONS,
  filterManualMovements,
  manualFiltersToParams,
  manualRange,
  manualTotals,
  parseManualFilters,
  type ManualFilters,
} from './manualMovements'
import { fetchManualMovements, type ManualCategory } from './manualMovementsApi'

/** Lo que distingue Gastos operativos de Ingresos ocasionales. */
export interface ManualMovementsConfig {
  category: ManualCategory
  title: string
  subtitle: string
  /** Ruta del listado de facturas del modulo y su nombre, para el enlace de regreso. */
  listPath: string
  listLabel: string
  /** "gasto" o "ingreso", para los textos. */
  singular: string
  /** "Nuevo gasto": boton y titulo del modal de alta. */
  newLabel: string
  createdToast: string
  emptyMessage: string
  filteredEmptyMessage: string
  conceptPlaceholder: string
  accountHint: string
}

const card = 'rounded-card border border-border bg-surface shadow-card'
const iconButton =
  'flex size-touch items-center justify-center rounded-control text-text-muted transition-colors duration-(--duration-fast) hover:bg-neutral-100 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

type Dialog = { kind: 'create' } | { kind: 'edit'; movement: TreasuryMovement } | { kind: 'delete'; movement: TreasuryMovement }

/** Gastos operativos o Ingresos ocasionales: indicadores, filtros en la URL, tabla y modales. */
export function ManualMovementsPage({ config }: { config: ManualMovementsConfig }) {
  const queryClient = useQueryClient()
  const [today] = useState(() => businessToday())
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = parseManualFilters(searchParams)
  const range = manualRange(filters, today)
  const [dialog, setDialog] = useState<Dialog | null>(null)

  const movements = useQuery({
    queryKey: ['treasury', 'movements', config.category, range.desde, range.hasta],
    queryFn: () => fetchManualMovements(config.category, range.desde, range.hasta),
    enabled: range.valid,
  })
  const accounts = useQuery({ queryKey: ACCOUNTS_KEY, queryFn: fetchAccounts })

  function updateFilters(change: Partial<ManualFilters>, replace = false) {
    setSearchParams(manualFiltersToParams({ ...filters, pagina: 1, ...change }), { replace })
  }
  const clearFilters = () => updateFilters(DEFAULT_MANUAL_FILTERS)
  const search = useUrlTextParam(filters.q, (q) => updateFilters({ q }, true))

  // Un movimiento manual mueve el saldo de su cuenta y los indicadores del panel y Reportes.
  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['treasury'] })
    void queryClient.invalidateQueries({ queryKey: ['kpis'] })
  }

  const filtered = movements.data ? filterManualMovements(movements.data, filters) : undefined
  const totals = filtered ? manualTotals(filtered) : undefined
  const amountClass = config.category === 'GASTO_OPERATIVO' ? 'text-error' : 'text-success-ink'

  const actions = (movement: TreasuryMovement) => (
    <div className="flex justify-end gap-1">
      <button
        type="button"
        className={iconButton}
        aria-label={`Editar ${config.singular} ${movement.concept}`}
        title="Editar"
        onClick={() => setDialog({ kind: 'edit', movement })}
      >
        <Pencil size={18} strokeWidth={1.5} aria-hidden />
      </button>
      <button
        type="button"
        className={iconButton}
        aria-label={`Eliminar ${config.singular} ${movement.concept}`}
        title="Eliminar"
        onClick={() => setDialog({ kind: 'delete', movement })}
      >
        <Trash2 size={18} strokeWidth={1.5} aria-hidden />
      </button>
    </div>
  )

  const signed = (movement: TreasuryMovement) => (
    <span className={`tabular font-medium whitespace-nowrap ${amountClass}`}>{formatSignedAmount(movement)}</span>
  )

  const columns: Column<TreasuryMovement>[] = [
    { header: 'Fecha', render: (movement) => formatDate(movement.date) },
    { header: 'Concepto', render: (movement) => movement.concept },
    { header: 'Cuenta', render: (movement) => movement.accountName ?? EMPTY_VALUE },
    { header: 'Monto', align: 'right', render: signed },
    { header: 'Observaciones', render: (movement) => movement.notes || EMPTY_VALUE },
    { header: 'Acciones', align: 'right', render: actions },
  ]

  const retry = () => void movements.refetch()
  // Sin filtros propios (los de Limpiar) el vacio invita a crear; con filtros, a limpiarlos.
  const atDefaults = filters.cuenta === null && !filters.q && filters.periodo === DEFAULT_MANUAL_FILTERS.periodo
  let content: ReactNode
  if (!range.valid) {
    content = <EmptyState message="Elige un período válido para ver los movimientos." />
  } else if (movements.isError) {
    content = <ErrorState message="No pudimos cargar los movimientos." onRetry={retry} />
  } else if (!filtered) {
    content = (
      <DataTable columns={columns} rows={undefined} rowKey={(m) => m.id} loading error={false} onRetry={retry} emptyMessage="" skeletonRows={6} />
    )
  } else if (filtered.length === 0 && atDefaults) {
    content = (
      <EmptyState
        message={config.emptyMessage}
        action={<Button onClick={() => setDialog({ kind: 'create' })}>{config.newLabel}</Button>}
      />
    )
  } else if (filtered.length === 0) {
    content = (
      <EmptyState
        message={config.filteredEmptyMessage}
        action={
          <Button variant="secondary" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        }
      />
    )
  } else {
    const page = paginate(filtered, filters.pagina)
    content = (
      <>
        <div className="hidden md:block">
          <DataTable columns={columns} rows={page.rows} rowKey={(m) => m.id} loading={false} error={false} onRetry={retry} emptyMessage="" />
        </div>
        <ul className="flex flex-col gap-3 md:hidden" aria-label={config.title}>
          {page.rows.map((movement) => (
            <li key={movement.id} className="flex flex-col gap-2 rounded-control border border-border p-4">
              <div className="flex items-start justify-between gap-4">
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-body text-text">{movement.concept}</span>
                  <span className="text-small text-text-muted">
                    {formatDate(movement.date)} · {movement.accountName ?? EMPTY_VALUE}
                  </span>
                  {movement.notes && <span className="text-small text-text-muted">{movement.notes}</span>}
                </span>
                {signed(movement)}
              </div>
              {actions(movement)}
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t border-border pt-4">
          <Pagination
            page={page}
            itemLabel="movimientos"
            onPageChange={(pagina) => setSearchParams(manualFiltersToParams({ ...filters, pagina }))}
          />
        </div>
      </>
    )
  }

  const accountOptions = [
    { value: '', label: 'Todas' },
    ...[...(accounts.data ?? [])]
      .sort((a, b) => a.id - b.id)
      .map((account) => ({ value: String(account.id), label: account.name })),
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 text-text">{config.title}</h1>
          <p className="mt-1 text-small text-text-muted">{config.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link to={config.listPath} className={buttonClasses('secondary')}>
            Volver a {config.listLabel}
          </Link>
          <Button onClick={() => setDialog({ kind: 'create' })}>{config.newLabel}</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <IndicatorCard
          label="Total del período"
          value={totals ? formatCurrency(totals.amount) : undefined}
          error={movements.isError}
          onRetry={retry}
        />
        <IndicatorCard
          label="Movimientos"
          value={totals ? String(totals.count) : undefined}
          error={movements.isError}
          onRetry={retry}
        />
      </div>

      <div className={`${card} grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))_auto] lg:items-end`}>
        <SearchField label="Buscar" placeholder="Concepto" {...search} />
        {accounts.isError ? (
          <div className="flex flex-col gap-1.5" role="alert">
            <span className="text-small font-medium text-text">Cuenta</span>
            <span className="flex items-center gap-2 text-small text-text">
              No pudimos cargar las cuentas.
              <Button variant="text" className="px-2" onClick={() => void accounts.refetch()}>
                Reintentar
              </Button>
            </span>
          </div>
        ) : (
          <SelectField
            label="Cuenta"
            options={accountOptions}
            value={filters.cuenta === null ? '' : String(filters.cuenta)}
            disabled={accounts.isPending}
            onChange={(event) => updateFilters({ cuenta: event.target.value ? Number(event.target.value) : null })}
          />
        )}
        <SelectField
          label="Período"
          options={MANUAL_PERIOD_OPTIONS}
          value={filters.periodo}
          onChange={(event) => updateFilters({ periodo: event.target.value as ManualFilters['periodo'] })}
        />
        <Button variant="secondary" onClick={clearFilters}>
          Limpiar
        </Button>
        {filters.periodo === 'personalizado' && (
          <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2 lg:col-span-3">
            <TextField
              label="Desde"
              type="date"
              value={filters.desde}
              error={range.errors.desde}
              onChange={(event) => updateFilters({ desde: event.target.value }, true)}
            />
            <TextField
              label="Hasta"
              type="date"
              value={filters.hasta}
              error={range.errors.hasta}
              onChange={(event) => updateFilters({ hasta: event.target.value }, true)}
            />
          </div>
        )}
      </div>

      <section className={`${card} p-4`} aria-label={config.title}>
        {content}
      </section>

      {(dialog?.kind === 'create' || dialog?.kind === 'edit') && (
        <ManualMovementFormModal
          config={config}
          accounts={accounts.data}
          today={today}
          movement={dialog.kind === 'edit' ? dialog.movement : undefined}
          onClose={() => setDialog(null)}
          onSaved={() => {
            showToast(dialog.kind === 'edit' ? 'Cambios guardados' : config.createdToast)
            setDialog(null)
            refresh()
          }}
        />
      )}
      {dialog?.kind === 'delete' && (
        <DeleteManualMovementModal
          config={config}
          movement={dialog.movement}
          accounts={accounts.data}
          onClose={() => setDialog(null)}
          onDeleted={() => {
            showToast('Registro eliminado')
            setDialog(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}
