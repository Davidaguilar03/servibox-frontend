/// <reference types="node" />
import { readFileSync } from 'node:fs'
import * as lucide from 'lucide-react'
import { describe, expect, it } from 'vitest'
import {
  FILTERS,
  LIVE_REPORTS,
  LOOKS,
  REPORT_GROUPS,
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
      ['inventario', '/reporting/inventory', 'INVENTARIO', true],
      ['flujo-caja', '/reporting/cash-flow', 'FLUJO_CAJA', true],
      ['estado-resultados', '/reporting/income-statement', 'ESTADO_RESULTADOS', true],
      ['iva', '/reporting/vat', 'IVA', true],
      ['movimientos', '/reporting/movements-report', 'MOVIMIENTOS', true],
    ])
  })

  it('cada reporte esta en una sola area y las areas cubren los diez', () => {
    const grouped = REPORT_GROUPS.flatMap((group) => group.reports)
    expect([...grouped].sort()).toEqual(LIVE_REPORTS.map((item) => item.key).sort())
    expect(REPORT_GROUPS.map((group) => group.label)).toEqual(['Ventas y cartera', 'Compras y proveedores', 'Inventario', 'Finanzas'])
  })

  it('arma la ruta y la exportacion de los reportes de la segunda tanda', () => {
    expect(apiPathFor('inventario', 'categoria=3&stock=SIN_STOCK')).toBe(
      '/reporting/inventory?desde=2026-11-01&hasta=2026-11-21&categoriaId=3&estadoStock=SIN_STOCK',
    )
    expect(apiPathFor('flujo-caja', 'cuenta=2')).toBe('/reporting/cash-flow?desde=2026-11-01&hasta=2026-11-21&cuentaId=2')
    expect(apiPathFor('estado-resultados', 'periodo=este-ano')).toBe('/reporting/income-statement?desde=2026-01-01&hasta=2026-11-21')
    expect(apiPathFor('iva', 'cuenta=2')).toBe('/reporting/vat?desde=2026-11-01&hasta=2026-11-21')
    expect(apiPathFor('movimientos', 'cuenta=1&movimiento=EGRESO')).toBe(
      '/reporting/movements-report?desde=2026-11-01&hasta=2026-11-21&cuentaId=1&tipo=EGRESO',
    )
    const definition = report('movimientos')
    const params = reportApiParams(definition, parseReportState(definition, new URLSearchParams('cuenta=1&movimiento=INGRESO')), TODAY)!
    expect(reportExportPath(definition, 'PDF', params)).toBe('/reporting/export?type=MOVIMIENTOS&format=PDF&desde=2026-11-01&hasta=2026-11-21&cuentaId=1&tipo=INGRESO')
  })

  it('el estado de stock admite los cuatro valores con las etiquetas de Inicio e Inventario', () => {
    expect(FILTERS.stock.options).toEqual([
      { value: 'NORMAL', label: 'Disponible' },
      { value: 'BAJO', label: 'Stock bajo' },
      { value: 'CRITICO', label: 'Stock crítico' },
      { value: 'SIN_STOCK', label: 'Sin stock' },
    ])
  })

  it('la nota de transferencias del flujo de caja sale solo sin cuenta', () => {
    const notes = report('flujo-caja').notes!
    expect(notes({})).toEqual(['Las transferencias entre tus cuentas no se cuentan como entradas ni salidas.'])
    expect(notes({ cuenta: '2' })).toEqual([])
  })

  it('el total del flujo de caja resta las salidas', () => {
    const rows = [
      { concept: 'VENTAS_CONTADO', direction: 'ENTRADA', movementCount: 2, amount: 1000.5 },
      { concept: 'GASTOS_OPERATIVOS', direction: 'SALIDA', movementCount: 1, amount: 3000 },
    ]
    expect(reportTotals(report('flujo-caja'), rows)).toEqual({ movementCount: 3, amount: -1999.5 })
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

describe('indicadores con el diseno de Inicio', () => {
  const all = LIVE_REPORTS.flatMap((definition) => definition.indicators.map((indicator) => ({ report: definition.key, ...indicator })))

  it('cada indicador declara icono, color y una descripcion corta de una linea', () => {
    const looks = Object.values(LOOKS)
    for (const indicator of all) {
      expect(looks, `${indicator.report} ${indicator.label}`).toContainEqual({ icon: indicator.icon, accent: indicator.accent })
      expect(indicator.description, `${indicator.report} ${indicator.label}`).toMatch(/^[A-ZÁÉÍÓÚ].{8,55}\.$/)
    }
  })

  it('el mismo concepto lleva el mismo icono y color en todos los reportes', () => {
    const byLabel = new Map<string, { icon: unknown; accent: string }>()
    for (const indicator of all) {
      const seen = byLabel.get(indicator.label)
      if (seen) expect({ icon: indicator.icon, accent: indicator.accent }, indicator.label).toEqual(seen)
      else byLabel.set(indicator.label, { icon: indicator.icon, accent: indicator.accent })
    }
    const look = (key: LiveReportKey, label: string) => report(key).indicators.find((indicator) => indicator.label === label)!
    expect(look('productos-vendidos', 'Costo de lo vendido')).toMatchObject(LOOKS.cost)
    expect(look('estado-resultados', 'Costo de ventas')).toMatchObject(LOOKS.cost)
    expect(look('ventas', 'Total vendido')).toMatchObject({ accent: 'success' })
    expect(look('ventas', 'Anuladas')).toMatchObject({ accent: 'error' })
    expect(look('estado-resultados', 'Gastos operativos')).toMatchObject({ accent: 'error' })
    expect(look('estado-resultados', 'Utilidad neta')).toMatchObject({ accent: 'brand-strong' })
    expect(look('compras', 'Total comprado')).toMatchObject({ accent: 'warning' })
    expect(look('cartera-cobrar', 'Más de 90 días')).toMatchObject({ accent: 'error' })
    expect(look('inventario', 'Stock crítico')).toMatchObject({ accent: 'error' })
    expect(look('inventario', 'Productos')).toMatchObject({ accent: 'neutral' })
  })
  it('los indicadores que tambien estan en Inicio se ven igual que alla', () => {
    // Etiqueta, acento e icono de cada KPI de Inicio, leidos del codigo de la pantalla.
    const source = readFileSync('src/pages/DashboardPage.tsx', 'utf-8')
    const home = [...source.matchAll(/label="([^"]+)"\s+accent="([^"]+)"\s+icon=\{(\w+)\}/g)]
      .map(([, label, accent, icon]) => ({ label, accent, icon: lucide[icon as keyof typeof lucide] }))
    expect(home.map((kpi) => kpi.label)).toEqual(['Ventas sin IVA', 'Costo de lo vendido', 'Utilidad bruta', 'Utilidad neta'])
    const same = { 'Ventas sin IVA': LOOKS.sales, 'Costo de lo vendido': LOOKS.cost, 'Utilidad bruta': LOOKS.grossProfit, 'Utilidad neta': LOOKS.netProfit }
    for (const kpi of home) expect(same[kpi.label as keyof typeof same], kpi.label).toEqual({ icon: kpi.icon, accent: kpi.accent })
    // Y los reportes usan esos aspectos en esos conceptos.
    const look = (key: LiveReportKey, label: string) => report(key).indicators.find((indicator) => indicator.label === label)!
    expect(look('productos-vendidos', 'Ingresos sin IVA')).toMatchObject(LOOKS.sales)
    expect(look('estado-resultados', 'Ingresos')).toMatchObject(LOOKS.sales)
    expect(look('productos-vendidos', 'Costo de lo vendido')).toMatchObject(LOOKS.cost)
    expect(look('productos-vendidos', 'Utilidad bruta')).toMatchObject(LOOKS.grossProfit)
    expect(look('estado-resultados', 'Utilidad bruta')).toMatchObject(LOOKS.grossProfit)
    expect(look('estado-resultados', 'Utilidad neta')).toMatchObject(LOOKS.netProfit)
  })
})

