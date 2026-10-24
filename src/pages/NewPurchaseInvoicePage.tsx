import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { ACCOUNTS_KEY } from '../accounts/accountsApi'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { ComboboxField, type ComboboxOption } from '../components/ComboboxField'
import { SelectField } from '../components/SelectField'
import { TextField } from '../components/TextField'
import { UnsavedChangesGuard } from '../components/UnsavedChangesGuard'
import { EmptyState, ErrorState, Skeleton } from '../components/states'
import { showToast } from '../components/toast'
import { NewCounterpartyModal } from '../counterparties/NewCounterpartyModal'
import { fetchAccounts } from '../dashboard/dashboardApi'
import {
  CATEGORIES_KEY,
  PRODUCTS_KEY,
  fetchInventoryCategories,
  fetchInventoryProducts,
  type InventoryCategory,
  type InventoryProduct,
} from '../inventory/inventoryApi'
import { defaultCashAccount } from '../lib/accountPayment'
import { CREDIT_DAY_OPTIONS, addDays, businessToday, defaultDueDate } from '../lib/businessDate'
import { errorMessage } from '../lib/errorMessage'
import { EMPTY_VALUE, formatCurrency } from '../lib/format'
import {
  INVOICE_NUMBER_MAX,
  buildPurchaseRequest,
  insufficientBalance,
  isDuplicatePurchaseNumberError,
  isInsufficientBalanceError,
  purchasePaymentMethodLabels,
  purchasePaymentMethodsFor,
  purchaseTotals,
  validatePurchase,
  type PurchaseForm,
  type PurchaseLine,
  type PurchasePaymentMethod,
} from '../purchases/newPurchase'
import { PURCHASES_KEY, SUPPLIERS_KEY, createPurchase, fetchSuppliers } from '../purchases/purchasesApi'
import { lineAmounts, vatRate } from '../sales/newSale'
import type { Counterparty } from '../sales/salesApi'

const card = 'rounded-card border border-border bg-surface p-6 shadow-card'
const lineInput =
  'h-control w-full rounded-control border bg-surface px-3 text-right text-body text-text tabular outline-none transition-[border-color,box-shadow] duration-(--duration-fast) focus:ring-3'
const lineGrid = 'md:grid md:grid-cols-[110px_minmax(0,1fr)_96px_128px_104px_112px_44px] md:items-start md:gap-3'

function initialForm(today: string): PurchaseForm {
  return {
    supplierId: null,
    invoiceNumber: '',
    invoiceDate: today,
    paymentType: 'CONTADO',
    dueDate: today,
    accountId: null,
    paymentMethod: '',
    lines: [],
  }
}

