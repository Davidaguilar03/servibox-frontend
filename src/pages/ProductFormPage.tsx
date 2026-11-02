import { useId, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PackageSearch } from 'lucide-react'
import { userMessage } from '../api/errorMessages'
import { useReportedError } from '../api/reportError'
import { Alert } from '../components/Alert'
import { AmountField } from '../components/AmountField'
import { Button } from '../components/Button'
import { buttonClasses } from '../components/buttonStyles'
import { ErrorSummary } from '../components/ErrorSummary'
import { Modal } from '../components/Modal'
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
import { iconLg } from '../components/icons'

/** Ruta del listado con los filtros que tiene detras del modal. */
function useListPath() {
  return `/inventario${useLocation().search}`
}

function NotFound() {
  const navigate = useNavigate()
  const listPath = useListPath()
  return (
    <Modal
      title="Producto no encontrado"
      onClose={() => void navigate(listPath)}
      footer={
        <Link to={listPath} className={buttonClasses('secondary')} data-variant="secondary">
          Volver a Productos
        </Link>
      }
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <PackageSearch {...iconLg} className="text-text-subtle" aria-hidden />
        <p className="text-small text-text-muted">Revisa el enlace o búscalo en el listado.</p>
      </div>
    </Modal>
  )
}

/** Nuevo producto (`/inventario/nuevo`) o edicion (`/inventario/:id/editar`), en un modal sobre el listado. */
export function ProductFormPage() {
  const { id } = useParams()
  if (id === undefined) return <ProductEditor key="nuevo" product={undefined} />
  const productId = parseProductId(id)
  if (productId === null) return <NotFound />
  return <EditProduct key={productId} productId={productId} />
}

function EditProduct({ productId }: { productId: number }) {
  const navigate = useNavigate()
  const listPath = useListPath()
  const product = useQuery({ queryKey: [...PRODUCTS_KEY, productId], queryFn: () => fetchInventoryProduct(productId) })

  if (product.error instanceof ApiError && product.error.status === 404) return <NotFound />
  if (product.isError || product.isPending) {
    return (
      <Modal title="Editar producto" size="wide" onClose={() => void navigate(listPath)}>
        {product.isError ? (
          <ErrorState message="No pudimos cargar el producto." onRetry={() => void product.refetch()} />
        ) : (
          <div className="flex flex-col gap-4" aria-busy>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}
      </Modal>
    )
  }
  return <ProductEditor product={product.data} />
}

/** Los valores iniciales salen del producto o vacios al crear. */
function ProductEditor({ product }: { product: InventoryProduct | undefined }) {
  const creating = product === undefined
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const listPath = useListPath()
  const formId = useId()
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

  // Cerrar es navegar al listado: con cambios, el guardian de la ruta pregunta (Esc, la X, Cancelar, clic fuera y atras).
  function close() {
    if (!save.isPending) void navigate(listPath)
  }

  const costError = errors.purchaseCost
  const cost = values.purchaseCost.trim() && !costError ? parseAmount(values.purchaseCost) : null
  const category = categories.data?.find((item) => String(item.id) === values.categoryId)

  const generalError = save.isError && !isCodeConflict(save.error)

  return (
    <UnsavedChangesGuard dirty={dirty} allowLeave={allowLeave} message="Si sales ahora, se pierde lo que digitaste en este producto.">
      <Modal
        title={creating ? 'Nuevo producto' : 'Editar producto'}
        size="wide"
        onClose={close}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Cancelar
            </Button>
            {/* Regla de Guardar: solo se deshabilita al enviar y, al editar, sin cambios. */}
            <Button type="submit" form={formId} disabled={save.isPending || (!creating && !dirty)} aria-busy={save.isPending || undefined}>
              {save.isPending ? 'Guardando…' : 'Guardar producto'}
            </Button>
          </>
        }
      >
        <form id={formId} ref={formRef} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <p className="text-small text-text-muted">
            El IVA y el precio sugerido los calcula ServiBox con el costo y el margen de la categoría.
          </p>

          {saveError && generalError && (
            <Alert tone="error" title="No pudimos guardar el producto">
              {saveError}
            </Alert>
          )}

          <div className="grid items-start gap-4 sm:grid-cols-2">
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
            <div className="sm:col-span-2">
              <TextField
                label="Descripción"
                value={values.description}
                onChange={(event) => change('description')(event.target.value)}
                onBlur={touch('description')}
                error={shown('description')}
                required
              />
            </div>
            <AmountField
              label="Costo de compra sin IVA"
              value={values.purchaseCost}
              onValueChange={change('purchaseCost')}
              onBlur={touch('purchaseCost')}
              error={shown('purchaseCost')}
              hint="Costo de compra antes de IVA, en pesos colombianos."
              required
            />
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
          </div>

          <PricePanel cost={cost} category={category} settings={financial.data} />
          <ErrorSummary count={submitted ? Object.keys(errors).length : 0} />
        </form>
      </Modal>
    </UnsavedChangesGuard>
  )
}
