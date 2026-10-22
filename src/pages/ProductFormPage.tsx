import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useBlocker, useLocation, useNavigate, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PackageSearch } from 'lucide-react'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { buttonClasses } from '../components/buttonStyles'
import { Modal } from '../components/Modal'
import { SelectField } from '../components/SelectField'
import { TextField } from '../components/TextField'
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
import {
  EMPTY_PRODUCT_FORM,
  buildCreateRequest,
  buildUpdateRequest,
  isCodeConflict,
  parseProductId,
  productToForm,
  validateProduct,
  type ProductField,
  type ProductFormValues,
} from '../inventory/productForm'
import { ApiError } from '../lib/api'
import { errorMessage } from '../lib/errorMessage'
import { formatCurrency } from '../lib/format'
import type { ListState } from './ProductsPage'

const card = 'rounded-card border border-border bg-surface p-6 shadow-card'
const PENDING_PRICE = 'Se calcula al guardar'

/** Ruta del listado con los filtros que tenia al entrar al formulario. */
function useListPath() {
  const state = useLocation().state as Partial<ListState> | null
  return `/inventario${state?.listSearch ?? ''}`
}

function NotFound() {
  const listPath = useListPath()
  return (
    <div className={`${card} flex flex-col items-center gap-3 py-12 text-center`}>
      <PackageSearch size={24} strokeWidth={1.5} className="text-text-subtle" aria-hidden />
      <h1 className="text-h2 text-text">Producto no encontrado</h1>
      <p className="text-small text-text-muted">Revisa el enlace o búscalo en el listado.</p>
      <Link to={listPath} className={buttonClasses('secondary')}>
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
  // Mensaje del backend para el codigo (409): repetido o bloqueado por facturas.
  const [codeConflict, setCodeConflict] = useState<string | null>(null)
  const codeRef = useRef<HTMLInputElement>(null)
  const allowLeave = useRef(false)

  const categories = useQuery({ queryKey: CATEGORIES_KEY, queryFn: fetchInventoryCategories })
  const categoryOptions = [
    { value: '', label: 'Elige una categoría' },
    ...[...(categories.data ?? [])]
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
      .map((category) => ({ value: String(category.id), label: category.name })),
  ]

  const errors = validateProduct(values, creating)
  const shown = (field: ProductField) => (touched.has(field) ? errors[field] : undefined)
  const dirty = JSON.stringify(values) !== JSON.stringify(initial)

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
        setCodeConflict(error.message)
        codeRef.current?.focus()
      }
    },
  })

  const change = (field: ProductField) => (value: string) => {
    if (field === 'code') setCodeConflict(null)
    setValues((current) => ({ ...current, [field]: value }))
  }
  const touch = (field: ProductField) => () => setTouched((current) => new Set(current).add(field))

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched(new Set(Object.keys(values) as ProductField[]))
    if (Object.keys(errors).length > 0 || save.isPending) return
    save.mutate(values)
  }

  const generalError = save.isError && !isCodeConflict(save.error)

  return (
    <form onSubmit={handleSubmit} noValidate className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-h1 text-text">{creating ? 'Nuevo producto' : 'Editar producto'}</h1>
        <p className="mt-1 text-small text-text-muted">
          El IVA y el precio sugerido los calcula ServiBox con el costo y el margen de la categoría.
        </p>
      </div>

      {generalError && (
        <Alert tone="error" title="No pudimos guardar el producto">
          {errorMessage(save.error)}
        </Alert>
      )}

      <section className={card} aria-labelledby="product-data-title">
        <h2 id="product-data-title" className="mb-4 text-h3 text-text">
          Datos del producto
        </h2>
        <div className="flex flex-col gap-4">
          <TextField
            ref={codeRef}
            label="Código"
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
              <Button variant="text" className="px-2" onClick={() => void categories.refetch()}>
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
        <h2 id="product-price-title" className="mb-4 text-h3 text-text">
          Costo y precio
        </h2>
        <div className="flex flex-col gap-4">
          <TextField
            label="Costo de compra sin IVA"
            inputMode="decimal"
            value={values.purchaseCost}
            onChange={(event) => change('purchaseCost')(event.target.value)}
            onBlur={touch('purchaseCost')}
            error={shown('purchaseCost')}
            hint="En pesos. Usa coma para los centavos."
            required
          />
          <TextField
            label="IVA del costo"
            value={product ? formatCurrency(product.taxAmount) : PENDING_PRICE}
            readOnly
            hint={product ? 'Se recalcula al guardar si cambias el costo o la categoría.' : undefined}
          />
          <TextField
            label="Precio sugerido sin IVA"
            value={product ? formatCurrency(product.suggestedPrice) : PENDING_PRICE}
            readOnly
            hint="Según el margen objetivo de la categoría."
          />
        </div>
      </section>

      <section className={card} aria-labelledby="product-stock-title">
        <h2 id="product-stock-title" className="mb-4 text-h3 text-text">
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

      <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-3 rounded-card border border-border bg-surface p-4 shadow-menu">
        <Button variant="secondary" onClick={() => void navigate(listPath)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Guardando…' : 'Guardar producto'}
        </Button>
      </div>

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
          <p className="text-body text-text">Si sales ahora, se pierde lo que digitaste en este producto.</p>
        </Modal>
      )}
    </form>
  )
}
