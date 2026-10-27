import { GLOSSARY } from '../copy/glossary'
import { useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileQuestion } from 'lucide-react'
import { useReportedError } from '../api/reportError'
import { ACCOUNTS_KEY, type TreasuryMovement } from '../accounts/accountsApi'
import { Alert } from '../components/Alert'
import { DiscardableModal } from '../components/DiscardableModal'
import { ErrorSummary } from '../components/ErrorSummary'
import { Button } from '../components/Button'
import { buttonClasses } from '../components/buttonStyles'
import { DataTable, type Column } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { SelectField } from '../components/SelectField'
import { StatusBadge } from '../components/StatusBadge'
import { TextField } from '../components/TextField'
import { EmptyState, ErrorState, Skeleton } from '../components/states'
import { showToast } from '../components/toast'
import { fetchAccounts, type Account } from '../dashboard/dashboardApi'
import { useBreadcrumbTail } from '../layout/breadcrumb'
import { defaultCashAccount } from '../lib/accountPayment'
import { ApiError } from '../lib/api'
import { businessToday } from '../lib/businessDate'
import { revealErrors } from '../lib/formErrors'
import { EMPTY_VALUE, formatCurrency, formatDate } from '../lib/format'
import { isInsufficientBalanceError, purchasePaymentMethodLabels, type PurchasePaymentMethod } from '../purchases/newPurchase'
import { purchaseActions, validatePayment, type PaymentDraft } from '../purchases/purchaseDetail'
import {
  PURCHASES_KEY,
  annulPurchase,
  createPurchasePayment,
  fetchPurchase,
  fetchPurchaseMovements,
  type Purchase,
} from '../purchases/purchasesApi'
import {
  buildCollectionRequest,
  collectionDateRange,
  lineTotal,
  parseSaleId,
  saleSummary,
  sortCollections,
} from '../sales/saleDetail'
import { iconLg } from '../components/icons'
import type { AppShellContext } from '../layout/AppShell'

const card = 'rounded-surface border border-border bg-surface p-6'

const paymentTypeLabels: Record<Purchase['paymentType'], string> = { CONTADO: 'Contado', CREDITO: 'Crédito' }

type Line = Purchase['details'][number]

const lineColumns: Column<Line>[] = [
  { header: 'Código', render: (line) => <span className="codigo">{line.productCode ?? EMPTY_VALUE}</span> },
  { header: 'Descripción', render: (line) => <span className="wrap-anywhere">{line.productDescription ?? EMPTY_VALUE}</span> },
  { header: 'Cant.', align: 'right', render: (line) => line.quantity },
  { header: 'Precio sin IVA', align: 'right', render: (line) => <span className="monto">{formatCurrency(line.price)}</span> },
  { header: 'IVA', align: 'right', render: (line) => <span className="monto">{formatCurrency(line.ivaAmount)}</span> },
  { header: 'Total', align: 'right', render: (line) => <span className="monto">{formatCurrency(lineTotal(line))}</span> },
]

function methodLabel(method: string | null) {
  if (!method) return null
  return purchasePaymentMethodLabels[method as PurchasePaymentMethod] ?? method
}

/** Detalle de factura de compra: datos, productos, pagos y resumen, con pagar y anular. */
export function PurchaseDetailPage() {
  const { menuButton } = useOutletContext<AppShellContext>()
  const purchaseId = parseSaleId(useParams().id)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {menuButton}
        <Link to="/compras" className={buttonClasses('text')}>Volver a Facturas de compra</Link>
      </div>
      {purchaseId === null ? <NotFound /> : <PurchaseDetailContent purchaseId={purchaseId} />}
    </div>
  )
}

function NotFound() {
  return (
    <div className={`${card} flex flex-col items-center gap-3 py-12 text-center`}>
      <FileQuestion {...iconLg} className="text-text-subtle" aria-hidden />
      <h1 className="text-title text-text">Factura no encontrada</h1>
      <p className="text-small text-text-muted">Revisa el número o búscala en el listado.</p>
    </div>
  )
}

