import { fetchSales, type Sale } from '../dashboard/dashboardApi'
import { restoreSale } from '../sales/salesApi'
import { customerName } from '../sales/salesList'
import { TrashPage, type TrashConfig } from '../trash/TrashPage'

const config: TrashConfig<Sale> = {
  title: 'Papelera de ventas',
  subtitle: 'Facturas de venta anuladas. Puedes consultarlas o recuperarlas.',
  listPath: '/ventas',
  listLabel: 'Facturas de venta',
  partyLabel: 'Cliente',
  partyName: customerName,
  queryKey: ['sales'],
  fetchInvoices: fetchSales,
  restore: restoreSale,
  restoreText:
    'La factura vuelve al listado como Pagada o Pendiente, según lo que tenga abonado. Se descuentan otra vez del inventario las unidades vendidas y se restablecen en las cuentas el pago y los abonos que tenía. Si algún producto ya no tiene las unidades suficientes, no se puede recuperar.',
}

/** Papelera de ventas: las facturas de venta anuladas, con Recuperar. */
export function SalesTrashPage() {
  return <TrashPage config={config} />
}
