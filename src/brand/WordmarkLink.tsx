import { Link } from 'react-router'
import { Wordmark } from './Wordmark'

/** El wordmark como enlace a la landing. */
export function WordmarkLink({ onDark = false }: { onDark?: boolean }) {
  return (
    <Link
      to="/"
      aria-label="ServiBox, ir a la página principal"
      className="inline-flex min-h-touch items-center rounded-control focus-ring"
    >
      <Wordmark onDark={onDark} />
    </Link>
  )
}
