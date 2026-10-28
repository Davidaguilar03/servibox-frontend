import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, ChartNoAxesCombined, Coins, FileDown, FileText, Info, Minus } from 'lucide-react'
import { useOutletContext } from 'react-router'
import { fetchPeriodMovements, type TreasuryMovement } from '../accounts/accountsApi'
import { formatSignedAmount, periodTotals } from '../accounts/accountsView'
import { useReportedError } from '../api/reportError'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { IndicatorCard } from '../components/IndicatorCard'
import { DataTable, type Column } from '../components/DataTable'
import { ListHeader } from '../components/ListHeader'
import { Pagination } from '../components/Pagination'
import { StatusBadge } from '../components/StatusBadge'
import { SegmentedControl } from '../components/SegmentedControl'
import { SelectField } from '../components/SelectField'
import { PeriodPicker } from '../components/PeriodPicker'
import { EmptyState, ErrorState, Skeleton } from '../components/states'
import { showToast } from '../components/toast'
import { GLOSSARY } from '../copy/glossary'
import { fetchAccounts, fetchKpis, type Kpis } from '../dashboard/dashboardApi'
import { apiDownload } from '../lib/api'
import { businessToday } from '../lib/businessDate'
import { formatCurrency, formatDate } from '../lib/format'
import { paginate } from '../lib/pagination'
import type { AppShellContext } from '../layout/AppShell'
import {
  REPORT_OPTIONS,
  exportPath,
  incomeStatementRows,
  periodTitle,
  previousPeriod,
  validateRange,
  variation,
  type ReportFormat,
  type ReportType,
} from '../reports/reports'
import { periodRange, type DateRange } from '../lib/period'
import { iconMd, iconSm } from '../components/icons'

const card = 'rounded-surface border border-t-2 border-border border-t-border-accent bg-surface p-4 sm:p-6'
const focusWithin = 'focus-ring-within'

/** Espera antes de pedir la vista previa de un rango nuevo, para no llamar en cada tecla. */
export const PREVIEW_DEBOUNCE_MS = 400

type ReportPeriod = 'este-mes' | 'mes-anterior' | 'ultimos-30' | 'este-ano' | 'personalizado'

const periodOptions: Array<{ value: ReportPeriod; label: string }> = [
  { value: 'este-mes', label: 'Este mes' },
  { value: 'mes-anterior', label: 'Mes anterior' },
  { value: 'ultimos-30', label: 'Últimos 30 días' },
  { value: 'este-ano', label: 'Este año' },
  { value: 'personalizado', label: 'Personalizado' },
]

const formats: Array<{ value: ReportFormat; label: string }> = [
  { value: 'PDF', label: 'PDF' },
  { value: 'XLSX', label: 'Excel' },
]

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

