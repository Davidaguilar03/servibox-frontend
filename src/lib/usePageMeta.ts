import { useEffect } from 'react'

/**
 * Titulo del documento y meta description de una pagina publica. Al salir de la pagina
 * se restauran los anteriores.
 */
export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.append(meta)
    }
    const previous = { title: document.title, description: meta.content }
    document.title = title
    meta.content = description
    return () => {
      document.title = previous.title
      meta.content = previous.description
    }
  }, [title, description])
}
