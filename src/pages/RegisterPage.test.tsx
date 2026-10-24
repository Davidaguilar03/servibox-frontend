import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getToken, saveToken } from '../auth/session'
import { jsonResponse, makeToken, renderRoute, validToken } from '../test/utils'

const token = makeToken({ sub: 'laura.gomez', role: 'ADMIN', exp: Math.floor(Date.now() / 1000) + 3600 })

const created = {
  token,
  user: { username: 'laura.gomez', role: 'ADMIN', fullName: 'Laura Gómez' },
  tenant: { name: 'Serviteca El Roble', slug: 'el-roble' },
}

/** El registro responde lo que se pida; el resto (el panel tras entrar) un 500. */
function mockFetch(register: () => Promise<Response>) {
  const fetchMock = vi.fn((url: string) =>
    url === '/api/auth/register' ? register() : Promise.resolve(jsonResponse({ error: 'x', status: 500 }, 500)),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function registerCalls(fetchMock: ReturnType<typeof mockFetch>) {
  return fetchMock.mock.calls.filter(([url]) => url === '/api/auth/register') as unknown as [string, RequestInit][]
}

async function fillForm(user = userEvent.setup()) {
  await user.type(await screen.findByLabelText('Nombre comercial'), '  Serviteca El Roble ')
  await user.type(screen.getByLabelText('NIT'), '900123456-7')
  await user.type(screen.getByLabelText('Teléfono'), '300 123 4567')
  await user.type(screen.getByLabelText('Nombre completo'), 'Laura Gómez')
  await user.type(screen.getByLabelText('Correo'), 'laura@elroble.co')
  await user.type(screen.getByLabelText('Usuario'), 'laura.gomez')
  await user.type(screen.getByLabelText('Contraseña'), 'secreta123')
  await user.click(screen.getByRole('checkbox', { name: /Acepto los Términos y condiciones/ }))
  return user
}

const submit = () => screen.getByRole('button', { name: 'Crear serviteca' })

describe('registro de serviteca', () => {
  it('tiene un unico h1, el titulo del formulario', async () => {
    renderRoute('/registro')

    const headings = await screen.findAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent('Crea tu serviteca')
    expect(screen.getByText('Tu serviteca lista en minutos.').tagName).toBe('P')
  })

  it('sugiere el identificador desde el nombre comercial hasta que se edita a mano', async () => {
    const user = userEvent.setup()
    renderRoute('/registro')
    const name = await screen.findByLabelText('Nombre comercial')
    const slug = screen.getByLabelText('Identificador de la serviteca')

    await user.type(name, 'Serviteca El Roble')
    expect(slug).toHaveValue('serviteca-el-roble')

    await user.clear(slug)
    await user.type(slug, 'EL-Roble 2')
    expect(slug).toHaveValue('el-roble2')

    await user.type(name, ' Norte')
    expect(slug).toHaveValue('el-roble2')
  })

  it('muestra los errores al salir de cada campo', async () => {
    const user = userEvent.setup()
    renderRoute('/registro')
    await user.click(await screen.findByLabelText('Nombre comercial'))
    await user.tab()

    expect(screen.getByText('Escribe el nombre comercial.')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre comercial')).toHaveAttribute('aria-invalid', 'true')

    await user.type(screen.getByLabelText('NIT'), '901.234.567-8')
    await user.tab()
    expect(screen.getByText(/^Usa solo dígitos y, si quieres/)).toBeInTheDocument()

    await user.type(screen.getByLabelText('Contraseña'), 'corta')
    await user.tab()
    expect(screen.getByText('Usa al menos 8 caracteres.')).toBeInTheDocument()
    expect(screen.queryByText('Escribe tu correo.')).not.toBeInTheDocument()
  })

  it('sin aceptar los terminos no se puede enviar', async () => {
    const fetchMock = mockFetch(() => Promise.resolve(jsonResponse(created, 201)))
    renderRoute('/registro')
    const user = await fillForm()
    expect(submit()).toBeEnabled()

    await user.click(screen.getByRole('checkbox'))
    await user.tab()

    expect(submit()).toBeDisabled()
    expect(screen.getByText('Acepta los términos y condiciones para continuar.')).toBeInTheDocument()
    expect(registerCalls(fetchMock)).toHaveLength(0)
  })

  it('el enlace de los terminos abre /terminos en una pestana nueva', async () => {
    renderRoute('/registro')

    const link = await screen.findByRole('link', { name: 'Términos y condiciones' })
    expect(link).toHaveAttribute('href', '/terminos')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener')
    expect(screen.getByText(/Creamos la Caja General, las categorías base/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login')
  })

  it('envia el cuerpo exacto, guarda la sesion con fullName y entra a /inicio con el toast', async () => {
    const fetchMock = mockFetch(() => Promise.resolve(jsonResponse(created, 201)))
    const router = renderRoute('/registro')
    const user = await fillForm()

    await user.click(submit())

    expect(await screen.findByText('Serviteca creada. Bienvenido a ServiBox.')).toBeInTheDocument()
    const [url, init] = registerCalls(fetchMock)[0] as [string, RequestInit]
    expect(url).toBe('/api/auth/register')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({
      businessName: 'Serviteca El Roble',
      nit: '900123456-7',
      phone: '300 123 4567',
      slug: 'serviteca-el-roble',
      adminFullName: 'Laura Gómez',
      adminEmail: 'laura@elroble.co',
      adminUsername: 'laura.gomez',
      password: 'secreta123',
      acceptTerms: true,
    })
    expect(router.state.location.pathname).toBe('/inicio')
    expect(router.state.historyAction).toBe('REPLACE')
    expect(getToken()).toBe(token)
    expect(localStorage.getItem('servibox.tenantSlug')).toBe('el-roble')
    expect(JSON.parse(sessionStorage.getItem('servibox.identity') ?? '')).toEqual({
      username: 'laura.gomez',
      role: 'ADMIN',
      tenantName: 'Serviteca El Roble',
      tenantSlug: 'el-roble',
      fullName: 'Laura Gómez',
    })
    expect(screen.getByText('Laura Gómez')).toBeInTheDocument()
    expect(screen.getByText('LG')).toBeInTheDocument()
  })

  it('un 409 queda bajo el identificador con el foco y conserva lo digitado', async () => {
    mockFetch(() =>
      Promise.resolve(jsonResponse({ error: 'Ya existe una serviteca con el identificador serviteca-el-roble', status: 409 }, 409)),
    )
    renderRoute('/registro')
    const user = await fillForm()

    await user.click(submit())

    const slug = screen.getByLabelText('Identificador de la serviteca')
    expect(await screen.findByText('Ya existe una serviteca con el identificador serviteca-el-roble')).toBeInTheDocument()
    expect(slug).toHaveAttribute('aria-invalid', 'true')
    await waitFor(() => expect(slug).toHaveFocus())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toHaveValue('secreta123')
    expect(submit()).toBeDisabled()

    await user.type(slug, '-2')
    expect(screen.queryByText(/Ya existe una serviteca/)).not.toBeInTheDocument()
    expect(submit()).toBeEnabled()
  })

  it('un 400 se muestra en el Alert sin perder lo digitado', async () => {
    mockFetch(() => Promise.resolve(jsonResponse({ error: 'El identificador demo esta reservado', status: 400 }, 400)))
    renderRoute('/registro')
    const user = await fillForm()

    await user.click(submit())

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos crear tu serviteca')
    expect(alert).toHaveTextContent('El identificador demo esta reservado')
    expect(screen.getByLabelText('Nombre comercial')).toHaveValue('  Serviteca El Roble ')
    expect(getToken()).toBeNull()
  })

  it('un 403 dice que el registro no esta disponible', async () => {
    mockFetch(() =>
      Promise.resolve(jsonResponse({ error: 'El registro de nuevas servitecas esta deshabilitado', status: 403 }, 403)),
    )
    renderRoute('/registro')
    const user = await fillForm()

    await user.click(submit())

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('El registro no está disponible')
    expect(alert).toHaveTextContent('Por ahora no estamos creando servitecas nuevas.')
  })

  it('un error de red o un 500 muestran el mensaje generico', async () => {
    mockFetch(() => Promise.reject(new TypeError('Failed to fetch')))
    renderRoute('/registro')
    const user = await fillForm()

    await user.click(submit())

    expect(await screen.findByRole('alert')).toHaveTextContent('Revisa tu conexión e intenta de nuevo.')

    mockFetch(() => Promise.resolve(jsonResponse({ error: 'Error interno del servidor', status: 500 }, 500)))
    await user.click(submit())

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Algo salió mal de nuestro lado. Intenta de nuevo en unos minutos.'),
    )
    expect(screen.getByLabelText('Contraseña')).toHaveValue('secreta123')
  })

  it('no envia dos veces y muestra el estado de carga', async () => {
    let resolve: (response: Response) => void = () => {}
    const fetchMock = mockFetch(() => new Promise<Response>((done) => (resolve = done)))
    renderRoute('/registro')
    const user = await fillForm()

    await user.dblClick(submit())

    const loading = await screen.findByRole('button', { name: 'Creando serviteca…' })
    expect(loading).toBeDisabled()
    expect(registerCalls(fetchMock)).toHaveLength(1)
    resolve(jsonResponse(created, 201))
    expect(await screen.findByText('Serviteca creada. Bienvenido a ServiBox.')).toBeInTheDocument()
  })

  it('con sesion redirige a /inicio', async () => {
    saveToken(validToken())
    const router = renderRoute('/registro')

    await screen.findByRole('heading', { name: 'Inicio' })
    expect(router.state.location.pathname).toBe('/inicio')
  })

  it('fija el titulo del documento', async () => {
    renderRoute('/registro')

    await screen.findByRole('heading', { name: 'Crea tu serviteca' })
    expect(document.title).toBe('Crea tu serviteca · ServiBox')
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      expect.stringContaining('Registra tu serviteca'),
    )
  })
})
