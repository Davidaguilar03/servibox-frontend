import { describe, expect, it } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { Toaster } from './Toaster'
import { showToast } from './toast'

describe('Toaster', () => {
  it('bajo sm ocupa el ancho con 16 px a cada lado; desde sm vuelve abajo a la derecha', () => {
    render(<Toaster />)
    act(() => showToast('Factura guardada.'))

    const region = screen.getByRole('status')
    expect(region).toHaveClass('fixed', 'right-4', 'bottom-4', 'left-4', 'sm:left-auto', 'sm:w-full', 'sm:max-w-sm')
    expect(region).not.toHaveClass('w-full')
    expect(screen.getByText('Factura guardada.')).toBeInTheDocument()
  })
})
