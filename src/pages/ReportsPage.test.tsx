import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { focusManager } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { getToken, saveToken } from '../auth/session'
import { jsonResponse, renderRoute, validToken } from '../test/utils'
import type { TreasuryMovement } from '../accounts/accountsApi'

type Handler = (url: URL) => Response | Promise<Response>

// Octubre con las cifras de la siembra dev. totalSales y totalPurchases (con IVA) no son filas.
const october = {
  totalSales: 24_730_469,
  totalPurchases: 29_310_000,
  netSales: 20_781_907,
  costOfSales: 14_055_000,
  grossProfit: 6_726_907,
  operatingExpenses: 5_192_200,
  otherIncome: 0,
  netProfit: 1_534_707,
}
const september = {
  totalSales: 21_420_000,
  totalPurchases: 25_000_000,
  netSales: 18_000_000,
  costOfSales: 12_000_000,
  grossProfit: 6_000_000,
  operatingExpenses: 4_400_000,
  otherIncome: 0,
  netProfit: 1_600_000,
}

const accounts = [
  { id: 10, name: 'Caja General', type: 'EFECTIVO', currentBalance: 0 },
  { id: 11, name: 'Bancolombia', type: 'BANCO', currentBalance: 0 },
]

const movements: TreasuryMovement[] = [
  { id: 3, date: '2026-10-03', accountId: 11, accountName: 'Bancolombia', type: 'INGRESO', category: 'TRANSFERENCIA', concept: 'Traslado recibido', amount: 30.25, notes: null, saleId: null, purchaseId: null, relatedMovementId: 2 },
  { id: 2, date: '2026-10-03', accountId: 10, accountName: 'Caja General', type: 'EGRESO', category: 'TRANSFERENCIA', concept: 'Traslado enviado', amount: 30.25, notes: null, saleId: null, purchaseId: null, relatedMovementId: null },
  { id: 1, date: '2026-10-01', accountId: 10, accountName: 'Caja General', type: 'INGRESO', category: 'RECAUDO_VENTA', concept: 'Cobro factura', amount: 100.35, notes: null, saleId: 7, purchaseId: null, relatedMovementId: null },
]

function kpisBy(table: Record<string, unknown>): Handler {
  return (url) => {
    const key = `${url.searchParams.get('desde')}|${url.searchParams.get('hasta')}`
    return key in table ? jsonResponse(table[key]) : jsonResponse({ error: 'Fallo', status: 500 }, 500)
  }
}

