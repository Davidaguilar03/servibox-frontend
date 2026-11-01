import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { WordmarkLink } from '../brand/WordmarkLink'
import { iconSm } from '../components/icons'
import { LegalLinks } from '../legal/LegalLinks'
import './LoginPage.css'

interface LoginLayoutProps {
  /** Fotografia decorativa de la columna izquierda (1122x1402). */
  photo: string
  /** Mensaje sobre la foto; sin el, la foto lleva solo la marca. */
  statement?: { lead: ReactNode; tagline: string }
  eyebrow: string
  title: string
  subtitle: string
  /** Formulario y lo que va bajo el. */
  children: ReactNode
}

/**
 * Composicion del acceso, compartida por el login de serviteca y el de plataforma: foto a
 * sangre desde lg y panel con marca, regreso, formulario y pie. Estilos en LoginPage.css.
 */
export function LoginLayout({ photo, statement, eyebrow, title, subtitle, children }: LoginLayoutProps) {
  return (
    <main id="login" className="bg-neutral-100 text-text">
      <div className="login-scene">
        <img className="login-photo" src={photo} alt="" width={1122} height={1402} fetchPriority="high" decoding="async" />
        <div className="login-scene-brand login-brand"><WordmarkLink onDark /></div>
        {statement && (
          <div className="login-scene-copy text-text-inverse">
            <p className="login-statement font-display font-semibold">{statement.lead}</p>
            <p className="mt-3">{statement.tagline}</p>
          </div>
        )}
      </div>
      <div className="login-panel">
        <nav aria-label="Navegación de acceso" className="flex flex-wrap items-center justify-between gap-4">
          <div className="login-mobile-brand login-brand"><WordmarkLink /></div>
          <Link to="/" className="ml-auto inline-flex min-h-touch items-center gap-2 rounded-control text-small text-text focus-ring hover:underline">
            <ArrowLeft {...iconSm} aria-hidden />Volver al inicio
          </Link>
        </nav>
        <div className="login-content">
          <p className="mb-4 flex items-center gap-3 text-label text-text-muted">
            <span aria-hidden className="size-2 shrink-0 rounded-pill bg-brand" />{eyebrow}
          </p>
          <h1 className="login-title text-title text-text">{title}</h1>
          <p className="mt-3 text-body text-text-muted">{subtitle}</p>
          {children}
        </div>
        <footer className="text-right text-small text-text-muted">
          <p className="mb-1">ServiBox · Colombia</p>
          <LegalLinks />
        </footer>
      </div>
    </main>
  )
}
