import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Ban,
  Banknote,
  Boxes,
  CalendarClock,
  ChartPie,
  CircleAlert,
  Clock,
  Coins,
  CreditCard,
  FileText,
  HandCoins,
  Hourglass,
  Landmark,
  Layers,
  Package,
  PackageX,
  Percent,
  Receipt,
  ReceiptText,
  ShoppingBag,
  ShoppingCart,
  Tag,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { IndicatorAccent } from '../components/IndicatorCard'
import type { BadgeStatus } from '../components/StatusBadge'
import { GLOSSARY } from '../copy/glossary'
import { addMoney } from '../lib/money'
import type { StockStatus } from '../lib/stock'
import { periodRange, type DateRange } from '../lib/period'
import { validateRange, type ReportFormat } from './reports'

// Reportes en vivo: cada reporte es una definicion declarativa (ruta, filtros, indicadores,
// grafica, columnas y tipo de exportacion). La pagina solo recorre estas definiciones; un
// reporte nuevo se agrega aqui. Contrato del backend en su nota 2026-11-21-reports-sales-portfolio.

export type LiveReportKey =
  | 'ventas'
  | 'productos-vendidos'
  | 'compras'
  | 'cartera-cobrar'
  | 'cartera-pagar'
  | 'inventario'
  | 'flujo-caja'
  | 'estado-resultados'
  | 'iva'
  | 'movimientos'

/** `type` de `GET /api/reporting/export` de cada reporte en vivo. */
export type LiveExportType =
  | 'VENTAS'
  | 'PRODUCTOS_VENDIDOS'
  | 'COMPRAS'
  | 'CARTERA_COBRAR'
  | 'CARTERA_PAGAR'
  | 'INVENTARIO'
  | 'FLUJO_CAJA'
  | 'ESTADO_RESULTADOS'
  | 'IVA'
  | 'MOVIMIENTOS'

/** Nombre del filtro en la URL de la pantalla. */
export type FilterKey =
  | 'cliente'
  | 'proveedor'
  | 'pago'
  | 'estado'
  | 'tipo'
  | 'categoria'
  | 'item'
  | 'antiguedad'
  | 'stock'
  | 'cuenta'
  | 'movimiento'

export type ReportPeriod = 'este-mes' | 'mes-anterior' | 'ultimos-30' | 'este-ano' | 'personalizado'

export const REPORT_PERIOD_OPTIONS: Array<{ value: ReportPeriod; label: string }> = [
  { value: 'este-mes', label: 'Este mes' },
  { value: 'mes-anterior', label: 'Mes anterior' },
  { value: 'ultimos-30', label: 'Últimos 30 días' },
  { value: 'este-ano', label: 'Este año' },
  { value: 'personalizado', label: 'Personalizado' },
]

export type FilterControl = 'select' | 'customer' | 'supplier' | 'item' | 'category' | 'account'

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

/** Etiquetas y badges del estado de stock: los mismos de Inicio e Inventario. */
export const STOCK_LABELS: Record<StockStatus, string> = {
  NORMAL: 'Disponible',
  BAJO: GLOSSARY.lowStock,
  CRITICO: GLOSSARY.criticalStock,
  SIN_STOCK: GLOSSARY.outOfStock,
}
export const STOCK_BADGES: Record<StockStatus, BadgeStatus> = {
  NORMAL: 'DISPONIBLE',
  BAJO: 'BAJO_STOCK',
  CRITICO: 'STOCK_CRITICO',
  SIN_STOCK: 'SIN_STOCK',
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
  stock: {
    label: 'Estado de stock',
    apiParam: 'estadoStock',
    control: 'select',
    allLabel: 'Todos',
    options: (['NORMAL', 'BAJO', 'CRITICO', 'SIN_STOCK'] as const).map((value) => ({ value, label: STOCK_LABELS[value] })),
  },
  cuenta: { label: 'Cuenta', apiParam: 'cuentaId', control: 'account', allLabel: 'Todas las cuentas' },
  movimiento: {
    label: 'Tipo',
    apiParam: 'tipo',
    control: 'select',
    allLabel: 'Todos',
    options: [{ value: 'INGRESO', label: 'Ingreso' }, { value: 'EGRESO', label: 'Egreso' }],
  },
}

