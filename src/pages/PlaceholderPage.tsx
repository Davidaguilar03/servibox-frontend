/** Pagina de una seccion privada que aun no tiene contenido. */
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-h1 text-text">{title}</h1>
      <p className="mt-1 text-small text-text-muted">Próximamente. Esta sección estará disponible pronto.</p>
    </div>
  )
}
