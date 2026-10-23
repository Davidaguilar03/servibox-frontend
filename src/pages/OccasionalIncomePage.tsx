import { ManualMovementsPage, type ManualMovementsConfig } from '../manualMovements/ManualMovementsPage'

const config: ManualMovementsConfig = {
  category: 'INGRESO_OCASIONAL',
  title: 'Ingresos ocasionales',
  subtitle: 'Ingresos que no vienen de una venta: reintegros, venta de chatarra, aportes.',
  listPath: '/ventas',
  listLabel: 'Facturas de venta',
  singular: 'ingreso',
  newLabel: 'Nuevo ingreso',
  createdToast: 'Ingreso registrado',
  emptyMessage: 'No hay ingresos registrados',
  filteredEmptyMessage: 'No hay ingresos con esos filtros.',
  conceptPlaceholder: 'Por ejemplo, venta de chatarra',
  accountHint: 'La cuenta a la que entra el dinero.',
}

/** Ingresos ocasionales: los ingresos manuales de tesoreria. */
export function OccasionalIncomePage() {
  return <ManualMovementsPage config={config} />
}
