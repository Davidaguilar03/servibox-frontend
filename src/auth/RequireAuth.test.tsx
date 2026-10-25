import { describe, expect, it } from 'vitest'
import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('el menu de usuario muestra el nombre completo, sus iniciales y la serviteca', async () => {
    const user = userEvent.setup()
    saveToken(validToken(), {
      username: 'laura.gomez',
      role: 'ADMIN',
      tenantName: 'Serviteca El Roble',
      tenantSlug: 'el-roble',
      fullName: 'Laura María Gómez',
    })
    renderRoute('/configuracion')

    await screen.findByRole('heading', { name: 'Configuración' })
    const button = screen.getByRole('button', { name: 'Menú de usuario de Laura María Gómez' })
    expect(within(button).getByText('LG')).toBeInTheDocument()
    await user.click(button)
    const panel = document.getElementById(button.getAttribute('aria-controls') ?? '') as HTMLElement
    expect(within(panel).getByText('Laura María Gómez')).toBeInTheDocument()
    expect(within(panel).getByText('Serviteca El Roble')).toBeInTheDocument()
  })

  it('sin nombre completo el menu de usuario muestra el username', async () => {
    const user = userEvent.setup()
    saveToken(validToken(), { username: 'admin', role: 'ADMIN', tenantName: 'Demo', tenantSlug: 'demo' })
    renderRoute('/configuracion')

    await screen.findByRole('heading', { name: 'Configuración' })
    const button = screen.getByRole('button', { name: 'Menú de usuario de admin' })
    expect(within(button).getByText('AD')).toBeInTheDocument()
    await user.click(button)
    expect(screen.getByText('admin')).toBeInTheDocument()
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
