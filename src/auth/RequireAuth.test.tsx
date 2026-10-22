import { describe, expect, it } from 'vitest'
import { act, screen } from '@testing-library/react'
import { clearSession, saveToken } from './session'
import { makeToken, renderRoute, validToken } from '../test/utils'

describe('guard de rutas privadas', () => {
  it('sin sesion manda a /login', async () => {
    const router = renderRoute('/inventario')

    expect(await screen.findByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('con un token vencido manda a /login', async () => {
    saveToken(makeToken({ sub: 'admin', role: 'ADMIN', exp: Math.floor(Date.now() / 1000) - 60 }))
    const router = renderRoute('/ventas')

    await screen.findByRole('heading', { name: 'Inicia sesión' })
    expect(router.state.location.pathname).toBe('/login')
  })

  it('con sesion muestra la pagina privada', async () => {
    saveToken(validToken())
    renderRoute('/configuracion')

    expect(await screen.findByRole('heading', { name: 'Configuración' })).toBeInTheDocument()
  })

  it('la raiz redirige a /inicio', async () => {
    saveToken(validToken())
    const router = renderRoute('/')

    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/inicio')
  })

  it('al cerrar la sesion vuelve a /login', async () => {
    saveToken(validToken())
    const router = renderRoute('/cuentas')
    await screen.findByRole('heading', { name: 'Cuentas' })

    act(() => clearSession())

    await screen.findByRole('heading', { name: 'Inicia sesión' })
    expect(router.state.location.pathname).toBe('/login')
  })
})
