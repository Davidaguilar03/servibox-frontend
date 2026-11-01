import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getToken } from '../auth/session'
import { jsonResponse, renderRoute } from '../test/utils'

// Activacion con el enlace del correo (POST /api/registration-requests/activate) con API simulada.

/** 43 caracteres Base64 URL, el formato de RegistrationActivationService. */
const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-AbCdE'
const ACTIVATED = { status: 'ACTIVATED', tenantSlug: 'el-roble', message: 'Cuenta activada; inicia sesion' }

function mockActivate(respond: () => Promise<Response>) {
  const fetchMock = vi.fn((url: string) =>
    url === '/api/registration-requests/activate' ? respond() : Promise.resolve(jsonResponse({ error: 'x', status: 500 }, 500)),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const activateCalls = (fetchMock: ReturnType<typeof mockActivate>) =>
  fetchMock.mock.calls.filter(([url]) => url === '/api/registration-requests/activate') as unknown as [string, RequestInit][]

async function fillAndSubmit(confirmation = 'secreta123') {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Usuario'), ' laura.gomez ')
  await user.type(screen.getByLabelText('Contraseña'), 'secreta123')
  await user.type(screen.getByLabelText('Confirmar contraseña'), confirmation)
  await user.click(screen.getByRole('button', { name: 'Activar cuenta' }))
  return user
}

/** El token no queda en almacenamiento, en la URL ni en el texto de la pagina. */
function expectTokenNowhere(router: ReturnType<typeof renderRoute>) {
  expect(router.state.location.hash).toBe('')
  expect(router.state.location.search).toBe('')
  for (const storage of [localStorage, sessionStorage]) {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i)!
      expect(`${key}=${storage.getItem(key)}`).not.toContain(TOKEN)
    }
  }
  expect(document.documentElement.outerHTML).not.toContain(TOKEN)
}

