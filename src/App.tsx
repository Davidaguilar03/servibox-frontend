import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { routes } from './routes'

// Un solo reintento: el estado de error de cada bloque ya ofrece reintentar.
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } })
const router = createBrowserRouter(routes)

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