function fileResponse(name: string) {
  const excel = name.endsWith('.xlsx')
  return new Response(new Blob([excel ? 'PK' : '%PDF-1.7']), {
    status: 200,
    headers: { 'Content-Type': excel ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf', 'Content-Disposition': `attachment; filename="${name}"` },
  })
}

function mockApi(change: Record<string, Handler> = {}) {
  const table: Record<string, Handler> = {
    'GET /api/reporting/kpis': kpisBy({ '2026-10-01|2026-10-19': october, '2026-09-12|2026-09-30': september }),
    'GET /api/treasury/accounts': () => jsonResponse(accounts),
    'GET /api/treasury/movements': (url) => jsonResponse(movements.filter((row) => !url.searchParams.has('accountId') || String(row.accountId) === url.searchParams.get('accountId'))),
    'GET /api/reporting/export': () => fileResponse('estado-resultados_2026-10-01_2026-10-19.pdf'),
    ...change,
  }
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const parsed = new URL(url, 'http://localhost')
    const handler = table[`${init?.method ?? 'GET'} ${parsed.pathname}`]
    return Promise.resolve(handler ? handler(parsed) : jsonResponse({ error: 'No encontrado', status: 404 }, 404))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function exportCalls(fetchMock: ReturnType<typeof mockApi>) {
  return fetchMock.mock.calls.map(([url]) => url).filter((url) => url.startsWith('/api/reporting/export'))
}

function kpiCalls(fetchMock: ReturnType<typeof mockApi>) {
  return fetchMock.mock.calls.map(([url]) => url).filter((url) => url.startsWith('/api/reporting/kpis'))
}

const statementValue = (concept: string) =>
  within(screen.getByRole('table')).getByRole('rowheader', { name: concept }).nextElementSibling

const statementConcepts = () =>
  within(screen.getByRole('table')).getAllByRole('rowheader').map((header) => header.textContent)

const STATEMENT_ORDER = ['Ventas sin IVA', 'Costo de lo vendido', 'Utilidad bruta', 'Otros ingresos', 'Gastos operativos', 'Utilidad neta']

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    // 19/10/2026 a las 7 p. m. en Bogota: ya es 20/10 en UTC.
    vi.setSystemTime(new Date('2026-10-20T00:00:00Z'))
    saveToken(validToken())
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:reporte'), revokeObjectURL: vi.fn() }))
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('clasifica una perdida de diez centavos como negativa', async () => {
    mockApi({ 'GET /api/reporting/kpis': () => jsonResponse({ ...october, netProfit: -0.1 }) })
    renderRoute('/reportes')
    await screen.findByRole('rowheader', { name: 'Utilidad neta' })
    expect(statementValue('Utilidad neta')).toHaveTextContent('$ 0')
    expect(screen.getByRole('rowheader', { name: 'Utilidad neta' }).parentElement).toHaveClass('bg-error-bg', 'text-error-ink')
  })

  it('muestra el periodo por defecto, la vista previa y la variacion', async () => {
    const fetchMock = mockApi()
    renderRoute('/reportes')

    expect(screen.getByRole('heading', { name: 'Reportes' })).toBeInTheDocument()
    expect(screen.getByText(/Las facturas anuladas no se incluyen/)).toBeInTheDocument()
    expect(screen.getByLabelText('Período')).toHaveValue('este-mes')
    expect(screen.getByText('1 oct. 2026 al 19 oct. 2026')).toBeInTheDocument()
    expect(screen.queryByLabelText('Desde')).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Estado de resultados/ })).toBeChecked()
    expect(screen.getByText('Ventas, costo de lo vendido, gastos y utilidad del período.')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'PDF' })).toBeChecked()
    expect(screen.queryByLabelText('Cuenta')).not.toBeInTheDocument()

    const preview = screen.getByRole('region', { name: 'Vista previa · Estado de resultados' })
    expect(within(preview).getByText('01/10/2026 a 19/10/2026')).toBeInTheDocument()
    expect(await within(preview).findAllByText('$ 20.781.907')).toHaveLength(2)
    expect(statementValue('Ventas sin IVA')).toHaveTextContent('$ 20.781.907')
    expect(statementValue('Costo de lo vendido')).toHaveTextContent('-$ 14.055.000')
    expect(statementValue('Costo de lo vendido')).toHaveClass('text-error')
    expect(statementValue('Utilidad bruta')).toHaveTextContent('$ 6.726.907')
    expect(statementValue('Otros ingresos')).toHaveTextContent('$ 0')
    expect(statementValue('Gastos operativos')).toHaveTextContent('-$ 5.192.200')
    expect(statementValue('Gastos operativos')).toHaveClass('text-error')
    expect(statementValue('Utilidad neta')).toHaveTextContent('$ 1.534.707')
    // Compras (con IVA) ya no sale en la vista previa.
    expect(within(preview).queryByText(/Compras/)).not.toBeInTheDocument()
    expect(within(preview).queryByText('-$ 29.310.000')).not.toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: 'Utilidad neta' }).parentElement).toHaveClass('bg-success-bg', 'text-success-ink')
    expect(statementConcepts()).toEqual(STATEMENT_ORDER)

    // Ventas sin IVA 20,78 contra 18 millones sube 15 %; utilidad 1,53 contra 1,6 baja 4 %.
    expect(await within(preview).findByText(/Subió/)).toBeInTheDocument()
    const salesCard = within(preview).getByText('Ventas sin IVA', { selector: 'p' }).parentElement!
    expect(salesCard).toHaveTextContent('Subió 15%vs. período anterior')
    const profitCard = within(preview).getByText('Utilidad neta', { selector: 'p' }).parentElement!
    expect(profitCard).toHaveTextContent('Bajó 4%vs. período anterior')
    expect(kpiCalls(fetchMock)).toEqual([
      '/api/reporting/kpis?desde=2026-10-01&hasta=2026-10-19',
      '/api/reporting/kpis?desde=2026-09-12&hasta=2026-09-30',
    ])
  })

  it('con otros ingresos: seis filas en orden, Otros ingresos en texto normal y utilidad neta y variacion de kpis', async () => {
    // Cifras de la siembra de demostracion: bruta 267.750 mas 50.000 menos 450.000.
    const withIncome = {
      totalSales: 318_622,
      totalPurchases: 0,
      netSales: 267_750,
      costOfSales: 0,
      grossProfit: 267_750,
      operatingExpenses: 450_000,
      otherIncome: 50_000,
      netProfit: -132_250,
    }
    mockApi({
      'GET /api/reporting/kpis': kpisBy({
        '2026-10-01|2026-10-19': withIncome,
        '2026-09-12|2026-09-30': { ...september, netProfit: -264_500 },
      }),
    })
    renderRoute('/reportes')

    const preview = screen.getByRole('region', { name: 'Vista previa · Estado de resultados' })
    expect(await within(preview).findAllByText('$ 267.750')).toHaveLength(3)
    expect(statementConcepts()).toEqual(STATEMENT_ORDER)
    expect(statementValue('Costo de lo vendido')).toHaveTextContent('$ 0')
    expect(statementValue('Utilidad bruta')).toHaveTextContent('$ 267.750')
    expect(statementValue('Otros ingresos')).toHaveTextContent('$ 50.000')
    expect(statementValue('Otros ingresos')).toHaveClass('text-text')
    expect(statementValue('Otros ingresos')).not.toHaveClass('text-error')
    expect(statementValue('Otros ingresos')).not.toHaveClass('text-success-ink')
    const incomeRow = screen.getByRole('rowheader', { name: 'Otros ingresos' }).parentElement
    expect(incomeRow).not.toHaveClass('bg-success-bg')
    expect(incomeRow).not.toHaveClass('bg-error-bg')
    expect(statementValue('Gastos operativos')).toHaveTextContent('-$ 450.000')
    expect(statementValue('Utilidad neta')).toHaveTextContent('-$ 132.250')

    // La variacion usa netProfit: -132.250 contra -264.500 sube 50 %.
    const profitCard = within(preview).getByText('Utilidad neta', { selector: 'p' }).parentElement!
    expect(profitCard).toHaveTextContent('-$ 132.250')
    expect(await within(profitCard).findByText(/Subió/)).toBeInTheDocument()
    expect(profitCard).toHaveTextContent('Subió 50%vs. período anterior')
  })

  it('un mes completo se titula con el mes y sin datos anteriores no hay porcentaje', async () => {
    mockApi({
      'GET /api/reporting/kpis': kpisBy({
        '2026-09-01|2026-09-30': { ...october, netProfit: -1_000_000 },
        // Periodo anterior en cero: la variacion no divide por cero.
        '2026-08-02|2026-08-31': { ...september, netSales: 0, netProfit: 0 },
      }),
    })
    renderRoute('/reportes')

    fireEvent.change(screen.getByLabelText('Período'), { target: { value: 'personalizado' } })
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-09-01' } })
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-09-30' } })

    const preview = await screen.findByRole('region', { name: 'Vista previa · Estado de resultados' })
    expect(await within(preview).findByText('Septiembre de 2026')).toBeInTheDocument()
    expect(await within(preview).findAllByText('Sin datos del período anterior')).toHaveLength(2)
    expect(screen.getByRole('rowheader', { name: 'Utilidad neta' }).parentElement).toHaveClass('bg-error-bg', 'text-error-ink')
    expect(statementValue('Utilidad neta')).toHaveTextContent('-$ 1.000.000')
  })

  it('sin el periodo anterior la vista previa sale sin variacion y se puede reintentar', async () => {
    const fetchMock = mockApi({
      'GET /api/reporting/kpis': kpisBy({ '2026-10-01|2026-10-19': october }),
    })
    renderRoute('/reportes')

    expect(await screen.findByText(/No pudimos cargar el período anterior/)).toBeInTheDocument()
    expect(statementValue('Ventas sin IVA')).toHaveTextContent('$ 20.781.907')
    expect(screen.queryByText(/vs\. período anterior/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Generar reporte' })).toBeEnabled()

    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(kpiCalls(fetchMock)).toHaveLength(3))
  })

  it('un error de kpis muestra el error de la vista previa con reintentar', async () => {
    mockApi({ 'GET /api/reporting/kpis': kpisBy({}) })
    renderRoute('/reportes')

    expect(await screen.findByText('No pudimos cargar la vista previa.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Generar reporte' })).toBeEnabled()
  })

  it('genera el reporte con los parametros exactos y avisa con el nombre del archivo', async () => {
    const fetchMock = mockApi({ 'GET /api/reporting/export': () => fileResponse('estado-resultados_2026-10-01_2026-10-19.xlsx') })
    let downloadedName = ''
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { downloadedName = this.download })
    const user = userEvent.setup()
    renderRoute('/reportes')

    await user.click(screen.getByRole('radio', { name: 'Excel' }))
    await user.click(screen.getByRole('button', { name: 'Generar reporte' }))

    expect(await screen.findByText('Reporte generado: estado-resultados_2026-10-01_2026-10-19.xlsx')).toBeInTheDocument()
    expect(downloadedName).toBe('estado-resultados_2026-10-01_2026-10-19.xlsx')
    expect(exportCalls(fetchMock)).toEqual([
      '/api/reporting/export?type=ESTADO_RESULTADOS&format=XLSX&desde=2026-10-01&hasta=2026-10-19',
    ])
  })

  it('movimientos: cuenta opcional y accountId solo con una cuenta concreta', async () => {
    const fetchMock = mockApi({ 'GET /api/reporting/export': () => fileResponse('movimientos-cuentas.pdf') })
    const user = userEvent.setup()
    renderRoute('/reportes')

    await user.click(screen.getByRole('radio', { name: /Movimientos de cuentas/ }))
    const preview = await screen.findByRole('region', { name: 'Vista previa · Movimientos de cuentas' })
    expect(within(preview).getByText('Todas las cuentas')).toBeInTheDocument()
    const account = await screen.findByLabelText('Cuenta')
    expect(account).toHaveValue('')
    expect(within(account).getByRole('option', { name: 'Todas las cuentas' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Generar reporte' }))
    await screen.findByText('Reporte generado: movimientos-cuentas.pdf')

    await user.selectOptions(account, '11')
    expect(within(preview).getByText('Bancolombia', { selector: 'p.text-body' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Generar reporte' }))
    await waitFor(() => expect(exportCalls(fetchMock)).toHaveLength(2))

    expect(exportCalls(fetchMock)).toEqual([
      '/api/reporting/export?type=MOVIMIENTOS&format=PDF&desde=2026-10-01&hasta=2026-10-19',
      '/api/reporting/export?type=MOVIMIENTOS&format=PDF&desde=2026-10-01&hasta=2026-10-19&accountId=11',
    ])
    expect(fetchMock.mock.calls.map(([url]) => url).filter((url) => url.startsWith('/api/treasury/movements'))).toEqual([
      '/api/treasury/movements?desde=2026-10-01&hasta=2026-10-19',
      '/api/treasury/movements?desde=2026-10-01&hasta=2026-10-19&accountId=11',
    ])
    const table = await within(preview).findByRole('table')
    expect(within(table).queryByRole('columnheader', { name: 'Cuenta' })).not.toBeInTheDocument()
    expect(within(table).getAllByRole('row')).toHaveLength(2)
    expect(within(table).getByText('Traslado recibido')).toBeInTheDocument()
  })

  it('movimientos ordena fecha e id ascendentes y suma transferencias con precision antes de redondear', async () => {
    mockApi()
    renderRoute('/reportes')
    await userEvent.setup().click(screen.getByRole('radio', { name: /Movimientos de cuentas/ }))
    const table = await screen.findByRole('table')
    expect(within(table).getAllByRole('row').slice(1).map((row) => row.textContent)).toEqual([
      expect.stringContaining('Cobro factura'), expect.stringContaining('Traslado enviado'), expect.stringContaining('Traslado recibido'),
    ])
    expect(within(table).getByText('-$ 30')).toBeInTheDocument()
    expect(within(table).getByText('+$ 30')).toBeInTheDocument()
    expect(within(table).getAllByText('Transferencia')).toHaveLength(2)
    expect(within(screen.getByRole('main')).getByText('Ingresos').nextElementSibling).toHaveTextContent('$ 131')
    expect(within(screen.getByRole('main')).getByText('Egresos').nextElementSibling).toHaveTextContent('-$ 30')
    expect(screen.queryByText('Saldo inicial del período')).not.toBeInTheDocument()
    expect(screen.queryByText('Saldo final')).not.toBeInTheDocument()
  })

  it.each(['', '11'])('pagina diez filas para cuenta %s con totales completos y exportacion independiente', async (accountId) => {
    const many = Array.from({ length: 35 }, (_, index) => ({ ...movements[0], id: index + 1, concept: `Movimiento ${index + 1}`, amount: 1.49, type: index % 2 ? 'EGRESO' : 'INGRESO' })).reverse()
    const fetchMock = mockApi({
      'GET /api/treasury/movements': () => jsonResponse(many),
      'GET /api/reporting/export': (url) => fileResponse(`movimientos-cuentas.${url.searchParams.get('format') === 'PDF' ? 'pdf' : 'xlsx'}`),
    })
    const user = userEvent.setup()
    renderRoute('/reportes')
    await user.click(screen.getByRole('radio', { name: /Movimientos de cuentas/ }))
    await screen.findByLabelText('Cuenta')
    if (accountId) await user.selectOptions(screen.getByLabelText('Cuenta'), accountId)
    await screen.findByText('1–10 de 35 movimientos')
    const tableRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1)
    expect(tableRows()).toHaveLength(10)
    expect(tableRows()[0]).toHaveTextContent('Movimiento 1')
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Página 1' })).toHaveAttribute('aria-current', 'page')
    expect(within(screen.getByRole('main')).getByText('Ingresos').nextElementSibling).toHaveTextContent('$ 27')
    expect(within(screen.getByRole('main')).getByText('Egresos').nextElementSibling).toHaveTextContent('-$ 25')
    await user.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(screen.getByText('11–20 de 35 movimientos')).toBeInTheDocument()
    expect(tableRows()[0]).toHaveTextContent('Movimiento 11')
    screen.getByRole('button', { name: 'Página 3' }).focus()
    await user.keyboard('{Enter}')
    expect(screen.getByText('21–30 de 35 movimientos')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(screen.getByText('31–35 de 35 movimientos')).toBeInTheDocument()
    expect(tableRows()).toHaveLength(5)
    expect(tableRows()[0]).toHaveTextContent('Movimiento 31')
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeEnabled()
    expect(within(screen.getByRole('main')).getByText('Ingresos').nextElementSibling).toHaveTextContent('$ 27')
    expect(within(screen.getByRole('main')).getByText('Egresos').nextElementSibling).toHaveTextContent('-$ 25')
    await user.click(screen.getByRole('button', { name: 'Generar reporte' }))
    await screen.findByText('Reporte generado: movimientos-cuentas.pdf')
    await user.click(screen.getByRole('radio', { name: 'Excel' }))
    await user.click(screen.getByRole('button', { name: 'Generar reporte' }))
    await screen.findByText('Reporte generado: movimientos-cuentas.xlsx')
    expect(exportCalls(fetchMock)).toEqual(['PDF', 'XLSX'].map((format) => `/api/reporting/export?type=MOVIMIENTOS&format=${format}&desde=2026-10-01&hasta=2026-10-19${accountId ? '&accountId=11' : ''}`))
    await user.click(screen.getByRole('button', { name: 'Página anterior' }))
    expect(screen.getByText('21–30 de 35 movimientos')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Cuenta'), accountId ? '' : '11')
    expect(await screen.findByText('1–10 de 35 movimientos')).toBeInTheDocument()
  })

  it('reinicia pagina al cambiar tipo, periodo con el mismo rango y fechas personalizadas', async () => {
    const many = Array.from({ length: 35 }, (_, index) => ({ ...movements[0], id: index + 1 }))
    mockApi({ 'GET /api/treasury/movements': () => jsonResponse(many) })
    const user = userEvent.setup()
    renderRoute('/reportes')
    await user.click(screen.getByRole('radio', { name: /Movimientos de cuentas/ }))
    await screen.findByText('1–10 de 35 movimientos')
    await user.click(screen.getByRole('button', { name: 'Página 3' }))
    await user.selectOptions(screen.getByLabelText('Período'), 'personalizado')
    expect(await screen.findByText('1–10 de 35 movimientos')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Página 3' }))
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-10-02' } })
    expect(await screen.findByText('1–10 de 35 movimientos')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Página 3' }))
    await user.click(screen.getByRole('radio', { name: /Estado de resultados/ }))
    await user.click(screen.getByRole('radio', { name: /Movimientos de cuentas/ }))
    expect(await screen.findByText('1–10 de 35 movimientos')).toBeInTheDocument()
  })

  it('ajusta la pagina visible cuando una recarga reduce el conjunto', async () => {
    let many = Array.from({ length: 35 }, (_, index) => ({ ...movements[0], id: index + 1, amount: 1 }))
    mockApi({ 'GET /api/treasury/movements': () => jsonResponse(many) })
    const user = userEvent.setup()
    renderRoute('/reportes')
    await user.click(screen.getByRole('radio', { name: /Movimientos de cuentas/ }))
    await screen.findByText('1–10 de 35 movimientos')
    await user.click(screen.getByRole('button', { name: 'Página 4' }))
    many = many.slice(0, 12)
    try {
      await act(async () => { focusManager.setFocused(false); focusManager.setFocused(true) })
      expect(await screen.findByText('11–12 de 12 movimientos')).toBeInTheDocument()
      expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(3)
      expect(screen.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')
      expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled()
      expect(within(screen.getByRole('main')).getByText('Ingresos').nextElementSibling).toHaveTextContent('$ 12')
      await user.click(screen.getByRole('button', { name: 'Página anterior' }))
      expect(screen.getByText('1–10 de 12 movimientos')).toBeInTheDocument()
    } finally {
      focusManager.setFocused(undefined)
    }
  })

  it('Personalizado cambia consulta y descarga juntos y oculta los datos anteriores durante la espera y carga', async () => {
    let finish: (response: Response) => void = () => undefined
    const fetchMock = mockApi({ 'GET /api/treasury/movements': (url) => url.searchParams.get('desde') === '2026-10-02' ? new Promise<Response>((resolve) => { finish = resolve }) : jsonResponse(movements) })
    const user = userEvent.setup()
    renderRoute('/reportes')
    await user.click(screen.getByRole('radio', { name: /Movimientos de cuentas/ }))
    await screen.findByText('1–3 de 3 movimientos')
    await user.selectOptions(screen.getByLabelText('Cuenta'), '11')
    fireEvent.change(screen.getByLabelText('Período'), { target: { value: 'personalizado' } })
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-10-02' } })
    expect(screen.queryByText('Cobro factura')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Actualizando vista previa')
    expect(await screen.findByText('Cargando movimientos…')).toBeInTheDocument()
    expect(within(screen.getByRole('main')).queryByText('Ingresos')).not.toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Excel' }))
    await user.click(screen.getByRole('button', { name: 'Generar reporte' }))
    await waitFor(() => expect(exportCalls(fetchMock)).toEqual(['/api/reporting/export?type=MOVIMIENTOS&format=XLSX&desde=2026-10-02&hasta=2026-10-19&accountId=11']))
    expect(fetchMock.mock.calls.map(([url]) => url)).toContain('/api/treasury/movements?desde=2026-10-02&hasta=2026-10-19&accountId=11')
    finish(jsonResponse([movements[0]]))
    await screen.findByText('1–1 de 1 movimientos')
    expect(within(screen.getByRole('table')).queryByText('Cobro factura')).not.toBeInTheDocument()
  })

  it('movimientos muestra error y permite reintentar la consulta', async () => {
    let fail = true
    mockApi({ 'GET /api/treasury/movements': () => fail ? jsonResponse({ error: 'Fallo', status: 500 }, 500) : jsonResponse(movements) })
    const user = userEvent.setup()
    renderRoute('/reportes')
    await user.click(screen.getByRole('radio', { name: /Movimientos de cuentas/ }))
    await screen.findByText('No pudimos cargar esta información.')
    expect(within(screen.getByRole('main')).queryByText('Ingresos')).not.toBeInTheDocument()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('1–3 de 3 movimientos')).toBeInTheDocument()
  })

  it('movimientos vacio conserva totales cero y no inventa filas', async () => {
    mockApi({ 'GET /api/treasury/movements': () => jsonResponse([]) })
    renderRoute('/reportes')
    await userEvent.setup().click(screen.getByRole('radio', { name: /Movimientos de cuentas/ }))
    expect(await screen.findByText('Sin movimientos en el período.')).toBeInTheDocument()
    expect(within(screen.getByRole('main')).getByText('Ingresos').nextElementSibling).toHaveTextContent('$ 0')
    expect(within(screen.getByRole('main')).getByText('Egresos').nextElementSibling).toHaveTextContent('$ 0')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('sin cuentas muestra el estado propio sin consultar movimientos', async () => {
    const fetchMock = mockApi({ 'GET /api/treasury/accounts': () => jsonResponse([]) })
    renderRoute('/reportes')
    await userEvent.setup().click(screen.getByRole('radio', { name: /Movimientos de cuentas/ }))
    expect(await screen.findByText('No hay cuentas registradas.')).toBeInTheDocument()
    expect(screen.getByLabelText('Cuenta')).toHaveValue('')
    expect(fetchMock.mock.calls.some(([url]) => url.startsWith('/api/treasury/movements'))).toBe(false)
  })

  it('cuentas carga y error mantienen el selector y la vista sin datos ficticios', async () => {
    let finish: (response: Response) => void = () => undefined
    const fetchMock = mockApi({ 'GET /api/treasury/accounts': () => new Promise<Response>((resolve) => { finish = resolve }) })
    renderRoute('/reportes')
    await userEvent.setup().click(screen.getByRole('radio', { name: /Movimientos de cuentas/ }))
    expect(screen.queryByLabelText('Cuenta')).not.toBeInTheDocument()
    expect(within(screen.getByRole('main')).queryByText('Ingresos')).not.toBeInTheDocument()
    finish(jsonResponse({ error: 'Fallo', status: 500 }, 500))
    expect(await screen.findAllByText('No pudimos cargar las cuentas.')).toHaveLength(2)
    expect(fetchMock.mock.calls.some(([url]) => url.startsWith('/api/treasury/movements'))).toBe(false)
  })

  it.each([
    ['este-mes', '2026-10-01', '2026-10-19'],
    ['mes-anterior', '2026-09-01', '2026-09-30'],
    ['ultimos-30', '2026-09-20', '2026-10-19'],
    ['este-ano', '2026-01-01', '2026-10-19'],
  ])('el periodo %s gobierna movimientos y PDF', async (period, desde, hasta) => {
    const fetchMock = mockApi()
    const user = userEvent.setup()
    renderRoute('/reportes')
    await user.click(screen.getByRole('radio', { name: /Movimientos de cuentas/ }))
    await screen.findByLabelText('Cuenta')
    await user.selectOptions(screen.getByLabelText('Período'), period!)
    await waitFor(() => expect(fetchMock.mock.calls.map(([url]) => url)).toContain(`/api/treasury/movements?desde=${desde}&hasta=${hasta}`))
    await user.click(screen.getByRole('button', { name: 'Generar reporte' }))
    await waitFor(() => expect(exportCalls(fetchMock)).toEqual([`/api/reporting/export?type=MOVIMIENTOS&format=PDF&desde=${desde}&hasta=${hasta}`]))
  })

  it('estado de resultados sin actividad conserva las seis cifras cero y el menu del contenido', async () => {
    mockApi({ 'GET /api/reporting/kpis': () => jsonResponse(Object.fromEntries(Object.keys(october).map((key) => [key, 0]))) })
    renderRoute('/reportes')
    expect(await screen.findByText('Sin actividad en el período.')).toBeInTheDocument()
    expect(statementConcepts()).toEqual(STATEMENT_ORDER)
    for (const concept of STATEMENT_ORDER) expect(statementValue(concept)).toHaveTextContent('$ 0')
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abrir menú' })).toBeInTheDocument()
  })

  it('oculta cifras del estado anterior al cambiar rango y opera formatos con teclado', async () => {
    const fetchMock = mockApi()
    const user = userEvent.setup()
    renderRoute('/reportes')
    await screen.findByRole('rowheader', { name: 'Ventas sin IVA' })
    screen.getByRole('radio', { name: 'PDF' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'Excel' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Excel' })).toHaveFocus()
    fireEvent.change(screen.getByLabelText('Período'), { target: { value: 'mes-anterior' } })
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByText('$ 20.781.907')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Actualizando vista previa')
    await waitFor(() => expect(kpiCalls(fetchMock)).toContain('/api/reporting/kpis?desde=2026-09-01&hasta=2026-09-30'))
  })

  it('un error del backend queda en el Alert sin perder lo digitado', async () => {
    mockApi({
      'GET /api/reporting/export': () =>
        jsonResponse({ error: 'El reporte tiene mas de 20000 movimientos: acota el rango de fechas', status: 400 }, 400),
    })
    const user = userEvent.setup()
    renderRoute('/reportes')

    await user.click(screen.getByRole('radio', { name: /Movimientos de cuentas/ }))
    fireEvent.change(screen.getByLabelText('Período'), { target: { value: 'personalizado' } })
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-01-01' } })
    await user.click(screen.getByRole('button', { name: 'Generar reporte' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos generar el reporte')
    expect(alert).toHaveTextContent('El reporte tiene más de 20.000 movimientos: acorta el período.')
    expect(screen.getByLabelText('Desde')).toHaveValue('2026-01-01')
    expect(screen.getByRole('radio', { name: /Movimientos de cuentas/ })).toBeChecked()
    expect(getToken()).not.toBeNull()
  })

  it('un 401 al generar cierra la sesion', async () => {
    mockApi({ 'GET /api/reporting/export': () => jsonResponse({ error: 'No autenticado', status: 401 }, 401) })
    const router = renderRoute('/reportes')

    await userEvent.setup().click(screen.getByRole('button', { name: 'Generar reporte' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(getToken()).toBeNull()
  })

  it('muestra la carga y no envia dos veces', async () => {
    let finish: (response: Response) => void = () => undefined
    const fetchMock = mockApi({
      'GET /api/reporting/export': () => new Promise<Response>((resolve) => (finish = resolve)),
    })
    const user = userEvent.setup()
    renderRoute('/reportes')

    await user.dblClick(screen.getByRole('button', { name: 'Generar reporte' }))
    const button = await screen.findByRole('button', { name: 'Generando…' })
    expect(button).toBeDisabled()
    expect(exportCalls(fetchMock)).toHaveLength(1)

    finish(fileResponse('estado-resultados_2026-10-01_2026-10-19.pdf'))
    expect(await screen.findByRole('button', { name: 'Generar reporte' })).toBeEnabled()
    expect(exportCalls(fetchMock)).toHaveLength(1)
  })

  it('valida el rango en el cliente sin llamar al backend', async () => {
    const fetchMock = mockApi()
    renderRoute('/reportes')
    const button = screen.getByRole('button', { name: 'Generar reporte' })

    fireEvent.change(screen.getByLabelText('Período'), { target: { value: 'personalizado' } })
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-10-20' } })
    expect(screen.getByText('Hasta no puede ser anterior a Desde.')).toBeInTheDocument()
    // Generar no se deshabilita por errores: al enviar, el foco va al campo con error.
    expect(button).toBeEnabled()
    fireEvent.click(button)
    expect(screen.getByLabelText('Hasta')).toHaveFocus()
    expect(screen.queryByRole('region', { name: /Vista previa/ })).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2025-10-18' } })
    expect(screen.getByText('El período no puede pasar de 366 días. Acorta el rango.')).toBeInTheDocument()
    expect(button).toBeEnabled()

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '' } })
    expect(screen.getByText('Elige la fecha de inicio.')).toBeInTheDocument()
    fireEvent.click(button)

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2025-10-19' } })
    expect(button).toBeEnabled()
    expect(exportCalls(fetchMock)).toHaveLength(0)
  })

  it('solo ofrece los reportes que existen, sin opciones Proximamente', async () => {
    mockApi()
    const user = userEvent.setup()
    renderRoute('/reportes')

    const radios = within(screen.getByRole('group', { name: 'Tipo de reporte' })).getAllByRole('radio')
    expect(radios.map((radio) => radio.getAttribute('value'))).toEqual(['ESTADO_RESULTADOS', 'MOVIMIENTOS'])
    for (const radio of radios) expect(radio).toBeEnabled()
    expect(screen.queryByText(/Próximamente/)).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: /^Ventas/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: /^Compras/ })).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Estado de resultados/ })).toBeChecked()

    screen.getByRole('radio', { name: /Estado de resultados/ }).focus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('radio', { name: /Movimientos de cuentas/ })).toBeChecked()
  })
})
