import { describe, expect, it, vi } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { saveToken } from '../auth/session'
import { jsonResponse, makeToken, renderRoute, validToken } from '../test/utils'
import { getPlatformToken, savePlatformSession } from './platformSession'

const exp = () => Math.floor(Date.now() / 1000) + 900
const platformToken = () => makeToken({ sub: '1', iss: 'servibox-platform', aud: 'platform', identityType: 'PLATFORM', exp: exp() })
const identity = { id: 1, email: 'operador@example.test' }
const emptyPage = { items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }

/** API simulada: identidad, metricas y listados vacios. */
function mockApi() {
  const responses: Record<string, unknown> = {
    '/api/platform/auth/me': identity,
    '/api/platform/metrics': { tenants: {}, users: { total: 0, active: 0, inactive: 0 }, registrationRequests: {}, outboxMessages: {} },
    '/api/platform/registration-requests': emptyPage,
    '/api/platform/tenants': emptyPage,
  }
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const { pathname } = new URL(String(input), 'http://localhost')
    if (!(pathname in responses)) throw new Error(`Sin respuesta para ${pathname}`)
    return jsonResponse(responses[pathname])
  }))
}

/** Ancho de pantalla: desde lg (1024 px) las ventanas van en la barra. */
function stubViewport(desktop: boolean) {
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
    matches: desktop,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })))
}

function renderPlatform(path = '/plataforma') {
  mockApi()
  savePlatformSession(platformToken(), identity)
  return renderRoute(path)
}

