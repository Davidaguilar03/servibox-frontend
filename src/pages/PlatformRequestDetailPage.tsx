import { useRef, useState } from 'react'
import { Link, useOutletContext, useParams, useSearchParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useReportedError } from '../api/reportError'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { buttonClasses } from '../components/buttonStyles'
import { DiscardableModal } from '../components/DiscardableModal'
import { ErrorSummary } from '../components/ErrorSummary'
import { ListHeader } from '../components/ListHeader'
import { StatusBadge } from '../components/StatusBadge'
import { TextField } from '../components/TextField'
import { EmptyState, ErrorState, Skeleton } from '../components/states'
import { showToast } from '../components/toast'
import type { AppShellContext } from '../layout/AppShell'
import { ApiError } from '../lib/api'
import { EMPTY_VALUE, formatPlatformDate } from '../lib/format'
import { fetchRegistrationRequest, PLATFORM_QUERY_KEY, PLATFORM_REQUESTS_KEY, reviewRegistrationRequest, type PlatformRegistrationRequest, type RegistrationAction } from '../platform/platformApi'

const actionTitles: Record<RegistrationAction, string> = { approve: 'Aprobar y enviar enlace', reject: 'Rechazar solicitud', 'resend-activation': 'Reenviar activación' }

function allowed(request: PlatformRegistrationRequest, action: RegistrationAction) {
  if (action === 'reject') return request.status === 'PENDING'
  return !request.reservationExpired && new Date(`${request.reservationExpiresAt}Z`).getTime() > Date.now()
    && request.status === (action === 'approve' ? 'PENDING' : 'APPROVED')
}

export function PlatformRequestDetailPage() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const { menuButton } = useOutletContext<AppShellContext>()
  const [target, setTarget] = useState<{ request: PlatformRegistrationRequest; action: RegistrationAction } | null>(null)
  const detail = useQuery({ queryKey: [...PLATFORM_REQUESTS_KEY, 'detail', id], queryFn: () => fetchRegistrationRequest(id), retry: false })
  const missing = detail.error instanceof ApiError && detail.error.status === 404
  const error = useReportedError(missing ? null : detail.error)
  const request = detail.data
  const back = `/plataforma/solicitudes${params.size ? `?${params}` : ''}`

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <ListHeader leading={menuButton} title="Detalle de solicitud" secondary={[<Link key="back" to={back} className={buttonClasses('secondary')} data-variant="secondary">Volver a solicitudes</Link>]} />
      {missing ? <EmptyState message="Solicitud no encontrada. Puede que ya no exista." action={{ label: 'Volver a solicitudes', to: back }} />
        : detail.isError ? <ErrorState message={error ?? 'No pudimos cargar la solicitud.'} onRetry={() => void detail.refetch()} />
          : !request ? <div aria-busy="true" aria-label="Cargando solicitud"><Skeleton className="h-40 w-full" /></div>
            : <>
              <section className="min-w-0 rounded-surface border border-border bg-surface p-4 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="min-w-0 wrap-anywhere text-section text-text">{request.businessName}</h2>
                  <StatusBadge status={request.status === 'PENDING' ? 'PENDIENTE' : request.status} />
                </div>
                <dl className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
                  {[
                    ['Código solicitado', request.slug], ['NIT', request.nit], ['Responsable', request.contactName],
                    ['Correo', request.contactEmail], ['Teléfono', request.phone], ['Recibida', formatPlatformDate(request.createdAt)],
                    ['Revisada', formatPlatformDate(request.reviewedAt)],
                    ['Reserva hasta', formatPlatformDate(request.reservationExpiresAt)],
                    ['Reserva', request.status === 'PENDING' || request.status === 'APPROVED' ? request.reservationExpired ? 'Vencida' : 'Vigente al consultar' : 'Liberada'],
                    ...(request.rejectionReason ? [['Motivo del rechazo', request.rejectionReason]] : []),
                  ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-small text-text-muted">{label}</dt><dd className={`mt-1 wrap-anywhere text-body text-text ${label === 'NIT' || label === 'Código solicitado' ? 'codigo' : ''}`}>{value ?? EMPTY_VALUE}</dd></div>)}
                </dl>
                <p className="mt-4 text-small text-text-muted">Fechas y horas de Bogotá. La fecha de reserva no indica el vencimiento del enlace de activación.</p>
              </section>
              <section className="min-w-0 rounded-surface border border-border bg-surface p-4 sm:p-6">
                <h2 className="text-section text-text">Coincidencias</h2>
                <p className="mt-2 text-small text-text-muted">Son datos para revisar, no una prueba automática de duplicidad ni un bloqueo.</p>
                {request.matches ? <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                  {[
                    ['Otras solicitudes con el mismo NIT', request.matches.requestsWithSameNit],
                    ['Otras solicitudes con el mismo correo', request.matches.requestsWithSameEmail],
                    ['Servitecas con el mismo NIT', request.matches.tenantsWithSameNit],
                  ].map(([label, value]) => <div key={label}><dt className="text-small text-text-muted">{label}</dt><dd className="tabular mt-1 text-body text-text">{typeof value === 'number' ? value.toLocaleString('es-CO') : value}</dd></div>)}
                </dl> : <p className="mt-4 text-body text-text-muted">Sin datos de coincidencias.</p>}
              </section>
              <section className="rounded-surface border border-border bg-surface p-4 sm:p-6">
                <h2 className="text-section text-text">Revisión de la solicitud</h2>
                <p className="mt-2 text-body text-text-muted">Aprobar encola el correo con el enlace. La serviteca se crea cuando el responsable completa la activación; aprobar no inicia una sesión.</p>
                {request.reservationExpired && <p className="mt-3 text-small text-warning-ink">Reserva vencida. No se puede aprobar ni reenviar la activación.</p>}
                <div className="mt-4 flex flex-wrap gap-3">
                  {(['reject', 'approve', 'resend-activation'] as const).filter((action) => allowed(request, action)).map((action) => <Button key={action} variant={action === 'reject' ? 'secondary' : 'primary'} onClick={() => setTarget({ request, action })}>{actionTitles[action]}</Button>)}
                  <Button variant="secondary" onClick={() => void detail.refetch()} disabled={detail.isFetching}>Actualizar solicitud</Button>
                </div>
              </section>
            </>}
      {target && <RequestActionModal key={`${target.request.id}/${target.action}`} request={target.request} action={target.action} onClose={() => setTarget(null)} />}
    </div>
  )
}

