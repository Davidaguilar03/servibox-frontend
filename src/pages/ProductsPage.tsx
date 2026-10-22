import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Button } from '../components/Button'
import { buttonClasses } from '../components/buttonStyles'
import { CategoryDot } from '../components/CategoryDot'
import { DataTable, type Column } from '../components/DataTable'
import { IndicatorCard } from '../components/IndicatorCard'
import { Pagination } from '../components/Pagination'
import { SearchField } from '../components/SearchField'
import { SelectField } from '../components/SelectField'
import { StatusBadge, type BadgeStatus } from '../components/StatusBadge'
import { EmptyState, ErrorState, Skeleton } from '../components/states'
import {
  CATEGORIES_KEY,
  PRODUCTS_KEY,
  fetchInventoryCategories,
  fetchInventoryProducts,
  type InventoryCategory,
  type InventoryProduct,
} from '../inventory/inventoryApi'
import {
  DEFAULT_PRODUCT_FILTERS,
  belowMinimum,
  categoriesById,
  categoryTabs,
  filterProducts,
  parseProductFilters,
  productFiltersToParams,
  productIndicators,
  productStatus,
  type CategoriesById,
  type ProductFilters,
} from '../inventory/productList'
import { EMPTY_VALUE, formatCurrency } from '../lib/format'
import { paginate } from '../lib/pagination'
import type { StockStatus } from '../lib/stock'

const badgeFor: Record<StockStatus, BadgeStatus> = {
  NORMAL: 'DISPONIBLE',
  BAJO: 'BAJO_STOCK',
  CRITICO: 'STOCK_CRITICO',
  SIN_STOCK: 'SIN_STOCK',
}

const statusOptions = [
  { value: '', label: 'Todos' },
  { value: 'NORMAL', label: 'Disponible' },
  { value: 'BAJO', label: 'Bajo stock' },
  { value: 'CRITICO', label: 'Stock crítico' },
  { value: 'SIN_STOCK', label: 'Sin stock' },
]

const sortOptions = [
  { value: 'codigo', label: 'Código' },
  { value: 'descripcion', label: 'Descripción' },
  { value: 'stock-asc', label: 'Stock de menor a mayor' },
  { value: 'stock-desc', label: 'Stock de mayor a menor' },
  { value: 'precio', label: 'Precio sugerido' },
]

const linkClass =
  'rounded-tag text-small font-medium whitespace-nowrap text-brand-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

const card = 'rounded-card border border-border bg-surface shadow-card'

/** Lo que el formulario necesita para volver al listado con los mismos filtros. */
export interface ListState {
  listSearch: string
}

function units(count: number) {
  return count === 1 ? '1 unidad' : `${count} unidades`
}

