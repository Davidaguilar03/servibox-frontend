import { addMoney } from '../lib/money'
import { periodRange, type DateRange } from '../lib/period'
import { validateRange, type ReportFormat } from './reports'

// Reportes en vivo: cada reporte es una definicion declarativa (ruta, filtros, indicadores,
// grafica, columnas y tipo de exportacion). La pagina solo recorre estas definiciones; un
// reporte nuevo se agrega aqui. Contrato del backend en su nota 2026-11-21-reports-sales-portfolio.

export type LiveReportKey = 'ventas' | 'productos-vendidos' | 'compras' | 'cartera-cobrar' | 'cartera-pagar'

/** `type` de `GET /api/reporting/export` de cada reporte en vivo. */
export type LiveExportType = 'VENTAS' | 'PRODUCTOS_VENDIDOS' | 'COMPRAS' | 'CARTERA_COBRAR' | 'CARTERA_PAGAR'

/** Nombre del filtro en la URL de la pantalla. */
export type FilterKey = 'cliente' | 'proveedor' | 'pago' | 'estado' | 'tipo' | 'categoria' | 'item' | 'antiguedad'

export type ReportPeriod = 'este-mes' | 'mes-anterior' | 'ultimos-30' | 'este-ano' | 'personalizado'

export const REPORT_PERIOD_OPTIONS: Array<{ value: ReportPeriod; label: string }> = [
  { value: 'este-mes', label: 'Este mes' },
  { value: 'mes-anterior', label: 'Mes anterior' },
  { value: 'ultimos-30', label: 'Últimos 30 días' },
  { value: 'este-ano', label: 'Este año' },
  { value: 'personalizado', label: 'Personalizado' },
]

export type FilterControl = 'select' | 'customer' | 'supplier' | 'item' | 'category'

export interface FilterSpec {
  label: string
  /** Parametro del backend. */
  apiParam: string
  control: FilterControl
  /** Opcion vacia: sin filtro. */
  allLabel: string
  /** Solo en `select`: valores que acepta el backend. */
  options?: Array<{ value: string; label: string }>
}

export const AGING_LABELS: Record<string, string> = {
  '0-30': '0 a 30 días',
  '31-60': '31 a 60 días',
  '61-90': '61 a 90 días',
  '90+': 'Más de 90 días',
}

export const FILTERS: Record<FilterKey, FilterSpec> = {
  cliente: { label: 'Cliente', apiParam: 'clienteId', control: 'customer', allLabel: 'Todos los clientes' },
  proveedor: { label: 'Proveedor', apiParam: 'proveedorId', control: 'supplier', allLabel: 'Todos los proveedores' },
  pago: {
    label: 'Forma de pago',
    apiParam: 'formaPago',
    control: 'select',
    allLabel: 'Todas',
    options: [{ value: 'CONTADO', label: 'Contado' }, { value: 'CREDITO', label: 'Crédito' }],
  },
  estado: {
    label: 'Estado',
    apiParam: 'estado',
    control: 'select',
    allLabel: 'Todos',
    options: [{ value: 'PAGADA', label: 'Pagada' }, { value: 'PENDIENTE', label: 'Pendiente' }, { value: 'ANULADA', label: 'Anulada' }],
  },
  tipo: {
    label: 'Tipo',
    apiParam: 'itemType',
    control: 'select',
    allLabel: 'Todos',
    options: [{ value: 'PRODUCTO', label: 'Productos' }, { value: 'SERVICIO', label: 'Servicios' }],
  },
  categoria: { label: 'Categoría', apiParam: 'categoriaId', control: 'category', allLabel: 'Todas las categorías' },
  item: { label: 'Ítem', apiParam: 'productoId', control: 'item', allLabel: 'Todos los ítems' },
  antiguedad: {
    label: 'Antigüedad',
    apiParam: 'antiguedad',
    control: 'select',
    allLabel: 'Todas',
    options: Object.entries(AGING_LABELS).map(([value, label]) => ({ value, label })),
  },
}

export type ValueFormat = 'text' | 'code' | 'date' | 'currency' | 'integer' | 'percent' | 'status' | 'paymentType' | 'itemType' | 'aging'

export type ReportRow = Record<string, string | number | null>

export interface ReportColumn {
  /** Campo de la fila, como en el DTO del backend. */
  key: string
  header: string
  format: ValueFormat
  /** Valor de la fila de totales: suma de la columna o un calculo sobre las filas que suman. */
  total?: 'sum' | ((rows: ReportRow[]) => number)
}

export interface ReportIndicator {
  /** Campo de `summary`. */
  key: string
  label: string
  format: 'currency' | 'integer' | 'percent'
}

