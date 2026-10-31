import { GLOSSARY } from './copy/glossary'
import { Navigate, type RouteObject } from 'react-router'
import { RequireAuth } from './auth/RequireAuth'
import { AppShell, type RouteHandle } from './layout/AppShell'
import { AccountsPage } from './pages/AccountsPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { CustomersPage } from './pages/CustomersPage'
import { DashboardPage } from './pages/DashboardPage'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { NewPurchaseInvoicePage } from './pages/NewPurchaseInvoicePage'
import { NewSaleInvoicePage } from './pages/NewSaleInvoicePage'
import { PlatformLoginPage } from './pages/PlatformLoginPage'
import { PlatformOverviewPage } from './pages/PlatformOverviewPage'
import { PlatformRequireAuth } from './platform/PlatformRequireAuth'
import { PlatformShell } from './platform/PlatformShell'
import { OccasionalIncomePage } from './pages/OccasionalIncomePage'
import { OperationalExpensesPage } from './pages/OperationalExpensesPage'
import { ProductFormPage } from './pages/ProductFormPage'
import { ProductsPage } from './pages/ProductsPage'
import { PurchaseDetailPage } from './pages/PurchaseDetailPage'
import { PurchaseInvoicesPage } from './pages/PurchaseInvoicesPage'
import { PurchasesTrashPage } from './pages/PurchasesTrashPage'
import { RegisterPage } from './pages/RegisterPage'
import { ReportsPage } from './pages/ReportsPage'
import { SaleDetailPage } from './pages/SaleDetailPage'
import { SalesInvoicesPage } from './pages/SalesInvoicesPage'
import { SalesTrashPage } from './pages/SalesTrashPage'
import { SuppliersPage } from './pages/SuppliersPage'
import { TermsPage } from './pages/TermsPage'
import { SettingsPage } from './settings/SettingsPage'

// Destino de cada tramo de la miga cuando no es el ultimo.
const crumbLinks: Record<string, string> = {
  Ventas: '/ventas',
  'Facturas de venta': '/ventas',
  Compras: '/compras',
  'Facturas de compra': '/compras',
  Inventario: '/inventario',
  Productos: '/inventario',
  [GLOSSARY.treasury]: '/cuentas',
  Movimientos: '/cuentas',
}

const handle = (breadcrumb: string[]): RouteHandle => ({
  breadcrumb: breadcrumb.map((label) => ({ label, to: crumbLinks[label] })),
})

export const routes: RouteObject[] = [
  // Publicas: sin RequireAuth ni AppShell. Cada una fija su titulo con usePageMeta.
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/registro', element: <RegisterPage /> },
  { path: '/terminos', element: <TermsPage /> },
  { path: '/crear-cuenta', element: <Navigate to="/registro" replace /> },
  // Plataforma: acceso, guard, shell y cache propios; la sesion de serviteca no cuenta aqui.
  // Siguientes entregas: /plataforma/solicitudes, /plataforma/servitecas y /plataforma/servitecas/:id.
  { path: '/plataforma/login', element: <PlatformLoginPage /> },
  {
    path: '/plataforma',
    element: <PlatformRequireAuth />,
    children: [
      {
        element: <PlatformShell />,
        children: [{ index: true, element: <PlatformOverviewPage />, handle: handle(['Resumen']) }],
      },
      { path: '*', element: <Navigate to="/plataforma" replace /> },
    ],
  },
  {
    // Ruta de layout sin path: las privadas siguen colgando de la raiz.
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: 'inicio', element: <DashboardPage />, handle: handle(['Inicio']) },
          { path: 'ventas', element: <SalesInvoicesPage />, handle: handle([GLOSSARY.incomeNavigation, 'Facturas de venta']) },
          { path: 'ventas/papelera', element: <SalesTrashPage />, handle: handle([GLOSSARY.incomeNavigation, 'Papelera']) },
          { path: 'ventas/ingresos', element: <OccasionalIncomePage />, handle: handle([GLOSSARY.incomeNavigation, GLOSSARY.otherIncome]) },
          { path: 'ventas/clientes', element: <CustomersPage />, handle: handle([GLOSSARY.incomeNavigation, 'Clientes']) },
          {
            path: 'ventas/nueva',
            element: <NewSaleInvoicePage />,
            handle: handle([GLOSSARY.incomeNavigation, 'Facturas de venta', 'Nueva factura']),
          },
          {
            path: 'ventas/:id',
            element: <SaleDetailPage />,
            // El ultimo tramo lo reemplaza la pagina por el numero de la factura.
            handle: handle([GLOSSARY.incomeNavigation, 'Facturas de venta', 'Detalle de factura']),
          },
          { path: 'compras', element: <PurchaseInvoicesPage />, handle: handle([GLOSSARY.expenseNavigation, 'Facturas de compra']) },
          { path: 'compras/papelera', element: <PurchasesTrashPage />, handle: handle([GLOSSARY.expenseNavigation, 'Papelera']) },
          { path: 'compras/gastos', element: <OperationalExpensesPage />, handle: handle([GLOSSARY.expenseNavigation, 'Gastos operativos']) },
          { path: 'compras/proveedores', element: <SuppliersPage />, handle: handle([GLOSSARY.expenseNavigation, 'Proveedores']) },
          {
            path: 'compras/nueva',
            element: <NewPurchaseInvoicePage />,
            handle: handle([GLOSSARY.expenseNavigation, 'Facturas de compra', 'Nueva factura']),
          },
          {
            path: 'compras/:id',
            element: <PurchaseDetailPage />,
            // El ultimo tramo lo reemplaza la pagina por el numero de la factura.
            handle: handle([GLOSSARY.expenseNavigation, 'Facturas de compra', 'Detalle de factura']),
          },
          { path: 'reportes', element: <ReportsPage />, handle: handle(['Reportes']) },
          // El ultimo tramo lo reemplaza la pagina por la cuenta seleccionada.
          { path: 'cuentas', element: <AccountsPage />, handle: handle([GLOSSARY.treasury]) },
          { path: 'inventario', element: <ProductsPage />, handle: handle(['Inventario', 'Productos']) },
          {
            path: 'inventario/nuevo',
            element: <ProductFormPage />,
            handle: handle(['Inventario', 'Productos', 'Nuevo producto']),
          },
          {
            path: 'inventario/:id/editar',
            element: <ProductFormPage />,
            handle: handle(['Inventario', 'Productos', 'Editar producto']),
          },
          { path: 'inventario/categorias', element: <CategoriesPage />, handle: handle(['Inventario', 'Categorías']) },
          { path: 'configuracion', element: <SettingsPage />, handle: handle(['Configuración']) },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/inicio" replace /> },
]
