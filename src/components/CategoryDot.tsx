/**
 * Punto con el color de una categoria. El color es un dato que guarda el backend (ver la
 * paleta en inventory/categoryForm.ts), no un token; sin color queda en gris.
 */
export function CategoryDot({ color }: { color: string | undefined }) {
  return (
    <span
      className="inline-block size-2 shrink-0 rounded-pill bg-neutral-400"
      style={color ? { backgroundColor: color } : undefined}
      aria-hidden
    />
  )
}
