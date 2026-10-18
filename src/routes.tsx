import { Navigate, type RouteObject } from 'react-router'
import { RequireAuth } from './auth/RequireAuth'
import { AppShell, type RouteHandle } from './layout/AppShell'
import { ComingSoonPage } from './pages/ComingSoonPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { SalesInvoicesPage } from './pages/SalesInvoicesPage'

const privatePages = [
  { path: 'inventario', title: 'Inventario', breadcrumb: ['Inventario'] },
  { path: 'compras', title: 'Compras', breadcrumb: ['Compras'] },
  { path: 'cuentas', title: 'Cuentas', breadcrumb: ['Cuentas'] },
  { path: 'reportes', title: 'Reportes', breadcrumb: ['Reportes'] },
  { path: 'configuracion', title: 'Configuración', breadcrumb: ['Configuración'] },
  { path: 'ventas/nueva', title: 'Nueva factura', breadcrumb: ['Ventas', 'Nueva factura'] },
  { path: 'ventas/papelera', title: 'Papelera', breadcrumb: ['Ventas', 'Papelera'] },
  { path: 'ventas/:id', title: 'Detalle de factura', breadcrumb: ['Ventas', 'Detalle de factura'] },
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
