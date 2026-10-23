import { Navigate, type RouteObject } from 'react-router'
import { RequireAuth } from './auth/RequireAuth'
import { AppShell, type RouteHandle } from './layout/AppShell'
import { AccountsPage } from './pages/AccountsPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { ComingSoonPage } from './pages/ComingSoonPage'
import { DashboardPage } from './pages/DashboardPage'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { NewPurchaseInvoicePage } from './pages/NewPurchaseInvoicePage'
import { NewSaleInvoicePage } from './pages/NewSaleInvoicePage'
import { PlaceholderPage } from './pages/PlaceholderPage'
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
import { TermsPage } from './pages/TermsPage'

const privatePages = [
  { path: 'configuracion', title: 'Configuración', breadcrumb: ['Configuración'] },
]

const handle = (breadcrumb: string[]): RouteHandle => ({ breadcrumb })

export const routes: RouteObject[] = [
  // Publicas: sin RequireAuth ni AppShell. Cada una fija su titulo con usePageMeta.
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/registro', element: <RegisterPage /> },
  { path: '/terminos', element: <TermsPage /> },
  { path: '/recuperar-contrasena', element: <ComingSoonPage title="Recuperar tu contraseña" /> },
  { path: '/crear-cuenta', element: <Navigate to="/registro" replace /> },
  {
    // Ruta de layout sin path: las privadas siguen colgando de la raiz.
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: 'inicio', element: <DashboardPage />, handle: handle(['Inicio']) },
          { path: 'ventas', element: <SalesInvoicesPage />, handle: handle(['Ventas', 'Facturas de venta']) },
          { path: 'ventas/papelera', element: <SalesTrashPage />, handle: handle(['Ventas', 'Papelera']) },
          {
            path: 'ventas/nueva',
            element: <NewSaleInvoicePage />,
            handle: handle(['Ventas', 'Facturas de venta', 'Nueva factura']),
          },
          {
            path: 'ventas/:id',
            element: <SaleDetailPage />,
            // El ultimo tramo lo reemplaza la pagina por el numero de la factura.
            handle: handle(['Ventas', 'Facturas de venta', 'Detalle de factura']),
          },
          { path: 'compras', element: <PurchaseInvoicesPage />, handle: handle(['Compras', 'Facturas de compra']) },
          { path: 'compras/papelera', element: <PurchasesTrashPage />, handle: handle(['Compras', 'Papelera']) },
          {
            path: 'compras/nueva',
            element: <NewPurchaseInvoicePage />,
            handle: handle(['Compras', 'Facturas de compra', 'Nueva factura']),
          },
          {
            path: 'compras/:id',
            element: <PurchaseDetailPage />,
            // El ultimo tramo lo reemplaza la pagina por el numero de la factura.
            handle: handle(['Compras', 'Facturas de compra', 'Detalle de factura']),
          },
          { path: 'reportes', element: <ReportsPage />, handle: handle(['Reportes']) },
          // El ultimo tramo lo reemplaza la pagina por la cuenta seleccionada.
          { path: 'cuentas', element: <AccountsPage />, handle: handle(['Cuentas', 'Movimientos']) },
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
          ...privatePages.map(({ path, title, breadcrumb }) => ({
            path,
            element: <PlaceholderPage title={title} />,
            handle: handle(breadcrumb),
          })),
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/inicio" replace /> },
]
