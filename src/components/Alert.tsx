import type { ReactNode } from 'react'
import { CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react'

export type AlertTone = 'success' | 'warning' | 'error' | 'info'

// El titulo usa el -ink del tono (contraste de texto); el icono, el color semantico.
const tones: Record<AlertTone, { box: string; title: string; iconColor: string; icon: LucideIcon }> = {
  success: { box: 'bg-success-bg', title: 'text-success-ink', iconColor: 'text-success', icon: CircleCheck },
  warning: { box: 'bg-warning-bg', title: 'text-warning-ink', iconColor: 'text-warning', icon: TriangleAlert },
  error: { box: 'bg-error-bg', title: 'text-error-ink', iconColor: 'text-error', icon: TriangleAlert },
  info: { box: 'bg-info-bg', title: 'text-info-ink', iconColor: 'text-info', icon: Info },
}

interface AlertProps {
  tone: AlertTone
  title: string
  children?: ReactNode
}

/** Retroalimentacion en linea: que paso y que hacer. */
export function Alert({ tone, title, children }: AlertProps) {
  const { box, title: titleClass, iconColor, icon: Icon } = tones[tone]
  const urgent = tone === 'error' || tone === 'warning'

  return (
    <div role={urgent ? 'alert' : 'status'} className={`flex gap-3 rounded-control p-4 ${box}`}>
      <Icon size={18} strokeWidth={1.5} className={`mt-px shrink-0 ${iconColor}`} aria-hidden />
      <div className="text-small">
        <p className={`font-medium ${titleClass}`}>{title}</p>
        {children && <div className="text-text">{children}</div>}
      </div>
    </div>
  )
}
