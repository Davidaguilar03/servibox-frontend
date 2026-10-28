import { useEffect, useRef, useState } from 'react'
import { useLocation, useOutletContext, useSearchParams } from 'react-router'
import { useSession } from '../auth/session'
import { UnsavedChangesGuard } from '../components/UnsavedChangesGuard'
import { ListHeader } from '../components/ListHeader'
import type { AppShellContext } from '../layout/AppShell'
import { FinancialSettingsTab } from './FinancialSettingsTab'
import { TenantProfileTab } from './TenantProfileTab'

/** Dos formularios independientes; los enlaces financieros conservan su destino. */
export function SettingsPage() {
  const { menuButton } = useOutletContext<AppShellContext>()
  const session = useSession()
  const [searchParams] = useSearchParams()
  const { key } = useLocation()
  const [profileDirty, setProfileDirty] = useState(false)
  const [financialDirty, setFinancialDirty] = useState(false)
  const [profileReady, setProfileReady] = useState(false)
  const [financialReady, setFinancialReady] = useState(false)
  const financialSection = useRef<HTMLDivElement>(null)
  const focusedLink = useRef<string | null>(null)
  const allowLeave = useRef(false)
  const readOnly = session?.role !== 'ADMIN'
  const financialLink = searchParams.get('tab') === 'financiera'

  useEffect(() => {
    if (!financialLink || !profileReady || !financialReady || focusedLink.current === key) return
    focusedLink.current = key
    financialSection.current?.scrollIntoView?.({ block: 'start' })
    financialSection.current?.focus({ preventScroll: true })
  }, [financialLink, profileReady, financialReady, key])

  return (
    <div className="@container flex flex-col gap-6">
      <ListHeader
        title="Configuración"
        subtitle="Datos de la serviteca y parámetros financieros."
        leading={menuButton}
      />

      <div className="grid items-start gap-4 @min-[1000px]:grid-cols-[minmax(0,3fr)_minmax(0,4fr)]">
        <TenantProfileTab readOnly={readOnly} onDirtyChange={setProfileDirty} onReadyChange={setProfileReady} />
        <div id="seccion-financiera" ref={financialSection} tabIndex={-1} className="min-w-0 scroll-mt-6 rounded-surface focus-ring">
          <FinancialSettingsTab readOnly={readOnly} onDirtyChange={setFinancialDirty} onReadyChange={setFinancialReady} />
        </div>
      </div>
      <UnsavedChangesGuard
        dirty={profileDirty || financialDirty}
        allowLeave={allowLeave}
        message="Si sales ahora, se pierden los cambios que no guardaste en Configuración."
      />
    </div>
  )
}