/** Reportes: el usuario elige tipo, periodo y formato, y descarga el archivo del backend. */
export function ReportsPage() {
  const { menuButton } = useOutletContext<AppShellContext>()
  const [today] = useState(() => businessToday())
  const [type, setType] = useState<ReportType>('ESTADO_RESULTADOS')
  // Por defecto Este mes: del primero del mes a hoy, como antes. Personalizado parte del rango visto.
  const [periodo, setPeriodo] = useState<ReportPeriod>('este-mes')
  const [custom, setCustom] = useState<DateRange>(() => periodRange('este-mes', today))
  const { desde, hasta } = periodo === 'personalizado' ? custom : periodRange(periodo, today)
  const [format, setFormat] = useState<ReportFormat>('PDF')
  const [accountId, setAccountId] = useState('')
  const submitting = useRef(false)

  const { errors, valid } = validateRange(desde, hasta)
  const accounts = useQuery({
    queryKey: ['treasury', 'accounts'],
    queryFn: fetchAccounts,
    enabled: type === 'MOVIMIENTOS',
  })

  const download = useMutation({
    mutationFn: () =>
      apiDownload(
        exportPath({ type, format, desde, hasta, accountId: type === 'MOVIMIENTOS' && accountId ? Number(accountId) : null }),
      ),
    onSuccess: (fileName) => showToast(`Reporte generado: ${fileName}`),
    onSettled: () => {
      submitting.current = false
    },
  })
  const downloadError = useReportedError(download.error)

  function generate() {
    if (submitting.current) return
    if (!valid) {
      // Generar no se deshabilita por errores: el foco va al primer campo con error.
      document.querySelector<HTMLElement>('form [aria-invalid="true"]')?.focus()
      return
    }
    submitting.current = true
    download.mutate()
  }

  // Un error de una generacion anterior no aplica a parametros nuevos.
  function change<T>(setter: (value: T) => void) {
    return (value: T) => {
      if (download.isError) download.reset()
      setter(value)
    }
  }

  function choosePeriod(next: ReportPeriod) {
    if (next === 'personalizado') setCustom({ desde, hasta })
    setPeriodo(next)
  }

  // La vista previa sigue al rango con una espera corta, y solo con un rango valido.
  const previewKey = useDebounced(valid ? `${desde}|${hasta}` : null, PREVIEW_DEBOUNCE_MS)
  const previewReady = valid && previewKey === `${desde}|${hasta}`
  const selectedAccount = accounts.data?.find((account) => String(account.id) === accountId)

  return (
    <div className="@container flex flex-col gap-6">
      <ListHeader leading={menuButton} title="Reportes" subtitle="Tus resultados, listos para consultar y descargar." />

      <div className="grid items-start gap-6 @min-[960px]:grid-cols-[minmax(0,3fr)_minmax(0,5fr)]">
        <form
          className={`${card} flex min-w-0 flex-col gap-5`}
          aria-labelledby="report-form-title"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            generate()
          }}
        >
          <div className="flex items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-control bg-error-bg text-brand-ink" aria-hidden><FileText {...iconMd} /></span>
            <h2 id="report-form-title" className="text-section text-text">Nuevo reporte</h2>
          </div>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-label text-text">Tipo de reporte</legend>
            {REPORT_OPTIONS.map((option) => {
              const checked = type === option.type
              return (
                <label
                  key={option.type}
                  className={`flex cursor-pointer items-start gap-3 rounded-control border p-4 transition-colors duration-(--duration-fast) ${focusWithin} ${
                    checked ? 'border-brand bg-error-bg' : 'border-border bg-surface hover:bg-neutral-100'
                  }`}
                >
                  <input
                    type="radio"
                    name="report-type"
                    value={option.type}
                    checked={checked}
                    onChange={() => change(setType)(option.type)}
                    aria-describedby={`report-${option.type}-description`}
                    className="mt-1 size-4 shrink-0 accent-brand"
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-body font-semibold text-text">{option.title}</span>
                    <span id={`report-${option.type}-description`} className="text-small text-text-muted">
                      {option.description}
                    </span>
                  </span>
                </label>
              )
            })}
          </fieldset>

          <PeriodPicker
            layout="form"
            options={periodOptions}
            value={periodo}
            onChange={change(choosePeriod)}
            range={valid ? { desde, hasta } : null}
            custom={{
              desde: { required: true, value: custom.desde, onChange: (event) => change(setCustom)({ ...custom, desde: event.target.value }) },
              hasta: { required: true, value: custom.hasta, onChange: (event) => change(setCustom)({ ...custom, hasta: event.target.value }) },
              errors,
            }}
          />

          {type === 'MOVIMIENTOS' &&
            (accounts.isError ? (
              <ErrorState message="No pudimos cargar las cuentas." onRetry={() => void accounts.refetch()} />
            ) : accounts.isPending ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <SelectField
                label="Cuenta"
                options={[
                  { value: '', label: 'Todas las cuentas' },
                  ...accounts.data.map((account) => ({ value: String(account.id), label: account.name })),
                ]}
                value={accountId}
                onChange={(event) => change(setAccountId)(event.target.value)}
              />
            ))}

          <div className="flex flex-col gap-2">
            <span id="formato-reporte" className="text-label text-text">
              Formato
            </span>
            <SegmentedControl
              aria-labelledby="formato-reporte"
              options={formats}
              value={format}
              onChange={change(setFormat)}
              className="grid grid-cols-2"
            />
          </div>

          {downloadError && download.isError && (
            <Alert tone="error" title="No pudimos generar el reporte">
              {downloadError}
            </Alert>
          )}

          <Button type="submit" disabled={download.isPending} aria-busy={download.isPending || undefined}>
            <FileDown {...iconMd} aria-hidden />
            {download.isPending ? 'Generando…' : 'Generar reporte'}
          </Button>
          <p className="flex items-start gap-2 text-small text-text-muted">
            <Info {...iconSm} className="mt-1 shrink-0" aria-hidden />
            Las facturas anuladas no se incluyen.
          </p>
        </form>

        {type === 'ESTADO_RESULTADOS' && valid && (
          previewReady ? <IncomeStatementPreview desde={desde} hasta={hasta} /> : <div className={card} role="status">Actualizando vista previa…</div>
        )}
        {type === 'MOVIMIENTOS' && valid && (
          <section className={`${card} flex min-w-0 flex-col gap-4`} aria-labelledby="movements-preview-title">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="movements-preview-title" className="text-section text-text">Vista previa · Movimientos de cuentas</h2>
              <p className="text-small text-text-muted">{periodTitle(desde, hasta)}</p>
            </div>
            <p className="text-body font-semibold text-text">{selectedAccount?.name ?? 'Todas las cuentas'}</p>
            {accounts.isError ? <ErrorState message="No pudimos cargar las cuentas." onRetry={() => void accounts.refetch()} />
              : accounts.isPending ? <Skeleton className="h-16 w-full" />
                : accounts.data.length === 0 ? <EmptyState message="No hay cuentas registradas." />
                  : !previewReady ? <p role="status" className="text-small text-text-muted">Actualizando vista previa…</p>
                    : <MovementsPreview key={`${periodo}|${desde}|${hasta}|${accountId}`} desde={desde} hasta={hasta} accountId={accountId ? Number(accountId) : null} />}
          </section>
        )}
      </div>
    </div>
  )
}

