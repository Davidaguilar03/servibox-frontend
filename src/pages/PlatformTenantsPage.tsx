import { useEffect } from 'react'
import { useOutletContext, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useReportedError } from '../api/reportError'
import { DataTable, type Column } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { ListHeader } from '../components/ListHeader'
import { Pagination } from '../components/Pagination'
import { SearchField } from '../components/SearchField'
import { SelectField } from '../components/SelectField'
import { StatusBadge } from '../components/StatusBadge'
import { GLOSSARY } from '../copy/glossary'
import type { AppShellContext } from '../layout/AppShell'
import { formatPlatformDate } from '../lib/format'
import { useUrlTextParam } from '../lib/useUrlTextParam'
import { fetchPlatformTenants, PLATFORM_TENANTS_KEY, type PlatformTenant, type TenantStatus } from '../platform/platformApi'

const STATUS_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'ACTIVE', label: 'Activas' },
  { value: 'SUSPENDED', label: 'Suspendidas' },
]

export function PlatformTenantsPage() {
  const { menuButton } = useOutletContext<AppShellContext>()
  const [params, setParams] = useSearchParams()
  const rawStatus = params.get('estado') ?? ''
  const status = Object.hasOwn(GLOSSARY.tenantStatuses, rawStatus) ? rawStatus as TenantStatus : ''
  const rawPage = Number(params.get('pagina') ?? 1)
  const page = Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 2147483647 ? rawPage : 1
  const q = (params.get('q') ?? '').trim()
  const active = status !== '' || q !== ''
  const tenants = useQuery({ queryKey: [...PLATFORM_TENANTS_KEY, 'list', status, q, page], queryFn: () => fetchPlatformTenants(status, q, page - 1), retry: false })
  const error = useReportedError(tenants.error)
  const data = tenants.data

  function changeFilter(key: string, value: string, replace = false) {
    setParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('pagina')
      if (value.trim()) next.set(key, value)
      else next.delete(key)
      return next
    }, { replace })
  }
  const search = useUrlTextParam(params.get('q') ?? '', (value) => changeFilter('q', value, true))

  function clearFilters() {
    setParams((current) => {
      const next = new URLSearchParams(current)
      for (const key of ['q', 'estado', 'pagina']) next.delete(key)
      return next
    })
  }

  // Si el total cambia, la pagina de la URL puede quedar fuera del rango.
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

  const columns: Column<PlatformTenant>[] = [
    { header: 'Serviteca', render: (t) => <span className="flex flex-col gap-1 wrap-anywhere"><span>{t.name}</span><span className="codigo text-small text-text-muted">{t.slug}</span></span> },
    { header: 'NIT', render: (t) => <span className="wrap-anywhere">{t.nit}</span> },
    { header: 'Teléfono', render: (t) => <span className="wrap-anywhere">{t.phone}</span> },
    {
      header: 'Estado',
      render: (t) => (
        <span className="flex flex-col items-start gap-1">
          <StatusBadge status={t.status} />
          {t.status === 'SUSPENDED' && t.suspensionReason && <span className="line-clamp-2 text-small text-text-muted wrap-anywhere" title={t.suspensionReason}>{t.suspensionReason}</span>}
        </span>
      ),
    },
    { header: 'Creada', render: (t) => formatPlatformDate(t.createdAt) },
  ]

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <ListHeader leading={menuButton} title={GLOSSARY.platformTenants} subtitle="Más recientes primero. Fechas y horas de Bogotá." />
      <section className="min-w-0 overflow-hidden rounded-surface border border-border bg-surface" aria-label={GLOSSARY.platformTenants}>
        <FilterBar embedded active={active} onClear={clearFilters}>
          {[
            <SearchField key="q" label="Buscar" placeholder="Nombre o código" {...search} />,
            <SelectField key="status" label="Estado" value={status} options={STATUS_OPTIONS} onChange={(event) => changeFilter('estado', event.target.value)} />,
          ]}
        </FilterBar>
        <DataTable columns={columns} rows={data?.items} rowKey={(t) => t.id} loading={tenants.isPending} error={tenants.isError} onRetry={() => void tenants.refetch()} emptyMessage={active ? 'No hay servitecas que coincidan con estos filtros.' : 'Todavía no hay servitecas registradas.'} cardsLabel={GLOSSARY.platformTenants} card={(t) => (
          <div className="flex flex-col gap-3">
            {columns.map((column) => <div key={column.header} className="min-w-0"><p className="text-small text-text-muted">{column.header}</p>{column.render(t)}</div>)}
          </div>
        )} />
        {error && <p role="alert" className="p-4 text-small text-error-ink">{error}</p>}
        {data && !tenants.isError && <div className="border-t border-border p-4"><Pagination itemLabel="servitecas" page={{ page, totalPages: data.totalPages, total: data.totalElements, from: data.items.length ? data.page * data.size + 1 : 0, to: data.items.length ? data.page * data.size + data.items.length : 0 }} onPageChange={changePage} /></div>}
      </section>
    </div>
  )
}