/** Productos: indicadores, pestanas por categoria, filtros en la URL y listado paginado. */
export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = parseProductFilters(searchParams)
  const listState: ListState = { listSearch: searchParams.size ? `?${searchParams.toString()}` : '' }

  const products = useQuery({ queryKey: PRODUCTS_KEY, queryFn: fetchInventoryProducts })
  const categories = useQuery({ queryKey: CATEGORIES_KEY, queryFn: fetchInventoryCategories })
  const byId = categories.data ? categoriesById(categories.data) : undefined
  const indicators = products.data ? productIndicators(products.data) : undefined

  // Cambiar un filtro vuelve a la primera pagina. Escribir en el buscador reemplaza la
  // entrada del historial para no dejar una por letra.
  function updateFilters(change: Partial<ProductFilters>, replace = false) {
    setSearchParams(productFiltersToParams({ ...filters, pagina: 1, ...change }), { replace })
  }
  const clearFilters = () => updateFilters(DEFAULT_PRODUCT_FILTERS)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 text-text">Productos</h1>
          <p className="mt-1 text-small text-text-muted">
            Catálogo de productos con alertas de stock. Costos y precios sin IVA.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/inventario/categorias" className={buttonClasses('secondary')}>
            Categorías
          </Link>
          <Link to="/inventario/nuevo" state={listState} className={buttonClasses('primary')}>
            Nuevo producto
          </Link>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <IndicatorCard
          label="Total de productos"
          value={indicators && String(indicators.total)}
          error={products.isError}
          onRetry={() => void products.refetch()}
        />
        <IndicatorCard
          label="En stock"
          value={indicators && String(indicators.inStock)}
          detail="Con al menos una unidad"
          error={products.isError}
          onRetry={() => void products.refetch()}
        />
        <IndicatorCard
          label="Por debajo del mínimo"
          value={products.data && byId ? String(belowMinimum(products.data, byId)) : undefined}
          detail="Bajo stock o stock crítico"
          error={products.isError || categories.isError}
          onRetry={() => {
            if (products.isError) void products.refetch()
            if (categories.isError) void categories.refetch()
          }}
        />
        <IndicatorCard
          label="Valor en inventario"
          value={indicators && formatCurrency(indicators.inventoryValue)}
          detail="Stock por costo de compra"
          error={products.isError}
          onRetry={() => void products.refetch()}
        />
      </div>

      <CategoryTabs
        categories={categories}
        products={products.data}
        selected={filters.categoria}
        onSelect={(categoria) => updateFilters({ categoria })}
      />

      <div className={`${card} grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))_auto] lg:items-end`}>
        <SearchField
          label="Buscar"
          placeholder="Código o descripción"
          value={filters.q}
          onChange={(event) => updateFilters({ q: event.target.value }, true)}
        />
        <SelectField
          label="Estado de stock"
          options={statusOptions}
          value={filters.estado}
          onChange={(event) => updateFilters({ estado: event.target.value as ProductFilters['estado'] })}
        />
        <SelectField
          label="Ordenar por"
          options={sortOptions}
          value={filters.orden}
          onChange={(event) => updateFilters({ orden: event.target.value as ProductFilters['orden'] })}
        />
        <Button variant="secondary" onClick={clearFilters}>
          Limpiar
        </Button>
      </div>

      <ProductsTable
        products={products.data}
        byId={byId}
        loading={products.isPending || categories.isPending}
        error={products.isError || categories.isError}
        onRetry={() => {
          if (products.isError) void products.refetch()
          if (categories.isError) void categories.refetch()
        }}
        filters={filters}
        listState={listState}
        onPageChange={(pagina) => setSearchParams(productFiltersToParams({ ...filters, pagina }))}
        onClear={clearFilters}
      />
    </div>
  )
}

interface CategoryTabsProps {
  categories: { data: InventoryCategory[] | undefined; isError: boolean; refetch: () => unknown }
  products: InventoryProduct[] | undefined
  selected: number | null
  onSelect: (id: number | null) => void
}

