import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getToken, saveToken } from '../auth/session'
import { WHATSAPP_URL } from '../config/contact'
import { jsonResponse, primaryActions, renderRoute, validToken } from '../test/utils'

async function fillAndSubmit() {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Código de tu serviteca'), 'demo')
  await user.type(screen.getByLabelText('Usuario'), 'admin')
  await user.type(screen.getByLabelText('Contraseña'), 'admin123')
  await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
}

describe('formulario de login', () => {
  it('tiene un unico h1, el subtitulo y ningun lema', async () => {
    renderRoute('/login')

    const headings = await screen.findAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent('Iniciar sesión')
    expect(screen.getByText('Ventas, inventario y caja en un solo lugar.')).toBeInTheDocument()
    expect(screen.queryByText(/buenas manos/)).not.toBeInTheDocument()
    expect(primaryActions()).toHaveLength(1)
  })

  it('rotula el codigo de la serviteca con su ayuda y ofrece soporte por WhatsApp', async () => {
    renderRoute('/login')

    const slug = await screen.findByLabelText('Código de tu serviteca')
    expect(slug).toHaveAccessibleDescription('El nombre corto que elegiste al registrarte.')
    expect(screen.getByText(/¿No puedes entrar\?/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Escríbenos por WhatsApp.' })).toHaveAttribute('href', WHATSAPP_URL)
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

  it('no ofrece recuperar la contrasena: la funcion no existe', async () => {
    const router = renderRoute('/login')

    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.queryByText(/Olvidaste/)).not.toBeInTheDocument()
    expect(screen.queryByText(/recuperar/i)).not.toBeInTheDocument()
    expect(screen.getAllByRole('link').some((link) => link.getAttribute('href') === '/recuperar-contrasena')).toBe(false)

    await router.navigate('/recuperar-contrasena')
    await waitFor(() => expect(router.state.location.pathname).not.toBe('/recuperar-contrasena'))
  })

  it('recuerda la serviteca de la ultima vez', async () => {
    localStorage.setItem('servibox.tenantSlug', 'autollantas')
    renderRoute('/login')

    expect(await screen.findByLabelText('Código de tu serviteca')).toHaveValue('autollantas')
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
    // El menu de usuario de la barra superior se nombra con el nombre completo.
    expect(screen.getByRole('button', { name: 'Menú de usuario de Laura Gómez' })).toBeInTheDocument()
  })

  it('Crear cuenta lleva a /registro y el wordmark a la landing', async () => {
    renderRoute('/login')

    expect(await screen.findByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/registro')
    for (const link of screen.getAllByRole('link', { name: 'ServiBox, ir a la página principal' })) {
      expect(link).toHaveAttribute('href', '/')
    }
    expect(document.title).toBe('Iniciar sesión | ServiBox')
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