describe('activacion de cuenta', () => {
  it('lee el token del enlace, lo quita de la URL con replace y agrega meta referrer no-referrer', async () => {
    const router = renderRoute(`/activar#token=${TOKEN}`)

    expect(await screen.findByRole('heading', { level: 1, name: 'Activa tu cuenta' })).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.hash).toBe(''))
    expect(router.state.location.pathname).toBe('/activar')
    expect(router.state.historyAction).toBe('REPLACE')
    expect(document.querySelector('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer')
    expect(document.title).toBe('Activar cuenta | ServiBox')
    expectTokenNowhere(router)
  })

  it('envia token, usuario y contrasena; muestra el codigo de la serviteca y enlaza al login sin iniciar sesion', async () => {
    const fetchMock = mockActivate(() => Promise.resolve(jsonResponse(ACTIVATED)))
    const router = renderRoute(`/activar#token=${TOKEN}`)

    await fillAndSubmit()

    const heading = await screen.findByRole('heading', { level: 1, name: 'Tu cuenta está activa' })
    await waitFor(() => expect(heading).toHaveFocus())
    const [[url, init]] = activateCalls(fetchMock) as [[string, RequestInit]]
    expect(url).toBe('/api/registration-requests/activate')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ token: TOKEN, username: 'laura.gomez', password: 'secreta123' })
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined()
    expect(screen.getByText('Código de tu serviteca').nextElementSibling).toHaveTextContent('el-roble')
    expect(screen.getByText(/lo necesitas, junto con tu usuario y tu contraseña, cada vez que inicies sesión/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login')
    // Sin JWT ni sesion; solo se recuerda el codigo para el login.
    expect(getToken()).toBeNull()
    expect(router.state.location.pathname).toBe('/activar')
    expect(localStorage.getItem('servibox.tenantSlug')).toBe('el-roble')
    expectTokenNowhere(router)
  })

  it('el codigo recordado llega al login', async () => {
    mockActivate(() => Promise.resolve(jsonResponse(ACTIVATED)))
    renderRoute(`/activar#token=${TOKEN}`)
    const user = await fillAndSubmit()

    await user.click(await screen.findByRole('link', { name: 'Iniciar sesión' }))

    expect(await screen.findByLabelText('Código de tu serviteca')).toHaveValue('el-roble')
  })

  it('sin token muestra enlace no valido, sin formulario ni llamada', async () => {
    const fetchMock = mockActivate(() => Promise.resolve(jsonResponse(ACTIVATED)))
    renderRoute('/activar')

    expect(await screen.findByRole('heading', { level: 1, name: 'Este enlace no es válido' })).toBeInTheDocument()
    expect(screen.getByText('El enlace de activación no es válido. Ábrelo de nuevo desde el correo, completo.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'hola@servibox.co' })).toHaveAttribute('href', 'mailto:hola@servibox.co')
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    expect(activateCalls(fetchMock)).toHaveLength(0)
  })

  it('un token con formato invalido tambien es enlace no valido y se retira de la URL', async () => {
    const router = renderRoute('/activar#token=corto')

    expect(await screen.findByRole('heading', { level: 1, name: 'Este enlace no es válido' })).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.hash).toBe(''))
  })

  it('valida usuario, contrasena y confirmacion como el backend antes de enviar', async () => {
    const fetchMock = mockActivate(() => Promise.resolve(jsonResponse(ACTIVATED)))
    const user = userEvent.setup()
    renderRoute(`/activar#token=${TOKEN}`)

    await user.click(await screen.findByRole('button', { name: 'Activar cuenta' }))
    expect(screen.getByLabelText('Usuario')).toHaveFocus()
    expect(screen.getByRole('alert')).toHaveTextContent('Revisa los 3 campos marcados.')

    await user.type(screen.getByLabelText('Usuario'), 'laura gomez')
    await user.type(screen.getByLabelText('Contraseña'), 'corta')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'corta')
    expect(screen.getByLabelText('Usuario')).toHaveAccessibleDescription(/Usa de 3 a 50 caracteres/)
    expect(screen.getByLabelText('Contraseña')).toHaveAccessibleDescription(/Usa al menos 8 caracteres\./)
    await user.clear(screen.getByLabelText('Contraseña'))
    await user.type(screen.getByLabelText('Contraseña'), 'ñ'.repeat(40))
    expect(screen.getByLabelText('Contraseña')).toHaveAccessibleDescription(/Usa máximo 72 caracteres\./)
    expect(activateCalls(fetchMock)).toHaveLength(0)
  })

  it('contrasenas distintas no se envian', async () => {
    const fetchMock = mockActivate(() => Promise.resolve(jsonResponse(ACTIVATED)))
    renderRoute(`/activar#token=${TOKEN}`)

    await fillAndSubmit('otra-cosa1')

    expect(screen.getByLabelText('Confirmar contraseña')).toHaveFocus()
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument()
    expect(activateCalls(fetchMock)).toHaveLength(0)
  })

  it.each([
    [400, 'El enlace de activacion no es valido', 'Este enlace no es válido', 'El enlace de activación no es válido. Ábrelo de nuevo desde el correo, completo.'],
    [410, 'El enlace de activacion vencio o fue reemplazado', 'Este enlace ya no sirve', 'El enlace de activación venció o fue reemplazado por uno más reciente. Usa el último correo que te enviamos.'],
  ])('un %i retira el formulario y explica el problema', async (status, error, title, text) => {
    mockActivate(() => Promise.resolve(jsonResponse({ error, status }, status)))
    const router = renderRoute(`/activar#token=${TOKEN}`)

    await fillAndSubmit()

    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument()
    expect(screen.getByText(text)).toBeInTheDocument()
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    expectTokenNowhere(router)
  })

  it('un 409 de enlace ya usado enlaza a iniciar sesion', async () => {
    mockActivate(() => Promise.resolve(jsonResponse({ error: 'El enlace de activacion ya fue utilizado; inicia sesion', status: 409 }, 409)))
    renderRoute(`/activar#token=${TOKEN}`)

    await fillAndSubmit()

    expect(await screen.findByRole('heading', { level: 1, name: 'Esta cuenta ya está activa' })).toBeInTheDocument()
    expect(screen.getByText('Este enlace de activación ya se usó. Inicia sesión con el código de tu serviteca.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login')
  })

  it('un 409 de solicitud que ya no se puede activar queda en el formulario con el mensaje', async () => {
    mockActivate(() => Promise.resolve(jsonResponse({ error: 'La solicitud ya no permite esta operacion', status: 409 }, 409)))
    renderRoute(`/activar#token=${TOKEN}`)

    await fillAndSubmit()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos activar la cuenta')
    expect(alert).toHaveTextContent('Esta solicitud ya no se puede activar. Escríbenos a hola@servibox.co para revisarla.')
  })

  it('un 400 de usuario se muestra mapeado y conserva lo digitado', async () => {
    mockActivate(() => Promise.resolve(jsonResponse({ error: 'El usuario debe tener de 3 a 50 caracteres con letras, numeros, punto, guion y guion bajo', status: 400 }, 400)))
    renderRoute(`/activar#token=${TOKEN}`)

    await fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent('El usuario debe tener de 3 a 50 caracteres: letras, números, punto, guion y guion bajo.')
    expect(screen.getByLabelText('Usuario')).toHaveValue(' laura.gomez ')
  })

  it.each([
    [900, 'Hiciste demasiados intentos de activación. Espera unos minutos e inténtalo de nuevo. Podrás intentarlo de nuevo en 15 minutos.'],
    [undefined, 'Hiciste demasiados intentos de activación. Espera unos minutos e inténtalo de nuevo.'],
  ])('un 429 con Retry-After %s muestra el mensaje y el tiempo si viene', async (retryAfter, text) => {
    mockActivate(() => {
      const response = jsonResponse({ error: 'Demasiados intentos de activacion, espera unos minutos e intenta de nuevo', status: 429 }, 429)
      if (retryAfter) response.headers.set('Retry-After', String(retryAfter))
      return Promise.resolve(response)
    })
    renderRoute(`/activar#token=${TOKEN}`)

    await fillAndSubmit()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Espera antes de intentar de nuevo')
    expect(alert.textContent).toContain(text)
    expect(screen.getByLabelText('Contraseña')).toHaveValue('secreta123')
  })

  it('un error de red conserva el formulario y permite reintentar con el mismo token', async () => {
    let fail = true
    const fetchMock = mockActivate(() => (fail ? Promise.reject(new TypeError('Failed to fetch')) : Promise.resolve(jsonResponse(ACTIVATED))))
    const router = renderRoute(`/activar#token=${TOKEN}`)

    const user = await fillAndSubmit()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos completar la acción. Revisa tu conexión e inténtalo de nuevo.')
    expect(alert).not.toHaveTextContent('Failed')

    fail = false
    await user.click(screen.getByRole('button', { name: 'Activar cuenta' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Tu cuenta está activa' })).toBeInTheDocument()
    const calls = activateCalls(fetchMock)
    expect(calls).toHaveLength(2)
    expect(JSON.parse(calls[1]![1].body as string).token).toBe(TOKEN)
    expectTokenNowhere(router)
  })
})
