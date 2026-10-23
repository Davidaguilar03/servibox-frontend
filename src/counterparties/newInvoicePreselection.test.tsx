import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { saveToken } from '../auth/session'
import { jsonResponse, renderRoute, validToken } from '../test/utils'

// Nueva factura de venta y de compra con el tercero de ?cliente= o ?proveedor= (enlace
// Nueva factura de Clientes y Proveedores). Las pruebas propias de esas pantallas no cambian.

const customers = [
  { id: 1, role: 'CLIENTE', name: 'Consumidor final', documentType: 'NIT', documentNumber: '222222222222', email: null, phone: null },
  { id: 2, role: 'CLIENTE', name: 'Transportes Boyacá S.A.S.', documentType: 'NIT', documentNumber: '900123456', email: 'compras@transboyaca.co', phone: null },
  { id: 6, role: 'AMBOS', name: 'Lubricantes del Norte', documentType: 'NIT', documentNumber: '900666222', email: null, phone: null },
]
const suppliers = [
  { id: 5, role: 'PROVEEDOR', name: 'Distrillantas Boyacá S.A.S.', documentType: 'NIT', documentNumber: '900555111', email: 'ventas@distrillantas.co', phone: null },
  { id: 6, role: 'AMBOS', name: 'Lubricantes del Norte', documentType: 'NIT', documentNumber: '900666222', email: null, phone: null },
]

function mockApi(counterparties: unknown[]) {
  const routes: Record<string, () => Response> = {
    'GET /api/sales/next-invoice-number': () => jsonResponse({ invoiceNumber: 'FV-0232' }),
    'GET /api/counterparties': () => jsonResponse(counterparties),
    'GET /api/treasury/accounts': () => jsonResponse([{ id: 10, name: 'Caja General', type: 'EFECTIVO', currentBalance: 0 }]),
    'GET /api/inventory/products': () => jsonResponse([]),
    'GET /api/inventory/categories': () => jsonResponse([]),
    'GET /api/sales': () => jsonResponse([]),
    'GET /api/purchases': () => jsonResponse([]),
    'GET /api/reporting/kpis': () => jsonResponse({ totalSales: 0, totalPurchases: 0 }),
    'GET /api/treasury/movements': () => jsonResponse([]),
  }
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) => {
      const handler = routes[`${init?.method ?? 'GET'} ${url.split('?')[0] ?? ''}`]
      return Promise.resolve(handler ? handler() : jsonResponse({ error: 'No encontrado', status: 404 }, 404))
    }),
  )
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-23T15:00:00Z'))
  saveToken(validToken())
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Nueva factura de venta con cliente preseleccionado', () => {
  async function open(path: string) {
    mockApi(customers)
    const router = renderRoute(path)
    await screen.findByRole('heading', { name: 'Nueva factura de venta' })
    return router
  }

  it('elige el cliente del parametro y no lo cuenta como cambio', async () => {
    const router = await open('/ventas/nueva?cliente=2')
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Cliente' })).toHaveValue('Transportes Boyacá S.A.S.'))
    expect(screen.getByLabelText('Correo del cliente')).toHaveValue('compras@transboyaca.co')

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/ventas'))
    expect(screen.queryByRole('dialog', { name: 'Descartar cambios' })).not.toBeInTheDocument()
  })

  it('acepta un tercero AMBOS', async () => {
    await open('/ventas/nueva?cliente=6')
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Cliente' })).toHaveValue('Lubricantes del Norte'))
  })

  it.each([
    ['inexistente', '99'],
    ['de otro rol', '5'],
    ['no numerico', 'abc'],
  ])('ignora un id %s y deja el Consumidor final', async (_, id) => {
    await open(`/ventas/nueva?cliente=${id}`)
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Cliente' })).toHaveValue('Consumidor final'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('Nueva factura de compra con proveedor preseleccionado', () => {
  async function open(path: string) {
    mockApi(suppliers)
    const router = renderRoute(path)
    await screen.findByRole('heading', { name: 'Nueva factura de compra' })
    return router
  }

  it('elige el proveedor del parametro y no lo cuenta como cambio', async () => {
    const router = await open('/compras/nueva?proveedor=5')
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Proveedor' })).toHaveValue('Distrillantas Boyacá S.A.S.'))
    expect(screen.getByLabelText('Documento')).toHaveValue('NIT 900555111')

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/compras'))
    expect(screen.queryByRole('dialog', { name: 'Descartar cambios' })).not.toBeInTheDocument()
  })

  it.each([
    ['inexistente', '99'],
    ['de otro rol', '2'],
  ])('ignora un id %s y arranca sin proveedor', async (_, id) => {
    await open(`/compras/nueva?proveedor=${id}`)
    const combo = await screen.findByRole('combobox', { name: 'Proveedor' })
    // Con la lista ya cargada (sus opciones aparecen) el campo sigue vacio.
    await userEvent.click(combo)
    expect(await screen.findByRole('option', { name: /Distrillantas/ })).toBeInTheDocument()
    expect(combo).toHaveValue('')
  })
})
