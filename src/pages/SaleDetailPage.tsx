import { useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileQuestion } from 'lucide-react'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { buttonClasses } from '../components/buttonStyles'
import { DataTable, type Column } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { SelectField } from '../components/SelectField'
import { StatusBadge } from '../components/StatusBadge'
import { TextField } from '../components/TextField'
import { EmptyState, ErrorState, Skeleton } from '../components/states'
import { showToast } from '../components/toast'
import { fetchAccounts } from '../dashboard/dashboardApi'
import { useBreadcrumbTail } from '../layout/breadcrumb'
import { defaultCashAccount } from '../lib/accountPayment'
import { ApiError } from '../lib/api'
import { businessToday } from '../lib/businessDate'
import { errorMessage } from '../lib/errorMessage'
import { EMPTY_VALUE, formatCurrency, formatDate } from '../lib/format'
import { paymentMethodLabels, type PaymentMethod } from '../sales/newSale'
import {
  buildCollectionRequest,
  collectionDateRange,
  lineTotal,
  parseSaleId,
  saleActions,
  saleSummary,
  sortCollections,
  validateCollection,
  type CollectionDraft,
} from '../sales/saleDetail'
import { annulSale, createCollection, fetchSale, fetchSaleMovements, type SaleDetail } from '../sales/salesApi'

const card = 'rounded-card border border-border bg-surface p-6 shadow-card'

const paymentTypeLabels: Record<SaleDetail['paymentType'], string> = { CONTADO: 'Contado', CREDITO: 'Crédito' }

type Line = SaleDetail['details'][number]
type SaleMovement = Awaited<ReturnType<typeof fetchSaleMovements>>[number]

const lineColumns: Column<Line>[] = [
  { header: 'Código', render: (line) => <span className="font-mono">{line.productCode ?? EMPTY_VALUE}</span> },
  { header: 'Descripción', render: (line) => line.productDescription ?? EMPTY_VALUE },
  { header: 'Cant.', align: 'right', render: (line) => line.quantity },
  { header: 'Precio', align: 'right', render: (line) => formatCurrency(line.price) },
  { header: 'IVA', align: 'right', render: (line) => formatCurrency(line.ivaAmount) },
  { header: 'Total', align: 'right', render: (line) => formatCurrency(lineTotal(line)) },
]

const movementColumns: Column<SaleMovement>[] = [
  { header: 'Fecha', render: (movement) => formatDate(movement.date) },
  { header: 'Cuenta', render: (movement) => movement.accountName ?? EMPTY_VALUE },
  { header: 'Valor', align: 'right', render: (movement) => formatCurrency(movement.amount) },
]

function methodLabel(method: string | null) {
  if (!method) return null
  return paymentMethodLabels[method as PaymentMethod] ?? method
}

/** Detalle de factura de venta: datos, productos, abonos y resumen, con abonar y anular. */
export function SaleDetailPage() {
  const saleId = parseSaleId(useParams().id)
  if (saleId === null) return <NotFound />
  return <SaleDetailContent saleId={saleId} />
}

function NotFound() {
  return (
    <div className={`${card} flex flex-col items-center gap-3 py-12 text-center`}>
      <FileQuestion size={24} strokeWidth={1.5} className="text-text-subtle" aria-hidden />
      <h1 className="text-h2 text-text">Factura no encontrada</h1>
      <p className="text-small text-text-muted">Revisa el número o búscala en el listado.</p>
      <Link to="/ventas" className={buttonClasses('secondary')}>
        Volver a Facturas de venta
      </Link>
    </div>
  )
}

