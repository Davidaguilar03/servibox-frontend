import { BrandSymbol } from './BrandSymbol'

/** Marca provisional basada en la referencia, pendiente del recurso oficial. */
export function Wordmark({ onDark = false, compact = false }: { onDark?: boolean; compact?: boolean }) {
  return (
    <span role="img" aria-label="ServiBox" className="inline-flex items-center gap-3 whitespace-nowrap">
      <BrandSymbol />
      {!compact && (
        <span aria-hidden className="font-display text-title font-bold italic">
          <span className={onDark ? 'text-text-inverse' : 'text-text'}>Servi</span>
          <span className="text-brand">Box</span>
        </span>
      )}
    </span>
  )
}
