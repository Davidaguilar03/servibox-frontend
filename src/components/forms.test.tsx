import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { saveToken } from '../auth/session'
import { INVOICE_TABLE_FULL, INVOICE_TABLE_MEDIUM } from '../lib/useElementWidth'
import { jsonResponse, renderRoute, validToken } from '../test/utils'
import { DiscardableModal } from './DiscardableModal'

const sale = {
  id: 1,
  invoiceNumber: 'FV-0001',
  customer: { name: 'Transportes Boyacá' },
  invoiceDate: '2026-10-10',
  dueDate: '2026-11-09',
  paymentType: 'CREDITO',
  status: 'PENDIENTE',
  total: 2380000,
  pendingBalance: 1380000,
}

/** ResizeObserver de prueba: informa el ancho pedido del recuadro observado. */
function stubContainerWidth(width: number) {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      callback: ResizeObserverCallback
      constructor(callback: ResizeObserverCallback) {
        this.callback = callback
      }
      observe(target: Element) {
        this.callback([{ target, contentRect: { width } } as unknown as ResizeObserverEntry], this as unknown as ResizeObserver)
      }
      disconnect() {}
      unobserve() {}
    },
  )
}

async function invoiceHeaders(width: number) {
  saveToken(validToken())
  stubContainerWidth(width)
  vi.stubGlobal('fetch', vi.fn((url: string) => Promise.resolve(jsonResponse(url.startsWith('/api/sales') ? [sale] : []))))
  renderRoute('/ventas?periodo=todas')
  await screen.findByRole('heading', { level: 1, name: 'Facturas de venta' })
  await waitFor(() => expect(screen.getAllByText('FV-0001').length).toBeGreaterThan(0), { timeout: 3000 }).catch(() => {
    throw new Error(document.body.textContent?.slice(0, 600))
  })
  const table = screen.getByRole('table')
  return { table, headers: within(table).getAllByRole('columnheader').map((cell) => cell.textContent) }
}

describe('tabla de facturas por ancho del recuadro', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('con espacio muestra todas las columnas', async () => {
    const { headers } = await invoiceHeaders(INVOICE_TABLE_FULL)
    expect(headers).toEqual(['N.º factura', 'Fecha', 'Cliente', 'Vence', 'Forma de pago', 'Estado', 'Total', 'Saldo pendiente', ''])
  })

  it('en un recuadro mediano Vence y Forma de pago pasan a la segunda linea del cliente', async () => {
    const { table, headers } = await invoiceHeaders(INVOICE_TABLE_FULL - 1)
    expect(headers).toEqual(['N.º factura', 'Fecha', 'Cliente', 'Estado', 'Total', 'Saldo pendiente', ''])
    expect(within(table).getByText('Crédito · Vence 09/11/2026')).toHaveClass('text-small')
  })

  it('en un recuadro angosto tambien la fecha va a la segunda linea', async () => {
    const { table, headers } = await invoiceHeaders(INVOICE_TABLE_MEDIUM - 1)
    expect(headers).toEqual(['N.º factura', 'Cliente', 'Estado', 'Total', 'Saldo pendiente', ''])
    expect(within(table).getByText('10/10/2026 · Crédito · Vence 09/11/2026')).toBeInTheDocument()
    expect(within(table).getByText('$ 1.380.000')).toBeInTheDocument()
  })
})

function GuardedForm({ onClosed }: { onClosed: () => void }) {
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(true)
  if (!open) return null
  const close = () => {
    setOpen(false)
    onClosed()
  }
  return (
    <DiscardableModal
      title="Registrar abono"
      dirty={value !== ''}
      busy={false}
      onClose={close}
      discardMessage="Si cierras ahora, se pierde lo que digitaste en este abono."
      footer={(requestClose) => (
        <>
          <button type="button" onClick={requestClose}>
            Cancelar
          </button>
          <button type="button" onClick={close}>
            Guardar
          </button>
        </>
      )}
    >
      <label>
        Valor
        <input value={value} onChange={(event) => setValue(event.target.value)} />
      </label>
    </DiscardableModal>
  )
}