function RequestActionModal({ request: initial, action, onClose }: { request: PlatformRegistrationRequest; action: RegistrationAction; onClose: () => void }) {
  const client = useQueryClient()
  // La confirmacion conserva la version revisada aunque una consulta se actualice en segundo plano.
  const [request, setRequest] = useState(initial)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string>()
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<unknown>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const sending = useRef(false)
  const mutation = useMutation({
    mutationFn: () => reviewRegistrationRequest(request, action, reason), retry: false,
    onSuccess: () => {
      // Incluye detalle, listado, cinco pendientes del Resumen y metricas, nunca cache tenant.
      void client.invalidateQueries({ queryKey: PLATFORM_REQUESTS_KEY })
      void client.invalidateQueries({ queryKey: [PLATFORM_QUERY_KEY, 'metrics'] })
      showToast(action === 'reject' ? 'Solicitud rechazada. Se liberó la reserva del código.' : 'Correo de activación encolado. La aceptación del servidor no garantiza que llegue al buzón.', 'success')
      onClose()
    },
    onSettled: () => { sending.current = false },
  })
  const conflict = mutation.error instanceof ApiError && mutation.error.status === 409
  const missing = mutation.error instanceof ApiError && mutation.error.status === 404
  const message = useReportedError(mutation.error, { inlineOnly: true })
  const refreshMessage = useReportedError(refreshError, { inlineOnly: true })
  const busy = mutation.isPending || refreshing

  function validateReason() {
    const trimmed = reason.trim()
    const error = !trimmed ? 'Escribe el motivo del rechazo.' : trimmed.length > 500 ? 'El motivo del rechazo no puede superar 500 caracteres.' : undefined
    setReasonError(error)
    return !error
  }

  function submit() {
    if (sending.current || busy || conflict || missing) return
    if (!allowed(request, action)) { setRequest({ ...request, reservationExpired: true }); return }
    if (action === 'reject' && !validateReason()) { inputRef.current?.focus(); return }
    sending.current = true
    mutation.mutate()
  }

  async function refresh() {
    setRefreshing(true)
    setRefreshError(null)
    try {
      const updated = await fetchRegistrationRequest(request.id)
      setRequest(updated)
      client.setQueryData([...PLATFORM_REQUESTS_KEY, 'detail', request.id], updated)
      void client.invalidateQueries({ queryKey: PLATFORM_REQUESTS_KEY, refetchType: 'none' })
      void client.invalidateQueries({ queryKey: [PLATFORM_QUERY_KEY, 'metrics'] })
      mutation.reset()
    } catch (error) { setRefreshError(error) }
    finally { setRefreshing(false) }
  }

  return (
    <DiscardableModal title={actionTitles[action]} dirty={Boolean(reason)} busy={busy} onClose={onClose} discardMessage="Se perderá el motivo del rechazo que escribiste." footer={(close) => <>
      <Button variant="secondary" onClick={close} disabled={busy}>Cancelar</Button>
      <Button variant={action === 'reject' ? 'danger' : 'primary'} onClick={submit} disabled={busy || conflict || missing || !allowed(request, action)} aria-busy={busy}>{busy ? 'Procesando…' : actionTitles[action]}</Button>
    </>}>
      <div className="flex flex-col gap-4">
        <p className="wrap-anywhere text-body text-text">{request.businessName} · {request.slug} · {request.contactEmail}</p>
        <p className="text-body text-text-muted">{action === 'approve' ? 'Se enviará un enlace al responsable. El acceso requiere completar la activación, que creará la serviteca y su administrador.' : action === 'reject' ? 'La solicitud quedará rechazada y se liberará la reserva del código solicitado.' : 'Se revocará el enlace anterior y se encolará uno nuevo. El reenvío tiene un intervalo mínimo y un límite diario; el servidor de correo puede aceptarlo sin que llegue al buzón.'}</p>
        {action === 'reject' && <TextField ref={inputRef} label="Motivo del rechazo" hint="Obligatorio. Máximo 500 caracteres, sin contar espacios al inicio y al final." value={reason} onChange={(event) => setReason(event.target.value)} onBlur={validateReason} error={reasonError} disabled={busy} />}
        <ErrorSummary count={reasonError ? 1 : 0} />
        {message && <Alert tone="error" title={message} />}
        {(conflict || missing) && <><p className="text-small text-text-muted">Actualiza la solicitud y revisa sus datos antes de confirmar otra vez. El motivo escrito se conserva.</p><Button variant="secondary" onClick={() => void refresh()} disabled={busy}>Actualizar solicitud</Button></>}
        {refreshMessage && <Alert tone="error" title={refreshMessage} />}
        {!allowed(request, action) && <Alert tone="warning" title="El estado actual o el vencimiento de la reserva ya no permiten esta acción." />}
      </div>
    </DiscardableModal>
  )
}
