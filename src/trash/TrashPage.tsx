import { useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { buttonClasses } from '../components/buttonStyles'
import { CellLink } from '../components/CellLink'
import { DataTable, type Column } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { ListHeader } from '../components/ListHeader'
import { Modal } from '../components/Modal'
import { Pagination } from '../components/Pagination'
import { PeriodPicker } from '../components/PeriodPicker'
import { SearchField } from '../components/SearchField'
import { SelectField } from '../components/SelectField'
import { StatusBadge } from '../components/StatusBadge'
import { EmptyState, ErrorState } from '../components/states'
import { showToast } from '../components/toast'
import { businessToday } from '../lib/businessDate'
import { errorMessage } from '../lib/errorMessage'
import { EMPTY_VALUE, formatCurrency, formatDate } from '../lib/format'
import { paginate } from '../lib/pagination'
import { periodRange } from '../lib/period'
import { useUrlTextParam } from '../lib/useUrlTextParam'
import {
  DEFAULT_TRASH_FILTERS,
  annulledInvoices,
  filterTrash,
  parseTrashFilters,
  trashFiltersActive,
  trashFiltersToParams,
  type TrashFilters,
  type TrashInvoice,
} from './trashList'

/** Lo que distingue la papelera de ventas de la de compras. */
export interface TrashConfig<T extends TrashInvoice> {
  title: string
  subtitle: string
  /** Ruta del listado (`/ventas`) y su nombre para el enlace de regreso. */
  listPath: string
  listLabel: string
  /** Cliente o Proveedor. */
  partyLabel: string
  partyName: (invoice: T) => string
  queryKey: QueryKey
  fetchInvoices: () => Promise<T[]>
  restore: (id: number) => Promise<unknown>
  /** Que hace recuperar en este modulo, verificado en el backend. */
  restoreText: string
}

const paymentTypeLabels: Record<TrashInvoice['paymentType'], string> = { CONTADO: 'Contado', CREDITO: 'Crédito' }

const paymentOptions = [
  { value: '', label: 'Todas' },
  { value: 'CONTADO', label: 'Contado' },
  { value: 'CREDITO', label: 'Crédito' },
]

const periodOptions: Array<{ value: TrashFilters['periodo']; label: string }> = [
  { value: 'este-mes', label: 'Este mes' },
  { value: 'mes-anterior', label: 'Mes anterior' },
  { value: 'este-ano', label: 'Este año' },
  { value: 'todas', label: 'Todas' },
]

const card = 'rounded-surface border border-border bg-surface'

/** Papelera: las facturas anuladas del modulo, con filtros en la URL y Recuperar. */
export function TrashPage<T extends TrashInvoice>({ config }: { config: TrashConfig<T> }) {
  const queryClient = useQueryClient()
  const [today] = useState(() => businessToday())
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = parseTrashFilters(searchParams)
  const [restoring, setRestoring] = useState<T | null>(null)
  const invoices = useQuery({ queryKey: config.queryKey, queryFn: config.fetchInvoices })

  function updateFilters(change: Partial<TrashFilters>, replace = false) {
    setSearchParams(trashFiltersToParams({ ...filters, pagina: 1, ...change }), { replace })
  }
  const clearFilters = () => updateFilters(DEFAULT_TRASH_FILTERS)
  const search = useUrlTextParam(filters.q, (q) => updateFilters({ q }, true))

  // Recuperar mueve la factura, el stock y los saldos: se refresca todo lo que depende de ellos.
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: config.queryKey })
    void queryClient.invalidateQueries({ queryKey: ['treasury'] })
    void queryClient.invalidateQueries({ queryKey: ['inventory', 'products'] })
    void queryClient.invalidateQueries({ queryKey: ['kpis'] })
  }

  const detailPath = (invoice: T) => `${config.listPath}/${invoice.id}`
  const columns: Column<T>[] = [
    {
      header: 'N.º factura',
      render: (invoice) => (
        <CellLink to={detailPath(invoice)} className="codigo">
          {invoice.invoiceNumber}
        </CellLink>
      ),
    },
    { header: 'Fecha', render: (invoice) => formatDate(invoice.invoiceDate) },
    { header: config.partyLabel, render: config.partyName },
    { header: 'Forma de pago', render: (invoice) => paymentTypeLabels[invoice.paymentType] ?? EMPTY_VALUE },
    { header: 'Estado', render: (invoice) => <StatusBadge status={invoice.status} /> },
    { header: 'Total', align: 'right', render: (invoice) => <span className="monto">{formatCurrency(invoice.total)}</span> },
    {
      header: '',
      render: (invoice) => (
        <Button variant="secondary" onClick={() => setRestoring(invoice)} aria-label={`Recuperar factura ${invoice.invoiceNumber}`}>
          Recuperar
        </Button>
      ),
    },
  ]

  let content: ReactNode
  if (invoices.isError) {
    content = <ErrorState message="No pudimos cargar la papelera." onRetry={() => void invoices.refetch()} />
  } else if (invoices.isPending) {
    content = (
      <DataTable columns={columns} rows={undefined} rowKey={(invoice) => invoice.id} loading error={false} onRetry={() => void invoices.refetch()} emptyMessage="" skeletonRows={6} />
    )
  } else if (annulledInvoices(invoices.data).length === 0) {
    content = <EmptyState message="La papelera está vacía." />
  } else {
    const page = paginate(filterTrash(invoices.data, filters, today, config.partyName), filters.pagina)
    content =
      page.total === 0 ? (
        <EmptyState
          message="No hay facturas anuladas con esos filtros."
          action={{ label: 'Limpiar filtros', onClick: clearFilters }}
        />
      ) : (
        <>
          <div className="hidden md:block">
            <DataTable columns={columns} rows={page.rows} rowKey={(invoice) => invoice.id} loading={false} error={false} onRetry={() => void invoices.refetch()} emptyMessage="" />
          </div>
          <ul className="flex flex-col gap-3 md:hidden" aria-label="Facturas anuladas">
            {page.rows.map((invoice) => (
              <li key={invoice.id} className="flex flex-col gap-3 rounded-surface border border-border p-4">
                <div className="flex items-start justify-between gap-4">
                  <span className="flex min-w-0 flex-col gap-1">
                    <CellLink to={detailPath(invoice)} className="codigo">
                      {invoice.invoiceNumber}
                    </CellLink>
                    <span className="truncate text-body text-text">{config.partyName(invoice)}</span>
                    <span className="text-small text-text-muted">
                      {formatDate(invoice.invoiceDate)} · {paymentTypeLabels[invoice.paymentType]}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="monto text-body font-semibold text-text">{formatCurrency(invoice.total)}</span>
                    <StatusBadge status={invoice.status} />
                  </span>
                </div>
                <Button variant="secondary" onClick={() => setRestoring(invoice)} aria-label={`Recuperar factura ${invoice.invoiceNumber}`}>
                  Recuperar
                </Button>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-border pt-4">
            <Pagination page={page} itemLabel="facturas" onPageChange={(pagina) => setSearchParams(trashFiltersToParams({ ...filters, pagina }))} />
          </div>
        </>
      )
  }

  return (
    <div className="flex flex-col gap-6">
      <ListHeader
        title={config.title}
        subtitle={config.subtitle}
        secondary={[
          <Link key="volver" to={config.listPath} className={buttonClasses('secondary')} data-variant="secondary">
            Volver a {config.listLabel}
          </Link>,
        ]}
      />

      <FilterBar active={trashFiltersActive(filters)} onClear={clearFilters}>
        {[
          <SearchField key="q" label="Buscar" placeholder={`Número de factura o ${config.partyLabel.toLowerCase()}`} {...search} />,
          <SelectField
            key="pago"
            label="Forma de pago"
            options={paymentOptions}
            value={filters.pago}
            onChange={(event) => updateFilters({ pago: event.target.value as TrashFilters['pago'] })}
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

      <section className={`${card} p-4`} aria-label="Facturas anuladas">
        {content}
      </section>

      {restoring && (
        <RestoreModal
          invoice={restoring}
          config={config}
          onClose={() => setRestoring(null)}
          onRestored={() => {
            setRestoring(null)
            showToast(`Factura ${restoring.invoiceNumber} recuperada`)
            refresh()
          }}
          onRejected={refresh}
        />
      )}
    </div>
  )
}

interface RestoreModalProps<T extends TrashInvoice> {
  invoice: T
  config: TrashConfig<T>
  onClose: () => void
  onRestored: () => void
  /** El backend rechazo la accion: los datos pudieron cambiar. */
  onRejected: () => void
}

function RestoreModal<T extends TrashInvoice>({ invoice, config, onClose, onRestored, onRejected }: RestoreModalProps<T>) {
  const submitting = useRef(false)
  const restore = useMutation({
    mutationFn: () => config.restore(invoice.id),
    onSuccess: onRestored,
    onError: () => {
      submitting.current = false
      onRejected()
    },
  })

  function confirm() {
    if (submitting.current) return
    submitting.current = true
    restore.mutate()
  }

  return (
    <Modal
      title={`Recuperar factura ${invoice.invoiceNumber}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={confirm} disabled={restore.isPending}>
            {restore.isPending ? 'Recuperando…' : 'Recuperar factura'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-body text-text">{config.restoreText}</p>
        {restore.isError && (
          <Alert tone="error" title="No pudimos recuperar la factura">
            {errorMessage(restore.error)}
          </Alert>
        )}
      </div>
    </Modal>
  )
}
