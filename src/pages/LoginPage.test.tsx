import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getToken, saveToken } from '../auth/session'
import { jsonResponse, primaryActions, renderRoute, validToken } from '../test/utils'

async function fillAndSubmit() {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Código de tu serviteca'), 'demo')
  await user.type(screen.getByLabelText('Usuario'), 'admin')
  await user.type(screen.getByLabelText('Contraseña'), 'admin123')
  await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
}

describe('formulario de login', () => {
  it.each([375, 1440])('acota la marca a 48 px y reserva las reglas de fondo a la foto, ancho %s', async (width) => {
    renderRoute('/login')
    await screen.findByRole('heading', { level: 1 })
    const source = document.createElement('style')
    const active = document.createElement('style')
    source.textContent = readFileSync('src/pages/LoginPage.css', 'utf8')
    document.head.append(source)
    try {
      // jsdom no evalua media queries ni geometria: activa las reglas del ancho
      // solicitado y comprueba cascada y selectores sobre el DOM real de Login.
      const rules = [...source.sheet!.cssRules].flatMap((rule) => {
        if (rule.type !== CSSRule.MEDIA_RULE) return [rule as CSSStyleRule]
        const media = rule as CSSMediaRule
        const minWidth = Number(/min-width:\s*(\d+)px/.exec(media.conditionText)?.[1])
        return width >= minWidth ? [...media.cssRules] as CSSStyleRule[] : []
      })
      source.remove()
      // jsdom omite grupos con pseudo-elementos en getComputedStyle.
      // El velo se comprueba desde CSSOM; la cascada usa los selectores de elementos.
      active.textContent = rules.map((rule) => {
        const selectors = rule.selectorText.split(',').filter((selector) => !selector.includes('::'))
        return selectors.length ? `${selectors.join(',')} { ${rule.style.cssText} }` : ''
      }).join('\n')
      document.head.append(active)
      const symbols = document.querySelectorAll<HTMLImageElement>('#login .login-brand [role="img"] > img')
      expect(symbols).toHaveLength(2)
      for (const symbol of symbols) {
        const style = getComputedStyle(symbol)
        expect(style.width).toBe('48px')
        expect(style.height).toBe('48px')
        expect(style.position).not.toBe('absolute')
        for (const rule of rules.filter((rule) => rule.style.position === 'absolute')) {
          expect(symbol.matches(rule.selectorText)).toBe(false)
        }
        const wordmark = symbol.parentElement!
        expect(getComputedStyle(wordmark).width).toBe('max-content')
        expect(getComputedStyle(wordmark.parentElement!).width).toBe('max-content')
        expect(getComputedStyle(wordmark.querySelector('span')!).fontSize).toBe('32px')
      }
      if (width >= 1024) {
        const photo = document.querySelector<HTMLImageElement>('#login .login-photo')!
        expect(photo).toHaveAttribute('alt', '')
        expect(getComputedStyle(photo).position).toBe('absolute')
        expect(getComputedStyle(photo).width).toBe('100%')
        expect(getComputedStyle(photo).height).toBe('100%')
        expect(getComputedStyle(photo).objectFit).toBe('cover')
        const veil = rules.find((rule) => rule.selectorText === '#login .login-scene::after')!
        expect(Number(veil.style.zIndex)).toBeGreaterThan(Number(getComputedStyle(photo).zIndex))
        for (const selector of ['.login-scene-brand', '.login-scene-copy']) {
          expect(Number(getComputedStyle(document.querySelector(selector)!).zIndex)).toBeGreaterThan(Number(veil.style.zIndex))
        }
      }
    } finally {
      source.remove()
      active.remove()
    }
  })

  it('tiene un unico h1, el subtitulo y el mensaje ambiental aprobado', async () => {
    renderRoute('/login')

    const headings = await screen.findAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent('Inicia sesión')
    expect(screen.getByText('Entra y continúa con tu negocio.')).toBeInTheDocument()
    expect(screen.getByText('Ventas, inventario y caja conectados.')).toBeInTheDocument()
    expect(primaryActions()).toHaveLength(1)
  })

  it('rotula el codigo de la serviteca con su ayuda y omite el contacto demostrativo', async () => {
    renderRoute('/login')

    const slug = await screen.findByLabelText('Código de tu serviteca')
    expect(slug).toHaveAccessibleDescription('El nombre corto que elegiste al registrarte.')
    expect(screen.queryByRole('link', { name: /WhatsApp/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link').some((link) => link.getAttribute('href')?.includes('wa.me'))).toBe(false)
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
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Términos y datos personales' })).toHaveAttribute('href', '/terminos')
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

  it.each(['red', 'servidor'])('anuncia el error de %s sin exponer mensajes internos ni contactos de ejemplo', async (kind) => {
    vi.stubGlobal('fetch', kind === 'red'
      ? vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
      : vi.fn().mockResolvedValue(jsonResponse({ error: 'Internal server error', status: 500 }, 500)))
    renderRoute('/login')

    await fillAndSubmit()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos conectar con ServiBox')
    expect(alert).toHaveTextContent('Revisa tu conexión e inténtalo de nuevo.')
    expect(alert).not.toHaveTextContent(/300|WhatsApp|Failed|Internal/)
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password')
    expect(getToken()).toBeNull()
  })

  it('permite mostrar y ocultar la contrasena con teclado sin enviar el formulario', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderRoute('/login')
    const password = await screen.findByLabelText('Contraseña')
    expect(password).toHaveAttribute('type', 'password')
    expect(password).toHaveAttribute('autocomplete', 'current-password')
    await user.type(password, 'clave de prueba')
    await user.tab()
    expect(screen.getByRole('button', { name: 'Mostrar contraseña' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(password).toHaveAttribute('type', 'text')
    await user.keyboard(' ')
    expect(password).toHaveAttribute('type', 'password')
    expect(password).toHaveValue('clave de prueba')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('envia con Enter, normaliza solo codigo y usuario y bloquea envios mientras espera', async () => {
    let respond!: (response: Response) => void
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => { respond = resolve }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderRoute('/login')
    await user.type(await screen.findByLabelText('Código de tu serviteca'), ' demo ')
    await user.type(screen.getByLabelText('Usuario'), ' admin ')
    await user.type(screen.getByLabelText('Contraseña'), ' clave con espacios {Enter}')

    const form = screen.getByRole('form', { name: 'Iniciar sesión' })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(form).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('button', { name: 'Iniciando sesión…' })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Iniciando sesión…')
    fireEvent.submit(form)
    await user.keyboard('{Enter}')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/auth/login')
    expect(JSON.parse(init.body as string)).toEqual({ tenantSlug: 'demo', username: 'admin', password: ' clave con espacios ' })
    expect(new Headers(init.headers).has('Authorization')).toBe(false)
    await act(async () => respond(jsonResponse({ error: 'Credenciales invalidas', status: 401 }, 401)))
    await screen.findByRole('alert')
    expect(form).toHaveAttribute('aria-busy', 'false')
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled()
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password')
    expect(screen.getByLabelText('Contraseña')).toHaveValue(' clave con espacios ')
  })
})
