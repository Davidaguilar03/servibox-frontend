import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { FileDown, Info } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { useReportedError } from '../api/reportError'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { ComboboxField, type ComboboxOption } from '../components/ComboboxField'
import { FilterBar } from '../components/FilterBar'
import { IndicatorCard } from '../components/IndicatorCard'
import { PeriodPicker } from '../components/PeriodPicker'
import { SelectField } from '../components/SelectField'
import { EmptyState, ErrorState, Skeleton } from '../components/states'
import { showToast } from '../components/toast'
import { iconMd, iconSm } from '../components/icons'
import { CUSTOMERS_KEY } from '../counterparties/counterpartiesApi'
import { fetchAccounts } from '../dashboard/dashboardApi'
import { CATEGORIES_KEY, PRODUCTS_KEY, fetchInventoryCategories, fetchInventoryProducts } from '../inventory/inventoryApi'
import { SUPPLIERS_KEY, fetchSuppliers } from '../purchases/purchasesApi'
import { fetchCustomers, type Counterparty } from '../sales/salesApi'
import { apiDownload, apiFetch } from '../lib/api'
import { businessToday } from '../lib/businessDate'
import { formatCurrency, formatDate, formatInteger, formatPercent } from '../lib/format'
import { rangeLabel } from '../lib/period'
import { useUrlTextParam } from '../lib/useUrlTextParam'
import { periodTitle, previousPeriod, validateRange, variation, type ReportFormat } from './reports'
import { Variation } from './Variation'
import {
  FILTERS,
  REPORT_PERIOD_OPTIONS,
  parseReportState,
  reportApiParams,
  reportExportPath,
  reportPath,
  reportRange,
  reportStateParams,
  type FilterKey,
  type LiveReportDefinition,
  type LiveReportResponse,
  type LiveReportState,
  type ReportIndicator,
} from './liveReports'
import { ReportChart } from './ReportChart'
import { ReportTable } from './ReportTable'

export const EMPTY_REPORT_MESSAGE = 'No hay datos para este período y filtros.'

function indicatorValue(indicator: ReportIndicator, value: number | undefined): string {
  if (indicator.format === 'currency') return formatCurrency(value)
  if (indicator.format === 'percent') return formatPercent(value)
  return formatInteger(value)
}

/**
 * Columnas de los indicadores segun cuantos hay (3 a 8): una en movil, dos desde sm y tres o cuatro
 * en escritorio, elegidas para llenar las filas (5 y 6 en tres, 4, 7 y 8 en cuatro).
 */
function indicatorGrid(count: number): string {
  if (count === 4 || count >= 7) return 'sm:grid-cols-2 xl:grid-cols-4'
  return 'sm:grid-cols-2 lg:grid-cols-3'
}

/** Con un numero impar, la ultima tarjeta ocupa la fila entera mientras hay dos columnas. */
function lastIndicatorSpan(count: number): string | undefined {
  if (count % 2 === 0) return undefined
  return count === 7 ? 'sm:max-xl:col-span-2' : 'sm:max-lg:col-span-2'
}

function counterpartyOptions(list: Counterparty[] | undefined, allLabel: string): ComboboxOption[] {
  return [
    { value: 0, label: allLabel },
    ...(list ?? []).map((item) => ({ value: item.id, label: item.name, detail: `${item.documentType} ${item.documentNumber}`, keywords: item.documentNumber })),
  ]
}

