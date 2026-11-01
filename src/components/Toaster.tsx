import { useEffect, useRef, useState } from 'react'
import { CircleCheck, TriangleAlert, X } from 'lucide-react'
import { SUPPORT_EMAIL, WHATSAPP } from '../config/contact'
import { IconButton } from './IconButton'
import { TOAST_DURATION_MS, dismissToast, useToasts, type ToastMessage } from './toast'
import { iconSm } from './icons'

/**
 * Region de avisos: abajo a la derecha, hasta 3. Cada aviso entra en 200 ms (`duration-base`)
 * y tiene su boton Cerrar; el de exito se cierra solo a los 5 s y el de error queda.
 */
export function Toaster() {
  const toasts = useToasts()
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 left-4 z-50 flex flex-col gap-3 sm:left-auto sm:w-full sm:max-w-sm">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  )
}

/** El contacto de soporte dentro del texto (mensaje de red) va como enlace: WhatsApp si existe, si no el correo. */
function MessageWithContact({ text }: { text: string }) {
  const contact = WHATSAPP
    ? { label: WHATSAPP.display, href: WHATSAPP.url, external: true }
    : { label: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}`, external: false }
  const [before, after] = text.split(contact.label)
  if (after === undefined) return text
  return (
    <>
      {before}
      <a
        href={contact.href}
        {...(contact.external ? { target: '_blank', rel: 'noopener' } : {})}
        className="rounded-control font-semibold text-brand-ink hover:underline focus-ring"
      >
        {contact.label}
      </a>
      {after}
    </>
  )
}

/** Un aviso. El temporizador del de exito se pausa con el cursor encima o el foco dentro. */
function Toast({ toast }: { toast: ToastMessage }) {
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const remaining = useRef(TOAST_DURATION_MS)
  const paused = hovered || focused
  const error = toast.tone === 'error'

  useEffect(() => {
    if (error || paused) return
    const started = Date.now()
    const timer = setTimeout(() => dismissToast(toast.id), remaining.current)
    return () => {
      clearTimeout(timer)
      remaining.current -= Date.now() - started
    }
  }, [error, paused, toast.id])

  const Icon = error ? TriangleAlert : CircleCheck
  return (
    <div
      role={error ? 'alert' : 'status'}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false)
      }}
      className="pointer-events-auto flex animate-[toast-in_var(--duration-base)_var(--ease-standard)] items-center gap-3 rounded-surface border border-border bg-surface py-2 pr-2 pl-4 shadow-raised"
    >
      <Icon {...iconSm} className={`shrink-0 ${error ? 'text-error' : 'text-success'}`} aria-hidden />
      <p className="flex-1 text-small text-text">
        <MessageWithContact text={toast.message} />
      </p>
      <IconButton aria-label="Cerrar aviso" onClick={() => dismissToast(toast.id)}>
        <X {...iconSm} aria-hidden />
      </IconButton>
    </div>
  )
}
