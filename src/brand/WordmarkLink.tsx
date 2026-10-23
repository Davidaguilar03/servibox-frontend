import { Link } from 'react-router'
import { Wordmark } from './Wordmark'

/** El wordmark como enlace a la landing. */
export function WordmarkLink({ onDark = false }: { onDark?: boolean }) {
  return (
    <Link
      to="/"
      aria-label="ServiBox, ir a la página principal"
      className="inline-block rounded-tag focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <Wordmark onDark={onDark} />
    </Link>
  )
}
