import type { ReactNode } from 'react'
import { useOutletContext } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { CirclePause, Clock, FileClock, MailCheck, MailX, Store, Users } from 'lucide-react'
import { useReportedError } from '../api/reportError'
import { DataTable, type Column } from '../components/DataTable'
import { IndicatorCard } from '../components/IndicatorCard'
import { iconMd } from '../components/icons'
import { StatusBadge } from '../components/StatusBadge'
import { ErrorState, Skeleton } from '../components/states'
import type { AppShellContext } from '../layout/AppShell'
import { businessToday } from '../lib/businessDate'
import { formatDate } from '../lib/format'
import {
  fetchPendingRequests,
  fetchPlatformMetrics,
  PLATFORM_QUERY_KEY,
  type PlatformMetrics,
  type PlatformRegistrationRequest,
} from '../platform/platformApi'

/** Solicitudes pendientes que muestra el Resumen; el listado completo es otra pantalla. */
export const PENDING_REQUESTS_LIMIT = 5

/** Un conteo de la respuesta; sin el campo no hay dato (nunca un cero inventado). */
function count(group: Record<string, number> | undefined, key: string): number | undefined {
  const value = group?.[key]
  return typeof value === 'number' ? value : undefined
}

const formatCount = (value: number) => value.toLocaleString('es-CO')

/** Fecha UTC del backend como dia en Bogota (dd/mm/aaaa). */
function requestDate(createdAt: string): string {
  const date = new Date(`${createdAt}Z`)
  return Number.isNaN(date.getTime()) ? formatDate(createdAt) : formatDate(businessToday(date))
}

/** Resumen de plataforma: metricas agregadas, solicitudes pendientes y correos de activacion. */
export function PlatformOverviewPage() {
  const { menuButton } = useOutletContext<AppShellContext>()
  const metrics = useQuery({ queryKey: [PLATFORM_QUERY_KEY, 'metrics'], queryFn: fetchPlatformMetrics })
  useReportedError(metrics.error)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex min-w-0 items-start gap-3">
        {menuButton}
        <div className="min-w-0">
          <h1 className="text-title text-text">Resumen</h1>
          <p className="mt-1 text-small text-text-muted">Servitecas, solicitudes de registro y correos de activación.</p>
        </div>
      </div>

      <MetricCards metrics={metrics.data} error={metrics.isError} onRetry={() => void metrics.refetch()} />

      <div className="grid items-start gap-6 xl:grid-cols-5">
        <div className="min-w-0 xl:col-span-3">
          <PendingRequestsBlock />
        </div>
        <div className="min-w-0 xl:col-span-2">
          <ActivationEmailsBlock metrics={metrics.data} error={metrics.isError} onRetry={() => void metrics.refetch()} />
        </div>
      </div>
    </div>
  )
}

interface MetricsProps {
  metrics: PlatformMetrics | undefined
  error: boolean
  onRetry: () => void
}

function MetricCards({ metrics, error, onRetry }: MetricsProps) {
  // Cada tarjeta resuelve su dato: un conteo ausente es error de esa tarjeta, no cero.
  const card = (value: number | undefined) =>
    error || (metrics && value === undefined) ? { error: true, onRetry } : { value: value === undefined ? undefined : formatCount(value) }
  const active = count(metrics?.users, 'active')
  const inactive = count(metrics?.users, 'inactive')

  return (
    <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4 [&>div]:items-start">
      <IndicatorCard compact label="Servitecas activas" accent="success" icon={Store} {...card(count(metrics?.tenants, 'ACTIVE'))} />
      <IndicatorCard compact label="Servitecas suspendidas" accent="warning" icon={CirclePause} {...card(count(metrics?.tenants, 'SUSPENDED'))} />
      <IndicatorCard compact label="Solicitudes pendientes" accent="brand-strong" icon={FileClock} {...card(count(metrics?.registrationRequests, 'PENDING'))} />
      <IndicatorCard
        compact
        label="Usuarios registrados"
        accent="info"
        icon={Users}
        {...card(count(metrics?.users, 'total'))}
        detail={active !== undefined && inactive !== undefined ? `${formatCount(active)} activos, ${formatCount(inactive)} inactivos` : undefined}
      />
    </div>
  )
}

