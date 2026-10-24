import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getToken, saveToken } from '../auth/session'
import { jsonResponse, renderRoute, validToken } from '../test/utils'

async function fillAndSubmit() {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Serviteca'), 'demo')
  await user.type(screen.getByLabelText('Usuario'), 'admin')
  await user.type(screen.getByLabelText('Contraseña'), 'admin123')
  await user.click(screen.getByRole('button', { name: 'Ingresar' }))
}

describe('formulario de login', () => {
  it('tiene un unico h1, el titulo del formulario', async () => {
    renderRoute('/login')

    const headings = await screen.findAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent('Inicia sesión')
    expect(screen.getByText('Tu negocio en buenas manos.').tagName).toBe('P')
  })

  it('envia los tres campos, guarda la sesion y entra a la pagina pedida', async () => {
    const token = validToken()
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ token, user: { username: 'admin', role: 'ADMIN' }, tenant: { name: 'Serviteca Demo', slug: 'demo' } }))
    vi.stubGlobal('fetch', fetchMock)
    const router = renderRoute('/configuracion')

    await fillAndSubmit()

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/auth/login')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ tenantSlug: 'demo', username: 'admin', password: 'admin123' })
    expect(await screen.findByRole('heading', { name: 'Configuración' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/configuracion')
    expect(getToken()).toBe(token)
    expect(localStorage.getItem('servibox.tenantSlug')).toBe('demo')
    expect(JSON.parse(sessionStorage.getItem('servibox.identity') ?? '')).toEqual({
      username: 'admin',
      role: 'ADMIN',
      tenantName: 'Serviteca Demo',
      tenantSlug: 'demo',
    })
  })

  it('muestra la alerta ante un 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'Credenciales invalidas', status: 401 }, 401)),
    )
    renderRoute('/login')

    await fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent('Revisa tus datos e intenta de nuevo.')
    expect(getToken()).toBeNull()
  })

  it('recuerda la serviteca de la ultima vez', async () => {
    localStorage.setItem('servibox.tenantSlug', 'autollantas')
    renderRoute('/login')

    expect(await screen.findByLabelText('Serviteca')).toHaveValue('autollantas')
  })

  it('guarda el nombre completo cuando el login lo devuelve', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          token: validToken(),
          user: { username: 'laura.gomez', role: 'ADMIN', fullName: 'Laura Gómez' },
          tenant: { name: 'Serviteca El Roble', slug: 'el-roble' },
        }),
      ),
    )
    renderRoute('/configuracion')

    await fillAndSubmit()

    await screen.findByRole('heading', { name: 'Configuración' })
    expect(JSON.parse(sessionStorage.getItem('servibox.identity') ?? '')).toMatchObject({ fullName: 'Laura Gómez' })
    expect(screen.getByText('Laura Gómez')).toBeInTheDocument()
  })

  it('Crea tu cuenta lleva a /registro y el wordmark a la landing', async () => {
    renderRoute('/login')

    expect(await screen.findByRole('link', { name: 'Crea tu cuenta' })).toHaveAttribute('href', '/registro')
    expect(screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' })).toHaveAttribute('href', '/recuperar-contrasena')
    for (const link of screen.getAllByRole('link', { name: 'ServiBox, ir a la página principal' })) {
      expect(link).toHaveAttribute('href', '/')
    }
    expect(document.title).toBe('Inicia sesión · ServiBox')
  })

  it('con sesion redirige a /inicio', async () => {
    saveToken(validToken())
    const router = renderRoute('/login')

    await screen.findByRole('heading', { name: 'Inicio' })
    expect(router.state.location.pathname).toBe('/inicio')
  })

  it('la ruta vieja /crear-cuenta lleva al registro', async () => {
    const router = renderRoute('/crear-cuenta')

    await screen.findByRole('heading', { name: 'Crea tu serviteca' })
    expect(router.state.location.pathname).toBe('/registro')
  })
})
