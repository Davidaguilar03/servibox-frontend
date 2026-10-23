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

  it('con sesion la raiz muestra la landing, no redirige', async () => {
    saveToken(validToken())
    const router = renderRoute('/')

    expect(await screen.findByRole('heading', { level: 1, name: 'Una venta. Inventario y caja al día.' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it('una ruta desconocida sin sesion termina en /login', async () => {
    const router = renderRoute('/no-existe')

    await screen.findByRole('heading', { name: 'Inicia sesión' })
    expect(router.state.location.pathname).toBe('/login')
  })

  it('la barra lateral muestra el nombre completo y sus iniciales', async () => {
    saveToken(validToken(), {
      username: 'laura.gomez',
      role: 'ADMIN',
      tenantName: 'Serviteca El Roble',
      tenantSlug: 'el-roble',
      fullName: 'Laura María Gómez',
    })
    renderRoute('/configuracion')

    await screen.findByRole('heading', { name: 'Configuración' })
    expect(screen.getByText('Laura María Gómez')).toBeInTheDocument()
    expect(screen.getByText('LG')).toBeInTheDocument()
    expect(screen.getByText('Serviteca El Roble')).toBeInTheDocument()
  })

  it('sin nombre completo la barra lateral muestra el username', async () => {
    saveToken(validToken(), { username: 'admin', role: 'ADMIN', tenantName: 'Demo', tenantSlug: 'demo' })
    renderRoute('/configuracion')

    await screen.findByRole('heading', { name: 'Configuración' })
    expect(screen.getByText('admin')).toBeInTheDocument()
    expect(screen.getByText('AD')).toBeInTheDocument()
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
