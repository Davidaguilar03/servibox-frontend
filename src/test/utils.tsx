import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '../routes'

/** JWT sin firma valida: el frontend solo lee el payload. */
export function makeToken(claims: Record<string, unknown>) {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '')
  return `${encode({ alg: 'HS256' })}.${encode(claims)}.firma`
}

export function validToken() {
  return makeToken({ sub: 'admin', role: 'ADMIN', exp: Math.floor(Date.now() / 1000) + 3600 })
}

export function renderRoute(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

/**
 * Una tecla tras otra como en el navegador, sin esperar a que React ni el router terminen
 * entre una y otra: los eventos van fuera de act, que en las pruebas aplica cada
 * actualizacion antes de la siguiente tecla.
 */
export function typeWithoutPause(input: HTMLInputElement, text: string) {
  const env = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  env.IS_REACT_ACT_ENVIRONMENT = false
  try {
    for (const char of text) {
      setValue?.call(input, input.value + char)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
  } finally {
    env.IS_REACT_ACT_ENVIRONMENT = true
  }
}
