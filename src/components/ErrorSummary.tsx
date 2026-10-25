/**
 * Resumen para lectores de pantalla tras enviar con errores: cuantos campos revisar. Los
 * mensajes siguen bajo cada campo; este texto no se ve.
 */
export function ErrorSummary({ count }: { count: number }) {
  if (count === 0) return null
  // role=alert se anuncia al aparecer.
  return (
    <p role="alert" className="sr-only">
      {count === 1 ? 'Revisa el campo marcado.' : `Revisa los ${count} campos marcados.`}
    </p>
  )
}
