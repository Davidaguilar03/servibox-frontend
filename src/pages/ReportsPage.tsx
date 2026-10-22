import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, FileDown, Minus } from 'lucide-react'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { IndicatorCard } from '../components/IndicatorCard'
import { SelectField } from '../components/SelectField'
import { TextField } from '../components/TextField'
import { ErrorState, Skeleton } from '../components/states'
import { showToast } from '../components/toast'
import { fetchAccounts, fetchKpis, type Kpis } from '../dashboard/dashboardApi'
import { apiDownload } from '../lib/api'
import { errorMessage } from '../lib/errorMessage'
import { formatCurrency } from '../lib/format'
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
import { businessToday, monthRange } from '../sales/salesList'

const card = 'rounded-card border border-border bg-surface p-6 shadow-card'
const focusWithin = 'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand'

/** Espera antes de pedir la vista previa de un rango nuevo, para no llamar en cada tecla. */
export const PREVIEW_DEBOUNCE_MS = 400

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
  const [initial] = useState(() => monthRange(businessToday()))
  const [type, setType] = useState<ReportType>('ESTADO_RESULTADOS')
  const [desde, setDesde] = useState(initial.desde)
  const [hasta, setHasta] = useState(initial.hasta)
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

  function generate() {
    if (!valid || submitting.current) return
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

  // La vista previa sigue al rango con una espera corta, y solo con un rango valido.
  const previewKey = useDebounced(valid ? `${desde}|${hasta}` : null, PREVIEW_DEBOUNCE_MS)
  const [previewDesde = '', previewHasta = ''] = valid && previewKey ? previewKey.split('|') : []
  const selectedAccount = accounts.data?.find((account) => String(account.id) === accountId)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h1 text-text">Reportes</h1>
        <p className="mt-1 text-small text-text-muted">
          Genera reportes del período en PDF o Excel. Las facturas anuladas no se incluyen.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <form
          className={`${card} flex min-w-0 flex-col gap-5`}
          aria-labelledby="report-form-title"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            generate()
          }}
        >
          <h2 id="report-form-title" className="text-h3 text-text">
            Nuevo reporte
          </h2>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-small font-medium text-text">Tipo de reporte</legend>
            {REPORT_OPTIONS.map((option) => {
              const checked = type === option.type
              return (
                <label
                  key={option.type}
                  className={`flex items-start gap-3 rounded-control border p-4 transition-colors duration-(--duration-fast) ${focusWithin} ${
                    !option.available
                      ? 'cursor-not-allowed border-border bg-neutral-100'
                      : checked
                        ? 'cursor-pointer border-brand bg-error-bg'
                        : 'cursor-pointer border-border bg-surface hover:bg-neutral-100'
                  }`}
                >
                  <input
                    type="radio"
                    name="report-type"
                    value={option.type}
                    checked={checked}
                    disabled={!option.available}
                    onChange={() => change(setType)(option.type)}
                    aria-describedby={`report-${option.type}-description`}
                    className="mt-1 size-4 shrink-0 accent-brand disabled:cursor-not-allowed"
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={`text-body font-medium ${option.available ? 'text-text' : 'text-text-muted'}`}>
                        {option.title}
                      </span>
                      {!option.available && (
                        <span className="rounded-tag bg-neutral-200 px-2 py-0.5 text-label text-text-muted">Próximamente</span>
                      )}
                    </span>
                    <span id={`report-${option.type}-description`} className="text-small text-text-muted">
                      {option.description}
                    </span>
                  </span>
                </label>
              )
            })}
          </fieldset>

          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="Desde"
              type="date"
              required
              value={desde}
              onChange={(event) => change(setDesde)(event.target.value)}
              error={errors.desde}
            />
            <TextField
              label="Hasta"
              type="date"
              required
              value={hasta}
              onChange={(event) => change(setHasta)(event.target.value)}
              error={errors.hasta}
            />
          </div>

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

          <fieldset>
            <legend className="mb-2 text-small font-medium text-text">Formato</legend>
            <div className="grid grid-cols-2 gap-1 rounded-control border border-border bg-surface p-1">
              {formats.map((option) => (
                <label
                  key={option.value}
                  className={`flex min-h-touch cursor-pointer items-center justify-center rounded-tag text-button transition-colors duration-(--duration-fast) ${focusWithin} ${
                    format === option.value ? 'bg-dark text-text-inverse' : 'text-text hover:bg-neutral-100'
                  }`}
                >
                  <input
                    type="radio"
                    name="report-format"
                    value={option.value}
                    checked={format === option.value}
                    onChange={() => change(setFormat)(option.value)}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          {download.isError && (
            <Alert tone="error" title="No pudimos generar el reporte">
              {errorMessage(download.error)}
            </Alert>
          )}

          <Button type="submit" disabled={!valid || download.isPending} aria-busy={download.isPending || undefined}>
            {download.isPending ? 'Generando…' : 'Generar reporte'}
          </Button>
        </form>

        {type === 'ESTADO_RESULTADOS' && valid && previewKey && (
          <IncomeStatementPreview desde={previewDesde} hasta={previewHasta} />
        )}
        {type === 'MOVIMIENTOS' && (
          <section className={card} aria-labelledby="movements-info-title">
            <div className="flex items-center gap-3">
              <FileDown size={20} strokeWidth={1.5} className="shrink-0 text-text-muted" aria-hidden />
              <h2 id="movements-info-title" className="text-h3 text-text">
                Movimientos de cuentas
              </h2>
            </div>
            <p className="mt-3 text-body text-text-muted">
              {selectedAccount
                ? `Se descargará un archivo con los ingresos y egresos de ${selectedAccount.name} en el período, con su saldo inicial y final.`
                : 'Se descargará un archivo con los ingresos y egresos de todas las cuentas en el período, con sus totales.'}{' '}
              Este reporte no tiene vista previa.
            </p>
          </section>
        )}
      </div>
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
        <h2 id="preview-title" className="text-h3 text-text">
          Vista previa · Estado de resultados
        </h2>
        <p className="text-small text-text-muted">{periodTitle(desde, hasta)}</p>
      </div>

      {current.isError ? (
        <ErrorState message="No pudimos cargar la vista previa." onRetry={() => void current.refetch()} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <IndicatorCard
              label="Ventas totales"
              value={current.data ? formatCurrency(current.data.totalSales) : undefined}
              trend={trend((kpis) => kpis.totalSales)}
            />
            <IndicatorCard
              label="Utilidad neta"
              value={current.data ? formatCurrency(current.data.netProfit) : undefined}
              trend={trend((kpis) => kpis.netProfit)}
            />
          </div>

          {before.isError && current.data && (
            <p role="status" className="flex flex-wrap items-center gap-2 text-small text-text-muted">
              No pudimos cargar el período anterior: la vista previa se muestra sin variación.
              <Button variant="text" className="h-auto px-2 py-1" onClick={() => void before.refetch()}>
                Reintentar
              </Button>
            </p>
          )}

          {current.data ? (
            <StatementTable kpis={current.data} />
          ) : (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }, (_, index) => (
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
  const tone = value > 0 ? 'text-success' : value < 0 ? 'text-error' : 'text-text-muted'
  const direction = value > 0 ? 'Subió' : value < 0 ? 'Bajó' : 'Sin cambio,'
  return (
    <span className="flex items-center gap-1 text-text-muted">
      <Icon size={14} strokeWidth={2} className={`shrink-0 ${tone}`} aria-hidden />
      <span className="sr-only">{direction} </span>
      <span className={`tabular font-medium ${tone}`}>{Math.abs(value)}%</span>
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
          const negative = Math.round(row.value) < 0
          const rowClass = row.total
            ? negative
              ? 'bg-error-bg font-semibold text-error'
              : 'bg-success-bg font-semibold text-success'
            : 'border-b border-border even:bg-row-alt'
          const valueClass = row.total ? '' : negative ? 'text-error' : 'text-text'
          return (
            <tr key={row.concept} className={`h-row ${rowClass}`}>
              <th scope="row" className={`px-3 text-left text-small ${row.total ? 'font-semibold' : 'font-normal text-text'}`}>
                {row.concept}
              </th>
              <td className={`tabular px-3 text-right text-small whitespace-nowrap ${valueClass}`}>
                {formatCurrency(row.value)}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
