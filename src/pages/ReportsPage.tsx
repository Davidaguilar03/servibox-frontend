import { Navigate, useOutletContext, useSearchParams } from 'react-router'
import { ListHeader } from '../components/ListHeader'
import { TabList } from '../components/SegmentedControl'
import type { AppShellContext } from '../layout/AppShell'
import { DEFAULT_REPORT, REPORT_GROUPS, liveReport, reportGroup, type LiveReportKey } from '../reports/liveReports'
import { LiveReportView } from '../reports/LiveReportView'

/** Pestana retirada el 2026-11-21: sus descargas viven en Estado de resultados y Movimientos. */
const RETIRED_FILES_TAB = 'archivos'
const PERIOD_PARAMS = ['periodo', 'desde', 'hasta']

/** El periodo de la URL actual con otro reporte. */
function withPeriod(params: URLSearchParams, report: LiveReportKey): URLSearchParams {
  const next = new URLSearchParams()
  if (report !== DEFAULT_REPORT) next.set('reporte', report)
  for (const key of PERIOD_PARAMS) {
    const value = params.get(key)
    if (value) next.set(key, value)
  }
  return next
}

/**
 * Reportes: las areas (Ventas y cartera, Compras y proveedores, Inventario, Finanzas) en una
 * fila de pestanas y, si el area tiene varios, sus reportes en otra. El reporte va en la URL.
 */
export function ReportsPage() {
  const { menuButton } = useOutletContext<AppShellContext>()
  const [params, setParams] = useSearchParams()
  const requested = params.get('reporte')

  if (requested === RETIRED_FILES_TAB) {
    return <Navigate replace to={{ search: `?${withPeriod(params, 'estado-resultados').toString()}` }} />
  }

  const definition = liveReport(requested) ?? liveReport(DEFAULT_REPORT)!
  const group = reportGroup(definition.key)
  // Cambiar de reporte conserva el periodo; los demas filtros son de cada reporte.
  const choose = (report: LiveReportKey) => setParams(withPeriod(params, report))

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <ListHeader leading={menuButton} title="Reportes" subtitle="Consulta tus reportes en pantalla y descárgalos en PDF o Excel." />
      <div className="flex min-w-0 flex-col gap-2">
        <TabList
          aria-label="Área del reporte"
          options={REPORT_GROUPS.map((item) => ({ value: item.key, label: item.label }))}
          value={group.key}
          onChange={(key) => choose(REPORT_GROUPS.find((item) => item.key === key)!.reports[0]!)}
          tabId={(key) => `area-${key}`}
          variant="pill"
          centerSelected
        />
        {group.reports.length > 1 && (
          <TabList
            aria-label={`Reportes de ${group.label}`}
            options={group.reports.map((key) => ({ value: key, label: liveReport(key)!.title }))}
            value={definition.key}
            onChange={choose}
            tabId={(key) => `reporte-${key}`}
            panelId={() => 'panel-reporte'}
            variant="subtle"
            centerSelected
          />
        )}
      </div>
      <div
        role="tabpanel"
        id="panel-reporte"
        aria-labelledby={group.reports.length > 1 ? `reporte-${definition.key}` : `area-${group.key}`}
        className="min-w-0"
      >
        <LiveReportView key={definition.key} definition={definition} />
      </div>
    </div>
  )
}