/** Nueva factura de compra: datos generales, lineas con calculo en vivo, saldo y resumen. */
export function NewPurchaseInvoicePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [today] = useState(() => businessToday())
  const [initial, setInitial] = useState(() => initialForm(today))
  const [form, setForm] = useState<PurchaseForm>(initial)
  const [supplierModalOpen, setSupplierModalOpen] = useState(false)
  // Mientras el usuario no elija cuenta, en contado se propone la primera de efectivo.
  const [accountTouched, setAccountTouched] = useState(false)
  // 409 de numero repetido: va bajo el campo hasta que se cambie el numero.
  const [numberError, setNumberError] = useState<string>()
  const numberRef = useRef<HTMLInputElement>(null)
  const nextKey = useRef(1)
  const allowLeave = useRef(false)

  const suppliers = useQuery({ queryKey: SUPPLIERS_KEY, queryFn: fetchSuppliers })

  // ?proveedor=<id> desde Proveedores: se elige una vez, al llegar la lista. Un id que no esta en ella (no
  // existe o no es proveedor) se ignora. Es el valor inicial, asi que no cuenta como cambio.
  const [searchParams] = useSearchParams()
  const [preselectDone, setPreselectDone] = useState(false)
  if (!preselectDone && suppliers.data) {
    setPreselectDone(true)
    const id = Number(searchParams.get('proveedor'))
    if (suppliers.data.some((item) => item.id === id)) {
      setInitial((current) => ({ ...current, supplierId: id }))
      setForm((current) => ({ ...current, supplierId: current.supplierId ?? id }))
    }
  }
  const accounts = useQuery({ queryKey: ACCOUNTS_KEY, queryFn: fetchAccounts })
  const products = useQuery({ queryKey: PRODUCTS_KEY, queryFn: fetchInventoryProducts })
  const categories = useQuery({ queryKey: CATEGORIES_KEY, queryFn: fetchInventoryCategories })

  const productsById = new Map((products.data ?? []).map((product) => [product.id, product]))
  const categoriesById = new Map((categories.data ?? []).map((category) => [category.id, category]))
  const supplier = suppliers.data?.find((item) => item.id === form.supplierId)
  const cashAccount = defaultCashAccount(accounts.data)
  const proposeCash = form.paymentType === 'CONTADO' && !accountTouched
  const accountId = proposeCash ? (cashAccount?.id ?? null) : form.accountId
  const paymentMethod = proposeCash
    ? (purchasePaymentMethodsFor(cashAccount?.type).options[0] ?? '')
    : form.paymentMethod
  const account = form.paymentType === 'CONTADO' ? accounts.data?.find((item) => item.id === accountId) : undefined
  const methods = purchasePaymentMethodsFor(account?.type)

  const effectiveForm = { ...form, accountId, paymentMethod }
  const validation = validatePurchase(effectiveForm, productsById)
  const dirty = JSON.stringify(form) !== JSON.stringify(initial)

  const rateOf = (product: InventoryProduct | undefined) =>
    vatRate(product?.categoryId == null ? undefined : categoriesById.get(product.categoryId))
  const totals = purchaseTotals(
    form.lines.map((line) => ({
      quantity: Number(line.quantity) || 0,
      price: Number(line.price) || 0,
      rate: rateOf(line.productId === null ? undefined : productsById.get(line.productId)),
    })),
  )
  const shortBalance = account !== undefined && insufficientBalance(account.currentBalance, totals.exactTotal)

  const save = useMutation({
    mutationFn: createPurchase,
    onSuccess: (purchase) => {
      allowLeave.current = true
      showToast(`Factura ${purchase.invoiceNumber} guardada`)
      void queryClient.invalidateQueries({ queryKey: PURCHASES_KEY })
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'products'] })
      void queryClient.invalidateQueries({ queryKey: ['treasury'] })
      void queryClient.invalidateQueries({ queryKey: ['kpis'] })
      void navigate('/compras')
    },
    onError: (error) => {
      if (isDuplicatePurchaseNumberError(error)) {
        setNumberError(errorMessage(error))
        numberRef.current?.focus()
      }
      // El saldo cambio desde que se cargaron las cuentas: se refrescan.
      if (isInsufficientBalanceError(error)) void queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY })
    },
  })

  const update = (change: Partial<PurchaseForm>) => setForm((current) => ({ ...current, ...change }))
  const updateLine = (key: number, change: Partial<PurchaseLine>) =>
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.key === key ? { ...line, ...change } : line)),
    }))

  function changeInvoiceNumber(invoiceNumber: string) {
    setNumberError(undefined)
    if (save.isError) save.reset()
    update({ invoiceNumber })
  }

  function changeInvoiceDate(invoiceDate: string) {
    update(
      form.paymentType === 'CONTADO'
        ? { invoiceDate, dueDate: invoiceDate }
        : { invoiceDate, dueDate: invoiceDate ? defaultDueDate(invoiceDate) : '' },
    )
  }

  function changePaymentType(paymentType: PurchaseForm['paymentType']) {
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
    update({ accountId, paymentMethod: purchasePaymentMethodsFor(type).options[0] ?? '' })
  }

  function addLine() {
    const key = nextKey.current++
    setForm((current) => ({ ...current, lines: [...current.lines, { key, productId: null, quantity: '1', price: '' }] }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validation.valid || shortBalance || save.isPending) return
    save.mutate(buildPurchaseRequest(effectiveForm))
  }

  function handleSupplierCreated(created: Counterparty) {
    queryClient.setQueryData<Counterparty[]>(SUPPLIERS_KEY, (list = []) => [
      ...list.filter((item) => item.id !== created.id),
      created,
    ])
    update({ supplierId: created.id })
    setSupplierModalOpen(false)
  }

  const missing = [...validation.form]
  if (form.lines.some((line) => validation.lines[line.key]?.product)) missing.push('Elige el producto de cada línea.')

  const supplierOptions: ComboboxOption[] = (suppliers.data ?? []).map((item) => ({
    value: item.id,
    label: item.name,
    detail: `${item.documentType} ${item.documentNumber}`,
    keywords: item.documentNumber,
  }))

  let generalContent: ReactNode
  if (suppliers.isError || accounts.isError) {
    generalContent = (
      <ErrorState
        message="No pudimos cargar los proveedores y las cuentas."
        onRetry={() => {
          if (suppliers.isError) void suppliers.refetch()
          if (accounts.isError) void accounts.refetch()
        }}
      />
    )
  } else if (suppliers.isPending || accounts.isPending) {
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
        <div className="flex flex-col gap-1.5">
          <ComboboxField
            label="Proveedor"
            options={supplierOptions}
            value={form.supplierId}
            onChange={(value) => update({ supplierId: value })}
            placeholder="Busca por nombre o documento"
          />
          <button
            type="button"
            onClick={() => setSupplierModalOpen(true)}
            className="self-start rounded-tag text-small font-medium text-brand-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Nuevo proveedor
          </button>
        </div>
        <TextField
          ref={numberRef}
          label="N.º factura del proveedor"
          required
          maxLength={INVOICE_NUMBER_MAX}
          value={form.invoiceNumber}
          onChange={(event) => changeInvoiceNumber(event.target.value)}
          error={numberError}
        />
        <TextField
          label="Documento"
          readOnly
          value={supplier ? `${supplier.documentType} ${supplier.documentNumber}` : EMPTY_VALUE}
        />
        <TextField label="Correo del proveedor" readOnly value={supplier?.email || EMPTY_VALUE} />
        <TextField
          label="Fecha de compra"
          type="date"
          required
          value={form.invoiceDate}
          onChange={(event) => changeInvoiceDate(event.target.value)}
        />
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-small font-medium text-text">Tipo de pago</legend>
          <div className="grid h-control grid-cols-2 gap-1 rounded-control border border-border-control bg-surface p-1">
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
                Aún no tienes cuentas. Crea una en Cuentas para comprar de contado.
              </p>
            ) : (
              <>
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
                  onChange={(event) => changeAccount(event.target.value)}
                  hint={account && !shortBalance ? `Saldo disponible: ${formatCurrency(account.currentBalance)}` : undefined}
                  error={account && shortBalance ? `Saldo disponible: ${formatCurrency(account.currentBalance)}` : undefined}
                />
                <SelectField
                  label="Método de pago"
                  options={
                    methods.options.length
                      ? methods.options.map((method) => ({ value: method, label: purchasePaymentMethodLabels[method] }))
                      : [{ value: '', label: 'Elige primero la cuenta' }]
                  }
                  value={paymentMethod}
                  disabled={methods.locked}
                  onChange={(event) => update({ paymentMethod: event.target.value as PurchasePaymentMethod })}
                  hint={methods.locked && account ? `Se asigna automáticamente con ${account.name}` : undefined}
                />
              </>
            )}
            <TextField
              label="Fecha de vencimiento"
              type="date"
              readOnly
              value={form.invoiceDate}
              hint="En contado es igual a la fecha de compra"
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
        <h1 className="text-h1 text-text">Nueva factura de compra</h1>
        <p className="mt-1 text-small text-text-muted">
          Al guardar se suma al inventario y, si es de contado, se descuenta de la cuenta.
        </p>
      </div>

      {account && shortBalance && (
        <Alert tone="error" title={`Saldo insuficiente en ${account.name}`}>
          Disponible {formatCurrency(account.currentBalance)}, necesitas {formatCurrency(totals.total)}. Elige otra
          cuenta o regístrala a crédito.
        </Alert>
      )}

      {save.isError && !isDuplicatePurchaseNumberError(save.error) && (
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
              <dt className="text-text-muted">IVA descontable</dt>
              <dd className="tabular font-medium text-text">{formatCurrency(totals.iva)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-border pt-4">
              <dt className="font-medium text-text">Total</dt>
              <dd className="tabular font-display text-h2 font-bold text-text">{formatCurrency(totals.total)}</dd>
            </div>
            {account && (
              <>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-muted">Saldo de {account.name}</dt>
                  <dd className={`tabular font-medium whitespace-nowrap ${shortBalance ? 'text-error' : 'text-text'}`}>
                    {formatCurrency(account.currentBalance)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-muted">Saldo después de la compra</dt>
                  <dd className={`tabular font-medium whitespace-nowrap ${shortBalance ? 'text-error' : 'text-text'}`}>
                    {formatCurrency(account.currentBalance - totals.total)}
                  </dd>
                </div>
              </>
            )}
          </dl>
          <div className="mt-4 flex flex-col gap-3">
            <Button type="submit" disabled={!validation.valid || shortBalance || save.isPending}>
              {save.isPending ? 'Guardando…' : 'Guardar compra'}
            </Button>
            <Button variant="secondary" onClick={() => void navigate('/compras')}>
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
          <p className="text-small text-text-muted">Precio de compra sin IVA</p>
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
      </section>

      {supplierModalOpen && (
        <NewCounterpartyModal role="PROVEEDOR" onClose={() => setSupplierModalOpen(false)} onCreated={handleSupplierCreated} />
      )}

      <UnsavedChangesGuard dirty={dirty} allowLeave={allowLeave} />
    </form>
  )
}

interface LinesBlockProps {
  lines: PurchaseLine[]
  products: { data: InventoryProduct[] | undefined; isPending: boolean; isError: boolean; refetch: () => unknown }
  categories: { data: InventoryCategory[] | undefined; isPending: boolean; isError: boolean; refetch: () => unknown }
  productsById: Map<number, InventoryProduct>
  rateOf: (product: InventoryProduct | undefined) => number
  errors: Record<number, { product?: string; quantity?: string; price?: string }>
  onChange: (key: number, change: Partial<PurchaseLine>) => void
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
    return <EmptyState message="Aún no tienes productos en el inventario. Créalos en Inventario para comprarlos." />
  }

  const all = products.data
  const used = new Set(lines.map((line) => line.productId))

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
          <span className="text-right">Precio sin IVA</span>
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
          const options: ComboboxOption[] = all
            .filter((item) => item.id === line.productId || !used.has(item.id))
            .map((item) => ({ value: item.id, label: item.description, detail: item.code, keywords: item.code }))
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
                  onChange(line.key, { productId, price: chosen?.purchaseCost ? String(chosen.purchaseCost) : '' })
                }}
                placeholder="Busca por código o descripción"
              />
              <LineNumberInput
                label="Cantidad"
                value={line.quantity}
                min={1}
                step={1}
                onChange={(quantity) => onChange(line.key, { quantity })}
                error={lineErrors?.quantity}
              />
              <LineNumberInput
                label="Precio sin IVA"
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
      <Button variant="secondary" className="mt-4" onClick={onAdd} disabled={lines.length >= all.length}>
        Agregar producto
      </Button>
      <p className="mt-3 text-small text-text-muted">
        Al guardar, el costo de cada producto pasa a ser el precio de esta compra y se recalcula su precio sugerido.
      </p>
    </div>
  )
}

interface LineNumberInputProps {
  label: string
  value: string
  min?: number
  step: number | 'any'
  onChange: (value: string) => void
  error?: string
}

/** Campo numerico de una linea: etiqueta visible bajo md, solo para lectores desde md. */
function LineNumberInput({ label, value, min, step, onChange, error }: LineNumberInputProps) {
  const id = useId()
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
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-message` : undefined}
        className={`${lineInput} ${error ? 'border-error focus:ring-error/20' : 'border-border-control focus:border-brand focus:ring-brand/20'}`}
      />
      {error && (
        <p id={`${id}-message`} aria-live="polite" className="text-small text-error md:text-right">
          {error}
        </p>
      )}
    </div>
  )
}
