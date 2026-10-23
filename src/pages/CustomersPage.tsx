import { CounterpartiesPage, type CounterpartiesConfig } from '../counterparties/CounterpartiesPage'
import { CUSTOMERS_KEY, fetchSaleBalances } from '../counterparties/counterpartiesApi'
import { fetchCustomers } from '../sales/salesApi'

const config: CounterpartiesConfig = {
  role: 'CLIENTE',
  title: 'Clientes',
  subtitle: 'Las personas y empresas a las que les vendes, con lo que te deben.',
  singular: 'cliente',
  plural: 'clientes',
  listPath: '/ventas',
  listLabel: 'Facturas de venta',
  counterpartiesKey: CUSTOMERS_KEY,
  fetchCounterparties: fetchCustomers,
  invoicesKey: ['sales'],
  fetchInvoices: fetchSaleBalances,
  balanceLabel: 'Por cobrar',
  newInvoicePath: (id) => `/ventas/nueva?cliente=${id}`,
  createdToast: 'Cliente creado',
  promotedToast:
    'Ya existía como proveedor: ahora también es cliente. Se conservan el nombre y los datos que ya tenía registrados.',
}

/** Clientes (`/ventas/clientes`): `CounterpartiesPage` con el rol CLIENTE. */
export function CustomersPage() {
  return <CounterpartiesPage config={config} />
}
