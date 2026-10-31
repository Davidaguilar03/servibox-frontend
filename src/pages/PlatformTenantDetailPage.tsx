import { useRef, useState } from 'react'
import { Link, useOutletContext, useParams, useSearchParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reportError, useReportedError } from '../api/reportError'
import { roleLabel } from '../auth/session'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { buttonClasses } from '../components/buttonStyles'
import { CellButton, CellLink } from '../components/CellLink'
import { DataTable, type Column } from '../components/DataTable'
import { DiscardableModal } from '../components/DiscardableModal'
import { ErrorSummary } from '../components/ErrorSummary'
import { ListHeader } from '../components/ListHeader'
import { Pagination } from '../components/Pagination'
import { StatusBadge } from '../components/StatusBadge'
import { TextField } from '../components/TextField'
import { EmptyState, ErrorState, Skeleton } from '../components/states'
import { showToast } from '../components/toast'
import { GLOSSARY } from '../copy/glossary'
import type { AppShellContext } from '../layout/AppShell'
import { ApiError } from '../lib/api'
import { EMPTY_VALUE, formatPlatformDate } from '../lib/format'
import {
  changeTenantStatus, fetchPlatformTenant, fetchPlatformTenantUsers, PLATFORM_QUERY_KEY, PLATFORM_TENANTS_KEY, revokeTenantSessions,
  revokeTenantUser, type PlatformTenant, type PlatformTenantDetail, type PlatformTenantUser, type TenantUserRole,
} from '../platform/platformApi'

type TenantAction = { kind: 'suspend' | 'reactivate' | 'revoke-all' } | { kind: 'revoke-user'; user: PlatformTenantUser }

const actionTitles: Record<TenantAction['kind'], string> = {
  suspend: 'Suspender serviteca',
  reactivate: 'Reactivar serviteca',
  'revoke-all': 'Cerrar todas las sesiones',
  'revoke-user': 'Cerrar sesiones del usuario',
}
const ROLES: TenantUserRole[] = ['ADMIN', 'MECANICO', 'CAJERO']
const REASON_MAX = 500

const detailKey = (id: string) => [...PLATFORM_TENANTS_KEY, 'detail', id]

/** Suspender solo si esta activa y reactivar solo si esta suspendida. Cerrar sesiones no aplica a una suspendida: ya se cerraron. */
function allowed(tenant: PlatformTenant, kind: TenantAction['kind']) {
  return kind === 'reactivate' ? tenant.status === 'SUSPENDED' : tenant.status === 'ACTIVE'
}

const plural = (count: number, one: string, many: string) => `${count.toLocaleString('es-CO')} ${count === 1 ? one : many}`

