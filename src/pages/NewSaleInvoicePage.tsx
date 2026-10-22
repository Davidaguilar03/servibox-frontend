import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useBlocker, useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { ComboboxField, type ComboboxOption } from '../components/ComboboxField'
import { Modal } from '../components/Modal'
import { SelectField } from '../components/SelectField'
import { TextField } from '../components/TextField'
import { EmptyState, ErrorState, Skeleton } from '../components/states'
import { showToast } from '../components/toast'
import {
  fetchAccounts,
  fetchCategories,
  fetchProducts,
  type Category,
  type Product,
} from '../dashboard/dashboardApi'
import { ApiError } from '../lib/api'
import { errorMessage } from '../lib/errorMessage'
import { EMPTY_VALUE, formatCurrency } from '../lib/format'
import {
  CREDIT_DAY_OPTIONS,
  addDays,
  buildSaleRequest,
  defaultCashAccount,
  defaultDueDate,
  invoiceTotals,
  isDuplicateNumberError,
  lineAmounts,
  paymentMethodLabels,
  paymentMethodsFor,
  stockWarnings,
  validateSale,
  vatRate,
  type PaymentMethod,
  type SaleForm,
  type SaleLine,
} from '../sales/newSale'
import {
  createCounterparty,
  createSale,
  fetchCustomers,
  fetchNextInvoiceNumber,
  type Counterparty,
  type DocumentType,
  type SaleRequest,
} from '../sales/salesApi'
import { businessToday } from '../sales/salesList'

/** Documento del tercero Consumidor final que crea el backend en cada tenant. */
const CONSUMIDOR_FINAL_DOCUMENT = '222222222222'

const CUSTOMERS_KEY = ['counterparties', 'CLIENTE']

