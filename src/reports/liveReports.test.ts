import { describe, expect, it } from 'vitest'
import {
  LIVE_REPORTS,
  liveReport,
  parseReportState,
  reportApiParams,
  reportExportPath,
  reportPath,
  reportStateParams,
  reportTotals,
  sortRows,
  type LiveReportKey,
} from './liveReports'

const TODAY = '2026-11-21'
const report = (key: LiveReportKey) => liveReport(key)!
const apiPathFor = (key: LiveReportKey, query: string) => {
  const definition = report(key)
  return reportPath(definition, reportApiParams(definition, parseReportState(definition, new URLSearchParams(query)), TODAY)!)
}

describe('definiciones de reportes en vivo', () => {
  it('cada reporte tiene su ruta y su tipo de exportacion', () => {
    expect(LIVE_REPORTS.map((item) => [item.key, item.path, item.exportType, item.period])).toEqual([
      ['ventas', '/reporting/sales', 'VENTAS', true],
      ['productos-vendidos', '/reporting/products-sold', 'PRODUCTOS_VENDIDOS', true],
      ['compras', '/reporting/purchases', 'COMPRAS', true],
      ['cartera-cobrar', '/reporting/receivables', 'CARTERA_COBRAR', false],
      ['cartera-pagar', '/reporting/payables', 'CARTERA_PAGAR', false],
    ])
  })

  it('arma la ruta del backend con el rango y los filtros de cada reporte', () => {
    expect(apiPathFor('ventas', 'cliente=5&pago=CREDITO&estado=PENDIENTE')).toBe(
      '/reporting/sales?desde=2026-11-01&hasta=2026-11-21&clienteId=5&formaPago=CREDITO&estado=PENDIENTE',
    )
    expect(apiPathFor('productos-vendidos', 'periodo=mes-anterior&tipo=SERVICIO&categoria=3&item=9')).toBe(
      '/reporting/products-sold?desde=2026-10-01&hasta=2026-10-31&itemType=SERVICIO&categoriaId=3&productoId=9',
    )
    expect(apiPathFor('compras', 'periodo=personalizado&desde=2026-01-01&hasta=2026-03-31&proveedor=11&categoria=2&estado=ANULADA')).toBe(
      '/reporting/purchases?desde=2026-01-01&hasta=2026-03-31&proveedorId=11&categoriaId=2&estado=ANULADA',
    )
    expect(apiPathFor('cartera-cobrar', 'cliente=4&antiguedad=31-60')).toBe('/reporting/receivables?clienteId=4&antiguedad=31-60')
    expect(apiPathFor('cartera-pagar', '')).toBe('/reporting/payables')
  })

  it('las carteras no envian fechas aunque la URL traiga un periodo', () => {
    expect(apiPathFor('cartera-pagar', 'periodo=este-ano&proveedor=2')).toBe('/reporting/payables?proveedorId=2')
  })

  it('codifica el + de 90+ como %2B', () => {
    expect(apiPathFor('cartera-cobrar', 'antiguedad=90%2B')).toBe('/reporting/receivables?antiguedad=90%2B')
  })

  it('ignora filtros que el reporte no admite y valores desconocidos', () => {
    expect(apiPathFor('cartera-cobrar', 'proveedor=3&antiguedad=15&cliente=abc')).toBe('/reporting/receivables')
    expect(apiPathFor('ventas', 'estado=OTRO&tipo=SERVICIO')).toBe('/reporting/sales?desde=2026-11-01&hasta=2026-11-21')
  })

  it('no consulta con un rango personalizado invalido', () => {
    const definition = report('ventas')
    const state = parseReportState(definition, new URLSearchParams('periodo=personalizado&desde=2026-11-10&hasta=2026-11-01'))
    expect(reportApiParams(definition, state, TODAY)).toBeNull()
  })

  it('la exportacion lleva el tipo, el formato y los mismos filtros', () => {
    const definition = report('cartera-cobrar')
    const params = reportApiParams(definition, parseReportState(definition, new URLSearchParams('cliente=4&antiguedad=90%2B')), TODAY)!
    expect(reportExportPath(definition, 'XLSX', params)).toBe('/reporting/export?type=CARTERA_COBRAR&format=XLSX&clienteId=4&antiguedad=90%2B')
  })

  it('la URL de la pantalla solo escribe lo no predeterminado y se lee igual', () => {
    const definition = report('compras')
    const state = { periodo: 'personalizado' as const, desde: '2026-01-01', hasta: '2026-01-31', filters: { proveedor: '11', estado: 'PAGADA' } }
    const params = reportStateParams(definition, state)
    expect(params.toString()).toBe('reporte=compras&periodo=personalizado&desde=2026-01-01&hasta=2026-01-31&proveedor=11&estado=PAGADA')
    expect(parseReportState(definition, params)).toEqual(state)
    expect(reportStateParams(report('ventas'), { periodo: 'este-mes', desde: '', hasta: '', filters: {} }).toString()).toBe('')
  })
})

describe('totales y orden de la tabla', () => {
  const rows = [
    { saleId: 1, invoiceNumber: 'FV-2', status: 'PAGADA', subtotal: 100, iva: 19, total: 119, pendingBalance: 0 },
    { saleId: 2, invoiceNumber: 'FV-10', status: 'ANULADA', subtotal: 500, iva: 95, total: 595, pendingBalance: 0 },
    { saleId: 3, invoiceNumber: 'FV-1', status: 'PENDIENTE', subtotal: 200.5, iva: 38.1, total: 238.6, pendingBalance: 238.6 },
  ]

  it('las anuladas no suman en los totales de ventas', () => {
    expect(reportTotals(report('ventas'), rows)).toEqual({ subtotal: 300.5, iva: 57.1, total: 357.6, pendingBalance: 238.6 })
  })

  it('el margen total es la utilidad sobre los ingresos, no la suma de margenes', () => {
    const products = [
      { productId: 1, units: 2, revenue: 1000, cost: 600, margin: 400, marginPercent: 40 },
      { productId: 2, units: 1, revenue: 3000, cost: 2700, margin: 300, marginPercent: 10 },
    ]
    expect(reportTotals(report('productos-vendidos'), products)).toEqual({ units: 3, revenue: 4000, cost: 3300, margin: 700, marginPercent: 17.5 })
  })

  it('ordena numeros, textos con numeros y deja los vacios al final', () => {
    expect(sortRows(rows, 'total', 'desc').map((row) => row.saleId)).toEqual([2, 3, 1])
    expect(sortRows(rows, 'invoiceNumber', 'asc').map((row) => row.invoiceNumber)).toEqual(['FV-1', 'FV-2', 'FV-10'])
    const withNull = [{ id: 1, dueDate: null }, { id: 2, dueDate: '2026-11-01' }]
    expect(sortRows(withNull, 'dueDate', 'asc').map((row) => row.id)).toEqual([2, 1])
    expect(sortRows(withNull, 'dueDate', 'desc').map((row) => row.id)).toEqual([2, 1])
    expect(sortRows(rows, null, 'asc')).toBe(rows)
  })
})
