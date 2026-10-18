/**
 * Wordmark provisional de texto. Reemplazar por los archivos oficiales de /brand/logo/
 * cuando existan; no recomponer el logotipo.
 */
export function Wordmark({ onDark = false }: { onDark?: boolean }) {
  return (
    <span className="font-display text-h3 font-bold">
      <span className={onDark ? 'text-neutral-50' : 'text-text'}>Servi</span>
      <span className="text-brand">Box</span>
    </span>
  )
}
