import { PURCHASES_KEY, fetchPurchaseInvoices, restorePurchase, type Purchase } from '../purchases/purchasesApi'
import { TrashPage, type TrashConfig } from '../trash/TrashPage'

const config: TrashConfig<Purchase> = {
  title: 'Papelera de compras',
  subtitle: 'Facturas de compra anuladas. Puedes consultarlas o restaurarlas.',
  listPath: '/compras',
  listLabel: 'Facturas de compra',
  partyLabel: 'Proveedor',
  partyName: (purchase) => purchase.supplier.name,
  queryKey: PURCHASES_KEY,
  fetchInvoices: fetchPurchaseInvoices,
  restore: restorePurchase,
  restoreText:
    'La factura vuelve al listado como Pagada o Pendiente, según lo que tenga pagado. Se suman otra vez al inventario las unidades compradas y se descuentan de nuevo de las cuentas los pagos que tenía. El costo de cada producto pasa al de esta compra si es la más reciente de ese producto. Si alguna cuenta no tiene saldo para esos pagos, no se puede restaurar.',
}

/** Papelera de compras: las facturas de compra anuladas, con Restaurar. */
export function PurchasesTrashPage() {
  return <TrashPage config={config} />
}
