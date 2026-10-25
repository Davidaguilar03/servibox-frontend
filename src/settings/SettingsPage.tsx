import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useSession } from '../auth/session'
import { DiscardChangesModal } from '../components/DiscardChangesModal'
import { TabList } from '../components/SegmentedControl'
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
  const readOnly = session?.role !== 'ADMIN'

  function go(tab: SettingsTab) {
    setDirty(false)
    setPending(null)
    setSearchParams(tab === 'datos' ? {} : { tab })
  }

  function select(tab: SettingsTab) {
    if (tab === active) return
    if (dirty) setPending(tab)
    else go(tab)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-title text-text">Configuración</h1>
        <p className="mt-1 text-small text-text-muted">Datos de la serviteca y parámetros financieros.</p>
      </div>

      {/* Pestanas de ARIA con activacion automatica: flechas, Inicio y Fin. */}
      <TabList
        aria-label="Secciones de configuración"
        options={SETTINGS_TABS}
        value={active}
        onChange={select}
        tabId={tabId}
        panelId={panelId}
        fill
      />

      <div role="tabpanel" id={panelId(active)} aria-labelledby={tabId(active)}>
        {active === 'datos' && <TenantProfileTab readOnly={readOnly} onDirtyChange={setDirty} />}
        {active === 'financiera' && <FinancialSettingsTab readOnly={readOnly} onDirtyChange={setDirty} />}
      </div>

      {pending && (
        <DiscardChangesModal
          message="Si cambias de pestaña, se pierde lo que digitaste y no guardaste."
          onKeepEditing={() => setPending(null)}
          onDiscard={() => go(pending)}
        />
      )}
    </div>
  )
}
