import { Link } from 'react-router'
import { WordmarkLink } from '../brand/WordmarkLink'
import { buttonClasses } from '../components/buttonStyles'
import { usePageMeta } from '../lib/usePageMeta'

/** Terminos y condiciones: el texto aun no existe. */
export function TermsPage() {
  usePageMeta('Términos y condiciones · ServiBox', 'Consulta los términos y condiciones de ServiBox. Muy pronto.')

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-md rounded-card border border-border bg-surface p-8 text-center shadow-card">
        <WordmarkLink />
        <h1 className="mt-6 text-h2 text-text">Términos y condiciones</h1>
        <p className="mt-2 text-small text-text-muted">Próximamente. Estamos preparando este texto.</p>
        <Link to="/" className={`mt-6 ${buttonClasses('secondary')}`}>
          Volver a la página principal
        </Link>
      </div>
    </main>
  )
}
