import type { MouseEvent } from 'react'

/**
 * "Saltar al contenido": primer elemento enfocable de la pagina. Lleva el foco al `main`
 * (`id="contenido"`, `tabIndex={-1}`). Compartido por la landing y el shell.
 */
export function SkipLink() {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    const main = document.getElementById('contenido')
    if (!main) return
    event.preventDefault()
    main.focus()
  }

  return (
    <a
      href="#contenido"
      onClick={handleClick}
      className="sr-only z-50 rounded-control bg-surface text-small font-semibold text-text shadow-raised focus-ring focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:px-4 focus:py-2"
    >
      Saltar al contenido
    </a>
  )
}