export type ValueFormat =
  | 'text'
  | 'code'
  | 'date'
  | 'currency'
  | 'integer'
  | 'percent'
  | 'status'
  | 'paymentType'
  | 'itemType'
  | 'aging'
  | 'stockStatus'
  /** ENTRADA o SALIDA, con etiqueta. */
  | 'direction'
  /** Monto positivo con signo: menos si la fila es SALIDA o EGRESO (en totales, el signo del valor). */
  | 'signedAmount'

export type ReportRow = Record<string, string | number | null>

export interface ReportColumn {
  /** Campo de la fila, como en el DTO del backend. */
  key: string
  header: string
  format: ValueFormat
  /** Valor de la fila de totales: suma de la columna o un calculo sobre las filas que suman. */
  total?: 'sum' | ((rows: ReportRow[]) => number)
}

/** Aspecto de un indicador (el de los KPI de Inicio): un mismo concepto lleva el mismo en todos los reportes. */
export interface IndicatorLook {
  icon: LucideIcon
  accent: IndicatorAccent
}

// Criterio de colores en 03-DECISIONS (2026-11-21): ventas e ingresos verde, costos y compras ambar,
// utilidades y saldos azul, gastos, anuladas, cartera vieja y estados criticos rojo, conteos gris. Los
// indicadores que tambien estan en Inicio llevan su aspecto: Utilidad neta en brand-strong.
export const LOOKS = {
  sales: { icon: TrendingUp, accent: 'success' },
  invoices: { icon: FileText, accent: 'neutral' },
  ticket: { icon: Receipt, accent: 'success' },
  cash: { icon: Banknote, accent: 'success' },
  credit: { icon: CreditCard, accent: 'success' },
  annulled: { icon: Ban, accent: 'error' },
  units: { icon: ShoppingCart, accent: 'neutral' },
  cost: { icon: Package, accent: 'warning' },
  grossProfit: { icon: ChartPie, accent: 'info' },
  netProfit: { icon: Wallet, accent: 'brand-strong' },
  margin: { icon: Percent, accent: 'info' },
  purchases: { icon: ShoppingBag, accent: 'warning' },
  deductibleVat: { icon: ReceiptText, accent: 'warning' },
  generatedVat: { icon: ReceiptText, accent: 'success' },
  payable: { icon: CalendarClock, accent: 'warning' },
  balance: { icon: Landmark, accent: 'info' },
  portfolio: { icon: HandCoins, accent: 'info' },
  agingCurrent: { icon: Clock, accent: 'info' },
  agingLate: { icon: Hourglass, accent: 'warning' },
  agingOld: { icon: CircleAlert, accent: 'error' },
  products: { icon: Boxes, accent: 'neutral' },
  stock: { icon: Layers, accent: 'neutral' },
  stockCost: { icon: Coins, accent: 'warning' },
  stockSale: { icon: Tag, accent: 'success' },
  lowStock: { icon: TriangleAlert, accent: 'warning' },
  criticalStock: { icon: CircleAlert, accent: 'error' },
  outOfStock: { icon: PackageX, accent: 'error' },
  inflows: { icon: ArrowUpRight, accent: 'success' },
  outflows: { icon: ArrowDownRight, accent: 'error' },
  netFlow: { icon: ArrowLeftRight, accent: 'info' },
  expenses: { icon: TrendingDown, accent: 'error' },
} satisfies Record<string, IndicatorLook>

export interface ReportIndicator extends IndicatorLook {
  /** Campo de `summary`. */
  key: string
  label: string
  /** Una linea bajo el valor que explica que cuenta, como en Inicio. */
  description: string
  format: 'currency' | 'integer' | 'percent'
  /** Puede ser negativo: la cifra va en el tono de error. */
  signed?: boolean
  /** Porcentaje que acompana al valor, como el margen. */
  detail?: { key: string; label: string }
  /** Costos y gastos: en la variacion, bajar es lo bueno. */
  lowerIsBetter?: boolean
}

/** Un punto de la grafica: su etiqueta y un valor por serie. */
export type ChartPoint = { label: string } & Record<string, string | number>

export interface ChartSeries {
  /** Campo del punto. */
  key: string
  label: string
  tone: 'info' | 'warning' | 'success'
}

