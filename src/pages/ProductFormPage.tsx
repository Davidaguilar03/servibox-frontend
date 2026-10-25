import { useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PackageSearch } from 'lucide-react'
import { userMessage } from '../api/errorMessages'
import { useReportedError } from '../api/reportError'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { buttonClasses } from '../components/buttonStyles'
import { ErrorSummary } from '../components/ErrorSummary'
import { SelectField } from '../components/SelectField'
import { TextField } from '../components/TextField'
import { UnsavedChangesGuard } from '../components/UnsavedChangesGuard'
import { ErrorState, Skeleton } from '../components/states'
import { showToast } from '../components/toast'
import {
  CATEGORIES_KEY,
  PRODUCTS_KEY,
  createProduct,
  fetchInventoryCategories,
  fetchInventoryProduct,
  updateProduct,
  type InventoryProduct,
} from '../inventory/inventoryApi'
import { PricePanel } from '../inventory/PricePanel'
import {
  EMPTY_PRODUCT_FORM,
  buildCreateRequest,
  buildUpdateRequest,
  isCodeConflict,
  parseAmount,
  parseProductId,
  productToForm,
  validateProduct,
  type ProductField,
  type ProductFormValues,
} from '../inventory/productForm'
import { ApiError } from '../lib/api'
import { revealErrors } from '../lib/formErrors'
import { FINANCIAL_SETTINGS_KEY, fetchFinancialSettings } from '../settings/settingsApi'
import type { ListState } from './ProductsPage'
import { iconLg } from '../components/icons'

const card = 'rounded-surface border border-border bg-surface p-6'

/** Ruta del listado con los filtros que tenia al entrar al formulario. */
function useListPath() {
  const state = useLocation().state as Partial<ListState> | null
  return `/inventario${state?.listSearch ?? ''}`
}

function NotFound() {
  const listPath = useListPath()
  return (
    <div className={`${card} flex flex-col items-center gap-3 py-12 text-center`}>
      <PackageSearch {...iconLg} className="text-text-subtle" aria-hidden />
      <h1 className="text-title text-text">Producto no encontrado</h1>
      <p className="text-small text-text-muted">Revisa el enlace o búscalo en el listado.</p>
      <Link to={listPath} className={buttonClasses('secondary')} data-variant="secondary">
        Volver a Productos
      </Link>
    </div>
  )
}

/** Nuevo producto (`/inventario/nuevo`) o edicion (`/inventario/:id/editar`). */
export function ProductFormPage() {
  const { id } = useParams()
  if (id === undefined) return <ProductEditor key="nuevo" product={undefined} />
  const productId = parseProductId(id)
  if (productId === null) return <NotFound />
  return <EditProduct key={productId} productId={productId} />
}

