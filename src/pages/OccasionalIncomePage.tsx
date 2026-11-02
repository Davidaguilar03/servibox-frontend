import { GLOSSARY } from '../copy/glossary'
import { ManualMovementsPage, type ManualMovementsConfig } from '../manualMovements/ManualMovementsPage'

const config: ManualMovementsConfig = {
  category: 'INGRESO_OCASIONAL',
  title: GLOSSARY.otherIncome,
  subtitle: 'Ingresos que no vienen de una venta: reintegros, venta de chatarra, aportes.',
  singular: 'ingreso',
  newLabel: GLOSSARY.newOtherIncome,
  createdToast: 'Ingreso registrado',
  emptyMessage: 'No hay ingresos registrados',
  filteredEmptyMessage: 'No hay ingresos con esos filtros.',
  conceptPlaceholder: 'Por ejemplo, venta de chatarra',
  accountHint: 'La cuenta a la que entra el dinero.',
}

/** Otros ingresos: los ingresos manuales de tesoreria. */
export function OccasionalIncomePage() {
  return <ManualMovementsPage config={config} />
}