export interface ReportChartSpec {
  /** Columnas verticales (por dia, mes o rango) o barras horizontales (los 10 mayores). */
  kind: 'columns' | 'bars'
  title: string
  /** Como se leen las etiquetas: fecha, texto, rango de antiguedad o mes o dia (`2026-09`). */
  labels: 'date' | 'text' | 'aging' | 'period'
  /** Pesos por defecto; `integer` para unidades. */
  valueFormat?: 'currency' | 'integer'
  /** Varias series, con leyenda. Sin ellas, una sola serie en `value`. */
  series?: ChartSeries[]
  /** Puntos armados de la respuesta; sin el, `series` del backend. */
  points?: (response: LiveReportResponse) => ChartPoint[]
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
  rowKey: string | ((row: ReportRow) => string)
  /** Filas que entran en la fila de totales (las anuladas no). Sin el, todas. */
  inTotals?: (row: ReportRow) => boolean
  /** Filas resaltadas (subtotales de un estado). */
  emphasize?: (row: ReportRow) => boolean
  /** Sin orden por columna: las filas siguen el orden del documento. */
  fixedOrder?: boolean
  /** Notas cortas bajo la descripcion, segun los filtros elegidos. */
  notes?: (filters: LiveReportState['filters']) => string[]
  /** Indicadores con la variacion contra el periodo anterior de igual duracion (`previousPeriod`). */
  compareWithPrevious?: boolean
}

export interface LiveReportResponse {
  desde: string | null
  hasta: string | null
  corte: string | null
  appliedFilters: string[]
  summary: Record<string, number>
  rows: ReportRow[]
  series: ChartPoint[]
}

const notAnnulled = (row: ReportRow) => row.status !== 'ANULADA'

function portfolioIndicators(side: 'cobrar' | 'pagar'): ReportIndicator[] {
  const aging = 'Saldo de facturas con'
  return [
    {
      key: 'totalBalance',
      label: 'Saldo total',
      format: 'currency',
      ...LOOKS.portfolio,
      description: side === 'cobrar' ? 'Lo que tus clientes te deben hoy.' : 'Lo que debes hoy a tus proveedores.',
    },
    { key: 'invoiceCount', label: 'Facturas', format: 'integer', ...LOOKS.invoices, description: 'Facturas pendientes con saldo.' },
    { key: 'balance0To30', label: AGING_LABELS['0-30']!, format: 'currency', ...LOOKS.agingCurrent, description: `${aging} hasta 30 días de emitidas.` },
    { key: 'balance31To60', label: AGING_LABELS['31-60']!, format: 'currency', ...LOOKS.agingLate, description: `${aging} 31 a 60 días de emitidas.` },
    { key: 'balance61To90', label: AGING_LABELS['61-90']!, format: 'currency', ...LOOKS.agingOld, description: `${aging} 61 a 90 días de emitidas.` },
    { key: 'balanceOver90', label: AGING_LABELS['90+']!, format: 'currency', ...LOOKS.agingOld, description: `${aging} más de 90 días de emitidas.` },
  ]
}

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
      { key: 'totalSold', label: 'Total vendido', format: 'currency', ...LOOKS.sales, description: 'Con IVA y sin facturas anuladas.' },
      { key: 'invoiceCount', label: 'Facturas', format: 'integer', ...LOOKS.invoices, description: 'Facturas emitidas, sin las anuladas.' },
      { key: 'averageTicket', label: 'Ticket promedio', format: 'currency', ...LOOKS.ticket, description: 'Total vendido entre el número de facturas.' },
      { key: 'cashTotal', label: 'De contado', format: 'currency', ...LOOKS.cash, description: 'Ventas pagadas al momento.' },
      { key: 'creditTotal', label: 'A crédito', format: 'currency', ...LOOKS.credit, description: 'Ventas que el cliente paga después.' },
      { key: 'annulledCount', label: 'Anuladas', format: 'integer', ...LOOKS.annulled, description: 'Facturas anuladas en el período.' },
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
      { key: 'unitsSold', label: 'Unidades vendidas', format: 'integer', ...LOOKS.units, description: 'Productos y servicios, sin facturas anuladas.' },
      { key: 'revenue', label: 'Ingresos sin IVA', format: 'currency', ...LOOKS.sales, description: 'Sin IVA y sin facturas anuladas.' },
      { key: 'cost', label: 'Costo de lo vendido', format: 'currency', ...LOOKS.cost, description: 'Costo de lo que vendiste.' },
      { key: 'grossMargin', label: 'Utilidad bruta', format: 'currency', ...LOOKS.grossProfit, description: 'Ingresos menos costo de lo vendido.' },
      { key: 'marginPercent', label: 'Margen', format: 'percent', ...LOOKS.margin, description: 'Utilidad bruta sobre los ingresos.' },
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
      { key: 'totalPurchased', label: 'Total comprado', format: 'currency', ...LOOKS.purchases, description: 'Con IVA y sin facturas anuladas.' },
      { key: 'invoiceCount', label: 'Facturas', format: 'integer', ...LOOKS.invoices, description: 'Facturas de compra, sin las anuladas.' },
      { key: 'deductibleVat', label: 'IVA descontable', format: 'currency', ...LOOKS.deductibleVat, description: 'IVA pagado en tus compras.' },
      { key: 'pendingTotal', label: 'Por pagar', format: 'currency', ...LOOKS.payable, description: 'Saldo pendiente de estas compras.' },
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
    indicators: portfolioIndicators('cobrar'),
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
    indicators: portfolioIndicators('pagar'),
    chart: agingChart,
    columns: portfolioColumns('Proveedor'),
    rowKey: 'invoiceId',
  },
]