export interface ReportChartSpec {
  /** Columnas verticales (por dia o por rango) o barras horizontales (los 10 mayores). */
  kind: 'columns' | 'bars'
  title: string
  /** Como se leen las etiquetas de `series`. */
  labels: 'date' | 'text' | 'aging'
}

export interface LiveReportDefinition {
  key: LiveReportKey
  title: string
  description: string
  /** Ruta del backend sin la base /api. */
  path: string
  exportType: LiveExportType
  /** Con periodo (desde y hasta); sin el, el reporte es una foto al corte de hoy. */
  period: boolean
  filters: FilterKey[]
  indicators: ReportIndicator[]
  chart: ReportChartSpec
  columns: ReportColumn[]
  rowKey: string
  /** Filas que entran en la fila de totales (las anuladas no). Sin el, todas. */
  inTotals?: (row: ReportRow) => boolean
}

export interface LiveReportResponse {
  desde: string | null
  hasta: string | null
  corte: string | null
  appliedFilters: string[]
  summary: Record<string, number>
  rows: ReportRow[]
  series: Array<{ label: string; value: number }>
}

const notAnnulled = (row: ReportRow) => row.status !== 'ANULADA'

const portfolioIndicators: ReportIndicator[] = [
  { key: 'totalBalance', label: 'Saldo total', format: 'currency' },
  { key: 'invoiceCount', label: 'Facturas', format: 'integer' },
  { key: 'balance0To30', label: AGING_LABELS['0-30']!, format: 'currency' },
  { key: 'balance31To60', label: AGING_LABELS['31-60']!, format: 'currency' },
  { key: 'balance61To90', label: AGING_LABELS['61-90']!, format: 'currency' },
  { key: 'balanceOver90', label: AGING_LABELS['90+']!, format: 'currency' },
]

function portfolioColumns(counterparty: string): ReportColumn[] {
  return [
    { key: 'counterpartyName', header: counterparty, format: 'text' },
    { key: 'invoiceNumber', header: 'Factura', format: 'code' },
    { key: 'invoiceDate', header: 'Fecha', format: 'date' },
    { key: 'dueDate', header: 'Vencimiento', format: 'date' },
    { key: 'daysOld', header: 'Días', format: 'integer' },
    { key: 'agingBucket', header: 'Antigüedad', format: 'aging' },
    { key: 'total', header: 'Total', format: 'currency', total: 'sum' },
    { key: 'paid', header: 'Abonado', format: 'currency', total: 'sum' },
    { key: 'balance', header: 'Saldo', format: 'currency', total: 'sum' },
  ]
}

const agingChart: ReportChartSpec = { kind: 'columns', title: 'Saldo por antigüedad', labels: 'aging' }

