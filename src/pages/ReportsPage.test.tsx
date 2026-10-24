import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getToken, saveToken } from '../auth/session'
import { jsonResponse, renderRoute, validToken } from '../test/utils'

type Handler = (url: URL) => Response | Promise<Response>

const october = { totalSales: 48_620_000, totalPurchases: 29_310_000, grossProfit: 19_310_000, operatingExpenses: 4_440_000, netProfit: 14_870_000 }
const september = { totalSales: 43_400_000, totalPurchases: 25_000_000, grossProfit: 18_400_000, operatingExpenses: 3_000_000, netProfit: 15_400_000 }

const accounts = [
  { id: 10, name: 'Caja General', type: 'EFECTIVO', currentBalance: 0 },
  { id: 11, name: 'Bancolombia', type: 'BANCO', currentBalance: 0 },
]

function kpisBy(table: Record<string, unknown>): Handler {
  return (url) => {
    const key = `${url.searchParams.get('desde')}|${url.searchParams.get('hasta')}`
    return key in table ? jsonResponse(table[key]) : jsonResponse({ error: 'Fallo', status: 500 }, 500)
  }
}

function fileResponse(name: string) {
  return new Response(new Blob(['%PDF-1.7']), {
    status: 200,
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${name}"` },
  })
}

function mockApi(change: Record<string, Handler> = {}) {
  const table: Record<string, Handler> = {
    'GET /api/reporting/kpis': kpisBy({ '2026-10-01|2026-10-19': october, '2026-09-12|2026-09-30': september }),
    'GET /api/treasury/accounts': () => jsonResponse(accounts),
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

  it('muestra el periodo por defecto, la vista previa y la variacion', async () => {
    const fetchMock = mockApi()
    renderRoute('/reportes')

    expect(screen.getByRole('heading', { name: 'Reportes' })).toBeInTheDocument()
    expect(screen.getByText(/Las facturas anuladas no se incluyen/)).toBeInTheDocument()
    expect(screen.getByLabelText('Desde')).toHaveValue('2026-10-01')
    expect(screen.getByLabelText('Hasta')).toHaveValue('2026-10-19')
    expect(screen.getByRole('radio', { name: /Estado de resultados/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'PDF' })).toBeChecked()
    expect(screen.queryByLabelText('Cuenta')).not.toBeInTheDocument()

    const preview = screen.getByRole('region', { name: 'Vista previa · Estado de resultados' })
    expect(within(preview).getByText('01/10/2026 a 19/10/2026')).toBeInTheDocument()
    expect(await within(preview).findAllByText('$ 48.620.000')).toHaveLength(2)
    expect(statementValue('Ventas totales')).toHaveTextContent('$ 48.620.000')
    expect(statementValue('Compras totales')).toHaveTextContent('-$ 29.310.000')
    expect(statementValue('Compras totales')).toHaveClass('text-error')
    expect(statementValue('Utilidad bruta')).toHaveTextContent('$ 19.310.000')
    expect(statementValue('Gastos operativos')).toHaveTextContent('-$ 4.440.000')
    expect(statementValue('Utilidad neta')).toHaveTextContent('$ 14.870.000')
    expect(screen.getByRole('rowheader', { name: 'Utilidad neta' }).parentElement).toHaveClass('bg-success-bg', 'text-success-ink')

    // Ventas 48,62 contra 43,4 millones sube 12 %; utilidad 14,87 contra 15,4 baja 3 %.
    expect(await within(preview).findByText(/Subió/)).toBeInTheDocument()
    const salesCard = within(preview).getByText('Ventas totales', { selector: 'p' }).parentElement!
    expect(salesCard).toHaveTextContent('Subió 12%vs. período anterior')
    const profitCard = within(preview).getByText('Utilidad neta', { selector: 'p' }).parentElement!
    expect(profitCard).toHaveTextContent('Bajó 3%vs. período anterior')
    expect(kpiCalls(fetchMock)).toEqual([
      '/api/reporting/kpis?desde=2026-10-01&hasta=2026-10-19',
      '/api/reporting/kpis?desde=2026-09-12&hasta=2026-09-30',
    ])
  })

  it('un mes completo se titula con el mes y sin datos anteriores no hay porcentaje', async () => {
    mockApi({
      'GET /api/reporting/kpis': kpisBy({
        '2026-09-01|2026-09-30': { ...october, netProfit: -1_000_000 },
        '2026-08-02|2026-08-31': { ...september, totalSales: 0, netProfit: 0 },
      }),
    })
    renderRoute('/reportes')

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-09-01' } })
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-09-30' } })

    const preview = screen.getByRole('region', { name: 'Vista previa · Estado de resultados' })
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
    expect(statementValue('Ventas totales')).toHaveTextContent('$ 48.620.000')
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
    const fetchMock = mockApi()
    const user = userEvent.setup()
    renderRoute('/reportes')

    await user.click(screen.getByRole('radio', { name: 'Excel' }))
    await user.click(screen.getByRole('button', { name: 'Generar reporte' }))

    expect(await screen.findByText('Reporte generado: estado-resultados_2026-10-01_2026-10-19.pdf')).toBeInTheDocument()
    expect(exportCalls(fetchMock)).toEqual([
      '/api/reporting/export?type=ESTADO_RESULTADOS&format=XLSX&desde=2026-10-01&hasta=2026-10-19',
    ])
  })

  it('movimientos: cuenta opcional y accountId solo con una cuenta concreta', async () => {
    const fetchMock = mockApi({ 'GET /api/reporting/export': () => fileResponse('movimientos-cuentas.pdf') })
    const user = userEvent.setup()
    renderRoute('/reportes')

    await user.click(screen.getByRole('radio', { name: /Movimientos de cuentas/ }))
    expect(screen.queryByRole('region', { name: /Vista previa/ })).not.toBeInTheDocument()
    expect(screen.getByText(/de todas las cuentas en el período/)).toBeInTheDocument()
    const account = await screen.findByLabelText('Cuenta')
    expect(account).toHaveValue('')
    expect(within(account).getByRole('option', { name: 'Todas las cuentas' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Generar reporte' }))
    await screen.findByText('Reporte generado: movimientos-cuentas.pdf')

    await user.selectOptions(account, '11')
    expect(screen.getByText(/de Bancolombia en el período, con su saldo inicial y final/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Generar reporte' }))
    await waitFor(() => expect(exportCalls(fetchMock)).toHaveLength(2))

    expect(exportCalls(fetchMock)).toEqual([
      '/api/reporting/export?type=MOVIMIENTOS&format=PDF&desde=2026-10-01&hasta=2026-10-19',
      '/api/reporting/export?type=MOVIMIENTOS&format=PDF&desde=2026-10-01&hasta=2026-10-19&accountId=11',
    ])
  })

  it('un error del backend queda en el Alert sin perder lo digitado', async () => {
    mockApi({
      'GET /api/reporting/export': () =>
        jsonResponse({ error: 'El reporte tiene mas de 20000 movimientos: acota el rango de fechas', status: 400 }, 400),
    })
    const user = userEvent.setup()
    renderRoute('/reportes')

    await user.click(screen.getByRole('radio', { name: /Movimientos de cuentas/ }))
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-01-01' } })
    await user.click(screen.getByRole('button', { name: 'Generar reporte' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos generar el reporte')
    expect(alert).toHaveTextContent('El reporte tiene mas de 20000 movimientos: acota el rango de fechas')
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

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-10-20' } })
    expect(screen.getByText('Hasta no puede ser anterior a Desde.')).toBeInTheDocument()
    expect(button).toBeDisabled()
    expect(screen.queryByRole('region', { name: /Vista previa/ })).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2025-10-18' } })
    expect(screen.getByText('El período no puede pasar de 366 días. Acorta el rango.')).toBeInTheDocument()
    expect(button).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '' } })
    expect(screen.getByText('Elige la fecha de inicio.')).toBeInTheDocument()
    fireEvent.click(button)

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2025-10-19' } })
    expect(button).toBeEnabled()
    expect(exportCalls(fetchMock)).toHaveLength(0)
  })

  it('Ventas y Compras se muestran como Proximamente y no se pueden elegir', async () => {
    mockApi()
    const user = userEvent.setup()
    renderRoute('/reportes')

    for (const name of [/^Ventas/, /^Compras/]) {
      const radio = screen.getByRole('radio', { name })
      expect(radio).toBeDisabled()
      expect(radio.closest('label')).toHaveTextContent('Próximamente')
      await user.click(radio.closest('label')!)
      expect(radio).not.toBeChecked()
    }
    expect(screen.getByRole('radio', { name: /Estado de resultados/ })).toBeChecked()

    // Con teclado, las flechas saltan las opciones deshabilitadas.
    screen.getByRole('radio', { name: /Estado de resultados/ }).focus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('radio', { name: /Movimientos de cuentas/ })).toBeChecked()
  })
})
