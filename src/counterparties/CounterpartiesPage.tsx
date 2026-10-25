import { useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { FilePlus, Pencil, TriangleAlert } from 'lucide-react'
import { Button } from '../components/Button'
import { buttonClasses } from '../components/buttonStyles'
import { DataTable, type Column } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { IconButton, IconLink } from '../components/IconButton'
import { IndicatorCard } from '../components/IndicatorCard'
import { ListHeader } from '../components/ListHeader'
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
import { iconMd, iconSm } from '../components/icons'

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
  /** "Registrar venta" o "Registrar compra": el verbo de la accion de newInvoicePath. */
  newInvoiceLabel: string
  createdToast: string
  /** Toast del 200: el documento ya existia con el otro rol y paso a AMBOS. */
  promotedToast: string
}

const card = 'rounded-surface border border-border bg-surface'
const tag = 'inline-flex items-center whitespace-nowrap rounded-pill bg-neutral-200 px-2 py-1 text-small font-semibold text-text-muted'

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
    <span className="md:whitespace-nowrap">
      {counterparty.documentType} <span className="codigo">{counterparty.documentNumber}</span>
    </span>
  )

  const balanceCell = (counterparty: Counterparty) => {
    if (!balances) return <span className="monto">{EMPTY_VALUE}</span>
    const balance = balances.get(counterparty.id) ?? ZERO_BALANCE
    return (
      <span className="flex flex-col items-end">
        <span className="monto font-semibold whitespace-nowrap text-text">{formatCurrency(balance.amount)}</span>
        {balance.count > 0 && <span className="text-small whitespace-nowrap text-text-muted">{invoicesText(balance.count)}</span>}
      </span>
    )
  }

  const actions = (counterparty: Counterparty) => (
    <div className="flex justify-end gap-2 lg:gap-1">
      {!isSystemCounterparty(counterparty) && (
        <IconButton
          aria-label={`Editar ${config.singular} ${counterparty.name}`}
          title="Editar"
          onClick={() => setDialog({ kind: 'edit', counterparty })}
        >
          <Pencil {...iconMd} aria-hidden />
        </IconButton>
      )}
      <IconLink
        to={config.newInvoicePath(counterparty.id)}
        aria-label={`${config.newInvoiceLabel} para ${counterparty.name}`}
        title={config.newInvoiceLabel}
      >
        <FilePlus {...iconMd} aria-hidden />
      </IconLink>
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
              <li key={counterparty.id} className="flex flex-col gap-2 rounded-surface border border-border p-4">
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
      <ListHeader
        title={config.title}
        subtitle={config.subtitle}
        primary={<Button onClick={() => setDialog({ kind: 'create' })}>Nuevo {config.singular}</Button>}
        secondary={[
          <Link key="volver" to={config.listPath} className={buttonClasses('secondary')} data-variant="secondary">
            Volver a {config.listLabel}
          </Link>,
        ]}
      />

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

      <FilterBar
        active={(['q', 'saldo', 'orden'] as const).some((key) => filters[key] !== DEFAULT_COUNTERPARTY_FILTERS[key])}
        onClear={clearFilters}
      >
        {[
          <SearchField key="q" label="Buscar" placeholder="Nombre, documento o correo" {...search} />,
          <SelectField
            key="saldo"
            label="Saldo"
            options={balanceOptions}
            value={filters.saldo}
            onChange={(event) => updateFilters({ saldo: event.target.value as CounterpartyFilters['saldo'] })}
          />,
          <SelectField
            key="orden"
            label="Ordenar por"
            options={orderOptions}
            value={filters.orden}
            onChange={(event) => updateFilters({ orden: event.target.value as CounterpartyFilters['orden'] })}
          />,
        ]}
      </FilterBar>

      <section className={`${card} flex flex-col gap-4 p-4`} aria-label={config.title}>
        {invoices.isError && counterparties.data && (
          <div role="alert" className="flex flex-wrap items-center gap-2 text-small text-text">
            <TriangleAlert {...iconSm} className="text-error" aria-hidden />
            No pudimos cargar los saldos.
            <Button variant="text" onClick={retryInvoices}>
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