export const LIVE_REPORTS: LiveReportDefinition[] = [
  {
    key: 'ventas',
    title: 'Ventas',
    description: 'Facturas de venta del período con su forma de pago, estado y saldo.',
    path: '/reporting/sales',
    exportType: 'VENTAS',
    period: true,
    filters: ['cliente', 'pago', 'estado'],
    indicators: [
      { key: 'totalSold', label: 'Total vendido', format: 'currency' },
      { key: 'invoiceCount', label: 'Facturas', format: 'integer' },
      { key: 'averageTicket', label: 'Ticket promedio', format: 'currency' },
      { key: 'cashTotal', label: 'De contado', format: 'currency' },
      { key: 'creditTotal', label: 'A crédito', format: 'currency' },
      { key: 'annulledCount', label: 'Anuladas', format: 'integer' },
    ],
    chart: { kind: 'columns', title: 'Total vendido por día', labels: 'date' },
    columns: [
      { key: 'invoiceNumber', header: 'Factura', format: 'code' },
      { key: 'invoiceDate', header: 'Fecha', format: 'date' },
      { key: 'customerName', header: 'Cliente', format: 'text' },
      { key: 'paymentType', header: 'Forma de pago', format: 'paymentType' },
      { key: 'status', header: 'Estado', format: 'status' },
      { key: 'subtotal', header: 'Subtotal', format: 'currency', total: 'sum' },
      { key: 'iva', header: 'IVA', format: 'currency', total: 'sum' },
      { key: 'total', header: 'Total', format: 'currency', total: 'sum' },
      { key: 'pendingBalance', header: 'Saldo', format: 'currency', total: 'sum' },
    ],
    rowKey: 'saleId',
    inTotals: notAnnulled,
  },
  {
    key: 'productos-vendidos',
    title: 'Productos y servicios vendidos',
    description: 'Unidades, ingresos sin IVA, costo y utilidad por ítem en el período.',
    path: '/reporting/products-sold',
    exportType: 'PRODUCTOS_VENDIDOS',
    period: true,
    filters: ['tipo', 'categoria', 'item'],
    indicators: [
      { key: 'unitsSold', label: 'Unidades vendidas', format: 'integer' },
      { key: 'revenue', label: 'Ingresos sin IVA', format: 'currency' },
      { key: 'cost', label: 'Costo de lo vendido', format: 'currency' },
      { key: 'grossMargin', label: 'Utilidad bruta', format: 'currency' },
      { key: 'marginPercent', label: 'Margen', format: 'percent' },
    ],
    chart: { kind: 'bars', title: 'Los 10 con más ingresos', labels: 'text' },
    columns: [
      { key: 'code', header: 'Código', format: 'code' },
      { key: 'description', header: 'Descripción', format: 'text' },
      { key: 'itemType', header: 'Tipo', format: 'itemType' },
      { key: 'categoryName', header: 'Categoría', format: 'text' },
      { key: 'units', header: 'Unidades', format: 'integer', total: 'sum' },
      { key: 'revenue', header: 'Ingresos', format: 'currency', total: 'sum' },
      { key: 'cost', header: 'Costo', format: 'currency', total: 'sum' },
      { key: 'margin', header: 'Utilidad', format: 'currency', total: 'sum' },
      {
        key: 'marginPercent',
        header: 'Margen',
        format: 'percent',
        total: (rows) => {
          const revenue = sumColumn(rows, 'revenue')
          return revenue === 0 ? 0 : (sumColumn(rows, 'margin') / revenue) * 100
        },
      },
    ],
    rowKey: 'productId',
  },
  {
    key: 'compras',
    title: 'Compras',
    description: 'Facturas de compra del período con su estado, IVA descontable y saldo.',
    path: '/reporting/purchases',
    exportType: 'COMPRAS',
    period: true,
    filters: ['proveedor', 'categoria', 'estado'],
    indicators: [
      { key: 'totalPurchased', label: 'Total comprado', format: 'currency' },
      { key: 'invoiceCount', label: 'Facturas', format: 'integer' },
      { key: 'deductibleVat', label: 'IVA descontable', format: 'currency' },
      { key: 'pendingTotal', label: 'Por pagar', format: 'currency' },
    ],
    chart: { kind: 'bars', title: 'Los 10 proveedores con más compras', labels: 'text' },
    columns: [
      { key: 'invoiceNumber', header: 'Factura', format: 'code' },
      { key: 'invoiceDate', header: 'Fecha', format: 'date' },
      { key: 'supplierName', header: 'Proveedor', format: 'text' },
      { key: 'status', header: 'Estado', format: 'status' },
      { key: 'subtotal', header: 'Subtotal', format: 'currency', total: 'sum' },
      { key: 'iva', header: 'IVA', format: 'currency', total: 'sum' },
      { key: 'total', header: 'Total', format: 'currency', total: 'sum' },
      { key: 'pendingBalance', header: 'Saldo', format: 'currency', total: 'sum' },
    ],
    rowKey: 'purchaseId',
    inTotals: notAnnulled,
  },
  {
    key: 'cartera-cobrar',
    title: 'Cartera por cobrar',
    description: 'Facturas de venta pendientes con su saldo y antigüedad.',
    path: '/reporting/receivables',
    exportType: 'CARTERA_COBRAR',
    period: false,
    filters: ['cliente', 'antiguedad'],
    indicators: portfolioIndicators,
    chart: agingChart,
    columns: portfolioColumns('Cliente'),
    rowKey: 'invoiceId',
  },
  {
    key: 'cartera-pagar',
    title: 'Cartera por pagar',
    description: 'Facturas de compra pendientes con su saldo y antigüedad.',
    path: '/reporting/payables',
    exportType: 'CARTERA_PAGAR',
    period: false,
    filters: ['proveedor', 'antiguedad'],
    indicators: portfolioIndicators,
    chart: agingChart,
    columns: portfolioColumns('Proveedor'),
    rowKey: 'invoiceId',
  },
]

export const DEFAULT_REPORT: LiveReportKey = 'ventas'

export function liveReport(key: string | null): LiveReportDefinition | undefined {
  return LIVE_REPORTS.find((report) => report.key === key)
}

/** Lo que la pantalla lee de la URL para un reporte en vivo. */
export interface LiveReportState {
  periodo: ReportPeriod
  /** Solo con Personalizado. */
  desde: string
  hasta: string
  filters: Partial<Record<FilterKey, string>>
}