export function PlatformTenantDetailPage() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const { menuButton } = useOutletContext<AppShellContext>()
  const [action, setAction] = useState<TenantAction | null>(null)
  const [usersPage, setUsersPage] = useState(1)
  const detail = useQuery({ queryKey: detailKey(id), queryFn: () => fetchPlatformTenant(id), retry: false })
  const missing = detail.error instanceof ApiError && detail.error.status === 404
  const error = useReportedError(missing ? null : detail.error, { context: 'tenant' })
  const users = useQuery({
    queryKey: [...PLATFORM_TENANTS_KEY, 'users', id, usersPage],
    queryFn: () => fetchPlatformTenantUsers(id, usersPage - 1),
    retry: false,
    enabled: Boolean(detail.data),
  })
  const usersError = useReportedError(users.error, { context: 'tenant' })
  const data = detail.data
  const back = `/plataforma/servitecas${params.size ? `?${params}` : ''}`

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <ListHeader leading={menuButton} title="Detalle de serviteca" secondary={[<Link key="back" to={back} className={buttonClasses('secondary')} data-variant="secondary">Volver a servitecas</Link>]} />
      {missing ? <EmptyState message="Serviteca no encontrada. Puede que ya no exista." action={{ label: 'Volver a servitecas', to: back }} />
        : detail.isError ? <ErrorState message={error ?? 'No pudimos cargar la serviteca.'} onRetry={() => void detail.refetch()} />
          : !data ? <div aria-busy="true" aria-label="Cargando serviteca"><Skeleton className="h-40 w-full" /></div>
            : <>
              <div className="grid min-w-0 gap-6 lg:grid-cols-3">
                <TenantData detail={data} />
                <section className="min-w-0 rounded-surface border border-border bg-surface p-4 sm:p-6">
                  <h2 className="text-section text-text">Acceso</h2>
                  {data.tenant.status === 'ACTIVE' ? <>
                    <p className="mt-2 text-body text-text-muted">Suspender bloquea la entrada de todos sus usuarios y cierra sus sesiones de inmediato.</p>
                    <div className="mt-3"><Button variant="secondary" onClick={() => setAction({ kind: 'suspend' })}>{actionTitles.suspend}</Button></div>
                    <p className="mt-4 text-body text-text-muted">Cerrar las sesiones obliga a todos a iniciar sesión de nuevo. Los usuarios siguen activos.</p>
                    <div className="mt-3"><Button variant="secondary" onClick={() => setAction({ kind: 'revoke-all' })}>{actionTitles['revoke-all']}</Button></div>
                  </> : <>
                    <p className="mt-2 text-body text-text-muted">Sus usuarios no pueden entrar. Al reactivarla deben iniciar sesión de nuevo.</p>
                    <div className="mt-3"><Button variant="secondary" onClick={() => setAction({ kind: 'reactivate' })}>{actionTitles.reactivate}</Button></div>
                  </>}
                </section>
              </div>
              <section className="min-w-0 rounded-surface border border-border bg-surface p-4 sm:p-6" aria-labelledby="tenant-users">
                <h2 id="tenant-users" className="text-section text-text">Usuarios</h2>
                <p className="mt-2 text-small text-text-muted">Solo consulta: los datos y roles de los usuarios no se modifican desde este panel.</p>
                <UserSummary detail={data} />
                <div className="mt-4">
                  <DataTable columns={userColumns(data.tenant, (user) => setAction({ kind: 'revoke-user', user }))} rows={users.data?.items} rowKey={(u) => u.id} loading={users.isPending} error={users.isError} onRetry={() => void users.refetch()} emptyMessage="Esta serviteca no tiene usuarios." cardsLabel="Usuarios" card={(u) => (
                    <div className="flex flex-col gap-3">
                      {userColumns(data.tenant, (user) => setAction({ kind: 'revoke-user', user })).map((column) => <div key={column.header} className="min-w-0"><p className="text-small text-text-muted">{column.header}</p>{column.render(u)}</div>)}
                    </div>
                  )} />
                </div>
                {usersError && <p role="alert" className="mt-4 text-small text-error-ink">{usersError}</p>}
                {users.data && !users.isError && <div className="mt-4"><Pagination itemLabel="usuarios" page={{ page: usersPage, totalPages: users.data.totalPages, total: users.data.totalElements, from: users.data.items.length ? users.data.page * users.data.size + 1 : 0, to: users.data.items.length ? users.data.page * users.data.size + users.data.items.length : 0 }} onPageChange={setUsersPage} /></div>}
              </section>
            </>}
      {action && data && <TenantActionModal key={action.kind === 'revoke-user' ? `user/${action.user.id}` : action.kind} id={id} tenant={data.tenant} action={action} onClose={() => setAction(null)} />}
    </div>
  )
}

