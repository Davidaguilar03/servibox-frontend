import { describe, expect, it } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { DataTable } from '../components/DataTable'
import { IndicatorCard } from '../components/IndicatorCard'
import { Modal } from '../components/Modal'
import { Toaster } from '../components/Toaster'
import { EmptyState } from '../components/states'
import { showToast } from '../components/toast'

// Sombras solo en lo que flota (docs/ai-context/05-DESIGN-SYSTEM.md): las tarjetas, tablas y
// estados se separan con borde; el modal, el toast y el menu movil si llevan sombra.

const withShadow = (root: HTMLElement) =>
  [root, ...root.querySelectorAll<HTMLElement>('*')].filter((el) => /(^|\s)(\w+:)?shadow-(?!none)/.test(el.className))

describe('superficies', () => {
  it('la tabla y sus tarjetas moviles no llevan sombra y usan el radio surface', () => {
    const { container } = render(
      <DataTable
        columns={[{ header: 'Total', align: 'right', render: (row: { id: number }) => <span className="monto">{row.id}</span> }]}
        rows={[{ id: 1 }]}
        rowKey={(row) => row.id}
        loading={false}
        error={false}
        onRetry={() => {}}
        emptyMessage=""
        card={(row) => row.id}
        cardsLabel="Tarjetas"
      />,
    )
    expect(withShadow(container)).toEqual([])
    expect(screen.getByRole('list', { name: 'Tarjetas' }).firstElementChild).toHaveClass('rounded-surface', 'border')
    expect(screen.getByRole('cell')).toHaveClass('text-body')
  })

  it('la tarjeta de indicador no lleva sombra y su cifra usa el rol monto con text-title', () => {
    const { container } = render(<IndicatorCard label="Ventas del mes" value="$ 635.000" />)
    expect(withShadow(container)).toEqual([])
    expect(container.firstElementChild).toHaveClass('rounded-surface', 'border')
    expect(screen.getByText('$ 635.000')).toHaveClass('monto', 'text-title')
  })

  it('el estado vacio no lleva sombra', () => {
    const { container } = render(
      <MemoryRouter>
        <EmptyState message="No hay facturas." />
      </MemoryRouter>,
    )
    expect(withShadow(container)).toEqual([])
  })

  it('el modal flota con la sombra overlay', () => {
    render(
      <Modal title="Nuevo gasto" onClose={() => {}}>
        <p>Contenido</p>
      </Modal>,
    )
    expect(screen.getByRole('dialog')).toHaveClass('shadow-overlay', 'rounded-surface')
  })

  it('el toast flota con la sombra raised', () => {
    render(<Toaster />)
    act(() => showToast('Factura guardada.'))
    expect(screen.getByText('Factura guardada.').parentElement).toHaveClass('shadow-raised')
  })
})
