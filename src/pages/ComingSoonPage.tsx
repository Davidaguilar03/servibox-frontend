import { Link } from 'react-router'
import { Wordmark } from '../brand/Wordmark'
import { usePageMeta } from '../lib/usePageMeta'

/** Placeholder de las rutas publicas que aun no existen. */
export function ComingSoonPage({ title }: { title: string }) {
  usePageMeta(`${title} · ServiBox`, `${title} estará disponible pronto en ServiBox.`)
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-md rounded-card border border-border bg-surface p-8 text-center shadow-card">
        <Wordmark />
        <h1 className="mt-6 text-h2 text-text">Próximamente</h1>
        <p className="mt-2 text-small text-text-muted">{title} estará disponible pronto.</p>
        <Link
          to="/login"
          className="mt-6 inline-block rounded-tag text-small font-medium text-brand-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Volver a iniciar sesión
        </Link>
      </div>
    </div>
  )
}