function MovementsPreview({ desde, hasta, accountId }: { desde: string; hasta: string; accountId: number | null }) {
  const [pageNumber, setPageNumber] = useState(1)
  const movements = useQuery({
    queryKey: ['treasury', 'report-movements', desde, hasta, accountId],
    queryFn: () => fetchPeriodMovements(desde, hasta, accountId),
  })
  useReportedError(movements.error)
  // El endpoint entrega el conjunto completo. El archivo ordena por fecha e id ascendentes.
  const rows = [...(movements.data ?? [])].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
  const totals = periodTotals(rows)
  const page = paginate(rows, pageNumber, 10)
  const origins: Record<TreasuryMovement['category'], string> = {
    RECAUDO_VENTA: `${GLOSSARY.collection} de venta`,
    PAGO_COMPRA: `${GLOSSARY.payment} de compra`,
    GASTO_OPERATIVO: 'Gasto operativo',
    INGRESO_OCASIONAL: GLOSSARY.otherIncome,
    TRANSFERENCIA: 'Transferencia',
  }
  const columns: Column<TreasuryMovement>[] = [
    { header: 'Fecha', render: (row) => <span className="whitespace-nowrap">{formatDate(row.date)}</span> },
    ...(accountId === null ? [{ header: 'Cuenta', render: (row: TreasuryMovement) => row.accountName }] : []),
    { header: 'Tipo', render: (row) => <StatusBadge status={row.type} /> },
    { header: 'Concepto / origen', render: (row) => <div className="min-w-0 py-2 wrap-anywhere"><p>{row.concept}</p><p className="text-small text-text-muted">{origins[row.category]}</p></div> },
    { header: 'Importe', align: 'right', render: (row) => <span className={`monto whitespace-nowrap ${row.type === 'EGRESO' ? 'text-error' : 'text-text'}`}>{formatSignedAmount(row)}</span> },
  ]
  return (
    <div className="flex min-w-0 flex-col gap-4" aria-busy={movements.isPending}>
      {movements.isPending && <p role="status" className="text-small text-text-muted">Cargando movimientos…</p>}
      {movements.data && !movements.isError && (
        <>
          <dl className="flex flex-wrap gap-4 rounded-control bg-canvas p-4">
            <div className="min-w-0 flex-1"><dt className="text-small text-text-muted">Ingresos</dt><dd className="monto text-body font-semibold text-text">{formatCurrency(totals.income)}</dd></div>
            <div className="min-w-0 flex-1"><dt className="text-small text-text-muted">Egresos</dt><dd className="monto text-body font-semibold text-text">{formatCurrency(-totals.expense)}</dd></div>
          </dl>
          <p className="text-small text-text-muted">Totales del período completo, incluidas las transferencias internas.</p>
        </>
      )}
      <DataTable
        dense columns={columns} rows={page.rows} rowKey={(row) => row.id}
        loading={movements.isPending} error={movements.isError} onRetry={() => void movements.refetch()}
        emptyMessage="Sin movimientos en el período."
        cardsLabel="Movimientos del reporte"
        card={(row) => <>
          <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-small text-text-muted">{formatDate(row.date)}</span><StatusBadge status={row.type} /></div>
          {accountId === null && <p className="text-small text-text-muted">{row.accountName}</p>}
          <p className="text-body text-text wrap-anywhere">{row.concept}</p>
          <p className="text-small text-text-muted">{origins[row.category]}</p>
          <p className={`monto text-body font-semibold ${row.type === 'EGRESO' ? 'text-error' : 'text-text'}`}>{formatSignedAmount(row)}</p>
        </>}
      />
      {movements.data && !movements.isError && <Pagination page={page} itemLabel="movimientos" rangeSeparator="–" onPageChange={setPageNumber} />}
    </div>
  )
}

