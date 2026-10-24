import { useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { FilePlus, Pencil, TriangleAlert } from 'lucide-react'
import { Button } from '../components/Button'
import { buttonClasses } from '../components/buttonStyles'
import { DataTable, type Column } from '../components/DataTable'
import { IndicatorCard } from '../components/IndicatorCard'
import { Pagination } from '../components/Pagination'
import { SearchField } from '../components/SearchField'
import { SelectField } from '../components/SelectField'
import { EmptyState, ErrorState } from '../components/states'
import { showToast } from '../components/toast'
import { EMPTY_VALUE, formatCurrency } from '../lib/format'
import { paginate } from '../lib/pagination'
import { useUrlTextParam } from '../lib/useUrlTextParam'
import type { Counterparty, CounterpartyRequest } from '../sales/salesApi'
import type { BalanceInvoice } from './counterpartiesApi'
import {
  DEFAULT_COUNTERPARTY_FILTERS,
  ZERO_BALANCE,
  balancesByCounterparty,
  counterpartyFiltersToParams,
  counterpartyIndicators,
  filterCounterparties,
  isSystemCounterparty,
  parseCounterpartyFilters,
  type CounterpartyFilters,
} from './counterpartyList'
import { NewCounterpartyModal } from './NewCounterpartyModal'

/** Lo que distingue Clientes de Proveedores. */
export interface CounterpartiesConfig {
  role: CounterpartyRequest['role']
  title: string
  subtitle: string
  /** "cliente" o "proveedor", para los textos. */
  singular: string
  plural: string
  /** Ruta del listado de facturas del modulo y su nombre, para el enlace de regreso. */
  listPath: string
  listLabel: string
  counterpartiesKey: QueryKey
  fetchCounterparties: () => Promise<Counterparty[]>
  invoicesKey: QueryKey
  fetchInvoices: () => Promise<BalanceInvoice[]>
  /** "Por cobrar" o "Por pagar". */
  balanceLabel: string
  newInvoicePath: (id: number) => string
  createdToast: string
  /** Toast del 200: el documento ya existia con el otro rol y paso a AMBOS. */
  promotedToast: string
}

const card = 'rounded-card border border-border bg-surface shadow-card'
const iconButton =
  'flex size-touch items-center justify-center rounded-control text-text-muted transition-colors duration-(--duration-fast) hover:bg-neutral-100 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'
const tag = 'inline-flex items-center whitespace-nowrap rounded-tag bg-neutral-200 px-2 py-0.5 text-small font-medium text-text-muted'

const balanceOptions = [
  { value: '', label: 'Todos' },
  { value: 'pendiente', label: 'Con saldo pendiente' },
]

const orderOptions = [
  { value: 'nombre', label: 'Nombre' },
  { value: 'saldo', label: 'Saldo de mayor a menor' },
]

type Dialog = { kind: 'create' } | { kind: 'edit'; counterparty: Counterparty }

function invoicesText(count: number) {
  return count === 1 ? '1 factura pendiente' : `${count} facturas pendientes`
}

/** Clientes o Proveedores: indicadores, filtros en la URL, tabla con saldo y el modal de crear y editar. */
export function CounterpartiesPage({ config }: { config: CounterpartiesConfig }) {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = parseCounterpartyFilters(searchParams)
  const [dialog, setDialog] = useState<Dialog | null>(null)

  const counterparties = useQuery({ queryKey: config.counterpartiesKey, queryFn: config.fetchCounterparties })
  const invoices = useQuery({ queryKey: config.invoicesKey, queryFn: config.fetchInvoices })

  function updateFilters(change: Partial<CounterpartyFilters>, replace = false) {
    setSearchParams(counterpartyFiltersToParams({ ...filters, pagina: 1, ...change }), { replace })
  }
  const clearFilters = () => updateFilters(DEFAULT_COUNTERPARTY_FILTERS)
  const search = useUrlTextParam(filters.q, (q) => updateFilters({ q }, true))

  // Terceros de esta pantalla y de los formularios de venta y compra; editar cambia ademas el
  // tercero que muestran los listados de facturas.
  function refresh(edited: boolean) {
    void queryClient.invalidateQueries({ queryKey: ['counterparties'] })
    if (edited) {
      void queryClient.invalidateQueries({ queryKey: ['sales'] })
      void queryClient.invalidateQueries({ queryKey: ['purchases'] })
    }
  }

  const balances = invoices.data ? balancesByCounterparty(invoices.data) : undefined
  const indicators = counterparties.data ? counterpartyIndicators(counterparties.data, balances) : undefined
  const retryCounterparties = () => void counterparties.refetch()
  const retryInvoices = () => void invoices.refetch()

  const nameCell = (counterparty: Counterparty) => (
    <span className="flex flex-wrap items-center gap-2">
      <span className="text-text">{counterparty.name}</span>
      {isSystemCounterparty(counterparty) ? (
        <span className={tag}>Sistema</span>
      ) : (
        counterparty.role === 'AMBOS' && <span className={tag}>Cliente y proveedor</span>
      )}
    </span>
  )

  const documentCell = (counterparty: Counterparty) => (
    <span className="whitespace-nowrap">
      {counterparty.documentType} <span className="font-mono">{counterparty.documentNumber}</span>
    </span>
  )

  const balanceCell = (counterparty: Counterparty) => {
    if (!balances) return <span className="tabular">{EMPTY_VALUE}</span>
    const balance = balances.get(counterparty.id) ?? ZERO_BALANCE
    return (
      <span className="flex flex-col items-end">
        <span className="tabular font-medium whitespace-nowrap text-text">{formatCurrency(balance.amount)}</span>
        {balance.count > 0 && <span className="text-small whitespace-nowrap text-text-muted">{invoicesText(balance.count)}</span>}
      </span>
    )
  }

  const actions = (counterparty: Counterparty) => (
    <div className="flex justify-end gap-1">
      {!isSystemCounterparty(counterparty) && (
        <button
          type="button"
          className={iconButton}
          aria-label={`Editar ${config.singular} ${counterparty.name}`}
          title="Editar"
          onClick={() => setDialog({ kind: 'edit', counterparty })}
        >
          <Pencil size={18} strokeWidth={1.5} aria-hidden />
        </button>
      )}
      <Link
        to={config.newInvoicePath(counterparty.id)}
        className={iconButton}
        aria-label={`Nueva factura para ${counterparty.name}`}
        title="Nueva factura"
      >
        <FilePlus size={18} strokeWidth={1.5} aria-hidden />
      </Link>
    </div>
  )

  const columns: Column<Counterparty>[] = [
    { header: 'Nombre', render: nameCell },
    { header: 'Documento', render: documentCell },
    { header: 'Correo', render: (counterparty) => counterparty.email || EMPTY_VALUE },
    { header: 'Celular', render: (counterparty) => counterparty.phone || EMPTY_VALUE },
    { header: config.balanceLabel, align: 'right', render: balanceCell },
    { header: 'Acciones', align: 'right', render: actions },
  ]

  let content: ReactNode
  if (counterparties.isError) {
    content = <ErrorState message={`No pudimos cargar los ${config.plural}.`} onRetry={retryCounterparties} />
  } else if (!counterparties.data || !indicators) {
    content = (
      <DataTable columns={columns} rows={undefined} rowKey={(c) => c.id} loading error={false} onRetry={retryCounterparties} emptyMessage="" skeletonRows={6} />
    )
  } else if (indicators.total === 0) {
    content = (
      <EmptyState
        message={`Aún no registras ${config.plural}. Crea el primero.`}
        action={{ label: `Nuevo ${config.singular}`, onClick: () => setDialog({ kind: 'create' }) }}
      />
    )
  } else {
    const page = paginate(filterCounterparties(counterparties.data, filters, balances), filters.pagina)
    content =
      page.total === 0 ? (
        <EmptyState
          message={`No hay ${config.plural} con esos filtros.`}
          action={{ label: 'Limpiar filtros', onClick: clearFilters }}
        />
      ) : (
        <>
          <div className="hidden md:block">
            <DataTable columns={columns} rows={page.rows} rowKey={(c) => c.id} loading={false} error={false} onRetry={retryCounterparties} emptyMessage="" />
          </div>
          <ul className="flex flex-col gap-3 md:hidden" aria-label={config.title}>
            {page.rows.map((counterparty) => (
              <li key={counterparty.id} className="flex flex-col gap-2 rounded-control border border-border p-4">
                <div className="flex items-start justify-between gap-4">
                  <span className="flex min-w-0 flex-col gap-1">
                    {nameCell(counterparty)}
                    <span className="text-small text-text-muted">{documentCell(counterparty)}</span>
                    {counterparty.email && <span className="truncate text-small text-text-muted">{counterparty.email}</span>}
                    {counterparty.phone && <span className="text-small text-text-muted">{counterparty.phone}</span>}
                  </span>
                  {balanceCell(counterparty)}
                </div>
                {actions(counterparty)}
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-border pt-4">
            <Pagination
              page={page}
              itemLabel={config.plural}
              onPageChange={(pagina) => setSearchParams(counterpartyFiltersToParams({ ...filters, pagina }))}
            />
          </div>
        </>
      )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 text-text">{config.title}</h1>
          <p className="mt-1 text-small text-text-muted">{config.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link to={config.listPath} className={buttonClasses('secondary')} data-variant="secondary">
            Volver a {config.listLabel}
          </Link>
          <Button onClick={() => setDialog({ kind: 'create' })}>Nuevo {config.singular}</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <IndicatorCard
          label={`Total de ${config.plural}`}
          value={indicators ? String(indicators.total) : undefined}
          error={counterparties.isError}
          onRetry={retryCounterparties}
        />
        <IndicatorCard
          label="Con saldo pendiente"
          value={indicators && balances ? String(indicators.withBalance) : undefined}
          error={counterparties.isError || invoices.isError}
          onRetry={() => {
            if (counterparties.isError) retryCounterparties()
            if (invoices.isError) retryInvoices()
          }}
        />
        <IndicatorCard
          label={`Total ${config.balanceLabel.toLowerCase()}`}
          value={indicators && balances ? formatCurrency(indicators.amount) : undefined}
          error={counterparties.isError || invoices.isError}
          onRetry={() => {
            if (counterparties.isError) retryCounterparties()
            if (invoices.isError) retryInvoices()
          }}
        />
      </div>

      <div className={`${card} grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))_auto] lg:items-end`}>
        <SearchField label="Buscar" placeholder="Nombre, documento o correo" {...search} />
        <SelectField
          label="Saldo"
          options={balanceOptions}
          value={filters.saldo}
          onChange={(event) => updateFilters({ saldo: event.target.value as CounterpartyFilters['saldo'] })}
        />
        <SelectField
          label="Ordenar por"
          options={orderOptions}
          value={filters.orden}
          onChange={(event) => updateFilters({ orden: event.target.value as CounterpartyFilters['orden'] })}
        />
        <Button variant="secondary" onClick={clearFilters}>
          Limpiar
        </Button>
      </div>

      <section className={`${card} flex flex-col gap-4 p-4`} aria-label={config.title}>
        {invoices.isError && counterparties.data && (
          <div role="alert" className="flex flex-wrap items-center gap-2 text-small text-text">
            <TriangleAlert size={16} strokeWidth={1.5} className="text-error" aria-hidden />
            No pudimos cargar los saldos.
            <Button variant="text" className="px-2" onClick={retryInvoices}>
              Reintentar
            </Button>
          </div>
        )}
        <div>{content}</div>
      </section>

      {dialog && (
        <NewCounterpartyModal
          role={config.role}
          counterparty={dialog.kind === 'edit' ? dialog.counterparty : undefined}
          guardUnsaved
          onClose={() => setDialog(null)}
          onCreated={(created) => {
            // Un 201 es un tercero nuevo con este rol; un 200 es uno que ya existia con el otro
            // rol y paso a AMBOS, con su nombre y sus datos de antes.
            showToast(created.role === 'AMBOS' ? config.promotedToast : config.createdToast)
            setDialog(null)
            refresh(false)
          }}
          onUpdated={() => {
            showToast('Cambios guardados')
            setDialog(null)
            refresh(true)
          }}
        />
      )}
    </div>
  )
}