function PurchaseDetailContent({ purchaseId }: { purchaseId: number }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [modal, setModal] = useState<'pay' | 'annul' | null>(null)
  const purchase = useQuery({ queryKey: [...PURCHASES_KEY, purchaseId], queryFn: () => fetchPurchase(purchaseId) })
  const movements = useQuery({
    queryKey: ['treasury', 'movements', 'purchase', purchaseId],
    queryFn: () => fetchPurchaseMovements(purchaseId),
  })
  const accounts = useQuery({ queryKey: ACCOUNTS_KEY, queryFn: fetchAccounts })
  useBreadcrumbTail(purchase.data?.invoiceNumber)

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: PURCHASES_KEY })
    void queryClient.invalidateQueries({ queryKey: ['treasury'] })
    void queryClient.invalidateQueries({ queryKey: ['inventory', 'products'] })
    void queryClient.invalidateQueries({ queryKey: ['kpis'] })
  }

  if (purchase.error instanceof ApiError && purchase.error.status === 404) return <NotFound />
  if (purchase.isError) {
    return (
      <div className={card}>
        <ErrorState message="No pudimos cargar la factura." onRetry={() => void purchase.refetch()} />
      </div>
    )
  }
  if (purchase.isPending) {
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

  const data = purchase.data
  const actions = purchaseActions(data)
  const summary = saleSummary(data)
  const subtitle = [
    data.supplier.name,
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
            <h1 className="codigo text-title text-text">{data.invoiceNumber}</h1>
            <StatusBadge status={data.status} />
          </div>
          <p className="mt-1 text-small text-text-muted">{subtitle}</p>
        </div>
        {(actions.canAnnul || actions.canPay) && (
          <div className="flex flex-wrap items-center gap-3">
            {actions.canAnnul && (
              <Button variant="secondary" onClick={() => setModal('annul')}>
                Anular
              </Button>
            )}
            {actions.canPay && <Button onClick={() => setModal('pay')}>Registrar pago</Button>}
          </div>
        )}
      </div>

      {data.status === 'ANULADA' && (
        <Alert tone="info" title="Factura anulada">
          Está en la papelera: sus unidades salieron del inventario y sus pagos se revirtieron. Solo puedes
          consultarla.
        </Alert>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className={card} aria-labelledby="purchase-data-title">
            <h2 id="purchase-data-title" className="mb-4 text-section text-text">
              Datos de la factura
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Proveedor">{data.supplier.name}</Field>
              <Field label="Documento">{`${data.supplier.documentType} ${data.supplier.documentNumber}`}</Field>
              <Field label="Correo">{data.supplier.email || EMPTY_VALUE}</Field>
              <Field label="Celular">{data.supplier.phone || EMPTY_VALUE}</Field>
              <Field label="Fecha">{formatDate(data.invoiceDate)}</Field>
              <Field label="Vence">{formatDate(data.dueDate)}</Field>
              <Field label="Forma de pago">{paymentTypeLabels[data.paymentType]}</Field>
              {method && <Field label={GLOSSARY.paymentMethod}>{method}</Field>}
            </dl>
          </section>

          <section className={card} aria-labelledby="purchase-lines-title">
            <h2 id="purchase-lines-title" className="mb-4 text-section text-text">
              Productos
            </h2>
            <div className="hidden md:block">
              <DataTable
                columns={lineColumns}
                rows={data.details}
                rowKey={(line) => line.id}
                loading={false}
                error={false}
                onRetry={() => void purchase.refetch()}
                emptyMessage="Esta factura no tiene productos."
              />
            </div>
            <ul className="flex flex-col gap-3 md:hidden" aria-label="Productos">
              {data.details.map((line) => (
                <li key={line.id} className="rounded-surface border border-border p-4">
                  <p className="codigo text-small text-text-muted">{line.productCode}</p>
                  <p className="wrap-anywhere text-body text-text">{line.productDescription}</p>
                  <p className="monto mt-2 flex justify-between gap-3 text-small text-text-muted">
                    <span>
                      {line.quantity} × {formatCurrency(line.price)} · IVA {formatCurrency(line.ivaAmount)}
                    </span>
                    <span className="font-semibold whitespace-nowrap text-text">{formatCurrency(lineTotal(line))}</span>
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className={card} aria-labelledby="purchase-payments-title">
            <h2 id="purchase-payments-title" className="mb-4 text-section text-text">
              {data.paymentType === 'CREDITO' ? 'Pagos registrados' : 'Pago realizado'}
            </h2>
            <PaymentsBlock purchase={data} movements={movements} accounts={accounts.data} />
          </section>
        </div>

        <aside className={card} aria-labelledby="purchase-summary-title">
          <h2 id="purchase-summary-title" className="mb-4 text-section text-text">
            Resumen
          </h2>
          <dl className="flex flex-col gap-3 text-body">
            <SummaryRow label="Subtotal" value={formatCurrency(summary.subtotal)} />
            <SummaryRow label="IVA" value={formatCurrency(summary.iva)} />
            <SummaryRow label="Total" value={formatCurrency(summary.total)} />
            <SummaryRow
              label="Pagado"
              value={summary.paid === null ? EMPTY_VALUE : formatCurrency(summary.paid)}
              tone={summary.paid ? 'text-success-ink' : undefined}
            />
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 border-t border-border pt-4">
              <dt className="font-semibold text-text">Saldo pendiente</dt>
              <dd className="monto wrap-anywhere text-right text-figure text-text">
                {summary.pending === null ? EMPTY_VALUE : formatCurrency(summary.pending).replace('$ ', '$\u00a0')}
              </dd>
            </div>
          </dl>
        </aside>
      </div>

      {modal === 'pay' && (
        <PaymentModal
          purchase={data}
          accounts={accounts}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            showToast('Pago registrado')
            refresh()
          }}
          onRejected={refresh}
        />
      )}
      {modal === 'annul' && (
        <AnnulModal
          purchase={data}
          onClose={() => setModal(null)}
          onAnnulled={() => {
            showToast(`Factura ${data.invoiceNumber} anulada`)
            refresh()
            void navigate('/compras')
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
    <div className="flex flex-wrap justify-between gap-x-4">
      <dt className="text-text-muted">{label}</dt>
      <dd className={`monto font-semibold whitespace-nowrap ${tone ?? 'text-text'}`}>{value}</dd>
    </div>
  )
}

interface PaymentsBlockProps {
  purchase: Purchase
  movements: { data: TreasuryMovement[] | undefined; isPending: boolean; isError: boolean; refetch: () => unknown }
  accounts: Account[] | undefined
}

function PaymentsBlock({ purchase, movements, accounts }: PaymentsBlockProps) {
  if (movements.isError) {
    return <ErrorState message="No pudimos cargar los pagos." onRetry={() => void movements.refetch()} />
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
      purchase.status === 'ANULADA'
        ? 'La factura está anulada: sus pagos se revirtieron.'
        : purchase.paymentType === 'CREDITO'
          ? 'Aún no hay pagos. Regístralos con Registrar pago.'
          : 'No hay un pago registrado para esta factura.'
    return <EmptyState message={message} />
  }
  const accountName = (movement: TreasuryMovement) =>
    movement.accountName ?? accounts?.find((account) => account.id === movement.accountId)?.name ?? EMPTY_VALUE
  const columns: Column<TreasuryMovement>[] = [
    { header: 'Fecha', render: (movement) => formatDate(movement.date) },
    { header: 'Cuenta', render: accountName },
    { header: 'Valor', align: 'right', render: (movement) => <span className="monto">{formatCurrency(movement.amount)}</span> },
  ]
  const rows = sortCollections(movements.data)
  return (
    <>
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(movement) => movement.id}
          loading={false}
          error={false}
          onRetry={() => void movements.refetch()}
          emptyMessage=""
        />
      </div>
      <ul className="flex flex-col gap-3 md:hidden" aria-label="Pagos">
        {rows.map((movement) => (
          <li key={movement.id} className="flex items-center justify-between gap-4 rounded-surface border border-border p-4">
            <span className="flex flex-col">
              <span className="text-body text-text">{accountName(movement)}</span>
              <span className="text-small text-text-muted">{formatDate(movement.date)}</span>
            </span>
            <span className="monto text-body font-semibold text-text">{formatCurrency(movement.amount)}</span>
          </li>
        ))}
      </ul>
    </>
  )
}

interface ActionModalProps {
  purchase: Purchase
  onClose: () => void
  /** El backend rechazo la accion: la factura pudo cambiar en otra pestana. */
  onRejected: () => void
}

interface PaymentModalProps extends ActionModalProps {
  accounts: { data: Account[] | undefined; isPending: boolean; isError: boolean; refetch: () => unknown }
  onSaved: () => void
}

function PaymentModal({ purchase, accounts, onClose, onSaved, onRejected }: PaymentModalProps) {
  const queryClient = useQueryClient()
  const [today] = useState(() => businessToday())
  const range = collectionDateRange(purchase.invoiceDate, today)
  const [draft, setDraft] = useState<Omit<PaymentDraft, 'accountId'> & { accountId: number | null | undefined }>({
    accountId: undefined,
    amount: String(purchase.pendingBalance),
    date: today,
  })
  const submitting = useRef(false)
  const [touched, setTouched] = useState<Set<string>>(() => new Set())
  const [submitted, setSubmitted] = useState(false)
  // Sin eleccion del usuario se propone la primera cuenta de efectivo.
  const accountId = draft.accountId === undefined ? (defaultCashAccount(accounts.data)?.id ?? null) : draft.accountId
  const account = accounts.data?.find((item) => item.id === accountId)
  const effective: PaymentDraft = { ...draft, accountId }
  const { errors, insufficient, valid } = validatePayment(effective, purchase.pendingBalance, range, account)

  const save = useMutation({
    mutationFn: () => createPurchasePayment(purchase.id, buildCollectionRequest(effective)),
    onSuccess: onSaved,
    // Tras un exito el modal se cierra: solo un error vuelve a permitir enviar.
    onError: (error) => {
      submitting.current = false
      if (isInsufficientBalanceError(error)) void queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY })
      onRejected()
    },
  })
  const saveError = useReportedError(save.error)

  function submit() {
    if (submitting.current) return
    if (!valid) {
      // Registrar no se deshabilita por errores: se muestran todos y el foco va al primero.
      revealErrors(() => setSubmitted(true), document.querySelector<HTMLElement>('[role="dialog"]'))
      return
    }
    submitting.current = true
    save.mutate()
  }

  // Validacion al salir de cada campo; al enviar, todos.
  const shown = (field: 'account' | 'amount' | 'date') => (submitted || touched.has(field) ? errors[field] : undefined)
  const touch = (field: string) => () => setTouched((current) => new Set(current).add(field))
  const dirty = draft.accountId !== undefined || draft.amount !== String(purchase.pendingBalance) || draft.date !== today

  return (
    <DiscardableModal
      title="Registrar pago"
      dirty={dirty}
      busy={save.isPending}
      onClose={onClose}
      discardMessage="Si cierras ahora, se pierde lo que digitaste en este pago."
      footer={(requestClose) => (
        <>
          <Button variant="secondary" onClick={requestClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={save.isPending} aria-busy={save.isPending || undefined}>
            {save.isPending ? 'Registrando…' : 'Registrar pago'}
          </Button>
        </>
      )}
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
          {purchase.invoiceNumber} · {purchase.supplier.name}
        </p>
        <div className="flex items-center justify-between rounded-control bg-neutral-200 p-4">
          <span className="text-small text-text-muted">Saldo pendiente</span>
          <span className="monto text-body font-semibold text-text">{formatCurrency(purchase.pendingBalance)}</span>
        </div>
        {saveError && save.isError && (
          <Alert tone="error" title="No pudimos registrar el pago">
            {saveError}
          </Alert>
        )}
        {account && insufficient && (
          <Alert
            tone="error"
            title={`Saldo insuficiente en ${account.name}: disponible ${formatCurrency(account.currentBalance)}, necesitas ${formatCurrency(Number(draft.amount))}`}
          />
        )}
        {accounts.isError ? (
          <ErrorState message="No pudimos cargar las cuentas." onRetry={() => void accounts.refetch()} />
        ) : accounts.isPending || !accounts.data ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <SelectField
            label="Cuenta"
            options={[
              { value: '', label: 'Elige una cuenta' },
              ...accounts.data.map((item) => ({
                value: String(item.id),
                label: `${item.name} · ${formatCurrency(item.currentBalance)}`,
              })),
            ]}
            value={accountId === null ? '' : String(accountId)}
            onChange={(event) => setDraft({ ...draft, accountId: event.target.value ? Number(event.target.value) : null })}
            onBlur={touch('account')}
            hint={account ? `Saldo disponible: ${formatCurrency(account.currentBalance)}` : undefined}
            error={shown('account') ?? (insufficient && account ? `Saldo disponible: ${formatCurrency(account.currentBalance)}` : undefined)}
          />
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Valor del pago"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={draft.amount}
            onChange={(event) => setDraft({ ...draft, amount: event.target.value })}
            onBlur={touch('amount')}
            error={shown('amount')}
          />
          <TextField
            label="Fecha"
            type="date"
            min={range.min}
            max={range.max}
            value={draft.date}
            onChange={(event) => setDraft({ ...draft, date: event.target.value })}
            onBlur={touch('date')}
            error={shown('date')}
          />
        </div>
      </div>
      <ErrorSummary count={submitted ? Object.keys(errors).length : 0} />
    </DiscardableModal>
  )
}

function AnnulModal({ purchase, onClose, onAnnulled, onRejected }: ActionModalProps & { onAnnulled: () => void }) {
  const submitting = useRef(false)
  const annul = useMutation({
    mutationFn: () => annulPurchase(purchase.id),
    onSuccess: onAnnulled,
    onError: () => {
      submitting.current = false
      onRejected()
    },
  })
  const annulError = useReportedError(annul.error)

  function confirm() {
    if (submitting.current) return
    submitting.current = true
    annul.mutate()
  }

  return (
    <Modal
      title={`Anular factura ${purchase.invoiceNumber}`}
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
          La factura pasa a la papelera. Se descuentan del inventario las unidades que sumó esta compra y se revierten
          en las cuentas los pagos registrados. Puedes restaurarla desde la Papelera.
        </p>
        <p className="text-small text-text-muted">
          El costo de cada producto vuelve al de su compra anterior si todavía venía de esta compra. Si el producto no
          tiene otra compra, el costo se queda como está. Si parte de esas unidades ya se vendió, no se puede anular.
        </p>
        {annulError && annul.isError && (
          <Alert tone="error" title="No pudimos anular la factura">
            {annulError}
          </Alert>
        )}
      </div>
    </Modal>
  )
}