function IncomeStatementPreview({ desde, hasta }: { desde: string; hasta: string }) {
  const previous = previousPeriod(desde, hasta)
  const current = useQuery({ queryKey: ['kpis', desde, hasta], queryFn: () => fetchKpis(desde, hasta) })
  const before = useQuery({
    queryKey: ['kpis', previous.desde, previous.hasta],
    queryFn: () => fetchKpis(previous.desde, previous.hasta),
  })

  const trend = (pick: (kpis: Kpis) => number) => {
    if (before.isError || !current.data) return undefined
    if (before.isPending) return <Skeleton className="h-4 w-40" />
    return <Variation value={variation(pick(current.data), pick(before.data))} />
  }

  return (
    <section className={`${card} flex min-w-0 flex-col gap-4`} aria-labelledby="preview-title" aria-busy={current.isPending}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="preview-title" className="text-section text-text">
          Vista previa · Estado de resultados
        </h2>
        <p className="text-small text-text-muted">{periodTitle(desde, hasta)}</p>
      </div>

      {current.isError ? (
        <ErrorState message="No pudimos cargar la vista previa." onRetry={() => void current.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-4">
            <IndicatorCard
              compact icon={ChartNoAxesCombined} accent="success"
              label="Ventas sin IVA"
              value={current.data ? formatCurrency(current.data.netSales) : undefined}
              trend={trend((kpis) => kpis.netSales)}
            />
            <IndicatorCard
              compact icon={Coins} negative={current.data ? current.data.netProfit < 0 : undefined}
              label="Utilidad neta"
              value={current.data ? formatCurrency(current.data.netProfit) : undefined}
              trend={trend((kpis) => kpis.netProfit)}
            />
          </div>

          {before.isError && current.data && (
            <p role="status" className="flex flex-wrap items-center gap-2 text-small text-text-muted">
              No pudimos cargar el período anterior: la vista previa se muestra sin variación.
              <Button variant="text" onClick={() => void before.refetch()}>
                Reintentar
              </Button>
            </p>
          )}

          {current.data ? (
            <>
              {incomeStatementRows(current.data).every((row) => row.value === 0) && <p role="status" className="text-small text-text-muted">Sin actividad en el período.</p>}
              <StatementTable kpis={current.data} />
              <p className="flex items-start gap-2 text-small text-text-muted"><Info {...iconSm} className="mt-1 shrink-0" aria-hidden />Utilidad neta = utilidad bruta + otros ingresos - gastos operativos.</p>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-8 w-full" />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}

/** Flecha y texto: el color nunca es el unico indicador. */
function Variation({ value }: { value: number | null }) {
  if (value === null) return <span className="text-text-muted">Sin datos del período anterior</span>
  const Icon = value > 0 ? ArrowUp : value < 0 ? ArrowDown : Minus
  const tone = value > 0 ? 'text-success-ink' : value < 0 ? 'text-error' : 'text-text-muted'
  const direction = value > 0 ? 'Subió' : value < 0 ? 'Bajó' : 'Sin cambio,'
  return (
    <span className="flex items-center gap-1 text-text-muted">
      <Icon {...iconSm} className={`shrink-0 ${tone}`} aria-hidden />
      <span className="sr-only">{direction} </span>
      <span className={`tabular font-semibold ${tone}`}>{Math.abs(value)}%</span>
      <span>vs. período anterior</span>
    </span>
  )
}

function StatementTable({ kpis }: { kpis: Kpis }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th scope="col" className="rounded-l-control bg-canvas px-3 py-3 text-left text-label text-text-muted uppercase">
            Concepto
          </th>
          <th scope="col" className="rounded-r-control bg-canvas px-3 py-3 text-right text-label text-text-muted uppercase">
            Valor
          </th>
        </tr>
      </thead>
      <tbody>
        {incomeStatementRows(kpis).map((row) => {
          const negative = row.value < 0
          const rowClass = row.total
            ? negative
              ? 'bg-error-bg font-semibold text-error-ink'
              : 'bg-success-bg font-semibold text-success-ink'
            : row.concept === 'Utilidad bruta' ? 'border-b border-border bg-canvas font-semibold' : 'border-b border-border'
          const valueClass = row.total ? '' : negative ? 'text-error' : 'text-text'
          return (
            <tr key={row.concept} className={`h-row ${rowClass}`}>
              <th scope="row" className={`px-3 py-3 text-left text-body ${row.total || row.concept === 'Utilidad bruta' ? 'font-semibold' : 'font-normal text-text'}`}>
                {row.concept}
              </th>
              <td className={`monto px-3 text-right text-body whitespace-nowrap ${valueClass}`}>
                {formatCurrency(row.value)}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