/** Un reporte en vivo armado desde su definicion: filtros, indicadores, grafica y tabla. */
export function LiveReportView({ definition }: { definition: LiveReportDefinition }) {
  const [params, setParams] = useSearchParams()
  const [today] = useState(() => businessToday())
  const state = parseReportState(definition, params)

  function write(next: LiveReportState, replace = false) {
    setParams(reportStateParams(definition, next), { replace })
  }
  const setFilter = (key: FilterKey, value: string) => write({ ...state, filters: { ...state.filters, [key]: value } })
  const desdeField = useUrlTextParam(state.desde, (desde) => write({ ...state, desde }, true))
  const hastaField = useUrlTextParam(state.hasta, (hasta) => write({ ...state, hasta }, true))
  const viewState = { ...state, desde: desdeField.value, hasta: hastaField.value }
  const range = reportRange(viewState, today)
  const { errors, valid } = validateRange(range.desde, range.hasta)
  const apiParams = reportApiParams(definition, viewState, today)
  const queryString = apiParams?.toString() ?? null

  const uses = (control: string) => definition.filters.some((key) => FILTERS[key].control === control)
  const customers = useQuery({ queryKey: CUSTOMERS_KEY, queryFn: fetchCustomers, enabled: uses('customer') })
  const suppliers = useQuery({ queryKey: SUPPLIERS_KEY, queryFn: fetchSuppliers, enabled: uses('supplier') })
  const items = useQuery({ queryKey: PRODUCTS_KEY, queryFn: fetchInventoryProducts, enabled: uses('item') })
  const categories = useQuery({ queryKey: CATEGORIES_KEY, queryFn: fetchInventoryCategories, enabled: uses('category') })
  const accounts = useQuery({ queryKey: ['treasury', 'accounts'], queryFn: fetchAccounts, enabled: uses('account') })

  const report = useQuery({
    queryKey: ['reporting', 'live', definition.key, queryString],
    queryFn: () => apiFetch<LiveReportResponse>(reportPath(definition, apiParams!)),
    enabled: apiParams !== null,
  })
  const reportError = useReportedError(report.error)

  // Periodo anterior de igual duracion, con los mismos filtros. Si falla, el reporte sigue sin variacion.
  const previous = definition.compareWithPrevious && apiParams ? previousPeriod(range.desde, range.hasta) : null
  const previousParams = previous && apiParams ? new URLSearchParams(apiParams) : null
  previousParams?.set('desde', previous!.desde)
  previousParams?.set('hasta', previous!.hasta)
  const previousQuery = previousParams?.toString() ?? null
  const before = useQuery({
    queryKey: ['reporting', 'live', definition.key, previousQuery],
    queryFn: () => apiFetch<LiveReportResponse>(reportPath(definition, previousParams!)),
    enabled: previousQuery !== null,
  })
  // "octubre de 2026" para un mes completo; si no, "11/10/2026 a 31/10/2026".
  const previousTitle = previous ? periodTitle(previous.desde, previous.hasta) : ''
  const comparedLabel = previousTitle.charAt(0).toLowerCase() + previousTitle.slice(1)
  function trend(indicator: ReportIndicator) {
    const data = report.data
    if (!data || !before.data || before.isError) return undefined
    const change = variation(data.summary[indicator.key] ?? 0, before.data.summary[indicator.key] ?? 0)
    return change === null ? undefined : <Variation value={change} label={comparedLabel} lowerIsBetter={indicator.lowerIsBetter} />
  }

  const download = useMutation({
    mutationFn: (format: ReportFormat) => apiDownload(reportExportPath(definition, format, apiParams!)),
    onSuccess: (fileName) => showToast(`Reporte descargado: ${fileName}`),
  })
  const downloadError = useReportedError(download.error)

  const active = (definition.period && state.periodo !== 'este-mes') || Object.values(state.filters).some(Boolean)

  function control(key: FilterKey) {
    const spec = FILTERS[key]
    const value = state.filters[key] ?? ''
    if (spec.control === 'select') {
      return (
        <SelectField
          key={key}
          label={spec.label}
          options={[{ value: '', label: spec.allLabel }, ...(spec.options ?? [])]}
          value={value}
          onChange={(event) => setFilter(key, event.target.value)}
        />
      )
    }
    if (spec.control === 'category' || spec.control === 'account') {
      const list = spec.control === 'category' ? categories.data : accounts.data
      return (
        <SelectField
          key={key}
          label={spec.label}
          options={[{ value: '', label: spec.allLabel }, ...(list ?? []).map((item) => ({ value: String(item.id), label: item.name }))]}
          value={list ? value : ''}
          onChange={(event) => setFilter(key, event.target.value)}
        />
      )
    }
    const tipo = state.filters.tipo
    const options = spec.control === 'customer'
      ? counterpartyOptions(customers.data, spec.allLabel)
      : spec.control === 'supplier'
        ? counterpartyOptions(suppliers.data, spec.allLabel)
        : [
            { value: 0, label: spec.allLabel },
            ...(items.data ?? []).filter((item) => !tipo || item.itemType === tipo)
              .map((item) => ({ value: item.id, label: item.description, detail: item.code, keywords: item.code })),
          ]
    return (
      <ComboboxField
        key={key}
        label={spec.label}
        options={options}
        value={value ? Number(value) : 0}
        onChange={(id) => setFilter(key, id === 0 ? '' : String(id))}
        placeholder="Busca por nombre o código"
      />
    )
  }

  const filterControls = [
    ...(definition.period
      ? [
          <PeriodPicker
            key="periodo"
            layout="form"
            options={REPORT_PERIOD_OPTIONS}
            value={state.periodo}
            onChange={(periodo) => write(periodo === 'personalizado' ? { ...state, periodo, ...range } : { ...state, periodo, desde: '', hasta: '' })}
            range={valid ? range : null}
            custom={{ desde: desdeField, hasta: hastaField, errors }}
          />,
        ]
      : []),
    ...definition.filters.map(control),
  ]

  const data = report.data
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <FilterBar active={active} onClear={() => write({ periodo: 'este-mes', desde: '', hasta: '', filters: {} })}>
        {filterControls}
      </FilterBar>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-body text-text">{definition.description}</p>
          <p className="mt-1 text-small text-text-muted">
            {definition.period
              ? valid ? `Período: ${rangeLabel(range)}` : 'Elige un período válido.'
              : `Corte al ${formatDate(data?.corte ?? today)}`}
          </p>
          {definition.notes?.(state.filters).map((note) => (
            <p key={note} className="mt-1 flex items-start gap-2 text-small text-text-muted">
              <Info {...iconSm} className="mt-1 shrink-0" aria-hidden />
              {note}
            </p>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          {(['PDF', 'XLSX'] as const).map((format) => (
            <Button
              key={format}
              variant="secondary"
              disabled={apiParams === null || download.isPending}
              aria-busy={(download.isPending && download.variables === format) || undefined}
              onClick={() => download.mutate(format)}
            >
              <FileDown {...iconMd} aria-hidden />
              {download.isPending && download.variables === format ? 'Descargando…' : format === 'PDF' ? 'Descargar PDF' : 'Descargar Excel'}
            </Button>
          ))}
        </div>
      </div>

      {downloadError && download.isError && (
        <Alert tone="error" title="No pudimos descargar el reporte">
          {downloadError}
        </Alert>
      )}

      {apiParams === null ? null : report.isError ? (
        <div className="rounded-surface border border-border bg-surface">
          <ErrorState message={reportError ?? 'No pudimos cargar el reporte.'} onRetry={() => void report.refetch()} />
        </div>
      ) : (
        <>
          <div className={`grid gap-4 ${indicatorGrid(definition.indicators.length)}`} aria-busy={report.isPending || undefined}>
            {definition.indicators.map((indicator, index) => (
              <IndicatorCard
                dense
                key={indicator.key}
                label={indicator.label}
                icon={indicator.icon}
                accent={indicator.accent}
                value={data ? indicatorValue(indicator, data.summary[indicator.key]) : undefined}
                negative={indicator.signed && data ? (data.summary[indicator.key] ?? 0) < 0 : undefined}
                note={indicator.detail && data ? `${indicator.detail.label}: ${formatPercent(data.summary[indicator.detail.key])}` : undefined}
                detail={indicator.description}
                trend={trend(indicator)}
                className={index === definition.indicators.length - 1 ? lastIndicatorSpan(definition.indicators.length) : undefined}
              />
            ))}
          </div>
          {!data ? (
            <div className="flex flex-col gap-3" role="status" aria-label="Cargando reporte">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : data.rows.length === 0 ? (
            <div className="rounded-surface border border-border bg-surface">
              <EmptyState message={EMPTY_REPORT_MESSAGE} />
            </div>
          ) : (
            <>
              <ReportChart spec={definition.chart} points={definition.chart.points ? definition.chart.points(data) : data.series} />
              <ReportTable key={queryString} definition={definition} rows={data.rows} />
            </>
          )}
        </>
      )}
    </div>
  )
}
