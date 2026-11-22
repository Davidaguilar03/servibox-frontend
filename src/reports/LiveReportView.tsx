import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { FileDown } from 'lucide-react'
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
import { iconMd } from '../components/icons'
import { CUSTOMERS_KEY } from '../counterparties/counterpartiesApi'
import { CATEGORIES_KEY, PRODUCTS_KEY, fetchInventoryCategories, fetchInventoryProducts } from '../inventory/inventoryApi'
import { SUPPLIERS_KEY, fetchSuppliers } from '../purchases/purchasesApi'
import { fetchCustomers, type Counterparty } from '../sales/salesApi'
import { apiDownload, apiFetch } from '../lib/api'
import { businessToday } from '../lib/businessDate'
import { formatCurrency, formatDate, formatInteger, formatPercent } from '../lib/format'
import { rangeLabel } from '../lib/period'
import { useUrlTextParam } from '../lib/useUrlTextParam'
import { validateRange, type ReportFormat } from './reports'
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

  const report = useQuery({
    queryKey: ['reporting', 'live', definition.key, queryString],
    queryFn: () => apiFetch<LiveReportResponse>(reportPath(definition, apiParams!)),
    enabled: apiParams !== null,
  })
  const reportError = useReportedError(report.error)

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
    if (spec.control === 'category') {
      return (
        <SelectField
          key={key}
          label={spec.label}
          options={[{ value: '', label: spec.allLabel }, ...(categories.data ?? []).map((category) => ({ value: String(category.id), label: category.name }))]}
          value={categories.data ? value : ''}
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
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-4" aria-busy={report.isPending || undefined}>
            {definition.indicators.map((indicator) => (
              <IndicatorCard
                compact
                key={indicator.key}
                label={indicator.label}
                value={data ? indicatorValue(indicator, data.summary[indicator.key]) : undefined}
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
              <ReportChart spec={definition.chart} series={data.series} />
              <ReportTable key={queryString} definition={definition} rows={data.rows} />
            </>
          )}
        </>
      )}
    </div>
  )
}
