// Texto de un campo de monto en formato colombiano: punto de miles y coma decimal. Solo da forma
// al texto: si los decimales se aceptan o no lo decide la validacion de cada formulario.

const significant = (text: string) => text.replace(/[^\d,]/g, '')

/**
 * Deja digitos y la primera coma, sin ceros a la izquierda y con punto de miles. Los puntos que
 * trae el texto se ignoran: son los del propio formato. La coma se conserva para que escribir
 * `98500,50` llegue a la validacion en vez de convertirse en `9.850.050`.
 */
export function formatAmountText(text: string): string {
  const clean = significant(text)
  const comma = clean.indexOf(',')
  const integer = (comma === -1 ? clean : clean.slice(0, comma)).replace(/^0+(?=\d)/, '')
  const decimals = comma === -1 ? '' : `,${clean.slice(comma + 1).replace(/,/g, '')}`
  return integer.replace(/\B(?=(\d{3})+$)/g, '.') + decimals
}

/**
 * Posicion del cursor en el texto ya formateado: queda detras del mismo digito que tenia
 * antes, sin contar los puntos de miles.
 */
export function caretAfterFormat(raw: string, caret: number, formatted: string): number {
  const removed = significant(raw).length - significant(formatted).length
  let remaining = Math.max(0, significant(raw.slice(0, caret)).length - removed)
  if (remaining === 0) return 0
  for (let index = 0; index < formatted.length; index += 1) {
    if (formatted[index] !== '.') remaining -= 1
    if (remaining === 0) return index + 1
  }
  return formatted.length
}

/**
 * Texto pegado de otro lado, donde el punto no siempre es de miles. Con los dos separadores, el
 * ultimo es el decimal. Con uno solo, es de miles si se repite o si lo siguen tres digitos; si
 * no, es decimal (`98500.50` no se convierte en `9.850.050`).
 */
export function normalizePastedAmount(text: string): string {
  const clean = text.replace(/[^\d.,]/g, '')
  const lastDot = clean.lastIndexOf('.')
  const lastComma = clean.lastIndexOf(',')
  const last = Math.max(lastDot, lastComma)
  if (last === -1) return clean
  const decimals = clean.slice(last + 1)
  const both = lastDot !== -1 && lastComma !== -1
  const once = clean.indexOf(clean.charAt(last)) === last
  const isDecimal = both || (once && decimals.length > 0 && decimals.length !== 3)
  const digits = (isDecimal ? clean.slice(0, last) : clean).replace(/[.,]/g, '')
  return isDecimal ? `${digits},${decimals}` : digits
}