describe('barra superior de plataforma', () => {
  it('reemplaza la barra lateral: marca, rotulo Plataforma, tres ventanas y menu de usuario en la barra', async () => {
    stubViewport(true)
    renderPlatform()

    await screen.findByRole('heading', { level: 1, name: 'Resumen' })
    const bar = screen.getByRole('banner')
    expect(bar).toHaveClass('sticky', 'top-0', 'bg-nav')
    expect(within(bar).getByRole('link', { name: 'ServiBox, ir a Resumen' })).toHaveAttribute('href', '/plataforma')
    expect(within(bar).getByText('PLATAFORMA')).toBeInTheDocument()
    const links = within(within(bar).getByRole('navigation', { name: 'Principal' })).getAllByRole('link')
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Resumen', '/plataforma'],
      ['Solicitudes', '/plataforma/solicitudes'],
      ['Servitecas', '/plataforma/servitecas'],
    ])
    expect(within(bar).getByRole('button', { name: 'Menú de usuario de operador@example.test' })).toBeInTheDocument()
    expect(document.getElementById('menu-lateral')).toBeNull()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Contraer menú|Expandir menú|Abrir menú/ })).not.toBeInTheDocument()
    // El contenido usa todo el ancho hasta max-content, sin el relleno de la barra lateral.
    const main = document.getElementById('contenido')!
    expect(main).toHaveClass('mx-auto', 'max-w-content')
    expect(main.closest('[class*="pl-sidebar"]')).toBeNull()
  })

  it('marca la ventana activa con aria-current, tambien en las subrutas', async () => {
    const user = userEvent.setup()
    stubViewport(true)
    const router = renderPlatform()
    await screen.findByRole('heading', { level: 1, name: 'Resumen' })
    const nav = screen.getByRole('navigation', { name: 'Principal' })
    expect(within(nav).getByRole('link', { name: 'Resumen' })).toHaveAttribute('aria-current', 'page')

    await user.click(within(nav).getByRole('link', { name: 'Servitecas' }))
    await screen.findByRole('heading', { level: 1, name: 'Servitecas' })
    expect(router.state.location.pathname).toBe('/plataforma/servitecas')
    const active = within(nav).getByRole('link', { name: 'Servitecas' })
    expect(active).toHaveAttribute('aria-current', 'page')
    expect(active).toHaveClass('border-brand', 'bg-nav-active', 'text-text-inverse')
    expect(within(nav).getByRole('link', { name: 'Resumen' })).toHaveClass('border-transparent', 'text-neutral-300', 'hover:bg-nav-hover', 'hover:text-text-inverse')
    expect(within(nav).getByRole('link', { name: 'Resumen' })).not.toHaveAttribute('aria-current')
    expect(document.title).toBe('Servitecas · ServiBox')
  })

  it('el menu de usuario abre hacia abajo y cierra solo la sesion de plataforma', async () => {
    const user = userEvent.setup()
    stubViewport(true)
    const tenant = validToken()
    saveToken(tenant)
    const router = renderPlatform()

    const button = await screen.findByRole('button', { name: 'Menú de usuario de operador@example.test' })
    await user.click(button)
    const panel = document.getElementById(button.getAttribute('aria-controls') ?? '')!
    expect(panel).toHaveClass('top-full', 'right-0')
    expect(panel).not.toHaveClass('bottom-full')
    await user.click(within(panel).getByRole('button', { name: 'Cerrar sesión' }))

    await screen.findByRole('heading', { level: 1, name: 'Acceso de plataforma' })
    expect(router.state.location.pathname).toBe('/plataforma/login')
    expect(getPlatformToken()).toBeNull()
  })

  it('el panel del menu de usuario muestra correo y rol completos, sin recorte, y Esc lo cierra', async () => {
    const user = userEvent.setup()
    stubViewport(true)
    const email = 'david.aguilar.administrador@servibox-plataforma.example.test'
    mockApi()
    savePlatformSession(platformToken(), { id: 1, email })
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const { pathname } = new URL(String(input), 'http://localhost')
      if (pathname === '/api/platform/auth/me') return jsonResponse({ id: 1, email })
      if (pathname === '/api/platform/metrics') return jsonResponse({ tenants: {}, users: { total: 0, active: 0, inactive: 0 }, registrationRequests: {}, outboxMessages: {} })
      return jsonResponse(emptyPage)
    }))
    renderRoute('/plataforma')

    const button = await screen.findByRole('button', { name: `Menú de usuario de ${email}` })
    await user.click(button)
    const panel = document.getElementById(button.getAttribute('aria-controls') ?? '')!
    expect(panel).toHaveClass('w-80', 'max-w-[calc(100vw-6rem)]', 'p-3')
    expect(panel).not.toHaveClass('w-[216px]')
    const name = within(panel).getByText(email)
    const role = within(panel).getByText('Administrador de plataforma')
    expect(name).toHaveTextContent(email)
    expect(name).toHaveClass('break-all')
    expect(role).toHaveClass('break-words')
    for (const element of [name, role]) {
      expect(element).not.toHaveClass('truncate')
      expect(element.className).not.toMatch(/truncate|text-ellipsis|line-clamp|whitespace-nowrap/)
    }
    expect(within(panel).getByRole('button', { name: 'Cerrar sesión' })).toHaveClass('min-h-12', 'w-full', 'focus-ring')

    await user.keyboard('{Escape}')
    expect(document.getElementById(panel.id)).toBeNull()
    expect(button).toHaveFocus()
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('la barra superior usa los mismos tokens que la barra lateral de las servitecas', async () => {
    stubViewport(true)
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('Sin API de serviteca') }))
    saveToken(validToken())
    renderRoute('/configuracion')
    await screen.findByRole('heading', { level: 1, name: 'Configuración' })
    const tokens = (element: Element) => element.className.split(/\s+/).filter((name) => /(?:^|:)(?:bg|text|border)-(?:nav|brand|neutral-300|text-inverse|transparent)/.test(name)).sort()
    const aside = document.getElementById('menu-lateral')!
    const tenantActive = tokens(within(aside).getByRole('link', { name: 'Configuración' }))
    const tenantIdle = tokens(within(aside).getByRole('link', { name: 'Inventario' }))
    cleanup()

    renderPlatform()
    await screen.findByRole('heading', { level: 1, name: 'Resumen' })
    expect(screen.getByRole('banner')).toHaveClass('bg-nav')
    expect(aside).toHaveClass('bg-nav')
    const nav = screen.getByRole('navigation', { name: 'Principal' })
    expect(tokens(within(nav).getByRole('link', { name: 'Resumen' }))).toEqual(tenantActive)
    expect(tokens(within(nav).getByRole('link', { name: 'Servitecas' }))).toEqual(tenantIdle)
    expect(document.querySelector('[class*="platform"]')).toBeNull()
  })

  it('con teclado sigue el orden natural: saltar al contenido, marca, ventanas y usuario', async () => {
    const user = userEvent.setup()
    stubViewport(true)
    renderPlatform()
    await screen.findByRole('heading', { level: 1, name: 'Resumen' })

    const expected = [
      screen.getByRole('link', { name: 'Saltar al contenido' }),
      screen.getByRole('link', { name: 'ServiBox, ir a Resumen' }),
      screen.getByRole('link', { name: 'Resumen' }),
      screen.getByRole('link', { name: 'Solicitudes' }),
      screen.getByRole('link', { name: 'Servitecas' }),
      screen.getByRole('button', { name: 'Menú de usuario de operador@example.test' }),
    ]
    for (const element of expected) {
      await user.tab()
      expect(element).toHaveFocus()
      expect(element).toHaveClass('focus-ring')
    }
  })

  describe('pantalla estrecha', () => {
    it('agrupa las ventanas en un desplegable accesible que Esc cierra devolviendo el foco', async () => {
      const user = userEvent.setup()
      stubViewport(false)
      renderPlatform()
      await screen.findByRole('heading', { level: 1, name: 'Resumen' })

      const toggle = screen.getByRole('button', { name: 'Abrir menú' })
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
      expect(toggle).toHaveAttribute('aria-controls', 'menu-plataforma')
      expect(screen.queryByRole('navigation', { name: 'Principal' })).not.toBeInTheDocument()
      expect(screen.getByText('PLATAFORMA')).toBeInTheDocument()

      await user.click(toggle)
      expect(toggle).toHaveAttribute('aria-expanded', 'true')
      expect(toggle).toHaveAccessibleName('Cerrar menú')
      const nav = within(document.getElementById('menu-plataforma')!).getByRole('navigation', { name: 'Principal' })
      expect(within(nav).getAllByRole('link').map((link) => link.textContent)).toEqual(['Resumen', 'Solicitudes', 'Servitecas'])
      expect(within(nav).getByRole('link', { name: 'Resumen' })).toHaveAttribute('aria-current', 'page')

      // Tab desde el boton entra en las ventanas del desplegable.
      await user.tab()
      expect(within(nav).getByRole('link', { name: 'Resumen' })).toHaveFocus()
      await user.keyboard('{Escape}')
      expect(document.getElementById('menu-plataforma')).toBeNull()
      expect(toggle).toHaveFocus()
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
    })

    it('elegir una ventana navega y cierra el desplegable; el clic fuera tambien lo cierra', async () => {
      const user = userEvent.setup()
      stubViewport(false)
      const router = renderPlatform()
      await screen.findByRole('heading', { level: 1, name: 'Resumen' })

      await user.click(screen.getByRole('button', { name: 'Abrir menú' }))
      await user.click(screen.getByRole('link', { name: 'Solicitudes' }))
      await screen.findByRole('heading', { level: 1, name: 'Solicitudes de registro' })
      expect(router.state.location.pathname).toBe('/plataforma/solicitudes')
      expect(document.getElementById('menu-plataforma')).toBeNull()

      await user.click(screen.getByRole('button', { name: 'Abrir menú' }))
      expect(document.getElementById('menu-plataforma')).not.toBeNull()
      await user.click(screen.getByRole('heading', { level: 1, name: 'Solicitudes de registro' }))
      expect(document.getElementById('menu-plataforma')).toBeNull()
    })
  })

  it('el shell de las servitecas conserva su barra lateral, sin la barra ni el color de plataforma', async () => {
    stubViewport(true)
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('Sin API de serviteca') }))
    saveToken(validToken())
    savePlatformSession(platformToken(), identity)
    renderRoute('/configuracion')

    await screen.findByRole('heading', { level: 1, name: 'Configuración' })
    const aside = document.getElementById('menu-lateral')!
    expect(aside).toHaveClass('bg-nav', 'w-sidebar')
    expect(within(aside).getByRole('link', { name: 'ServiBox, ir a Inicio' })).toHaveAttribute('href', '/inicio')
    expect(within(aside).getByRole('button', { name: 'Contraer menú' })).toBeInTheDocument()
    expect(screen.queryByText('PLATAFORMA')).not.toBeInTheDocument()
    expect(document.getElementById('menu-plataforma')).toBeNull()

    // Su menu de usuario conserva el panel del pie lateral: hacia arriba, 216 px y con recorte.
    const user = userEvent.setup()
    const button = within(aside).getByRole('button', { name: /^Menú de usuario de / })
    await user.click(button)
    const panel = document.getElementById(button.getAttribute('aria-controls') ?? '')!
    expect(panel).toHaveClass('bottom-full', 'left-0', 'w-[216px]', 'p-2')
    expect(panel).not.toHaveClass('top-full', 'w-80')
    expect(panel.querySelector('span')).toHaveClass('truncate')
    expect(within(panel).getByRole('button', { name: 'Cerrar sesión' })).toHaveClass('min-h-touch')
  })
})

