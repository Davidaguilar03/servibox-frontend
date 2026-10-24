import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderRoute } from '../test/utils'

describe('pagina proximamente', () => {
  it('tiene un unico main y conserva su titulo', async () => {
    renderRoute('/recuperar-contrasena')

    expect(await screen.findByRole('heading', { level: 1, name: 'Próximamente' })).toBeInTheDocument()
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(document.title).toBe('Recuperar tu contraseña · ServiBox')
  })
})