/** Todas y una pestana por categoria; se desplazan en horizontal si no caben. */
function CategoryTabs({ categories, products, selected, onSelect }: CategoryTabsProps) {
  if (categories.isError) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <span className="text-small text-text">No pudimos cargar las categorías.</span>
        <Button variant="text" className="px-2" onClick={() => void categories.refetch()}>
          Reintentar
        </Button>
      </div>
    )
  }
  if (!categories.data || !products) {
    return (
      <div className="flex gap-6 border-b border-border pb-3" aria-hidden>
        {['w-14', 'w-18', 'w-22'].map((width) => (
          <Skeleton key={width} className={`h-5 ${width}`} />
        ))}
      </div>
    )
  }
  const current = categories.data.some((category) => category.id === selected) ? selected : null

  return (
    <div className="overflow-x-auto overflow-y-hidden border-b border-border [scrollbar-width:thin]" role="group" aria-label="Categorías">
      <ul className="flex min-w-max gap-6">
        {categoryTabs(categories.data, products).map((tab) => {
          const active = tab.id === current
          return (
            <li key={tab.id ?? 'todas'}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(tab.id)}
                className={`flex min-h-touch items-center gap-1.5 border-b-2 rounded-tag text-body whitespace-nowrap transition-colors duration-(--duration-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                  active ? 'border-brand font-medium text-text' : 'border-transparent text-text-muted hover:text-text'
                }`}
              >
                {tab.name}
                <span className="tabular text-small text-text-subtle">{tab.count}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

interface ProductsTableProps {
  products: InventoryProduct[] | undefined
  byId: CategoriesById | undefined
  loading: boolean
  error: boolean
  onRetry: () => void
  filters: ProductFilters
  listState: ListState
  onPageChange: (page: number) => void
  onClear: () => void
}

function ProductsTable({ products, byId, loading, error, onRetry, filters, listState, onPageChange, onClear }: ProductsTableProps) {
  const editLink = (product: InventoryProduct) => (
    <Link
      to={`/inventario/${product.id}/editar`}
      state={listState}
      className={linkClass}
      aria-label={`Editar ${product.code}`}
    >
      Editar
    </Link>
  )

  const columns: Column<InventoryProduct>[] = [
    { header: 'Código', render: (p) => <span className="font-mono">{p.code}</span> },
    { header: 'Descripción', render: (p) => p.description },
    {
      header: 'Categoría',
      render: (p) => (
        <span className="flex items-center gap-2 whitespace-nowrap">
          <CategoryDot color={p.categoryId === null ? undefined : byId?.get(p.categoryId)?.color} />
          {p.categoryName ?? EMPTY_VALUE}
        </span>
      ),
    },
    {
      header: 'Stock',
      align: 'right',
      render: (p) => <span className={(p.quantity ?? 0) <= 0 ? 'font-medium text-brand-ink' : ''}>{p.quantity ?? 0}</span>,
    },
    { header: 'Costo sin IVA', align: 'right', render: (p) => formatCurrency(p.purchaseCost) },
    { header: 'Precio sugerido sin IVA', align: 'right', render: (p) => formatCurrency(p.suggestedPrice) },
    { header: 'Estado', render: (p) => byId && <StatusBadge status={badgeFor[productStatus(p, byId)]} /> },
    { header: '', render: editLink },
  ]

  let content: ReactNode
  if (error) {
    content = <ErrorState message="No pudimos cargar los productos." onRetry={onRetry} />
  } else if (loading || !products || !byId) {
    content = (
      <DataTable columns={columns} rows={undefined} rowKey={(p) => p.id} loading error={false} onRetry={onRetry} emptyMessage="" skeletonRows={8} />
    )
  } else if (products.length === 0) {
    content = (
      <EmptyState
        message="Aún no tienes productos. Crea el primero."
        action={
          <Link to="/inventario/nuevo" state={listState} className={buttonClasses('primary')}>
            Nuevo producto
          </Link>
        }
      />
    )
  } else {
    // Una pestana de una categoria que ya no existe cuenta como Todas, igual que las pestanas.
    const categoria = filters.categoria !== null && byId.has(filters.categoria) ? filters.categoria : null
    const page = paginate(filterProducts(products, { ...filters, categoria }, byId), filters.pagina)
    content =
      page.total === 0 ? (
        <EmptyState
          message="No hay productos con esos filtros."
          action={
            <Button variant="secondary" onClick={onClear}>
              Limpiar filtros
            </Button>
          }
        />
      ) : (
        <>
          <div className="hidden md:block">
            <DataTable columns={columns} rows={page.rows} rowKey={(p) => p.id} loading={false} error={false} onRetry={onRetry} emptyMessage="" />
          </div>
          <ul className="flex flex-col gap-3 md:hidden" aria-label="Productos">
            {page.rows.map((product) => (
              <li key={product.id}>
                <Link
                  to={`/inventario/${product.id}/editar`}
                  state={listState}
                  aria-label={`Editar ${product.code}, ${product.description}`}
                  className="flex items-start justify-between gap-4 rounded-control border border-border p-4 transition-colors duration-(--duration-fast) hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="font-mono text-small text-text">{product.code}</span>
                    <span className="text-body text-text">{product.description}</span>
                    <span className="flex items-center gap-2 text-small text-text-muted">
                      <CategoryDot color={product.categoryId === null ? undefined : byId.get(product.categoryId)?.color} />
                      {product.categoryName ?? EMPTY_VALUE}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="tabular text-body font-medium text-text">{units(product.quantity ?? 0)}</span>
                    <span className="tabular text-small text-text-muted">{formatCurrency(product.suggestedPrice)}</span>
                    <StatusBadge status={badgeFor[productStatus(product, byId)]} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-border pt-4">
            <Pagination page={page} itemLabel="productos" onPageChange={onPageChange} />
          </div>
        </>
      )
  }

  return (
    <section className={`${card} p-4`} aria-label="Listado de productos">
      {content}
    </section>
  )
}