describe('guardian de cambios de los modales', () => {
  it('sin cambios cierra de inmediato con Esc', async () => {
    const onClosed = vi.fn()
    const user = userEvent.setup()
    render(<GuardedForm onClosed={onClosed} />)
    await user.keyboard('{Escape}')
    expect(onClosed).toHaveBeenCalledOnce()
  })

  it('con cambios, Esc, la X, Cancelar y el clic fuera piden confirmar con el foco en Seguir editando', async () => {
    const onClosed = vi.fn()
    const user = userEvent.setup()
    render(<GuardedForm onClosed={onClosed} />)
    await user.type(screen.getByLabelText('Valor'), '5000')

    const closers = [
      () => user.keyboard('{Escape}'),
      () => user.click(screen.getByRole('button', { name: 'Cerrar' })),
      () => user.click(screen.getByRole('button', { name: 'Cancelar' })),
      async () => fireEvent.mouseDown(screen.getByRole('dialog').parentElement as HTMLElement),
    ]
    for (const close of closers) {
      await close()
      expect(screen.getByRole('dialog', { name: '¿Descartar los cambios?' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Seguir editando' })).toHaveFocus()
      expect(screen.getByRole('button', { name: 'Seguir editando' })).toHaveAttribute('data-variant', 'primary')
      expect(screen.getByRole('button', { name: 'Descartar' })).toHaveAttribute('data-variant', 'secondary')
      await user.click(screen.getByRole('button', { name: 'Seguir editando' }))
      expect(screen.getByLabelText('Valor')).toHaveValue('5000')
    }
    expect(onClosed).not.toHaveBeenCalled()

    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(onClosed).toHaveBeenCalledOnce()
  })

  it('tras guardar cierra sin preguntar', async () => {
    const onClosed = vi.fn()
    const user = userEvent.setup()
    render(<GuardedForm onClosed={onClosed} />)
    await user.type(screen.getByLabelText('Valor'), '5000')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(onClosed).toHaveBeenCalledOnce())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

const product = {
  id: 1,
  code: 'LL-001',
  description: 'Llanta Michelin 175/70 R13',
  purchaseCost: 252000,
  quantity: 6,
  taxAmount: 47880,
  suggestedPrice: 323077,
  categoryId: 1,
  categoryName: 'LLANTAS',
}
const category = { id: 1, name: 'LLANTAS', color: '#e74c3c', yellowStockMin: 10, redStockMin: 3, targetMargin: 0.22, taxTypes: [] }
const customer = { id: 7, role: 'CLIENTE', name: 'Transportes Boyacá', documentType: 'NIT', documentNumber: '900123456', email: 'compras@tb.co', phone: '3001234567' }

async function headersAt(path: string, width: number, rowText: string) {
  saveToken(validToken())
  stubContainerWidth(width)
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      Promise.resolve(
        jsonResponse(
          url.startsWith('/api/inventory/products')
            ? [product]
            : url.startsWith('/api/inventory/categories')
              ? [category]
              : url.startsWith('/api/counterparties')
                ? [customer]
                : url.includes('financial-settings')
                  ? { expensesRate: 0.1, dianRate: 0, icaRate: 0, cardCommissionRate: 0 }
                  : [],
        ),
      ),
    ),
  )
  renderRoute(path)
  await waitFor(() => expect(screen.getAllByText(rowText).length).toBeGreaterThan(0), { timeout: 4000 })
  const table = screen.getByRole('table')
  return { table, headers: within(table).getAllByRole('columnheader').map((cell) => cell.textContent) }
}

describe('tablas por prioridad segun el ancho del recuadro', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('productos: con espacio todas; en un recuadro angosto categoria y costo van en la segunda linea', async () => {
    const wide = await headersAt('/inventario', 940, 'LL-001')
    expect(wide.headers).toEqual(['Código', 'Descripción', 'Categoría', 'Stock', 'Costo sin IVA', 'Precio sugerido sin IVA', 'Estado', ''])
  })

  it('productos angosto', async () => {
    const narrow = await headersAt('/inventario', 939, 'LL-001')
    expect(narrow.headers).toEqual(['Código', 'Descripción', 'Stock', 'Precio sugerido sin IVA', 'Estado', ''])
    expect(within(narrow.table).getByText(/· Costo/)).toHaveClass('text-small')
    expect(within(narrow.table).getByText('$ 252.000')).toBeInTheDocument()
  })

  it('clientes angosto: correo y celular bajo el nombre', async () => {
    const narrow = await headersAt('/ventas/clientes', 700, 'Transportes Boyacá')
    expect(narrow.headers).not.toContain('Correo')
    expect(narrow.headers).not.toContain('Celular')
    expect(within(narrow.table).getByText('compras@tb.co · 3001234567')).toHaveClass('text-small')
  })
})