function EditProduct({ productId }: { productId: number }) {
  const product = useQuery({ queryKey: [...PRODUCTS_KEY, productId], queryFn: () => fetchInventoryProduct(productId) })

  if (product.error instanceof ApiError && product.error.status === 404) return <NotFound />
  if (product.isError) {
    return (
      <div className={card}>
        <ErrorState message="No pudimos cargar el producto." onRetry={() => void product.refetch()} />
      </div>
    )
  }
  if (product.isPending) {
    return (
      <div className="flex max-w-2xl flex-col gap-6" aria-busy>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }
  return <ProductEditor product={product.data} />
}

/** Formulario de una columna; los valores iniciales salen del producto o vacios al crear. */
function ProductEditor({ product }: { product: InventoryProduct | undefined }) {
  const creating = product === undefined
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const listPath = useListPath()
  const [initial] = useState<ProductFormValues>(() => (product ? productToForm(product) : EMPTY_PRODUCT_FORM))
  const [values, setValues] = useState(initial)
  const [touched, setTouched] = useState<Set<ProductField>>(() => new Set())
  const [submitted, setSubmitted] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  // Mensaje del backend para el codigo (409): repetido o bloqueado por facturas.
  const [codeConflict, setCodeConflict] = useState<string | null>(null)
  const codeRef = useRef<HTMLInputElement>(null)
  const allowLeave = useRef(false)

  const categories = useQuery({ queryKey: CATEGORIES_KEY, queryFn: fetchInventoryCategories })
  // Misma clave que Configuracion y Productos: una sola peticion en cache.
  const financial = useQuery({ queryKey: FINANCIAL_SETTINGS_KEY, queryFn: fetchFinancialSettings })
  const categoryOptions = [
    { value: '', label: 'Elige una categoría' },
    ...[...(categories.data ?? [])]
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
      .map((category) => ({ value: String(category.id), label: category.name })),
  ]

  const errors = validateProduct(values, creating, initial.purchaseCost)
  const shown = (field: ProductField) => (touched.has(field) ? errors[field] : undefined)
  const dirty = JSON.stringify(values) !== JSON.stringify(initial)

  const save = useMutation({
    mutationFn: (form: ProductFormValues) =>
      product ? updateProduct(product.id, buildUpdateRequest(form)) : createProduct(buildCreateRequest(form)),
    onSuccess: () => {
      allowLeave.current = true
      showToast('Producto guardado')
      void queryClient.invalidateQueries({ queryKey: ['inventory'] })
      void navigate(listPath)
    },
    onError: (error) => {
      if (isCodeConflict(error)) {
        setCodeConflict(userMessage(error))
        codeRef.current?.focus()
      }
    },
  })
  const saveError = useReportedError(save.error)

  const change = (field: ProductField) => (value: string) => {
    if (field === 'code') setCodeConflict(null)
    setValues((current) => ({ ...current, [field]: value }))
  }
  const touch = (field: ProductField) => () => setTouched((current) => new Set(current).add(field))

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (save.isPending) return
    if (Object.keys(errors).length > 0) {
      revealErrors(() => {
        setSubmitted(true)
        setTouched(new Set(Object.keys(values) as ProductField[]))
      }, formRef.current)
      return
    }
    save.mutate(values)
  }

  const costError = errors.purchaseCost
  const cost = values.purchaseCost.trim() && !costError ? parseAmount(values.purchaseCost) : null
  const category = categories.data?.find((item) => String(item.id) === values.categoryId)

  const generalError = save.isError && !isCodeConflict(save.error)

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="grid items-start gap-6 lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_320px]"
    >
      <div className="flex min-w-0 flex-col gap-6">
        <div>
          <h1 className="text-title text-text">{creating ? 'Nuevo producto' : 'Editar producto'}</h1>
          <p className="mt-1 text-small text-text-muted">
            El IVA y el precio sugerido los calcula ServiBox con el costo y el margen de la categoría.
          </p>
        </div>

        {saveError && generalError && (
          <Alert tone="error" title="No pudimos guardar el producto">
            {saveError}
          </Alert>
        )}

        <section className={card} aria-labelledby="product-data-title">
          <h2 id="product-data-title" className="mb-4 text-section text-text">
            Datos del producto
          </h2>
          <div className="flex flex-col gap-4">
            <TextField
              ref={codeRef}
              label="Código"
              valueRole="codigo"
              value={values.code}
              onChange={(event) => change('code')(event.target.value)}
              onBlur={touch('code')}
              error={codeConflict ?? shown('code')}
              autoComplete="off"
              required
            />
            <TextField
              label="Descripción"
              value={values.description}
              onChange={(event) => change('description')(event.target.value)}
              onBlur={touch('description')}
              error={shown('description')}
              required
            />
            {categories.isError ? (
              <div role="alert" className="flex flex-wrap items-center gap-2">
                <span className="text-small text-text">No pudimos cargar las categorías.</span>
                <Button variant="text" onClick={() => void categories.refetch()}>
                  Reintentar
                </Button>
              </div>
            ) : categories.isPending ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <SelectField
                label="Categoría"
                options={categoryOptions}
                value={values.categoryId}
                onChange={(event) => change('categoryId')(event.target.value)}
                onBlur={touch('categoryId')}
                error={shown('categoryId')}
                required
              />
            )}
          </div>
        </section>

        <section className={card} aria-labelledby="product-price-title">
          <h2 id="product-price-title" className="mb-4 text-section text-text">
            Costo
          </h2>
          <div className="flex flex-col gap-4">
            <TextField
              label="Costo de compra sin IVA"
              inputMode="numeric"
              value={values.purchaseCost}
              onChange={(event) => change('purchaseCost')(event.target.value)}
              onBlur={touch('purchaseCost')}
              error={shown('purchaseCost')}
              hint="Costo de compra antes de IVA, en pesos colombianos."
              required
            />
          </div>
        </section>

        <section className={card} aria-labelledby="product-stock-title">
          <h2 id="product-stock-title" className="mb-4 text-section text-text">
            Inventario
          </h2>
          {!product ? (
            <TextField
              label="Stock inicial"
              inputMode="numeric"
              value={values.quantity}
              onChange={(event) => change('quantity')(event.target.value)}
              onBlur={touch('quantity')}
              error={shown('quantity')}
              hint="Unidades en bodega hoy. Después cambia con las ventas y las compras."
              required
            />
          ) : (
            <TextField
              label="Stock"
              value={String(product.quantity ?? 0)}
              readOnly
              hint="El stock cambia con las ventas y las compras; no se edita aquí."
            />
          )}
        </section>

        <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-3 rounded-surface border border-border bg-surface p-4 shadow-raised">
          <Button variant="secondary" onClick={() => void navigate(listPath)}>
            Cancelar
          </Button>
          {/* Regla de Guardar: solo se deshabilita al enviar y, al editar, sin cambios. */}
          <Button type="submit" disabled={save.isPending || (!creating && !dirty)} aria-busy={save.isPending || undefined}>
            {save.isPending ? 'Guardando…' : 'Guardar producto'}
          </Button>
        </div>
        <ErrorSummary count={submitted ? Object.keys(errors).length : 0} />
      </div>

      <div className="flex flex-col gap-6 lg:sticky lg:top-24">
        <PricePanel cost={cost} category={category} settings={financial.data} />
      </div>

      <UnsavedChangesGuard dirty={dirty} allowLeave={allowLeave} message="Si sales ahora, se pierde lo que digitaste en este producto." />
    </form>
  )
}
