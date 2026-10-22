import { useEffect, useRef, useState, type ChangeEvent, type CompositionEvent, type KeyboardEvent } from 'react'

/** Espera entre la ultima tecla y la escritura en la URL. */
export const URL_TEXT_DEBOUNCE_MS = 300

/**
 * Campo de texto atado a un parametro de la URL. El campo tiene su propio estado, que cambia
 * en cada tecla; la URL se escribe con `write` tras `URL_TEXT_DEBOUNCE_MS` sin teclear, o de
 * inmediato con Enter o al salir del campo. Mientras dura una composicion IME no se escribe.
 * Si la URL cambia por otra causa (atras, Limpiar, un enlace) el campo la adopta, salvo que
 * haya algo digitado sin escribir todavia. Ver docs/ai-context/03-DECISIONS.md.
 *
 * `write` decide la query string completa (y la pagina 1); se usa siempre la ultima.
 */
export function useUrlTextParam(urlValue: string, write: (value: string) => void) {
  const [value, setValue] = useState(urlValue)
  const [pending, setPending] = useState(false)
  const [seenUrl, setSeenUrl] = useState(urlValue)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const composing = useRef(false)
  const writeRef = useRef(write)

  useEffect(() => {
    writeRef.current = write
  })
  useEffect(() => () => clearTimeout(timer.current), [])

  if (urlValue !== seenUrl) {
    setSeenUrl(urlValue)
    if (!pending) setValue(urlValue)
  }

  function commit(next: string) {
    clearTimeout(timer.current)
    timer.current = undefined
    setPending(false)
    writeRef.current(next)
  }

  function schedule(next: string) {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => commit(next), URL_TEXT_DEBOUNCE_MS)
  }

  return {
    value,
    onChange(event: ChangeEvent<HTMLInputElement>) {
      const next = event.target.value
      setValue(next)
      setPending(true)
      if (!composing.current) schedule(next)
    },
    onCompositionStart() {
      composing.current = true
    },
    onCompositionEnd(event: CompositionEvent<HTMLInputElement>) {
      composing.current = false
      schedule(event.currentTarget.value)
    },
    onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
      if (event.key === 'Enter' && !event.nativeEvent.isComposing && timer.current !== undefined) commit(value)
    },
    onBlur() {
      if (timer.current !== undefined) commit(value)
    },
  }
}