const documentTypes: Array<{ value: DocumentType; label: string }> = [
  { value: 'CC', label: 'CC' },
  { value: 'NIT', label: 'NIT' },
  { value: 'CE', label: 'CE' },
  { value: 'RUT', label: 'RUT' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
]

const card = 'rounded-card border border-border bg-surface p-6 shadow-card'
const lineInput =
  'h-control w-full rounded-control border bg-surface px-3 text-right text-body text-text tabular outline-none transition-[border-color,box-shadow] duration-(--duration-fast) focus:ring-3'
const lineGrid = 'md:grid md:grid-cols-[110px_minmax(0,1fr)_96px_128px_104px_112px_44px] md:items-start md:gap-3'

function initialForm(today: string): SaleForm {
  return {
    customerId: null,
    invoiceDate: today,
    paymentType: 'CONTADO',
    dueDate: today,
    accountId: null,
    paymentMethod: '',
    lines: [],
  }
}

function units(count: number) {
  return count === 1 ? '1 unidad' : `${count} unidades`
}

/** Nueva factura de venta: datos generales, lineas con calculo en vivo y resumen. */
export function NewSaleInvoicePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [today] = useState(() => businessToday())
  const [initial] = useState(() => initialForm(today))
  const [form, setForm] = useState<SaleForm>(initial)
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  // Mientras el usuario no elija cuenta, en contado se propone la primera de efectivo.
  const [accountTouched, setAccountTouched] = useState(false)
  const nextKey = useRef(1)
  const allowLeave = useRef(false)

  const nextNumber = useQuery({ queryKey: ['sales', 'next-invoice-number'], queryFn: fetchNextInvoiceNumber })
  const customers = useQuery({ queryKey: CUSTOMERS_KEY, queryFn: fetchCustomers })
  const accounts = useQuery({ queryKey: ['treasury', 'accounts'], queryFn: fetchAccounts })
  const products = useQuery({ queryKey: ['inventory', 'products'], queryFn: fetchProducts })
  const categories = useQuery({ queryKey: ['inventory', 'categories'], queryFn: fetchCategories })

  const productsById = new Map((products.data ?? []).map((product) => [product.id, product]))
  const categoriesById = new Map((categories.data ?? []).map((category) => [category.id, category]))
  const consumidorFinal = customers.data?.find((customer) => customer.documentNumber === CONSUMIDOR_FINAL_DOCUMENT)
  // Sin eleccion del usuario el cliente es el Consumidor final; no cuenta como cambio.
  const customerId = form.customerId ?? consumidorFinal?.id ?? null
  const customer = customers.data?.find((item) => item.id === customerId)
  const cashAccount = defaultCashAccount(accounts.data)
  const proposeCash = form.paymentType === 'CONTADO' && !accountTouched
  const accountId = proposeCash ? (cashAccount?.id ?? null) : form.accountId
  const paymentMethod = proposeCash ? (paymentMethodsFor(cashAccount?.type).options[0] ?? '') : form.paymentMethod
  const account = accounts.data?.find((item) => item.id === accountId)
  const methods = paymentMethodsFor(account?.type)

  const effectiveForm = { ...form, customerId, accountId, paymentMethod }
  const validation = validateSale(effectiveForm, productsById)
  const dirty = JSON.stringify(form) !== JSON.stringify(initial)

  const rateOf = (product: Product | undefined) =>
    vatRate(product?.categoryId == null ? undefined : categoriesById.get(product.categoryId))
  const pricedLines = form.lines.map((line) => ({
    quantity: Number(line.quantity) || 0,
    price: Number(line.price) || 0,
    rate: rateOf(line.productId === null ? undefined : productsById.get(line.productId)),
  }))
  const totals = invoiceTotals(pricedLines)
  const totalUnits = pricedLines.reduce((sum, line) => sum + (Number.isInteger(line.quantity) ? line.quantity : 0), 0)
  const warnings = stockWarnings(form.lines, productsById, categoriesById)

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !allowLeave.current && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const save = useMutation({
    // Otra factura pudo tomar el mismo consecutivo al tiempo: se reintenta una sola vez.
    mutationFn: async (request: SaleRequest) => {
      try {
        return await createSale(request)
      } catch (error) {
        if (isDuplicateNumberError(error)) return createSale(request)
        throw error
      }
    },
    onSuccess: (sale) => {
      allowLeave.current = true
      showToast(`Factura ${sale.invoiceNumber} guardada`)
      void queryClient.invalidateQueries({ queryKey: ['sales'] })
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'products'] })
      void queryClient.invalidateQueries({ queryKey: ['treasury'] })
      void queryClient.invalidateQueries({ queryKey: ['kpis'] })
      void navigate('/ventas')
    },
    // Un 409 de stock dice que el inventario cambio: se refresca para mostrar lo disponible.
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        void queryClient.invalidateQueries({ queryKey: ['inventory', 'products'] })
      }
    },
  })

  const update = (change: Partial<SaleForm>) => setForm((current) => ({ ...current, ...change }))
  const updateLine = (key: number, change: Partial<SaleLine>) =>
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.key === key ? { ...line, ...change } : line)),
    }))

  function changeInvoiceDate(invoiceDate: string) {
    update(
      form.paymentType === 'CONTADO'
        ? { invoiceDate, dueDate: invoiceDate }
        : { invoiceDate, dueDate: invoiceDate ? defaultDueDate(invoiceDate) : '' },
    )
  }

  function changePaymentType(paymentType: SaleForm['paymentType']) {
    if (paymentType === form.paymentType) return
    setAccountTouched(false)
    update(
      paymentType === 'CONTADO'
        ? { paymentType, dueDate: form.invoiceDate }
        : { paymentType, dueDate: defaultDueDate(form.invoiceDate), accountId: null, paymentMethod: '' },
    )
  }

  function changeAccount(value: string) {
    const accountId = value ? Number(value) : null
    const type = accounts.data?.find((item) => item.id === accountId)?.type
    setAccountTouched(true)
    update({ accountId, paymentMethod: paymentMethodsFor(type).options[0] ?? '' })
  }

  function addLine() {
    const key = nextKey.current++
    setForm((current) => ({ ...current, lines: [...current.lines, { key, productId: null, quantity: '1', price: '' }] }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validation.valid || save.isPending) return
    save.mutate(buildSaleRequest(effectiveForm))
  }

  function handleCustomerCreated(created: Counterparty) {
    queryClient.setQueryData<Counterparty[]>(CUSTOMERS_KEY, (list = []) => [
      ...list.filter((item) => item.id !== created.id),
      created,
    ])
    update({ customerId: created.id })
    setCustomerModalOpen(false)
  }

  const missing = [...validation.form]
  if (form.lines.some((line) => validation.lines[line.key]?.product)) missing.push('Elige el producto de cada línea.')

  const customerOptions: ComboboxOption[] = (customers.data ?? []).map((item) => ({
    value: item.id,
    label: item.name,
    detail: `${item.documentType} ${item.documentNumber}`,
    keywords: item.documentNumber,
  }))

  let generalContent: ReactNode
  if (customers.isError || accounts.isError) {
    generalContent = (
      <ErrorState
        message="No pudimos cargar los clientes y las cuentas."
        onRetry={() => {
          if (customers.isError) void customers.refetch()
          if (accounts.isError) void accounts.refetch()
        }}
      />
    )
  } else if (customers.isPending || accounts.isPending) {
    generalContent = (
      <div className="grid gap-4 sm:grid-cols-2" aria-busy>
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    )
  } else {
    generalContent = (
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Número"
          readOnly
          value={nextNumber.data?.invoiceNumber ?? EMPTY_VALUE}
          hint="Se confirma al guardar"
        />
        <div className="flex flex-col gap-1.5">
          <ComboboxField
            label="Cliente"
            options={customerOptions}
            value={customerId}
            onChange={(value) => update({ customerId: value })}
            placeholder="Busca por nombre o documento"
          />
          <button
            type="button"
            onClick={() => setCustomerModalOpen(true)}
            className="self-start rounded-tag text-small font-medium text-brand-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Nuevo cliente
          </button>
        </div>
        <TextField
          label="Documento"
          readOnly
          value={customer ? `${customer.documentType} ${customer.documentNumber}` : EMPTY_VALUE}
        />
        <TextField label="Correo del cliente" readOnly value={customer?.email || EMPTY_VALUE} />
        <TextField
          label="Fecha de factura"
          type="date"
          required
          value={form.invoiceDate}
          onChange={(event) => changeInvoiceDate(event.target.value)}
        />
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-small font-medium text-text">Tipo de pago</legend>
          <div className="grid h-control grid-cols-2 gap-1 rounded-control border border-border bg-surface p-1">
            {(['CONTADO', 'CREDITO'] as const).map((type) => (
              <label
                key={type}
                className={`flex cursor-pointer items-center justify-center rounded-tag text-small font-medium transition-colors duration-(--duration-fast) has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand ${
                  form.paymentType === type ? 'bg-dark text-text-inverse' : 'text-text hover:bg-neutral-100'
                }`}
              >
                <input
                  type="radio"
                  name="paymentType"
                  value={type}
                  checked={form.paymentType === type}
                  onChange={() => changePaymentType(type)}
                  className="sr-only"
                />
                {type === 'CONTADO' ? 'Contado' : 'Crédito'}
              </label>
            ))}
          </div>
        </fieldset>

        {form.paymentType === 'CONTADO' ? (
          <>
            {accounts.data.length === 0 ? (
              <p className="text-small text-text-muted sm:col-span-2">
                Aún no tienes cuentas. Crea una en Cuentas para facturar de contado.
              </p>
            ) : (
              <>
                <SelectField
                  label="Cuenta"
                  options={[
                    { value: '', label: 'Elige una cuenta' },
                    ...accounts.data.map((item) => ({ value: String(item.id), label: item.name })),
                  ]}
                  value={accountId === null ? '' : String(accountId)}
                  onChange={(event) => changeAccount(event.target.value)}
                />
                <SelectField
                  label="Método de pago"
                  options={
                    methods.options.length
                      ? methods.options.map((method) => ({ value: method, label: paymentMethodLabels[method] }))
                      : [{ value: '', label: 'Elige primero la cuenta' }]
                  }
                  value={paymentMethod}
                  disabled={methods.locked}
                  onChange={(event) => update({ paymentMethod: event.target.value as PaymentMethod })}
                  hint={methods.locked && account ? `Se asigna automáticamente con ${account.name}` : undefined}
                />
              </>
            )}
            <TextField
              label="Fecha de vencimiento"
              type="date"
              readOnly
              value={form.invoiceDate}
              hint="En contado es igual a la fecha de factura"
            />
          </>
        ) : (
          <div className="flex flex-col gap-2 sm:col-span-2">
            <TextField
              label="Fecha de vencimiento"
              type="date"
              required
              min={form.invoiceDate}
              value={form.dueDate}
              onChange={(event) => update({ dueDate: event.target.value })}
              error={
                form.dueDate && form.dueDate < form.invoiceDate
                  ? 'El vencimiento no puede ser anterior a la fecha de la factura.'
                  : undefined
              }
            />
            <div className="flex flex-wrap gap-2" role="group" aria-label="Plazo">
              {CREDIT_DAY_OPTIONS.map((days) => (
                <Button
                  key={days}
                  variant="secondary"
                  onClick={() => update({ dueDate: addDays(form.invoiceDate, days) })}
                  disabled={!form.invoiceDate}
                >
                  {days} días
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div>
        <h1 className="text-h1 text-text">Nueva factura de venta</h1>
        <p className="mt-1 text-small text-text-muted">
          Al guardar se descuenta el inventario y se acredita la cuenta en una sola operación.
        </p>
      </div>

      {save.isError && (
        <Alert tone="error" title="No pudimos guardar la factura">
          {errorMessage(save.error)}
        </Alert>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className={card} aria-labelledby="general-title">
          <h2 id="general-title" className="mb-4 text-h3 text-text">
            Datos generales
          </h2>
          {generalContent}
        </section>

        <aside className={card} aria-labelledby="summary-title">
          <h2 id="summary-title" className="mb-4 text-h3 text-text">
            Resumen
          </h2>
          <dl className="flex flex-col gap-3 text-body">
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">Subtotal</dt>
              <dd className="tabular font-medium text-text">{formatCurrency(totals.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">IVA</dt>
              <dd className="tabular font-medium text-text">{formatCurrency(totals.iva)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-border pt-4">
              <dt className="font-medium text-text">Total</dt>
              <dd className="tabular font-display text-h2 font-bold text-text">{formatCurrency(totals.total)}</dd>
            </div>
          </dl>
          {totalUnits > 0 && (
            <p className="mt-4 rounded-control bg-neutral-200 p-3 text-small text-text-muted">
              Al guardar se descuentan {units(totalUnits)} del inventario
              {form.paymentType === 'CREDITO'
                ? ' y la factura queda pendiente de abono.'
                : account
                  ? ` y se acreditan ${formatCurrency(totals.total)} en ${account.name}.`
                  : '.'}
            </p>
          )}
          <div className="mt-4 flex flex-col gap-3">
            <Button type="submit" disabled={!validation.valid || save.isPending}>
              {save.isPending ? 'Guardando…' : 'Guardar factura'}
            </Button>
            <Button variant="secondary" onClick={() => void navigate('/ventas')}>
              Cancelar
            </Button>
          </div>
          {missing.length > 0 && (
            <ul aria-live="polite" className="mt-3 flex flex-col gap-1 text-small text-text-muted">
              {missing.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <section className={card} aria-labelledby="products-title">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 id="products-title" className="text-h3 text-text">
            Productos
          </h2>
          <p className="text-small text-text-muted">El precio inicia en el precio sugerido y se puede editar</p>
        </div>
        <LinesBlock
          lines={form.lines}
          products={products}
          categories={categories}
          productsById={productsById}
          rateOf={rateOf}
          errors={validation.lines}
          onChange={updateLine}
          onRemove={(key) => setForm((current) => ({ ...current, lines: current.lines.filter((line) => line.key !== key) }))}
          onAdd={addLine}
        />
        {warnings.length > 0 && (
          <div className="mt-4 flex flex-col gap-3">
            {warnings.map((warning) => (
              <Alert key={warning.productId} tone={warning.tone} title={warning.title}>
                {warning.code} quedará con {units(warning.remaining)} después de esta venta.
              </Alert>
            ))}
          </div>
        )}
      </section>

      {customerModalOpen && (
        <NewCustomerModal onClose={() => setCustomerModalOpen(false)} onCreated={handleCustomerCreated} />
      )}

      {blocker.state === 'blocked' && (
        <Modal
          title="Descartar cambios"
          onClose={() => blocker.reset()}
          footer={
            <>
              <Button variant="secondary" onClick={() => blocker.reset()}>
                Seguir editando
              </Button>
              <Button variant="danger" onClick={() => blocker.proceed()}>
                Descartar cambios
              </Button>
            </>
          }
        >
          <p className="text-body text-text">Si sales ahora, se pierde lo que digitaste en esta factura.</p>
        </Modal>
      )}
    </form>
  )
}

interface LinesBlockProps {
  lines: SaleLine[]
  products: { data: Product[] | undefined; isPending: boolean; isError: boolean; refetch: () => unknown }
  categories: { data: Category[] | undefined; isPending: boolean; isError: boolean; refetch: () => unknown }
  productsById: Map<number, Product>
  rateOf: (product: Product | undefined) => number
  errors: Record<number, { product?: string; quantity?: string; price?: string }>
  onChange: (key: number, change: Partial<SaleLine>) => void
  onRemove: (key: number) => void
  onAdd: () => void
}

function LinesBlock({ lines, products, categories, productsById, rateOf, errors, onChange, onRemove, onAdd }: LinesBlockProps) {
  if (products.isError || categories.isError) {
    return (
      <ErrorState
        message="No pudimos cargar los productos."
        onRetry={() => {
          if (products.isError) void products.refetch()
          if (categories.isError) void categories.refetch()
        }}
      />
    )
  }
  if (products.isPending || categories.isPending) {
    return (
      <div className="flex flex-col gap-3" aria-busy>
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    )
  }
  if (!products.data || products.data.length === 0) {
    return <EmptyState message="Aún no tienes productos en el inventario. Agrégalos en Inventario para facturarlos." />
  }

  const used = new Set(lines.map((line) => line.productId))
  const available = products.data.filter((product) => (product.quantity ?? 0) > 0)

  return (
    <div>
      {lines.length > 0 && (
        <div
          className={`hidden rounded-control bg-canvas px-3 py-3 text-label text-text-muted uppercase ${lineGrid}`}
          aria-hidden
        >
          <span>Código</span>
          <span>Descripción</span>
          <span className="text-right">Cant.</span>
          <span className="text-right">Precio</span>
          <span className="text-right">IVA</span>
          <span className="text-right">Total</span>
          <span />
        </div>
      )}
      <ul className="flex flex-col gap-3 md:gap-0">
        {lines.map((line) => {
          const product = line.productId === null ? undefined : productsById.get(line.productId)
          const lineErrors = product ? errors[line.key] : undefined
          const amounts = lineAmounts({
            quantity: Number(line.quantity) || 0,
            price: Number(line.price) || 0,
            rate: rateOf(product),
          })
          const options: ComboboxOption[] = available
            .filter((item) => item.id === line.productId || !used.has(item.id))
            .map((item) => ({
              value: item.id,
              label: item.description,
              detail: `${item.code} · ${item.quantity ?? 0} disponibles`,
              keywords: item.code,
            }))
          const name = product?.description ?? 'línea sin producto'
          return (
            <li
              key={line.key}
              aria-label={product ? `Línea ${product.code}` : 'Línea nueva'}
              className={`flex flex-col gap-3 rounded-control border border-border p-4 md:rounded-none md:border-0 md:border-b md:px-3 md:py-3 ${lineGrid}`}
            >
              <span className="font-mono text-small text-text md:pt-2.5">
                <span className="text-text-muted md:sr-only">Código: </span>
                {product?.code ?? EMPTY_VALUE}
              </span>
              <ComboboxField
                label="Producto"
                compactLabel
                options={options}
                value={line.productId}
                onChange={(productId) => {
                  const chosen = productsById.get(productId)
                  onChange(line.key, { productId, price: chosen?.suggestedPrice ? String(chosen.suggestedPrice) : '' })
                }}
                placeholder="Busca por código o descripción"
              />
              <LineNumberInput
                label="Cantidad"
                value={line.quantity}
                min={1}
                max={product?.quantity ?? undefined}
                step={1}
                onChange={(quantity) => onChange(line.key, { quantity })}
                hint={product ? `Disponible: ${product.quantity ?? 0}` : undefined}
                error={lineErrors?.quantity}
              />
              <LineNumberInput
                label="Precio"
                value={line.price}
                min={0}
                step="any"
                onChange={(price) => onChange(line.key, { price })}
                error={lineErrors?.price}
              />
              <span className="tabular flex justify-between text-small text-text md:block md:pt-2.5 md:text-right">
                <span className="text-text-muted md:sr-only">IVA </span>
                {formatCurrency(amounts.iva)}
              </span>
              <span className="tabular flex justify-between text-small font-medium text-text md:block md:pt-2.5 md:text-right">
                <span className="font-normal text-text-muted md:sr-only">Total </span>
                {formatCurrency(amounts.base)}
              </span>
              <button
                type="button"
                onClick={() => onRemove(line.key)}
                aria-label={`Quitar ${name}`}
                className="flex size-touch items-center justify-center self-end rounded-control text-text-muted transition-colors duration-(--duration-fast) hover:bg-neutral-100 hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand md:self-start"
              >
                <Trash2 size={18} strokeWidth={1.5} aria-hidden />
              </button>
            </li>
          )
        })}
      </ul>
      <Button
        variant="secondary"
        className="mt-4"
        onClick={onAdd}
        disabled={lines.length >= available.length}
      >
        Agregar producto
      </Button>
      {available.length === 0 && (
        <p className="mt-2 text-small text-text-muted">No hay productos con stock para facturar.</p>
      )}
    </div>
  )
}

interface LineNumberInputProps {
  label: string
  value: string
  min?: number
  max?: number
  step: number | 'any'
  onChange: (value: string) => void
  hint?: string
  error?: string
}

/** Campo numerico de una linea: etiqueta visible bajo md, solo para lectores desde md. */
function LineNumberInput({ label, value, min, max, step, onChange, hint, error }: LineNumberInputProps) {
  const id = useId()
  const message = error ?? hint
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-small font-medium text-text md:sr-only">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode={step === 1 ? 'numeric' : 'decimal'}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? `${id}-message` : undefined}
        className={`${lineInput} ${error ? 'border-error focus:ring-error/20' : 'border-border focus:border-brand focus:ring-brand/20'}`}
      />
      {message && (
        <p id={`${id}-message`} aria-live="polite" className={`text-small ${error ? 'text-error' : 'text-text-muted'} md:text-right`}>
          {message}
        </p>
      )}
    </div>
  )
}

function NewCustomerModal({ onClose, onCreated }: { onClose: () => void; onCreated: (customer: Counterparty) => void }) {
  const [name, setName] = useState('')
  const [documentType, setDocumentType] = useState<DocumentType>('CC')
  const [documentNumber, setDocumentNumber] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const create = useMutation({ mutationFn: createCounterparty, onSuccess: onCreated })
  const ready = name.trim() !== '' && documentNumber.trim() !== ''

  function submit() {
    if (!ready || create.isPending) return
    create.mutate({
      role: 'CLIENTE',
      name: name.trim(),
      documentType,
      documentNumber: documentNumber.trim(),
      ...(email.trim() ? { email: email.trim() } : {}),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
    })
  }

  return (
    <Modal
      title="Nuevo cliente"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!ready || create.isPending}>
            {create.isPending ? 'Guardando…' : 'Guardar cliente'}
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
        {create.isError && (
          <Alert tone="error" title="No pudimos crear el cliente">
            {errorMessage(create.error)}
          </Alert>
        )}
        <TextField label="Nombre o razón social" value={name} onChange={(event) => setName(event.target.value)} required />
        <div className="grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)]">
          <SelectField
            label="Tipo de documento"
            options={documentTypes}
            value={documentType}
            onChange={(event) => setDocumentType(event.target.value as DocumentType)}
          />
          <TextField
            label="Número de documento"
            value={documentNumber}
            onChange={(event) => setDocumentNumber(event.target.value)}
            required
          />
        </div>
        <TextField label="Correo" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <TextField label="Celular" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
      </div>
    </Modal>
  )
}
