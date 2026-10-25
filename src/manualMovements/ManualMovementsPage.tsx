import { useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'
import { ACCOUNTS_KEY, type TreasuryMovement } from '../accounts/accountsApi'
import { formatSignedAmount } from '../accounts/accountsView'
import { Button } from '../components/Button'
import { buttonClasses } from '../components/buttonStyles'
import { DataTable, type Column } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { IconButton } from '../components/IconButton'
import { IndicatorCard } from '../components/IndicatorCard'
import { ListHeader } from '../components/ListHeader'
import { Pagination } from '../components/Pagination'
import { PeriodPicker } from '../components/PeriodPicker'
import { SearchField } from '../components/SearchField'
import { SelectField } from '../components/SelectField'
import { EmptyState, ErrorState } from '../components/states'
import { showToast } from '../components/toast'
import { fetchAccounts } from '../dashboard/dashboardApi'
import { businessToday } from '../lib/businessDate'
import { EMPTY_VALUE, formatCurrency, formatDate } from '../lib/format'
import { paginate } from '../lib/pagination'
import { useElementWidth } from '../lib/useElementWidth'
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
import { iconMd } from '../components/icons'

/** Lo que distingue Gastos operativos de Otros ingresos. */
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

/** Ancho del recuadro desde el que caben todas las columnas de gastos y otros ingresos. */
const MANUAL_TABLE_FULL = 760

const card = 'rounded-surface border border-border bg-surface'

type Dialog = { kind: 'create' } | { kind: 'edit'; movement: TreasuryMovement } | { kind: 'delete'; movement: TreasuryMovement }

/** Gastos operativos u Otros ingresos: indicadores, filtros en la URL, tabla y modales. */
export function ManualMovementsPage({ config }: { config: ManualMovementsConfig }) {
  const queryClient = useQueryClient()
  const [today] = useState(() => businessToday())
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = parseManualFilters(searchParams)
  const range = manualRange(filters, today)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [sectionRef, width] = useElementWidth<HTMLElement>()

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
    <div className="flex justify-end gap-2 lg:gap-1">
      <IconButton
        aria-label={`Editar ${config.singular} ${movement.concept}`}
        title="Editar"
        onClick={() => setDialog({ kind: 'edit', movement })}
      >
        <Pencil {...iconMd} aria-hidden />
      </IconButton>
      <IconButton
        aria-label={`Eliminar ${config.singular} ${movement.concept}`}
        title="Eliminar"
        onClick={() => setDialog({ kind: 'delete', movement })}
      >
        <Trash2 {...iconMd} aria-hidden />
      </IconButton>
    </div>
  )

  const signed = (movement: TreasuryMovement) => (
    <span className={`monto font-semibold whitespace-nowrap ${amountClass}`}>{formatSignedAmount(movement)}</span>
  )

  // En un recuadro angosto las observaciones pasan a una segunda linea bajo el concepto.
  const compact = width < MANUAL_TABLE_FULL
  const columns: Column<TreasuryMovement>[] = [
    { header: 'Fecha', render: (movement) => formatDate(movement.date) },
    {
      header: 'Concepto',
      render: (movement) =>
        compact && movement.notes ? (
          <span className="flex flex-col">
            <span>{movement.concept}</span>
            <span className="text-small text-text-muted">{movement.notes}</span>
          </span>
        ) : (
          movement.concept
        ),
    },
    { header: 'Cuenta', render: (movement) => movement.accountName ?? EMPTY_VALUE },
    { header: 'Monto', align: 'right', render: signed },
    ...(compact ? [] : [{ header: 'Observaciones', render: (movement: TreasuryMovement) => movement.notes || EMPTY_VALUE }]),
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
        action={{ label: config.newLabel, onClick: () => setDialog({ kind: 'create' }) }}
      />
    )
  } else if (filtered.length === 0) {
    content = (
      <EmptyState
        message={config.filteredEmptyMessage}
        action={{ label: 'Limpiar filtros', onClick: clearFilters }}
      />
    )
  } else {
    const page = paginate(filtered, filters.pagina)
    content = (
      <>
        <div className="hidden md:block">
          <DataTable columns={columns} rows={page.rows} rowKey={(m) => m.id} loading={false} error={false} onRetry={retry} emptyMessage="" dense={compact} />
        </div>
        <ul className="flex flex-col gap-3 md:hidden" aria-label={config.title}>
          {page.rows.map((movement) => (
            <li key={movement.id} className="flex flex-col gap-2 rounded-surface border border-border p-4">
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
      <ListHeader
        title={config.title}
        subtitle={config.subtitle}
        primary={<Button onClick={() => setDialog({ kind: 'create' })}>{config.newLabel}</Button>}
        secondary={[
          <Link key="volver" to={config.listPath} className={buttonClasses('secondary')} data-variant="secondary">
            Volver a {config.listLabel}
          </Link>,
        ]}
      />

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

      <FilterBar active={!atDefaults} onClear={clearFilters}>
        {[
          <SearchField key="q" label="Buscar" placeholder="Concepto" {...search} />,
          accounts.isError ? (
            <div key="cuenta" className="flex flex-col gap-2" role="alert">
              <span className="text-label text-text">Cuenta</span>
              <span className="flex items-center gap-2 text-small text-text">
                No pudimos cargar las cuentas.
                <Button variant="text" onClick={() => void accounts.refetch()}>
                  Reintentar
                </Button>
              </span>
            </div>
          ) : (
            <SelectField
              key="cuenta"
              label="Cuenta"
              options={accountOptions}
              value={filters.cuenta === null ? '' : String(filters.cuenta)}
              disabled={accounts.isPending}
              onChange={(event) => updateFilters({ cuenta: event.target.value ? Number(event.target.value) : null })}
            />
          ),
          <PeriodPicker
            key="periodo"
            options={MANUAL_PERIOD_OPTIONS}
            value={filters.periodo}
            onChange={(periodo) => updateFilters({ periodo })}
            range={range.valid && range.desde && range.hasta ? { desde: range.desde, hasta: range.hasta } : null}
            custom={{
              desde: { value: filters.desde, onChange: (event) => updateFilters({ desde: event.target.value }, true) },
              hasta: { value: filters.hasta, onChange: (event) => updateFilters({ hasta: event.target.value }, true) },
              errors: range.errors,
            }}
          />,
        ]}
      </FilterBar>

      <section ref={sectionRef} className={`${card} p-4`} aria-label={config.title}>
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
