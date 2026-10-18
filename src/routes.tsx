import { Navigate, type RouteObject } from 'react-router'
import { RequireAuth } from './auth/RequireAuth'
import { AppShell } from './layout/AppShell'
import { ComingSoonPage } from './pages/ComingSoonPage'
import { LoginPage } from './pages/LoginPage'
import { PlaceholderPage } from './pages/PlaceholderPage'

const privatePages = [
  { path: 'inicio', title: 'Inicio' },
  { path: 'inventario', title: 'Inventario' },
  { path: 'ventas', title: 'Ventas' },
  { path: 'compras', title: 'Compras' },
  { path: 'cuentas', title: 'Cuentas' },
  { path: 'reportes', title: 'Reportes' },
  { path: 'configuracion', title: 'Configuración' },
]

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
          ...privatePages.map(({ path, title }) => ({ path, element: <PlaceholderPage title={title} /> })),
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/inicio" replace /> },
]
