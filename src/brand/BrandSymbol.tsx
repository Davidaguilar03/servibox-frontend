import symbolUrl from './symbol.svg'

/** Simbolo provisional compartido con el favicon, sin depender de fuentes. */
export function BrandSymbol() {
  return <img src={symbolUrl} alt="" aria-hidden className="size-8 shrink-0" />
}
