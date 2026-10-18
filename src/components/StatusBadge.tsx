export type BadgeStatus =
  | 'DISPONIBLE'
  | 'BAJO_STOCK'
  | 'STOCK_CRITICO'
  | 'SIN_STOCK'
  | 'PAGADA'
  | 'PENDIENTE'
  | 'ANULADA'
  | 'ACTIVO'
  | 'INACTIVO'

const badges: Record<BadgeStatus, { label: string; tone: string }> = {
  DISPONIBLE: { label: 'Disponible', tone: 'bg-success-bg text-success' },
  BAJO_STOCK: { label: 'Bajo stock', tone: 'bg-warning-bg text-warning' },
  // Variante que el manual no define: pendiente de validar con el disenador.
  STOCK_CRITICO: { label: 'Stock crítico', tone: 'bg-error-bg text-error' },
  SIN_STOCK: { label: 'Sin stock', tone: 'bg-error-bg text-error' },
  PAGADA: { label: 'Pagada', tone: 'bg-success-bg text-success' },
  PENDIENTE: { label: 'Pendiente', tone: 'bg-warning-bg text-warning' },
  ANULADA: { label: 'Anulada', tone: 'bg-neutral-200 text-text-muted' },
  ACTIVO: { label: 'Activo', tone: 'bg-success-bg text-success' },
  INACTIVO: { label: 'Inactivo', tone: 'bg-neutral-200 text-text-muted' },
}

/** Etiqueta de estado: siempre lleva texto, el color solo acompana. */
export function StatusBadge({ status }: { status: BadgeStatus }) {
  const { label, tone } = badges[status]
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-pill px-2.5 py-0.5 text-small font-medium ${tone}`}>
      {label}
    </span>
  )
}
