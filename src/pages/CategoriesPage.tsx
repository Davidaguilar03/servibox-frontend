import { useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { CategoryDot } from '../components/CategoryDot'
import { DataTable, type Column } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { TextField } from '../components/TextField'
import { EmptyState, ErrorState, Skeleton } from '../components/states'
import { showToast } from '../components/toast'
import {
  CATEGORIES_KEY,
  PRODUCTS_KEY,
  TAX_TYPES_KEY,
  createCategory,
  fetchInventoryCategories,
  fetchInventoryProducts,
  fetchTaxTypes,
  updateCategory,
  type InventoryCategory,
  type TaxType,
} from '../inventory/inventoryApi'
import {
  CATEGORY_COLORS,
  buildCategoryRequest,
  categoryToForm,
  defaultTaxTypeIds,
  emptyCategoryForm,
  fractionToPercent,
  isNameConflict,
  validateCategory,
  type CategoryField,
  type CategoryFormValues,
} from '../inventory/categoryForm'
import { productCounts } from '../inventory/productList'
import { errorMessage } from '../lib/errorMessage'
import { EMPTY_VALUE } from '../lib/format'

const card = 'rounded-card border border-border bg-surface shadow-card'
const linkClass =
  'rounded-tag text-small font-medium whitespace-nowrap text-brand-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

/** null cerrado, 'new' para crear, o la categoria a editar. */
type ModalTarget = null | 'new' | InventoryCategory

function taxLabel(tax: TaxType) {
  return `${tax.name} (${fractionToPercent(tax.rate)} %)`
}

/** Categorias: umbrales de stock, margen objetivo e impuestos de cada una. */
export function CategoriesPage() {
  const [target, setTarget] = useState<ModalTarget>(null)
  const categories = useQuery({ queryKey: CATEGORIES_KEY, queryFn: fetchInventoryCategories })
  const products = useQuery({ queryKey: PRODUCTS_KEY, queryFn: fetchInventoryProducts })
  const counts = products.data ? productCounts(products.data) : undefined

  const columns: Column<InventoryCategory>[] = [
    {
      header: 'Nombre',
      render: (c) => (
        <span className="flex items-center gap-2 whitespace-nowrap">
          <CategoryDot color={c.color} />
          {c.name}
        </span>
      ),
    },
    { header: 'Umbral amarillo', align: 'right', render: (c) => c.yellowStockMin ?? EMPTY_VALUE },
    { header: 'Umbral rojo', align: 'right', render: (c) => c.redStockMin ?? EMPTY_VALUE },
    {
      header: 'Margen objetivo',
      align: 'right',
      render: (c) => (c.targetMargin === null ? EMPTY_VALUE : `${fractionToPercent(c.targetMargin)} %`),
    },
    {
      header: 'Impuestos',
      render: (c) => (c.taxTypes.length ? c.taxTypes.map((tax) => tax.name).sort().join(', ') : EMPTY_VALUE),
    },
    {
      header: 'Productos',
      align: 'right',
      render: (c) =>
        products.isError ? EMPTY_VALUE : counts ? (counts.get(c.id) ?? 0) : <Skeleton className="ml-auto h-4 w-6" />,
    },
    {
      header: '',
      render: (c) => (
        <button type="button" className={linkClass} onClick={() => setTarget(c)} aria-label={`Editar ${c.name}`}>
          Editar
        </button>
      ),
    },
  ]

  let content: ReactNode
  if (categories.isError) {
    content = <ErrorState message="No pudimos cargar las categorías." onRetry={() => void categories.refetch()} />
  } else if (categories.isPending) {
    content = (
      <DataTable columns={columns} rows={undefined} rowKey={(c) => c.id} loading error={false} onRetry={() => undefined} emptyMessage="" />
    )
  } else if (categories.data.length === 0) {
    content = (
      <EmptyState
        message="Aún no tienes categorías. Crea la primera para empezar a cargar productos."
        action={<Button onClick={() => setTarget('new')}>Nueva categoría</Button>}
      />
    )
  } else {
    const sorted = [...categories.data].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
    content = (
      <>
        {products.isError && (
          <div role="alert" className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-small text-text">No pudimos cargar el número de productos.</span>
            <Button variant="text" className="px-2" onClick={() => void products.refetch()}>
              Reintentar
            </Button>
          </div>
        )}
        <DataTable columns={columns} rows={sorted} rowKey={(c) => c.id} loading={false} error={false} onRetry={() => undefined} emptyMessage="" />
      </>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 text-text">Categorías</h1>
          <p className="mt-1 text-small text-text-muted">
            Cada categoría define cuándo avisar por stock bajo, el margen del precio sugerido y sus impuestos.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/inventario" className={linkClass}>
            Volver a Productos
          </Link>
          <Button onClick={() => setTarget('new')}>Nueva categoría</Button>
        </div>
      </div>

      <section className={`${card} p-4`} aria-label="Listado de categorías">
        {content}
      </section>

      {target !== null && (
        <CategoryModal
          category={target === 'new' ? undefined : target}
          categories={categories.data ?? []}
          onClose={() => setTarget(null)}
        />
      )}
    </div>
  )
}

interface CategoryModalProps {
  category: InventoryCategory | undefined
  /** Todas las categorias, para avisar de un nombre repetido antes de enviar. */
  categories: InventoryCategory[]
  onClose: () => void
}

function CategoryModal({ category, categories, onClose }: CategoryModalProps) {
  const queryClient = useQueryClient()
  const [initial] = useState<CategoryFormValues>(() => (category ? categoryToForm(category) : emptyCategoryForm()))
  const [values, setValues] = useState(initial)
  const [touched, setTouched] = useState<Set<CategoryField>>(() => new Set())
  const [nameConflict, setNameConflict] = useState<string | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  const taxTypes = useQuery({ queryKey: TAX_TYPES_KEY, queryFn: fetchTaxTypes })
  // Al crear, mientras el usuario no toque los impuestos, va marcado el IVA vigente.
  const taxTypeIds = values.taxTypeIds ?? (category ? [] : defaultTaxTypeIds(taxTypes.data))
  // Al crear hacen falta los impuestos para proponer el IVA; al editar ya vienen en la categoria.
  const canSave = category !== undefined || taxTypes.isSuccess

  const others = categories.filter((item) => item.id !== category?.id)
  const errors = validateCategory(values, others)
  const shown = (field: CategoryField) => (touched.has(field) ? errors[field] : undefined)
  const dirty = JSON.stringify(values) !== JSON.stringify(initial)
  // Un color guardado fuera de la paleta (datos anteriores) se ofrece tal cual para no cambiarlo sin querer.
  const colors: Array<{ value: string; label: string }> = CATEGORY_COLORS.some((color) => color.value === initial.color)
    ? [...CATEGORY_COLORS]
    : [...CATEGORY_COLORS, { value: initial.color, label: 'Color actual' }]

  const save = useMutation({
    mutationFn: () => {
      const body = buildCategoryRequest(values, taxTypeIds)
      return category ? updateCategory(category.id, body) : createCategory(body)
    },
    onSuccess: () => {
      showToast('Categoría guardada')
      // El backend rehace el precio sugerido de los productos de la categoria.
      void queryClient.invalidateQueries({ queryKey: ['inventory'] })
      onClose()
    },
    onError: (error) => {
      if (isNameConflict(error)) {
        setNameConflict(error.message)
        nameRef.current?.focus()
      }
    },
  })

  const change = (field: CategoryField) => (value: string) => {
    if (field === 'name') setNameConflict(null)
    setValues((current) => ({ ...current, [field]: value }))
  }
  const touch = (field: CategoryField) => () => setTouched((current) => new Set(current).add(field))

  function toggleTax(id: number, checked: boolean) {
    const next = checked ? [...new Set([...taxTypeIds, id])] : taxTypeIds.filter((item) => item !== id)
    setValues((current) => ({ ...current, taxTypeIds: next.sort((a, b) => a - b) }))
  }

  function submit() {
    setTouched(new Set<CategoryField>(['name', 'color', 'yellowStockMin', 'redStockMin', 'targetMargin']))
    if (Object.keys(errors).length > 0 || save.isPending || !canSave) return
    save.mutate()
  }

  function requestClose() {
    // Cada vista es su propio Modal: al volver, el foco va otra vez al primer campo.
    if (confirmDiscard) {
      setConfirmDiscard(false)
    } else if (dirty && !save.isPending) {
      setConfirmDiscard(true)
    } else {
      onClose()
    }
  }

  if (confirmDiscard) {
    return (
      <Modal
        title="Descartar cambios"
        onClose={requestClose}
        footer={
          <>
            <Button variant="secondary" onClick={requestClose}>
              Seguir editando
            </Button>
            <Button variant="danger" onClick={onClose}>
              Descartar cambios
            </Button>
          </>
        }
      >
        <p className="text-body text-text">Si cierras ahora, se pierde lo que digitaste en esta categoría.</p>
      </Modal>
    )
  }

  const generalError = save.isError && !isNameConflict(save.error)

  return (
    <Modal
      title={category ? 'Editar categoría' : 'Nueva categoría'}
      onClose={requestClose}
      footer={
        <>
          <Button variant="secondary" onClick={requestClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={save.isPending || !canSave}>
            {save.isPending ? 'Guardando…' : 'Guardar categoría'}
          </Button>
        </>
      }
    >
      <div
        className="flex flex-col gap-4"
        onKeyDown={(event) => {
          if (event.key === 'Enter' && event.target instanceof HTMLInputElement && event.target.type !== 'checkbox' && event.target.type !== 'radio') {
            event.preventDefault()
            submit()
          }
        }}
      >
        {generalError && (
          <Alert tone="error" title="No pudimos guardar la categoría">
            {errorMessage(save.error)}
          </Alert>
        )}
        <TextField
          ref={nameRef}
          label="Nombre"
          value={values.name}
          onChange={(event) => change('name')(event.target.value)}
          onBlur={touch('name')}
          error={nameConflict ?? shown('name')}
          hint="Se guarda en mayúsculas."
          required
        />

        <fieldset>
          <legend className="text-small font-medium text-text">Color</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {colors.map((color) => {
              const selected = values.color === color.value
              return (
                <label
                  key={color.value}
                  className="relative flex size-touch cursor-pointer items-center justify-center rounded-control border border-border has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand"
                  title={color.label}
                >
                  <input
                    type="radio"
                    name="category-color"
                    value={color.value}
                    checked={selected}
                    onChange={() => change('color')(color.value)}
                    className="sr-only"
                    aria-label={color.label}
                  />
                  <span
                    className="flex size-6 items-center justify-center rounded-pill"
                    style={{ backgroundColor: color.value }}
                    aria-hidden
                  >
                    {selected && <Check size={14} strokeWidth={2.5} className="text-text-inverse" />}
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Umbral amarillo"
            inputMode="numeric"
            value={values.yellowStockMin}
            onChange={(event) => change('yellowStockMin')(event.target.value)}
            onBlur={touch('yellowStockMin')}
            error={shown('yellowStockMin')}
            hint="Bajo stock con estas unidades o menos."
            required
          />
          <TextField
            label="Umbral rojo"
            inputMode="numeric"
            value={values.redStockMin}
            onChange={(event) => change('redStockMin')(event.target.value)}
            onBlur={touch('redStockMin')}
            error={shown('redStockMin')}
            hint="Stock crítico con estas unidades o menos."
            required
          />
        </div>

        <TextField
          label="Margen objetivo (%)"
          inputMode="decimal"
          value={values.targetMargin}
          onChange={(event) => change('targetMargin')(event.target.value)}
          onBlur={touch('targetMargin')}
          error={shown('targetMargin')}
          hint="De 0 a 100. Cambiar el margen actualiza el precio sugerido de los productos de esta categoría."
          required
        />

        <fieldset>
          <legend className="text-small font-medium text-text">Impuestos</legend>
          {taxTypes.isError ? (
            <div role="alert" className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="text-small text-text">No pudimos cargar los impuestos.</span>
              <Button variant="text" className="px-2" onClick={() => void taxTypes.refetch()}>
                Reintentar
              </Button>
            </div>
          ) : taxTypes.isPending ? (
            <Skeleton className="mt-1.5 h-6 w-40" />
          ) : taxTypes.data.length === 0 ? (
            <p className="mt-1.5 text-small text-text-muted">No hay impuestos configurados.</p>
          ) : (
            <ul className="mt-1.5 flex flex-col gap-1">
              {taxTypes.data.map((tax) => (
                <li key={tax.id}>
                  <label className="flex min-h-touch cursor-pointer items-center gap-3 text-body text-text">
                    <input
                      type="checkbox"
                      checked={taxTypeIds.includes(tax.id)}
                      onChange={(event) => toggleTax(tax.id, event.target.checked)}
                      className="size-4 accent-brand"
                    />
                    {taxLabel(tax)}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </fieldset>
      </div>
    </Modal>
  )
}
