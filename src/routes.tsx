import { Navigate, type RouteObject } from 'react-router'
import { RequireAuth } from './auth/RequireAuth'
import { AppShell, type RouteHandle } from './layout/AppShell'
import { ComingSoonPage } from './pages/ComingSoonPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { NewSaleInvoicePage } from './pages/NewSaleInvoicePage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { ReportsPage } from './pages/ReportsPage'
import { SaleDetailPage } from './pages/SaleDetailPage'
import { SalesInvoicesPage } from './pages/SalesInvoicesPage'

const privatePages = [
  { path: 'inventario', title: 'Inventario', breadcrumb: ['Inventario'] },
  { path: 'compras', title: 'Compras', breadcrumb: ['Compras'] },
  { path: 'cuentas', title: 'Cuentas', breadcrumb: ['Cuentas'] },
  { path: 'configuracion', title: 'Configuración', breadcrumb: ['Configuración'] },
  { path: 'ventas/papelera', title: 'Papelera', breadcrumb: ['Ventas', 'Papelera'] },
]

const handle = (breadcrumb: string[]): RouteHandle => ({ breadcrumb })

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/recuperar-contrasena', element: <ComingSoonPage title="Recuperar tu contraseña" /> },
  { path: '/crear-cuenta', element: <ComingSoonPage title="Crear tu cuenta" /> },
  {
    path: '/',
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/inicio" replace /> },
          { path: 'inicio', element: <DashboardPage />, handle: handle(['Inicio']) },
          { path: 'ventas', element: <SalesInvoicesPage />, handle: handle(['Ventas', 'Facturas de venta']) },
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
          { path: 'reportes', element: <ReportsPage />, handle: handle(['Reportes']) },
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
