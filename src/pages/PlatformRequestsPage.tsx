import { useEffect } from 'react'
import { useOutletContext, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useReportedError } from '../api/reportError'
import { userMessage } from '../api/errorMessages'
import { CellLink } from '../components/CellLink'
import { DataTable, type Column } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { ListHeader } from '../components/ListHeader'
import { Pagination } from '../components/Pagination'
import { DateRangeFields } from '../components/PeriodPicker'
import { SelectField } from '../components/SelectField'
import { StatusBadge } from '../components/StatusBadge'
import { TextField } from '../components/TextField'
import { GLOSSARY } from '../copy/glossary'
import type { AppShellContext } from '../layout/AppShell'
import { formatPlatformDate } from '../lib/format'
import { ApiError } from '../lib/api'
import { useUrlTextParam } from '../lib/useUrlTextParam'
import { fetchRegistrationRequests, PLATFORM_REQUESTS_KEY, type PlatformRegistrationRequest, type RegistrationStatus } from '../platform/platformApi'

export function PlatformRequestsPage() {
  const { menuButton } = useOutletContext<AppShellContext>()
  const [params, setParams] = useSearchParams()
  const rawStatus = params.get('estado') ?? ''
  const status = Object.hasOwn(GLOSSARY.registrationStatuses, rawStatus) ? rawStatus as RegistrationStatus : ''
  const rawPage = Number(params.get('pagina') ?? 1)
  const page = Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 2147483647 ? rawPage : 1
  const filters = {
    tenantName: (params.get('serviteca') ?? '').trim(),
    contactName: (params.get('responsable') ?? '').trim(),
    receivedFrom: (params.get('desde') ?? '').trim(),
    receivedTo: (params.get('hasta') ?? '').trim(),
  }
  const rangeInvalid = /^\d{4}-\d{2}-\d{2}$/.test(filters.receivedFrom) && /^\d{4}-\d{2}-\d{2}$/.test(filters.receivedTo) && filters.receivedFrom > filters.receivedTo
  const rangeError = rangeInvalid ? userMessage(new ApiError('La fecha inicial no puede ser posterior a la final', 400)) : undefined
  const active = status !== '' || Object.values(filters).some(Boolean)
  const requests = useQuery({ queryKey: [...PLATFORM_REQUESTS_KEY, 'list', status, page, filters], queryFn: () => fetchRegistrationRequests(status, page - 1, filters), retry: false, enabled: !rangeInvalid })
  const error = useReportedError(requests.error)
  const data = requests.data

  function changeFilter(key: string, value: string, replace = false) {
    setParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('pagina')
      if (value.trim()) next.set(key, value)
      else next.delete(key)
      return next
    }, { replace })
  }
  const tenantName = useUrlTextParam(params.get('serviteca') ?? '', (value) => changeFilter('serviteca', value, true))
  const contactName = useUrlTextParam(params.get('responsable') ?? '', (value) => changeFilter('responsable', value, true))
  const receivedFrom = useUrlTextParam(params.get('desde') ?? '', (value) => changeFilter('desde', value, true))
  const receivedTo = useUrlTextParam(params.get('hasta') ?? '', (value) => changeFilter('hasta', value, true))

  function clearFilters() {
    setParams((current) => {
      const next = new URLSearchParams(current)
      for (const key of ['serviteca', 'responsable', 'desde', 'hasta', 'estado', 'pagina']) next.delete(key)
      return next
    })
  }

  // Una accion o eliminacion puede dejar la pagina fuera del nuevo rango.
  useEffect(() => {
    if (!data || page <= Math.max(1, data.totalPages)) return
    setParams((current) => {
      const next = new URLSearchParams(current)
      if (data.totalPages > 1) next.set('pagina', String(data.totalPages))
      else next.delete('pagina')
      return next
    }, { replace: true })
  }, [data, page, setParams])

  function changePage(nextPage: number) {
    const next = new URLSearchParams(params)
    if (nextPage > 1) next.set('pagina', String(nextPage))
    else next.delete('pagina')
    setParams(next)
  }

  const detailLink = (r: PlatformRegistrationRequest) => (
    <CellLink to={`/plataforma/solicitudes/${encodeURIComponent(r.id)}?${params}`} aria-label={`Revisar ${r.businessName}`}>Revisar</CellLink>
  )
  const columns: Column<PlatformRegistrationRequest>[] = [
    { header: 'Serviteca', render: (r) => <span className="flex flex-col gap-1 wrap-anywhere"><span>{r.businessName}</span><span className="codigo text-small text-text-muted">{r.slug}</span></span> },
    { header: 'Responsable', render: (r) => <span className="flex flex-col gap-1 wrap-anywhere"><span>{r.contactName}</span><span className="text-small text-text-muted">{r.contactEmail}</span></span> },
    { header: 'Recibida', render: (r) => formatPlatformDate(r.createdAt) },
    { header: 'Estado', render: (r) => <span className="flex flex-col items-start gap-1"><StatusBadge status={r.status === 'PENDING' ? 'PENDIENTE' : r.status} />{r.reservationExpired && <span className="text-small text-text-muted">Reserva vencida</span>}</span> },
    { header: 'Acciones', render: detailLink },
  ]

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <ListHeader leading={menuButton} title="Solicitudes de registro" subtitle="Más recientes primero. Fechas y horas de Bogotá." />
      <section className="min-w-0 overflow-hidden rounded-surface border border-border bg-surface" aria-label="Solicitudes de registro">
        <FilterBar embedded requests active={active} onClear={clearFilters}>
          {[
            <TextField key="tenant" label="Serviteca" {...tenantName} />,
            <TextField key="contact" label="Responsable" {...contactName} />,
            <DateRangeFields key="dates" desde={receivedFrom} hasta={receivedTo} errors={{ hasta: rangeError }} />,
            <SelectField key="status" label="Estado" value={status} options={[{ value: '', label: 'Todos los estados' }, ...Object.entries(GLOSSARY.registrationStatuses).map(([value, label]) => ({ value, label }))]} onChange={(event) => changeFilter('estado', event.target.value)} />,
          ]}
        </FilterBar>
        {!rangeInvalid && <DataTable columns={columns} rows={data?.items} rowKey={(r) => r.id} loading={requests.isPending} error={requests.isError} onRetry={() => void requests.refetch()} emptyMessage={active ? 'No hay solicitudes que coincidan con estos filtros.' : 'No hay solicitudes de registro.'} cardsLabel="Solicitudes de registro" card={(r) => (
          <div className="flex flex-col gap-3">
            {columns.slice(0, 4).map((column) => <div key={column.header} className="min-w-0"><p className="text-small text-text-muted">{column.header}</p>{column.render(r)}</div>)}
            {detailLink(r)}
          </div>
        )} />}
        {error && <p role="alert" className="p-4 text-small text-error-ink">{error}</p>}
        {data && !requests.isError && !rangeInvalid && <div className="border-t border-border p-4"><Pagination itemLabel="solicitudes" page={{ page, totalPages: data.totalPages, total: data.totalElements, from: data.items.length ? data.page * data.size + 1 : 0, to: data.items.length ? data.page * data.size + data.items.length : 0 }} onPageChange={changePage} /></div>}
      </section>
    </div>
  )
}