describe('acceso de plataforma con la composicion del login', () => {
  it('usa la misma estructura que el login de serviteca, con su propia foto decorativa', async () => {
    mockApi()
    renderRoute('/login')
    await screen.findByRole('heading', { level: 1, name: 'Inicia sesión' })
    const structure = () => [...document.querySelectorAll('#login [class*="login-"]')].map((element) => element.className.split(' ').filter((name) => name.startsWith('login-')).join(' '))
    const tenantStructure = structure().filter((name) => name !== 'login-scene-copy' && name !== 'login-statement')
    const tenantPhoto = document.querySelector<HTMLImageElement>('#login .login-photo')!.getAttribute('src')
    cleanup()

    renderRoute('/plataforma/login')
    await screen.findByRole('heading', { level: 1, name: 'Acceso de plataforma' })
    expect(structure()).toEqual(tenantStructure)
    const photo = document.querySelector<HTMLImageElement>('#login .login-photo')!
    expect(photo.getAttribute('src')).toMatch(/platform-login-v1\.webp$/)
    expect(photo.getAttribute('src')).not.toBe(tenantPhoto)
    expect(photo).toHaveAttribute('alt', '')
    expect(photo).toHaveAttribute('width', '1122')
    expect(photo).toHaveAttribute('height', '1402')
    expect(screen.getByText('ACCESO DE PLATAFORMA')).toBeInTheDocument()
    // Sigue pidiendo solo correo y contrasena.
    const form = screen.getByRole('form', { name: 'Iniciar sesión en la plataforma' })
    expect(within(form).getAllByRole('textbox').map((input) => input.getAttribute('name'))).toEqual(['email'])
    expect(within(form).getByLabelText('Contraseña')).toHaveAttribute('name', 'password')
    expect(within(form).getByRole('button', { name: 'Iniciar sesión' })).toHaveClass('login-submit')
    expect(screen.queryByRole('link', { name: /Solicitar cuenta|Registr/ })).not.toBeInTheDocument()
  })
})
