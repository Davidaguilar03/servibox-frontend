import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toaster } from './Toaster'
import { TOAST_DURATION_MS, showToast } from './toast'

describe('Toaster', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('bajo sm ocupa el ancho con 16 px a cada lado; desde sm vuelve abajo a la derecha', () => {
    render(<Toaster />)
    act(() => showToast('Factura guardada.'))

    const region = screen.getByRole('status').parentElement as HTMLElement
    expect(region).toHaveClass('fixed', 'right-4', 'bottom-4', 'left-4', 'sm:left-auto', 'sm:w-full', 'sm:max-w-sm')
    expect(region).not.toHaveClass('w-full')
    expect(screen.getByText('Factura guardada.')).toBeInTheDocument()
  })

  it('el de exito es status y se cierra solo a los 5 s', () => {
    render(<Toaster />)
    act(() => showToast('Factura guardada.'))
    expect(screen.getByRole('status')).toHaveTextContent('Factura guardada.')

    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS - 1))
    expect(screen.getByText('Factura guardada.')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.queryByText('Factura guardada.')).not.toBeInTheDocument()
  })

  it('el de error es alert y queda hasta cerrarlo con el boton', () => {
    render(<Toaster />)
    act(() => showToast('No pudimos guardar.', 'error'))
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos guardar.')

    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS * 3))
    expect(screen.getByText('No pudimos guardar.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }))
    expect(screen.queryByText('No pudimos guardar.')).not.toBeInTheDocument()
  })

  it('se cierra con el teclado', async () => {
    vi.useRealTimers()
    const user = userEvent.setup()
    render(<Toaster />)
    act(() => showToast('Factura guardada.'))
    screen.getByRole('button', { name: 'Cerrar aviso' }).focus()
    await user.keyboard('{Enter}')
    expect(screen.queryByText('Factura guardada.')).not.toBeInTheDocument()
  })

  it('el temporizador se pausa con el cursor encima y con el foco dentro', () => {
    render(<Toaster />)
    act(() => showToast('Factura guardada.'))
    const toast = screen.getByRole('status')

    act(() => vi.advanceTimersByTime(3000))
    fireEvent.mouseEnter(toast)
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS * 2))
    expect(screen.getByText('Factura guardada.')).toBeInTheDocument()
    fireEvent.mouseLeave(toast)

    act(() => screen.getByRole('button', { name: 'Cerrar aviso' }).focus())
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS * 2))
    expect(screen.getByText('Factura guardada.')).toBeInTheDocument()
    act(() => screen.getByRole('button', { name: 'Cerrar aviso' }).blur())

    // Retoma con lo que le quedaba (2 s), no desde cero.
    act(() => vi.advanceTimersByTime(1999))
    expect(screen.getByText('Factura guardada.')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.queryByText('Factura guardada.')).not.toBeInTheDocument()
  })

  it('no acumula mas de 3: se retira el mas antiguo', () => {
    render(<Toaster />)
    act(() => {
      showToast('Uno', 'error')
      showToast('Dos', 'error')
      showToast('Tres', 'error')
      showToast('Cuatro', 'error')
    })
    expect(screen.getAllByRole('alert').map((toast) => toast.textContent)).toEqual(['Dos', 'Tres', 'Cuatro'])
  })
})
