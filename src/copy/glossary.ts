// Glosario de la interfaz: un solo rotulo por concepto. Toda pantalla toma de aqui el texto de
// estos conceptos. Tabla y reglas en docs/ai-context/06-COPY.md.

export const GLOSSARY = {
  platformRequests: 'Solicitudes',
  platformTenants: 'Servitecas',
  tenantStatuses: { ACTIVE: 'Activa', SUSPENDED: 'Suspendida' },
  registrationStatuses: { PENDING: 'Pendiente', APPROVED: 'Aprobada', REJECTED: 'Rechazada', CANCELLED: 'Cancelada', ACTIVATED: 'Activada' },
  /** Agrupadores de navegacion, sin cambiar los conceptos financieros. */
  incomeNavigation: 'Ingresos',
  expenseNavigation: 'Egresos',
  treasury: 'Tesorería',
  accountColor: 'Color de la cuenta',
  /** Contado o Crédito. */
  paymentType: 'Forma de pago',
  /** Efectivo, Transferencia, Tarjeta, Cheque... */
  paymentMethod: 'Medio de pago',
  registerSale: 'Registrar venta',
  registerPurchase: 'Registrar compra',
  /** Ingresos que no vienen de una venta (la ruta sigue siendo /ventas/ingresos). */
  otherIncome: 'Otros ingresos',
  newOtherIncome: 'Nuevo ingreso',
  /** El identificador del tenant con el que se inicia sesion. */
  tenantCode: 'Código de tu serviteca',
  lowStockThreshold: 'Avisar con stock bajo en (unidades)',
  criticalStockThreshold: 'Avisar con stock crítico en (unidades)',
  lowStock: 'Stock bajo',
  criticalStock: 'Stock crítico',
  outOfStock: 'Sin stock',
  /** Cobro de una venta a crédito. */
  collection: 'Abono',
  /** Pago de una compra a crédito. */
  payment: 'Pago',
  pendingBalance: 'Saldo pendiente',
  annul: 'Anular',
  restore: 'Restaurar',
  trash: 'Papelera',
  /** Textos legales: nombre completo en la casilla de aceptacion, corto en los pies. */
  privacyPolicy: 'Política de tratamiento de datos personales',
  privacyPolicyShort: 'Política de datos',
  terms: 'Términos y condiciones',
} as const
