import { CounterpartiesPage, type CounterpartiesConfig } from '../counterparties/CounterpartiesPage'
import { fetchPurchaseBalances } from '../counterparties/counterpartiesApi'
import { PURCHASES_KEY, SUPPLIERS_KEY, fetchSuppliers } from '../purchases/purchasesApi'

const config: CounterpartiesConfig = {
  role: 'PROVEEDOR',
  title: 'Proveedores',
  subtitle: 'Las personas y empresas a las que les compras, con lo que les debes.',
  singular: 'proveedor',
  plural: 'proveedores',
  listPath: '/compras',
  listLabel: 'Facturas de compra',
  counterpartiesKey: SUPPLIERS_KEY,
  fetchCounterparties: fetchSuppliers,
  invoicesKey: PURCHASES_KEY,
  fetchInvoices: fetchPurchaseBalances,
  balanceLabel: 'Por pagar',
  newInvoicePath: (id) => `/compras/nueva?proveedor=${id}`,
  createdToast: 'Proveedor creado',
  promotedToast:
    'Ya existía como cliente: ahora también es proveedor. Se conservan el nombre y los datos que ya tenía registrados.',
}

/** Proveedores (`/compras/proveedores`): `CounterpartiesPage` con el rol PROVEEDOR. */
export function SuppliersPage() {
  return <CounterpartiesPage config={config} />
}