function SaleDetailContent({ saleId }: { saleId: number }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [modal, setModal] = useState<'collect' | 'annul' | null>(null)
  const sale = useQuery({ queryKey: ['sales', saleId], queryFn: () => fetchSale(saleId) })
  const movements = useQuery({ queryKey: ['treasury', 'movements', 'sale', saleId], queryFn: () => fetchSaleMovements(saleId) })
  useBreadcrumbTail(sale.data?.invoiceNumber)

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['sales'] })
    void queryClient.invalidateQueries({ queryKey: ['treasury'] })
    void queryClient.invalidateQueries({ queryKey: ['inventory', 'products'] })
    void queryClient.invalidateQueries({ queryKey: ['kpis'] })
  }

  if (sale.error instanceof ApiError && sale.error.status === 404) return <NotFound />
  if (sale.isError) {
    return (
      <div className={card}>
        <ErrorState message="No pudimos cargar la factura." onRetry={() => void sale.refetch()} />
      </div>
    )
  }
  if (sale.isPending) {
    return (
      <div className="flex flex-col gap-6" aria-busy>
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-[7fr_3fr]">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  const data = sale.data
  const actions = saleActions(data)
  const summary = saleSummary(data)
  const customerName = data.customer?.name ?? 'Consumidor final'
  const subtitle = [
    customerName,
    paymentTypeLabels[data.paymentType],
    data.paymentType === 'CREDITO' && data.dueDate ? `Vence el ${formatDate(data.dueDate)}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
  const method = methodLabel(data.paymentMethod)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-h1 text-text">{data.invoiceNumber}</h1>
            <StatusBadge status={data.status} />
          </div>
          <p className="mt-1 text-small text-text-muted">{subtitle}</p>
        </div>
        {(actions.canAnnul || actions.canCollect) && (
          <div className="flex flex-wrap items-center gap-3">
            {actions.canAnnul && (
              <Button variant="secondary" onClick={() => setModal('annul')}>
                Anular
              </Button>
            )}
            {actions.canCollect && <Button onClick={() => setModal('collect')}>Registrar abono</Button>}
          </div>
        )}
      </div>

      {data.status === 'ANULADA' && (
        <Alert tone="info" title="Factura anulada">
          Está en la papelera: el stock volvió al inventario y sus pagos se revirtieron. Solo puedes consultarla.
        </Alert>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className={card} aria-labelledby="sale-data-title">
            <h2 id="sale-data-title" className="mb-4 text-h3 text-text">
              Datos de la factura
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Cliente">{customerName}</Field>
              <Field label="Documento">
                {data.customer ? `${data.customer.documentType} ${data.customer.documentNumber}` : EMPTY_VALUE}
              </Field>
              <Field label="Correo">{data.customer?.email || EMPTY_VALUE}</Field>
              <Field label="Celular">{data.customer?.phone || EMPTY_VALUE}</Field>
              <Field label="Fecha">{formatDate(data.invoiceDate)}</Field>
              <Field label="Vence">{formatDate(data.dueDate)}</Field>
              <Field label="Forma de pago">{paymentTypeLabels[data.paymentType]}</Field>
              {method && <Field label="Método de pago">{method}</Field>}
            </dl>
          </section>

          <section className={card} aria-labelledby="sale-lines-title">
            <h2 id="sale-lines-title" className="mb-4 text-h3 text-text">
              Productos
            </h2>
            <div className="hidden md:block">
              <DataTable
                columns={lineColumns}
                rows={data.details}
                rowKey={(line) => line.id}
                loading={false}
                error={false}
                onRetry={() => void sale.refetch()}
                emptyMessage="Esta factura no tiene productos."
              />
            </div>
            <ul className="flex flex-col gap-3 md:hidden" aria-label="Productos">
              {data.details.map((line) => (
                <li key={line.id} className="rounded-control border border-border p-4">
                  <p className="font-mono text-small text-text-muted">{line.productCode}</p>
                  <p className="text-body text-text">{line.productDescription}</p>
                  <p className="tabular mt-2 flex justify-between gap-3 text-small text-text-muted">
                    <span>
                      {line.quantity} × {formatCurrency(line.price)} · IVA {formatCurrency(line.ivaAmount)}
                    </span>
                    <span className="font-medium whitespace-nowrap text-text">{formatCurrency(lineTotal(line))}</span>
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className={card} aria-labelledby="sale-collections-title">
            <h2 id="sale-collections-title" className="mb-4 text-h3 text-text">
              {data.paymentType === 'CREDITO' ? 'Abonos registrados' : 'Pago recibido'}
            </h2>
            <CollectionsBlock sale={data} movements={movements} />
          </section>
        </div>

        <aside className={card} aria-labelledby="sale-summary-title">
          <h2 id="sale-summary-title" className="mb-4 text-h3 text-text">
            Resumen
          </h2>
          <dl className="flex flex-col gap-3 text-body">
            <SummaryRow label="Subtotal" value={formatCurrency(summary.subtotal)} />
            <SummaryRow label="IVA" value={formatCurrency(summary.iva)} />
            <SummaryRow label="Total" value={formatCurrency(summary.total)} />
            <SummaryRow
              label="Abonado"
              value={summary.paid === null ? EMPTY_VALUE : formatCurrency(summary.paid)}
              tone={summary.paid ? 'text-success' : undefined}
            />
            <div className="flex items-baseline justify-between gap-4 border-t border-border pt-4">
              <dt className="font-medium text-text">Saldo pendiente</dt>
              <dd className="tabular font-display text-h2 font-bold text-text">
                {summary.pending === null ? EMPTY_VALUE : formatCurrency(summary.pending)}
              </dd>
            </div>
          </dl>
        </aside>
      </div>

      {modal === 'collect' && (
        <CollectionModal
          sale={data}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            showToast('Abono registrado')
            refresh()
          }}
          onRejected={refresh}
        />
      )}
      {modal === 'annul' && (
        <AnnulModal
          sale={data}
          onClose={() => setModal(null)}
          onAnnulled={() => {
            showToast(`Factura ${data.invoiceNumber} anulada`)
            refresh()
            void navigate('/ventas')
          }}
          onRejected={refresh}
        />
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-small text-text-muted">{label}</dt>
      <dd className="text-body text-text">{children}</dd>
    </div>
  )
}

function SummaryRow({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-text-muted">{label}</dt>
      <dd className={`tabular font-medium ${tone ?? 'text-text'}`}>{value}</dd>
    </div>
  )
}

interface CollectionsBlockProps {
  sale: SaleDetail
  movements: { data: SaleMovement[] | undefined; isPending: boolean; isError: boolean; refetch: () => unknown }
}

function CollectionsBlock({ sale, movements }: CollectionsBlockProps) {
  if (movements.isError) {
    return <ErrorState message="No pudimos cargar los abonos." onRetry={() => void movements.refetch()} />
  }
  if (movements.isPending || !movements.data) {
    return (
      <div className="flex flex-col gap-3" aria-busy>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }
  if (movements.data.length === 0) {
    const message =
      sale.status === 'ANULADA'
        ? 'La factura está anulada: sus pagos se revirtieron.'
        : sale.paymentType === 'CREDITO'
          ? 'Aún no hay abonos. Regístralos con Registrar abono.'
          : 'No hay un pago registrado para esta factura.'
    return <EmptyState message={message} />
  }
  const rows = sortCollections(movements.data)
  return (
    <>
      <div className="hidden md:block">
        <DataTable
          columns={movementColumns}
          rows={rows}
          rowKey={(movement) => movement.id}
          loading={false}
          error={false}
          onRetry={() => void movements.refetch()}
          emptyMessage=""
        />
      </div>
      <ul className="flex flex-col gap-3 md:hidden" aria-label="Abonos">
        {rows.map((movement) => (
          <li key={movement.id} className="flex items-center justify-between gap-4 rounded-control border border-border p-4">
            <span className="flex flex-col">
              <span className="text-body text-text">{movement.accountName ?? EMPTY_VALUE}</span>
              <span className="text-small text-text-muted">{formatDate(movement.date)}</span>
            </span>
            <span className="tabular text-body font-medium text-text">{formatCurrency(movement.amount)}</span>
          </li>
        ))}
      </ul>
    </>
  )
}

interface ActionModalProps {
  sale: SaleDetail
  onClose: () => void
  /** El backend rechazo la accion: la factura pudo cambiar en otra pestana. */
  onRejected: () => void
}

function CollectionModal({ sale, onClose, onSaved, onRejected }: ActionModalProps & { onSaved: () => void }) {
  const [today] = useState(() => businessToday())
  const range = collectionDateRange(sale.invoiceDate, today)
  const accounts = useQuery({ queryKey: ['treasury', 'accounts'], queryFn: fetchAccounts })
  const [draft, setDraft] = useState<Omit<CollectionDraft, 'accountId'> & { accountId: number | null | undefined }>({
    accountId: undefined,
    amount: String(sale.pendingBalance),
    date: today,
  })
  const submitting = useRef(false)
  // Sin eleccion del usuario se propone la primera cuenta de efectivo.
  const accountId = draft.accountId === undefined ? (defaultCashAccount(accounts.data)?.id ?? null) : draft.accountId
  const effective: CollectionDraft = { ...draft, accountId }
  const { errors, valid } = validateCollection(effective, sale.pendingBalance, range)

  const save = useMutation({
    mutationFn: () => createCollection(sale.id, buildCollectionRequest(effective)),
    onSuccess: onSaved,
    // Tras un exito el modal se cierra: solo un error vuelve a permitir enviar.
    onError: () => {
      submitting.current = false
      onRejected()
    },
  })

  function submit() {
    if (!valid || submitting.current) return
    submitting.current = true
    save.mutate()
  }

  return (
    <Modal
      title="Registrar abono"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!valid || save.isPending}>
            {save.isPending ? 'Registrando…' : 'Registrar abono'}
          </Button>
        </>
      }
    >
      <div
        className="flex flex-col gap-4"
        onKeyDown={(event) => {
          if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
            event.preventDefault()
            submit()
          }
        }}
      >
        <p className="-mt-2 text-small text-text-muted">
          {sale.invoiceNumber} · {sale.customer?.name ?? 'Consumidor final'}
        </p>
        <div className="flex items-center justify-between rounded-control bg-neutral-200 p-4">
          <span className="text-small text-text-muted">Saldo pendiente</span>
          <span className="tabular text-body font-semibold text-text">{formatCurrency(sale.pendingBalance)}</span>
        </div>
        {save.isError && (
          <Alert tone="error" title="No pudimos registrar el abono">
            {errorMessage(save.error)}
          </Alert>
        )}
        {accounts.isError ? (
          <ErrorState message="No pudimos cargar las cuentas." onRetry={() => void accounts.refetch()} />
        ) : accounts.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <SelectField
            label="Cuenta"
            options={[
              { value: '', label: 'Elige una cuenta' },
              ...accounts.data.map((item) => ({ value: String(item.id), label: item.name })),
            ]}
            value={accountId === null ? '' : String(accountId)}
            onChange={(event) => setDraft({ ...draft, accountId: event.target.value ? Number(event.target.value) : null })}
            hint={errors.account}
          />
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Valor del abono"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={draft.amount}
            onChange={(event) => setDraft({ ...draft, amount: event.target.value })}
            error={errors.amount}
          />
          <TextField
            label="Fecha"
            type="date"
            min={range.min}
            max={range.max}
            value={draft.date}
            onChange={(event) => setDraft({ ...draft, date: event.target.value })}
            error={errors.date}
          />
        </div>
      </div>
    </Modal>
  )
}

function AnnulModal({ sale, onClose, onAnnulled, onRejected }: ActionModalProps & { onAnnulled: () => void }) {
  const submitting = useRef(false)
  const annul = useMutation({
    mutationFn: () => annulSale(sale.id),
    onSuccess: onAnnulled,
    onError: () => {
      submitting.current = false
      onRejected()
    },
  })

  function confirm() {
    if (submitting.current) return
    submitting.current = true
    annul.mutate()
  }

  return (
    <Modal
      title={`Anular factura ${sale.invoiceNumber}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirm} disabled={annul.isPending}>
            {annul.isPending ? 'Anulando…' : 'Anular factura'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-body text-text">
          La factura pasa a la papelera. Las unidades vendidas vuelven al inventario y se revierten el saldo de las
          cuentas y los pagos registrados. Puedes recuperarla desde la Papelera.
        </p>
        {annul.isError && (
          <Alert tone="error" title="No pudimos anular la factura">
            {errorMessage(annul.error)}
          </Alert>
        )}
      </div>
    </Modal>
  )
}
