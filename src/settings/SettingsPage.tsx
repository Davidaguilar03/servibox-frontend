import { useRef, useState, type KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router'
import { useSession } from '../auth/session'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { FinancialSettingsTab } from './FinancialSettingsTab'
import { SETTINGS_TABS, parseSettingsTab, type SettingsTab } from './settingsForms'
import { TenantProfileTab } from './TenantProfileTab'

const tabId = (tab: SettingsTab) => `configuracion-tab-${tab}`
const panelId = (tab: SettingsTab) => `configuracion-panel-${tab}`

/** Configuracion: pestanas en `?tab=`, con aviso si la pestana actual tiene cambios sin guardar. */
export function SettingsPage() {
  const session = useSession()
  const [searchParams, setSearchParams] = useSearchParams()
  const active = parseSettingsTab(searchParams.get('tab'))
  const [dirty, setDirty] = useState(false)
  const [pending, setPending] = useState<SettingsTab | null>(null)
  const tabRefs = useRef(new Map<SettingsTab, HTMLButtonElement>())
  const readOnly = session?.role !== 'ADMIN'

  function go(tab: SettingsTab) {
    setDirty(false)
    setPending(null)
    setSearchParams(tab === 'datos' ? {} : { tab })
  }

  function select(tab: SettingsTab) {
    tabRefs.current.get(tab)?.focus()
    if (tab === active) return
    if (dirty) setPending(tab)
    else go(tab)
  }

  // Patron de pestanas de ARIA con activacion automatica: flechas, Inicio y Fin.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = SETTINGS_TABS.findIndex((tab) => tab.value === active)
    const last = SETTINGS_TABS.length - 1
    const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: last }[event.key]
    if (next === undefined) return
    event.preventDefault()
    const wrapped = SETTINGS_TABS[(next + SETTINGS_TABS.length) % SETTINGS_TABS.length]
    if (wrapped) select(wrapped.value)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h1 text-text">Configuración</h1>
        <p className="mt-1 text-small text-text-muted">Datos de la serviteca, usuarios y parámetros financieros.</p>
      </div>

      <div role="tablist" aria-label="Secciones de configuración" className="flex gap-6 overflow-x-auto overflow-y-hidden border-b border-border" onKeyDown={handleKeyDown}>
        {SETTINGS_TABS.map(({ value, label }) => {
          const selected = value === active
          return (
            <button
              key={value}
              ref={(element) => {
                if (element) tabRefs.current.set(value, element)
              }}
              id={tabId(value)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId(value)}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(value)}
              className={`-mb-px min-h-touch shrink-0 border-b-2 px-1 text-small font-medium whitespace-nowrap transition-colors duration-(--duration-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                selected ? 'border-brand text-text' : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      <div role="tabpanel" id={panelId(active)} aria-labelledby={tabId(active)}>
        {active === 'datos' && <TenantProfileTab readOnly={readOnly} onDirtyChange={setDirty} />}
        {active === 'financiera' && <FinancialSettingsTab readOnly={readOnly} onDirtyChange={setDirty} />}
        {active === 'usuarios' && (
          <section className="rounded-card border border-border bg-surface p-6 shadow-card">
            <h2 className="text-h3 text-text">Próximamente</h2>
            <p className="mt-2 text-body text-text-muted">
              La gestión de usuarios y roles llegará más adelante. Por ahora cada serviteca tiene su usuario administrador.
            </p>
          </section>
        )}
      </div>

      {pending && (
        <Modal
          title="Descartar cambios"
          onClose={() => setPending(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setPending(null)}>
                Seguir editando
              </Button>
              <Button variant="danger" onClick={() => go(pending)}>
                Descartar cambios
              </Button>
            </>
          }
        >
          <p className="text-body text-text">Si cambias de pestaña, se pierde lo que digitaste y no guardaste.</p>
        </Modal>
      )}
    </div>
  )
}
