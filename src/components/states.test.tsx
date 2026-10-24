import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { EmptyState } from './states'

describe('EmptyState', () => {
  it('sin variante la accion es un boton secundario', async () => {
    const onClick = vi.fn()
    render(<EmptyState message="Nada por aqui." action={{ label: 'Crear', onClick }} />)

    const button = screen.getByRole('button', { name: 'Crear' })
    expect(button).toHaveAttribute('data-variant', 'secondary')
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('con variant primary la accion es primaria', () => {
    render(<EmptyState message="Nada por aqui." action={{ label: 'Crear', variant: 'primary', onClick: () => undefined }} />)

    expect(screen.getByRole('button', { name: 'Crear' })).toHaveAttribute('data-variant', 'primary')
  })

  it('con to la accion es un enlace con la variante', () => {
    render(
      <MemoryRouter>
        <EmptyState message="Nada por aqui." action={{ label: 'Crear', to: '/nuevo' }} />
      </MemoryRouter>,
    )

    const link = screen.getByRole('link', { name: 'Crear' })
    expect(link).toHaveAttribute('href', '/nuevo')
    expect(link).toHaveAttribute('data-variant', 'secondary')
  })

  it('sin accion solo muestra el mensaje', () => {
    render(<EmptyState message="Nada por aqui." />)

    expect(screen.getByText('Nada por aqui.')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
