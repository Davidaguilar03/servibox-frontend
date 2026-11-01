import { Link } from 'react-router'
import { WordmarkLink } from '../brand/WordmarkLink'
import { SUPPORT_EMAIL } from '../config/contact'
import { SITE_URL, type LegalDocument } from './legalContent'

const linkClass = 'rounded-control font-semibold text-brand-ink hover:underline focus-ring'

/** El cuerpo de una seccion con el correo y el sitio como enlaces. */
function bodyWithLinks(body: string) {
  return body.split(new RegExp(`(${SUPPORT_EMAIL}|${SITE_URL})`)).map((part, index) => {
    if (part === SUPPORT_EMAIL) return <a key={index} href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>{part}</a>
    if (part === SITE_URL) return <a key={index} href={SITE_URL} className={linkClass}>{part}</a>
    return part
  })
}

interface LegalPageProps {
  document: LegalDocument
  /** Enlace al otro texto legal. */
  other: { to: string; label: string }
}

/** Composicion de la politica y de los terminos: el texto sale de legalContent.ts. */
export function LegalPage({ document, other }: LegalPageProps) {
  return (
    <main className="min-h-screen bg-canvas px-4 py-12 sm:px-6">
      <article className="mx-auto w-full max-w-2xl break-words rounded-surface border border-border bg-surface p-6 sm:p-8">
        <WordmarkLink />
        <h1 className="mt-6 text-title text-text">{document.title}</h1>
        <p className="mt-1 text-small text-text-muted">{document.version}</p>

        <div className="mt-8 flex flex-col gap-8 text-body text-text">
          {document.sections.map((section, index) => (
            <section key={section.title} aria-labelledby={`seccion-${index + 1}`}>
              <h2 id={`seccion-${index + 1}`} className="text-section">{section.title}</h2>
              <p className="mt-2">{bodyWithLinks(section.body)}</p>
            </section>
          ))}
        </div>

        <p className="mt-8 flex flex-wrap justify-between gap-x-6 gap-y-2 border-t border-border pt-6 text-small">
          <Link to="/" className={`hit-area ${linkClass}`}>Volver a la página principal</Link>
          <Link to={other.to} className={`hit-area ${linkClass}`}>{other.label}</Link>
        </p>
      </article>
    </main>
  )
}
