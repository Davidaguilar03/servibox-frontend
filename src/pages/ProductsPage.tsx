import { GLOSSARY } from '../copy/glossary'
import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { buttonClasses } from '../components/buttonStyles'
import { CategoryDot } from '../components/CategoryDot'
import { CellLink } from '../components/CellLink'
import { DataTable, type Column } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { IndicatorCard } from '../components/IndicatorCard'
import { ListHeader } from '../components/ListHeader'
import { Pagination } from '../components/Pagination'
import { SearchField } from '../components/SearchField'
import { TabList } from '../components/SegmentedControl'
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
import { useElementWidth } from '../lib/useElementWidth'
import { useUrlTextParam } from '../lib/useUrlTextParam'
import { FINANCIAL_SETTINGS_KEY, fetchFinancialSettings } from '../settings/settingsApi'
import { stockAlertCounts, type StockStatus } from '../lib/stock'

const badgeFor: Record<StockStatus, BadgeStatus> = {
  NORMAL: 'DISPONIBLE',
  BAJO: 'BAJO_STOCK',
  CRITICO: 'STOCK_CRITICO',
  SIN_STOCK: 'SIN_STOCK',
}

const statusOptions = [
  { value: '', label: 'Todos' },
  { value: 'NORMAL', label: 'Disponible' },
  { value: 'BAJO', label: GLOSSARY.lowStock },
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

/** Ancho del recuadro desde el que caben todas las columnas de productos. */
const PRODUCTS_TABLE_FULL = 940

const linkClass = 'hit-area rounded-control font-semibold text-brand-ink hover:underline focus-ring'

const card = 'rounded-surface border border-border bg-surface'

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
  const alerts = products.data && categories.data ? stockAlertCounts(products.data, categories.data) : undefined
  // Misma clave que la pestana de configuracion financiera: una sola peticion en cache.
  const financial = useQuery({ queryKey: FINANCIAL_SETTINGS_KEY, queryFn: fetchFinancialSettings })
  const financialAtZero =
    financial.data && !financial.data.expensesRate && !financial.data.dianRate && !financial.data.icaRate

  // Cambiar un filtro vuelve a la primera pagina. Escribir en el buscador reemplaza la
  // entrada del historial para no dejar una por letra.
  function updateFilters(change: Partial<ProductFilters>, replace = false) {
    setSearchParams(productFiltersToParams({ ...filters, pagina: 1, ...change }), { replace })
  }
  const clearFilters = () => updateFilters(DEFAULT_PRODUCT_FILTERS)
  const search = useUrlTextParam(filters.q, (q) => updateFilters({ q }, true))

  return (
    <div className="flex flex-col gap-6">
      <ListHeader
        title="Productos"
        subtitle="Catálogo de productos con alertas de stock. Costos y precios sin IVA."
        primary={
          <Link to="/inventario/nuevo" state={listState} className={buttonClasses('primary')} data-variant="primary">
            Nuevo producto
          </Link>
        }
        secondary={[
          <Link key="categorias" to="/inventario/categorias" className={buttonClasses('secondary')} data-variant="secondary">
            Categorías
          </Link>,
        ]}
      />

      {financialAtZero && (
        <Alert tone="info" title="Tu configuración financiera está en 0 %, por eso el precio sugerido es igual al costo.">
          Configúrala en{' '}
          <Link to="/configuracion?tab=financiera" className={linkClass}>
            Configuración
          </Link>{' '}
          para calcular precios con tus márgenes.
        </Alert>
      )}

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
          label="Con alerta de stock"
          value={alerts && String(alerts.withAlert)}
          detail={alerts?.outOfStock ? `${alerts.outOfStock} sin stock` : undefined}
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

      <FilterBar
        active={(['q', 'categoria', 'estado', 'orden'] as const).some((key) => filters[key] !== DEFAULT_PRODUCT_FILTERS[key])}
        onClear={clearFilters}
      >
        {[
          <SearchField key="q" label="Buscar" placeholder="Código o descripción" {...search} />,
          <SelectField
            key="estado"
            label="Estado de stock"
            options={statusOptions}
            value={filters.estado}
            onChange={(event) => updateFilters({ estado: event.target.value as ProductFilters['estado'] })}
          />,
          <SelectField
            key="orden"
            label="Ordenar por"
            options={sortOptions}
            value={filters.orden}
            onChange={(event) => updateFilters({ orden: event.target.value as ProductFilters['orden'] })}
          />,
        ]}
      </FilterBar>

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
        <Button variant="text" onClick={() => void categories.refetch()}>
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
    <TabList
      aria-label="Categorías"
      options={categoryTabs(categories.data, products).map((tab) => ({
        value: tab.id,
        label: (
          <>
            {tab.name}
            <span className="tabular text-small text-text-muted">{tab.count}</span>
          </>
        ),
      }))}
      value={current}
      onChange={onSelect}
    />
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
  const [sectionRef, width] = useElementWidth<HTMLElement>()
  const editLink = (product: InventoryProduct) => (
    <CellLink to={`/inventario/${product.id}/editar`} state={listState} aria-label={`Editar ${product.code}`}>
      Editar
    </CellLink>
  )

  // Columnas por prioridad segun el ancho real del recuadro: en uno angosto la categoria y el
  // costo pasan a una segunda linea bajo la descripcion.
  const compact = width < PRODUCTS_TABLE_FULL
  const category = (p: InventoryProduct) => (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <CategoryDot color={p.categoryId === null ? undefined : byId?.get(p.categoryId)?.color} />
      {p.categoryName ?? EMPTY_VALUE}
    </span>
  )
  const columns: Column<InventoryProduct>[] = [
    { header: 'Código', render: (p) => <span className="codigo">{p.code}</span> },
    {
      header: 'Descripción',
      render: (p) =>
        compact ? (
          <span className="flex flex-col">
            <span>{p.description}</span>
            <span className="flex flex-wrap items-center gap-x-2 text-small text-text-muted">
              {category(p)} · Costo <span className="monto">{formatCurrency(p.purchaseCost)}</span>
            </span>
          </span>
        ) : (
          p.description
        ),
    },
    ...(compact ? [] : [{ header: 'Categoría', render: category }]),
    {
      header: 'Stock',
      align: 'right',
      render: (p) => <span className={(p.quantity ?? 0) <= 0 ? 'font-semibold text-brand-ink' : ''}>{p.quantity ?? 0}</span>,
    },
    ...(compact
      ? []
      : [{ header: 'Costo sin IVA', align: 'right' as const, render: (p: InventoryProduct) => <span className="monto">{formatCurrency(p.purchaseCost)}</span> }]),
    { header: 'Precio sugerido sin IVA', align: 'right', render: (p) => <span className="monto">{formatCurrency(p.suggestedPrice)}</span> },
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
        action={{ label: 'Nuevo producto', to: '/inventario/nuevo', state: listState }}
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
          action={{ label: 'Limpiar filtros', onClick: onClear }}
        />
      ) : (
        <>
          <div className="hidden md:block">
            <DataTable columns={columns} rows={page.rows} rowKey={(p) => p.id} loading={false} error={false} onRetry={onRetry} emptyMessage="" dense={compact} />
          </div>
          <ul className="flex flex-col gap-3 md:hidden" aria-label="Productos">
            {page.rows.map((product) => (
              <li key={product.id}>
                <Link
                  to={`/inventario/${product.id}/editar`}
                  state={listState}
                  aria-label={`Editar ${product.code}, ${product.description}`}
                  className="flex items-start justify-between gap-4 rounded-surface border border-border p-4 transition-colors duration-(--duration-fast) hover:bg-neutral-100 focus-ring"
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="codigo text-small text-text">{product.code}</span>
                    <span className="text-body text-text">{product.description}</span>
                    <span className="flex items-center gap-2 text-small text-text-muted">
                      <CategoryDot color={product.categoryId === null ? undefined : byId.get(product.categoryId)?.color} />
                      {product.categoryName ?? EMPTY_VALUE}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="monto text-body font-semibold text-text">{units(product.quantity ?? 0)}</span>
                    <span className="monto text-small text-text-muted">{formatCurrency(product.suggestedPrice)}</span>
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
    <section ref={sectionRef} className={`${card} p-4`} aria-label="Listado de productos">
      {content}
    </section>
  )
}