const negativeRow = (row: ReportRow) => row.direction === 'SALIDA' || row.type === 'EGRESO'
const signedSum = (rows: ReportRow[]) =>
  rows.reduce((sum, row) => addMoney(sum, negativeRow(row) ? -Number(row.amount) : Number(row.amount)), 0)

/** Signo de un monto de la fila: SALIDA y EGRESO restan. */
export function signedRowAmount(row: ReportRow | undefined, value: number): number {
  return row && negativeRow(row) ? -value : value
}

function vatRowLabel(row: ReportRow): string {
  return `${row.categoryName} ${String(row.ratePercent).replace('.', ',')} %`
}

LIVE_REPORTS.push(
  {
    key: 'inventario',
    title: 'Inventario y rotación',
    description: 'Stock, valor y rotación de cada producto. Los servicios no tienen stock y no salen.',
    path: '/reporting/inventory',
    exportType: 'INVENTARIO',
    period: true,
    filters: ['categoria', 'stock'],
    indicators: [
      { key: 'productCount', label: 'Productos', format: 'integer', ...LOOKS.products, description: 'Productos con los filtros elegidos.' },
      { key: 'unitsInStock', label: 'Unidades en stock', format: 'integer', ...LOOKS.stock, description: 'Suma del stock actual.' },
      { key: 'costValue', label: 'Valor al costo', format: 'currency', ...LOOKS.stockCost, description: 'Stock actual por su costo.' },
      { key: 'saleValue', label: 'Valor a precio de venta', format: 'currency', ...LOOKS.stockSale, description: 'Stock actual por su precio de venta.' },
      { key: 'lowStockCount', label: GLOSSARY.lowStock, format: 'integer', ...LOOKS.lowStock, description: 'Productos que conviene reponer pronto.' },
      { key: 'criticalStockCount', label: GLOSSARY.criticalStock, format: 'integer', ...LOOKS.criticalStock, description: 'Productos a punto de agotarse.' },
      { key: 'outOfStockCount', label: GLOSSARY.outOfStock, format: 'integer', ...LOOKS.outOfStock, description: 'Productos sin unidades disponibles.' },
      { key: 'unitsSoldInPeriod', label: 'Unidades vendidas', format: 'integer', ...LOOKS.units, description: 'Vendidas en el período, sin anuladas.' },
    ],
    chart: { kind: 'bars', title: 'Los 10 más vendidos por unidades', labels: 'text', valueFormat: 'integer' },
    columns: [
      { key: 'code', header: 'Código', format: 'code' },
      { key: 'description', header: 'Descripción', format: 'text' },
      { key: 'categoryName', header: 'Categoría', format: 'text' },
      { key: 'stock', header: 'Stock', format: 'integer', total: 'sum' },
      { key: 'stockStatus', header: 'Estado', format: 'stockStatus' },
      { key: 'unitCost', header: 'Costo unitario', format: 'currency' },
      { key: 'costValue', header: 'Valor al costo', format: 'currency', total: 'sum' },
      { key: 'salePrice', header: 'Precio de venta', format: 'currency' },
      { key: 'unitsSold', header: 'Vendidas', format: 'integer', total: 'sum' },
      { key: 'lastSaleDate', header: 'Última venta', format: 'date' },
      { key: 'daysWithoutSale', header: 'Días sin vender', format: 'integer' },
    ],
    rowKey: 'productId',
    notes: () => ['El stock es al día de hoy; el período aplica a las unidades vendidas.'],
  },
  {
    key: 'flujo-caja',
    title: 'Flujo de caja',
    description: 'Lo que entró y salió de tus cuentas en el período, por concepto.',
    path: '/reporting/cash-flow',
    exportType: 'FLUJO_CAJA',
    period: true,
    filters: ['cuenta'],
    indicators: [
      { key: 'openingBalance', label: 'Saldo inicial', format: 'currency', signed: true, ...LOOKS.balance, description: 'Saldo al empezar el período.' },
      { key: 'inflows', label: 'Entradas', format: 'currency', ...LOOKS.inflows, description: 'Dinero que entró a tus cuentas.' },
      { key: 'outflows', label: 'Salidas', format: 'currency', ...LOOKS.outflows, description: 'Dinero que salió de tus cuentas.' },
      { key: 'netFlow', label: 'Flujo neto', format: 'currency', signed: true, ...LOOKS.netFlow, description: 'Entradas menos salidas.' },
      { key: 'closingBalance', label: 'Saldo final', format: 'currency', signed: true, ...LOOKS.balance, description: 'Saldo inicial más el flujo neto.' },
    ],
    chart: { kind: 'columns', title: 'Flujo neto por día', labels: 'date' },
    columns: [
      { key: 'label', header: 'Concepto', format: 'text' },
      { key: 'direction', header: 'Dirección', format: 'direction' },
      { key: 'movementCount', header: 'Movimientos', format: 'integer', total: 'sum' },
      { key: 'amount', header: 'Valor', format: 'signedAmount', total: signedSum },
    ],
    rowKey: 'concept',
    fixedOrder: true,
    notes: (filters) => (filters.cuenta ? [] : ['Las transferencias entre tus cuentas no se cuentan como entradas ni salidas.']),
  },
  {
    key: 'estado-resultados',
    title: 'Estado de resultados',
    description: 'Ventas, costo de lo vendido, gastos y utilidad del período.',
    path: '/reporting/income-statement',
    exportType: 'ESTADO_RESULTADOS',
    period: true,
    filters: [],
    indicators: [
      { key: 'revenue', label: 'Ingresos', format: 'currency', ...LOOKS.sales, description: 'Ventas sin IVA y sin facturas anuladas.' },
      { key: 'costOfSales', label: 'Costo de ventas', format: 'currency', lowerIsBetter: true, ...LOOKS.cost, description: 'Costo de lo que vendiste.' },
      {
        key: 'grossProfit',
        label: 'Utilidad bruta',
        format: 'currency',
        signed: true,
        detail: { key: 'grossMarginPercent', label: 'Margen' },
        ...LOOKS.grossProfit,
        description: 'Ingresos menos costo de ventas.',
      },
      { key: 'operatingExpenses', label: 'Gastos operativos', format: 'currency', lowerIsBetter: true, ...LOOKS.expenses, description: 'Gastos del negocio en el período.' },
      {
        key: 'netProfit',
        label: 'Utilidad neta',
        format: 'currency',
        signed: true,
        detail: { key: 'netMarginPercent', label: 'Margen neto' },
        ...LOOKS.netProfit,
        description: 'Utilidad bruta más otros ingresos, menos gastos.',
      },
    ],
    chart: {
      kind: 'columns',
      title: 'Ingresos, costos y utilidad',
      labels: 'period',
      series: [
        { key: 'revenue', label: 'Ingresos', tone: 'info' },
        { key: 'cost', label: 'Costos', tone: 'warning' },
        { key: 'profit', label: 'Utilidad', tone: 'success' },
      ],
    },
    columns: [
      { key: 'label', header: 'Concepto', format: 'text' },
      { key: 'amount', header: 'Valor', format: 'currency' },
      { key: 'percentOfRevenue', header: '% de ingresos', format: 'percent' },
    ],
    rowKey: 'line',
    fixedOrder: true,
    compareWithPrevious: true,
    emphasize: (row) => row.line === 'UTILIDAD_BRUTA' || row.line === 'UTILIDAD_NETA',
  },
  {
    key: 'iva',
    title: 'IVA',
    description: 'IVA generado en ventas y descontable en compras, por categoría y tarifa.',
    path: '/reporting/vat',
    exportType: 'IVA',
    period: true,
    filters: [],
    indicators: [
      { key: 'ivaGenerado', label: 'IVA generado', format: 'currency', ...LOOKS.generatedVat, description: 'IVA cobrado en tus ventas.' },
      { key: 'ivaDescontable', label: 'IVA descontable', format: 'currency', ...LOOKS.deductibleVat, description: 'IVA pagado en tus compras.' },
      { key: 'ivaNeto', label: 'Saldo por pagar', format: 'currency', signed: true, ...LOOKS.balance, description: 'IVA generado menos descontable.' },
    ],
    chart: {
      kind: 'columns',
      title: 'IVA generado y descontable por tarifa',
      labels: 'text',
      series: [
        { key: 'ivaGenerado', label: 'Generado', tone: 'info' },
        { key: 'ivaDescontable', label: 'Descontable', tone: 'warning' },
      ],
      points: (response) => response.rows.map((row) => ({
        label: vatRowLabel(row),
        ivaGenerado: Number(row.ivaGenerado),
        ivaDescontable: Number(row.ivaDescontable),
      })),
    },
    columns: [
      { key: 'categoryName', header: 'Categoría', format: 'text' },
      { key: 'ratePercent', header: 'Tarifa', format: 'percent' },
      { key: 'taxableBase', header: 'Base gravable', format: 'currency', total: 'sum' },
      { key: 'ivaGenerado', header: 'IVA generado', format: 'currency', total: 'sum' },
      { key: 'ivaDescontable', header: 'IVA descontable', format: 'currency', total: 'sum' },
      { key: 'ivaNeto', header: 'Saldo', format: 'currency', total: 'sum' },
    ],
    rowKey: vatRowLabel,
  },
  {
    key: 'movimientos',
    title: 'Movimientos',
    description: 'Cada ingreso y egreso de tus cuentas en el período.',
    path: '/reporting/movements-report',
    exportType: 'MOVIMIENTOS',
    period: true,
    filters: ['cuenta', 'movimiento'],
    indicators: [
      { key: 'inflows', label: 'Entradas', format: 'currency', ...LOOKS.inflows, description: 'Dinero que entró a tus cuentas.' },
      { key: 'outflows', label: 'Salidas', format: 'currency', ...LOOKS.outflows, description: 'Dinero que salió de tus cuentas.' },
      { key: 'net', label: 'Neto', format: 'currency', signed: true, ...LOOKS.netFlow, description: 'Entradas menos salidas.' },
    ],
    chart: { kind: 'columns', title: 'Neto por día', labels: 'date' },
    columns: [
      { key: 'date', header: 'Fecha', format: 'date' },
      { key: 'accountName', header: 'Cuenta', format: 'text' },
      { key: 'concept', header: 'Concepto', format: 'text' },
      { key: 'reference', header: 'Referencia', format: 'text' },
      { key: 'type', header: 'Tipo', format: 'status' },
      { key: 'amount', header: 'Valor', format: 'signedAmount', total: signedSum },
    ],
    rowKey: 'movementId',
  },
)

/** Areas de la navegacion: cada reporte pertenece a una. */
export const REPORT_GROUPS: Array<{ key: string; label: string; reports: LiveReportKey[] }> = [
  { key: 'ventas-cartera', label: 'Ventas y cartera', reports: ['ventas', 'productos-vendidos', 'cartera-cobrar'] },
  { key: 'compras-proveedores', label: 'Compras y proveedores', reports: ['compras', 'cartera-pagar'] },
  { key: 'inventario', label: 'Inventario', reports: ['inventario'] },
  { key: 'finanzas', label: 'Finanzas', reports: ['estado-resultados', 'flujo-caja', 'iva', 'movimientos'] },
]

export function reportGroup(key: LiveReportKey) {
  return REPORT_GROUPS.find((group) => group.reports.includes(key))!
}

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