function TenantData({ detail }: { detail: PlatformTenantDetail }) {
  const { tenant, registrationRequest: origin } = detail
  return (
    <section className="min-w-0 rounded-surface border border-border bg-surface p-4 sm:p-6 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="min-w-0 wrap-anywhere text-section text-text">{tenant.name}</h2>
        <StatusBadge status={tenant.status} />
      </div>
      <dl className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
        {[
          ['Código', tenant.slug], ['NIT', tenant.nit], ['Teléfono', tenant.phone], ['Creada', formatPlatformDate(tenant.createdAt)],
          ...(tenant.status === 'SUSPENDED' ? [['Suspendida desde', formatPlatformDate(tenant.suspendedAt)], ['Motivo de la suspensión', tenant.suspensionReason ?? EMPTY_VALUE]] : []),
        ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-small text-text-muted">{label}</dt><dd className={`mt-1 wrap-anywhere text-body text-text ${label === 'NIT' || label === 'Código' ? 'codigo' : ''}`}>{value}</dd></div>)}
      </dl>
      <div className="mt-4 border-t border-border pt-4">
        <h3 className="text-body font-semibold text-text">Solicitud de registro</h3>
        {origin ? <>
          <dl className="mt-3 grid min-w-0 gap-4 sm:grid-cols-3">
            <div><dt className="text-small text-text-muted">Estado</dt><dd className="mt-1"><StatusBadge status={origin.status === 'PENDING' ? 'PENDIENTE' : origin.status} /></dd></div>
            <div><dt className="text-small text-text-muted">Recibida</dt><dd className="mt-1 text-body text-text">{formatPlatformDate(origin.createdAt)}</dd></div>
            <div><dt className="text-small text-text-muted">Revisada</dt><dd className="mt-1 text-body text-text">{formatPlatformDate(origin.reviewedAt)}</dd></div>
          </dl>
          <div className="mt-3"><CellLink to={`/plataforma/solicitudes/${encodeURIComponent(origin.id)}`}>Ver solicitud de registro</CellLink></div>
        </> : <p className="mt-2 text-body text-text-muted">Sin solicitud asociada: se registró directamente.</p>}
      </div>
      <p className="mt-4 text-small text-text-muted">Fechas y horas de Bogotá.</p>
    </section>
  )
}

function UserSummary({ detail }: { detail: PlatformTenantDetail }) {
  const count = (filter: (c: PlatformTenantDetail['userCounts'][number]) => boolean) => detail.userCounts.filter(filter).reduce((sum, c) => sum + c.count, 0)
  const roles = ROLES.filter((role) => detail.userCounts.some((c) => c.role === role && c.count > 0))
  return (
    <dl className="mt-4 grid min-w-0 gap-4 sm:grid-cols-3">
      {[
        ['Total', detail.totalUsers.toLocaleString('es-CO')],
        ['Activos', count((c) => c.active).toLocaleString('es-CO')],
        ['Inactivos', count((c) => !c.active).toLocaleString('es-CO')],
      ].map(([label, value]) => <div key={label}><dt className="text-small text-text-muted">{label}</dt><dd className="tabular mt-1 text-body font-semibold text-text">{value}</dd></div>)}
      {roles.map((role) => (
        <div key={role}>
          <dt className="text-small text-text-muted">{roleLabel(role)}</dt>
          <dd className="tabular mt-1 text-body text-text">{plural(count((c) => c.role === role && c.active), 'activo', 'activos')} · {plural(count((c) => c.role === role && !c.active), 'inactivo', 'inactivos')}</dd>
        </div>
      ))}
    </dl>
  )
}

function userColumns(tenant: PlatformTenant, onRevoke: (user: PlatformTenantUser) => void): Column<PlatformTenantUser>[] {
  return [
    { header: 'Usuario', render: (u) => <span className="flex flex-col gap-1 wrap-anywhere"><span>{u.username}</span>{u.fullName && <span className="text-small text-text-muted">{u.fullName}</span>}</span> },
    { header: 'Correo', render: (u) => <span className="wrap-anywhere">{u.email ?? EMPTY_VALUE}</span> },
    { header: 'Rol', render: (u) => roleLabel(u.role) },
    { header: 'Estado', render: (u) => <StatusBadge status={u.active ? 'ACTIVO' : 'INACTIVO'} /> },
    { header: 'Creado', render: (u) => formatPlatformDate(u.createdAt) },
    { header: 'Actualizado', render: (u) => formatPlatformDate(u.updatedAt) },
    {
      header: 'Acciones',
      render: (u) => tenant.status === 'ACTIVE' && u.active
        ? <CellButton onClick={() => onRevoke(u)} aria-label={`Cerrar sesiones de ${u.username}`}>Cerrar sesiones</CellButton>
        : EMPTY_VALUE,
    },
  ]
}

function TenantActionModal({ id, tenant: initial, action, onClose }: { id: string; tenant: PlatformTenant; action: TenantAction; onClose: () => void }) {
  const client = useQueryClient()
  // La confirmacion conserva la version revisada aunque la consulta se actualice en segundo plano.
  const [tenant, setTenant] = useState(initial)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string>()
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<unknown>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const sending = useRef(false)
  const { kind } = action
  const user = action.kind === 'revoke-user' ? action.user : null
  const withReason = kind === 'suspend' || kind === 'reactivate'

  function invalidate() {
    // Detalle, usuarios, listado de servitecas y metricas del Resumen; nunca la cache comercial.
    void client.invalidateQueries({ queryKey: PLATFORM_TENANTS_KEY })
    void client.invalidateQueries({ queryKey: [PLATFORM_QUERY_KEY, 'metrics'] })
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (kind === 'suspend' || kind === 'reactivate') { await changeTenantStatus(tenant, kind, reason); return 0 }
      if (kind === 'revoke-all') return (await revokeTenantSessions(tenant.id)).revokedUsers
      if (user) await revokeTenantUser(tenant.id, user.id)
      return 0
    },
    retry: false,
    onSuccess: (revoked) => {
      invalidate()
      showToast(
        kind === 'suspend' ? 'Serviteca suspendida. Sus usuarios ya no pueden entrar y sus sesiones se cerraron.'
          : kind === 'reactivate' ? 'Serviteca reactivada. Sus usuarios deben iniciar sesión de nuevo.'
            : kind === 'revoke-all' ? `Sesiones cerradas: ${plural(revoked, 'usuario', 'usuarios')}. Siguen activos.`
              : `Sesiones de ${user?.username} cerradas. El usuario sigue activo.`,
        'success',
      )
      onClose()
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 404) {
        // La serviteca o el usuario ya no existen: aviso y el detalle muestra la vuelta al listado.
        reportError(error, { context: 'tenant' })
        invalidate()
        onClose()
      } else if (error instanceof ApiError && error.status === 409) {
        void reload()
      }
    },
    onSettled: () => { sending.current = false },
  })
  const message = useReportedError(mutation.error, { inlineOnly: true, context: 'tenant' })
  const refreshMessage = useReportedError(refreshError, { inlineOnly: true, context: 'tenant' })
  const busy = mutation.isPending || refreshing
  // Sin la version nueva, confirmar repetiria el conflicto.
  const stale = refreshError !== null

  /** 409: relee el detalle, conserva el motivo y deja confirmar de nuevo con la version nueva si la accion sigue aplicando. */
  async function reload() {
    setRefreshing(true)
    setRefreshError(null)
    try {
      const fresh = await fetchPlatformTenant(id)
      // Marca listado, usuarios y metricas sin repetir la consulta del detalle recien leido.
      void client.invalidateQueries({ queryKey: PLATFORM_TENANTS_KEY, refetchType: 'none' })
      void client.invalidateQueries({ queryKey: [PLATFORM_QUERY_KEY, 'metrics'] })
      client.setQueryData(detailKey(id), fresh)
      setTenant(fresh.tenant)
    } catch (error) { setRefreshError(error) }
    finally { setRefreshing(false) }
  }

  function validateReason() {
    const trimmed = reason.trim()
    const error = kind === 'suspend' && !trimmed ? 'Escribe el motivo de la suspensión.'
      : trimmed.length > REASON_MAX ? `El motivo no puede superar ${REASON_MAX} caracteres.` : undefined
    setReasonError(error)
    return !error
  }

  function submit() {
    if (sending.current || busy || stale || !allowed(tenant, kind)) return
    if (withReason && !validateReason()) { inputRef.current?.focus(); return }
    sending.current = true
    mutation.mutate()
  }

  const consequence = {
    suspend: 'Los usuarios de esta serviteca no podrán entrar y sus sesiones activas se cerrarán de inmediato. Sus datos se conservan.',
    reactivate: 'Los usuarios podrán volver a entrar, pero deben iniciar sesión de nuevo: las sesiones cerradas al suspender no se recuperan.',
    'revoke-all': 'Se cerrarán las sesiones abiertas de todos los usuarios de esta serviteca. Siguen activos y pueden volver a iniciar sesión.',
    'revoke-user': `Se cerrarán las sesiones abiertas de ${user?.username}. El usuario sigue activo y puede volver a iniciar sesión.`,
  }[kind]
  const count = reason.trim().length

  return (
    <DiscardableModal title={actionTitles[kind]} dirty={Boolean(reason)} busy={busy} onClose={onClose} discardMessage="Se perderá el motivo que escribiste." footer={(close) => <>
      <Button variant="secondary" onClick={close} disabled={busy}>Cancelar</Button>
      <Button variant={kind === 'reactivate' ? 'primary' : 'danger'} onClick={submit} disabled={busy || stale || !allowed(tenant, kind)} aria-busy={busy}>{busy ? 'Procesando…' : actionTitles[kind]}</Button>
    </>}>
      <div className="flex flex-col gap-4">
        <p className="wrap-anywhere text-body text-text">{tenant.name} · {tenant.slug}{user ? ` · ${user.username}` : ''}</p>
        <p className="text-body text-text-muted">{consequence}</p>
        {withReason && <TextField ref={inputRef} label={kind === 'suspend' ? 'Motivo de la suspensión' : 'Motivo de la reactivación'} hint={`${kind === 'suspend' ? 'Obligatorio' : 'Opcional'}. ${count} de ${REASON_MAX} caracteres.`} value={reason} onChange={(event) => { setReason(event.target.value); setReasonError(undefined) }} onBlur={validateReason} error={reasonError} disabled={busy} />}
        <ErrorSummary count={reasonError ? 1 : 0} />
        {message && <Alert tone="error" title={message} />}
        {refreshMessage && <><Alert tone="error" title={refreshMessage} /><Button variant="secondary" onClick={() => void reload()} disabled={busy}>Actualizar serviteca</Button></>}
        {!allowed(tenant, kind) && <Alert tone="warning" title={`La serviteca ahora está ${GLOSSARY.tenantStatuses[tenant.status].toLowerCase()}. Esta acción ya no aplica.`} />}
      </div>
    </DiscardableModal>
  )
}
