import { ManualMovementsPage, type ManualMovementsConfig } from '../manualMovements/ManualMovementsPage'

const config: ManualMovementsConfig = {
  category: 'GASTO_OPERATIVO',
  title: 'Gastos operativos',
  subtitle: 'Gastos que no vienen de una factura de compra: arriendo, servicios, papelería.',
  listPath: '/compras',
  listLabel: 'Facturas de compra',
  singular: 'gasto',
  newLabel: 'Nuevo gasto',
  createdToast: 'Gasto registrado',
  emptyMessage: 'No hay gastos registrados',
  filteredEmptyMessage: 'No hay gastos con esos filtros.',
  conceptPlaceholder: 'Por ejemplo, pago de arriendo',
  accountHint: 'La cuenta de la que sale el dinero.',
}

/** Gastos operativos: los egresos manuales de tesoreria. */
export function OperationalExpensesPage() {
  return <ManualMovementsPage config={config} />
}