const periods = REPORT_PERIOD_OPTIONS.map((option) => option.value)

/** Un valor de filtro aceptado: ids numericos o una opcion conocida; lo demas se ignora. */
function validFilterValue(key: FilterKey, value: string | null): value is string {
  if (!value) return false
  const options = FILTERS[key].options
  return options ? options.some((option) => option.value === value) : /^\d+$/.test(value)
}

/** Estado del reporte leido de la URL; solo los filtros que el reporte admite. */
export function parseReportState(definition: LiveReportDefinition, params: URLSearchParams): LiveReportState {
  const raw = params.get('periodo')
  const periodo = periods.includes(raw as ReportPeriod) ? (raw as ReportPeriod) : 'este-mes'
  const filters: LiveReportState['filters'] = {}
  for (const key of definition.filters) {
    const value = params.get(key)
    if (validFilterValue(key, value)) filters[key] = value
  }
  return {
    periodo,
    desde: periodo === 'personalizado' ? (params.get('desde') ?? '') : '',
    hasta: periodo === 'personalizado' ? (params.get('hasta') ?? '') : '',
    filters,
  }
}

/** Query string de la pantalla: reporte, periodo (si aplica) y filtros, solo lo no predeterminado. */
export function reportStateParams(definition: LiveReportDefinition, state: LiveReportState): URLSearchParams {
  const params = new URLSearchParams()
  if (definition.key !== DEFAULT_REPORT) params.set('reporte', definition.key)
  if (definition.period && state.periodo !== 'este-mes') {
    params.set('periodo', state.periodo)
    if (state.periodo === 'personalizado') {
      if (state.desde) params.set('desde', state.desde)
      if (state.hasta) params.set('hasta', state.hasta)
    }
  }
  for (const key of definition.filters) {
    const value = state.filters[key]
    if (value) params.set(key, value)
  }
  return params
}

/** Rango del reporte, o null si no tiene periodo. */
export function reportRange(state: LiveReportState, today: string): DateRange {
  return state.periodo === 'personalizado' ? { desde: state.desde, hasta: state.hasta } : periodRange(state.periodo, today)
}

/**
 * Parametros del backend, los mismos para la vista y la exportacion. null si el rango no es
 * valido (no se consulta). `URLSearchParams` codifica el + de 90+ como %2B.
 */
export function reportApiParams(definition: LiveReportDefinition, state: LiveReportState, today: string): URLSearchParams | null {
  const params = new URLSearchParams()
  if (definition.period) {
    const range = reportRange(state, today)
    if (!validateRange(range.desde, range.hasta).valid) return null
    params.set('desde', range.desde)
    params.set('hasta', range.hasta)
  }
  for (const key of definition.filters) {
    const value = state.filters[key]
    if (value) params.set(FILTERS[key].apiParam, value)
  }
  return params
}

export function reportPath(definition: LiveReportDefinition, params: URLSearchParams): string {
  const query = params.toString()
  return query ? `${definition.path}?${query}` : definition.path
}

export function reportExportPath(definition: LiveReportDefinition, format: ReportFormat, params: URLSearchParams): string {
  const all = new URLSearchParams({ type: definition.exportType, format })
  for (const [key, value] of params) all.set(key, value)
  return `/reporting/export?${all.toString()}`
}

function sumColumn(rows: ReportRow[], key: string): number {
  return rows.reduce((sum, row) => (typeof row[key] === 'number' ? addMoney(sum, row[key]) : sum), 0)
}

/** Fila de totales por columna; null si el reporte no tiene columnas con total. */
export function reportTotals(definition: LiveReportDefinition, rows: ReportRow[]): Record<string, number> | null {
  const columns = definition.columns.filter((column) => column.total)
  if (columns.length === 0) return null
  const counted = definition.inTotals ? rows.filter(definition.inTotals) : rows
  return Object.fromEntries(
    columns.map((column) => [column.key, column.total === 'sum' ? sumColumn(counted, column.key) : column.total!(counted)]),
  )
}

export type SortDirection = 'asc' | 'desc'

/** Orden en el cliente por una columna; los vacios al final. Sin columna, el orden del backend. */
export function sortRows(rows: ReportRow[], key: string | null, direction: SortDirection): ReportRow[] {
  if (!key) return rows
  const factor = direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const left = a[key]
    const right = b[key]
    if (left === null || left === undefined) return right === null || right === undefined ? 0 : 1
    if (right === null || right === undefined) return -1
    if (typeof left === 'number' && typeof right === 'number') return (left - right) * factor
    return String(left).localeCompare(String(right), 'es', { numeric: true }) * factor
  })
}
