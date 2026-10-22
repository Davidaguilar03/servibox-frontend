import { PURCHASES_KEY, fetchPurchaseInvoices, restorePurchase, type Purchase } from '../purchases/purchasesApi'
import { TrashPage, type TrashConfig } from '../trash/TrashPage'

const config: TrashConfig<Purchase> = {
  title: 'Papelera de compras',
  subtitle: 'Facturas de compra anuladas. Puedes consultarlas o recuperarlas.',
  listPath: '/compras',
  listLabel: 'Facturas de compra',
  partyLabel: 'Proveedor',
  partyName: (purchase) => purchase.supplier.name,
  queryKey: PURCHASES_KEY,
  fetchInvoices: fetchPurchaseInvoices,
  restore: restorePurchase,
  restoreText:
    'La factura vuelve al listado como Pagada o Pendiente, según lo que tenga pagado. Se suman otra vez al inventario las unidades compradas y se descuentan de nuevo de las cuentas los pagos que tenía. El costo de los productos queda como está. Si alguna cuenta no tiene saldo para esos pagos, no se puede recuperar.',
}

/** Papelera de compras: las facturas de compra anuladas, con Recuperar. */
export function PurchasesTrashPage() {
  return <TrashPage config={config} />
}