function Section({ title, subtitle, children, compact }: { title: string; subtitle?: ReactNode; children: ReactNode; compact?: boolean }) {
  return (
    <section className={`min-w-0 rounded-surface border border-border bg-surface ${compact ? 'p-4' : 'h-full p-4 sm:p-6'}`}>
      <div className={compact ? 'mb-3' : 'mb-4'}>
        <h2 className="text-section text-text">{title}</h2>
        {subtitle && <p className="mt-1 text-small text-text-muted">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

const requestColumns: Column<PlatformRegistrationRequest>[] = [
  {
    header: 'Serviteca',
    render: (r) => (
      <span className="flex min-w-0 flex-col">
        <span className="wrap-anywhere">{r.businessName}</span>
        <span className="codigo text-small text-text-muted">{r.slug}</span>
      </span>
    ),
  },
  { header: 'Responsable', render: (r) => <span className="wrap-anywhere">{r.contactName}</span> },
  { header: 'Recibida', render: (r) => requestDate(r.createdAt) },
  { header: 'Estado', render: (r) => <RequestStatus request={r} /> },
]

function RequestStatus({ request }: { request: PlatformRegistrationRequest }) {
  return (
    <span className="flex flex-col items-start gap-1">
      <StatusBadge status="PENDIENTE" />
      {request.reservationExpired && <span className="text-small text-text-muted">Reserva vencida</span>}
    </span>
  )
}

/** La misma fila en tarjeta, bajo md. */
function requestCard(r: PlatformRegistrationRequest) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-body wrap-anywhere text-text">{r.businessName}</span>
        <span className="codigo text-small text-text-muted">{r.slug}</span>
        <span className="text-small text-text-muted">
          {r.contactName} · {requestDate(r.createdAt)}
        </span>
      </span>
      <RequestStatus request={r} />
    </div>
  )
}

function PendingRequestsBlock() {
  const requests = useQuery({
    queryKey: [PLATFORM_QUERY_KEY, 'registration-requests', 'PENDING', PENDING_REQUESTS_LIMIT],
    queryFn: () => fetchPendingRequests(PENDING_REQUESTS_LIMIT),
  })
  useReportedError(requests.error)
  const total = requests.data?.totalElements
  const shown = requests.data?.items.length ?? 0

  let subtitle: string | undefined
  if (total !== undefined && total > 0) {
    subtitle = total > shown
      ? `Las ${shown} más recientes de ${formatCount(total)} pendientes.`
      : `${formatCount(total)} ${total === 1 ? 'pendiente' : 'pendientes'}.`
  }

  return (
    <Section title="Solicitudes por revisar" subtitle={subtitle}>
      <DataTable
        columns={requestColumns}
        rows={requests.data?.items}
        rowKey={(r) => r.id}
        loading={requests.isPending}
        error={requests.isError}
        onRetry={() => void requests.refetch()}
        emptyMessage="No hay solicitudes pendientes."
        skeletonRows={3}
        card={requestCard}
        cardsLabel="Solicitudes por revisar"
      />
    </Section>
  )
}

const emailRows = [
  { key: 'PENDING', label: 'Pendientes', icon: Clock, tone: 'bg-warning-bg text-warning-ink' },
  { key: 'SENT', label: 'Enviados', icon: MailCheck, tone: 'bg-success-bg text-success-ink' },
  { key: 'FAILED', label: 'Fallidos', icon: MailX, tone: 'bg-error-bg text-error-ink' },
] as const

function ActivationEmailsBlock({ metrics, error, onRetry }: MetricsProps) {
  let content: ReactNode
  if (error) {
    content = <ErrorState message="No pudimos cargar los correos de activación." onRetry={onRetry} />
  } else if (!metrics) {
    content = (
      <div className="flex flex-col gap-2" aria-busy>
        {emailRows.map(({ key }) => <Skeleton key={key} className="h-8 w-full" />)}
      </div>
    )
  } else {
    content = (
      <dl className="flex flex-col gap-2">
        {emailRows.map(({ key, label, icon: Icon, tone }) => {
          const value = count(metrics.outboxMessages, key)
          return (
            <div key={key} className="flex items-center justify-between gap-3 py-1">
              <dt className="flex shrink-0 items-center gap-2 text-body text-text">
                <span className={`flex size-8 items-center justify-center rounded-control ${tone}`} aria-hidden>
                  <Icon {...iconMd} />
                </span>
                {label}
              </dt>
              <dd className={`tabular min-w-0 wrap-anywhere text-right text-body font-semibold ${key === 'FAILED' && value ? 'text-error' : 'text-text'}`}>
                {value === undefined ? 'Sin dato' : formatCount(value)}
              </dd>
            </div>
          )
        })}
      </dl>
    )
  }

  return (
    <Section title="Correos de activación" compact>
      {content}
      <p className="mt-3 text-small text-text-muted">
        Enviado significa que el servidor de correo lo aceptó; no garantiza que llegue al buzón.
      </p>
    </Section>
  )
}
