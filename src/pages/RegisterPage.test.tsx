import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getToken, saveToken } from '../auth/session'
import { jsonResponse, primaryActions, renderRoute, validToken } from '../test/utils'

// Solicitud publica de cuenta (POST /api/registration-requests) con API simulada.

const accepted = { requestId: 'r-1', status: 'PENDING', message: 'Solicitud recibida, pendiente de revision' }

function retryResponse(error: string, status: number, retryAfter?: number) {
  const response = jsonResponse({ error, status }, status)
  if (retryAfter !== undefined) response.headers.set('Retry-After', String(retryAfter))
  return response
}

/** La solicitud responde lo que se pida (una funcion por llamada, la ultima se repite); el resto un 500. */
function mockFetch(...responses: Array<() => Promise<Response>>) {
  let call = 0
  const fetchMock = vi.fn((url: string) => {
    if (url !== '/api/registration-requests') return Promise.resolve(jsonResponse({ error: 'x', status: 500 }, 500))
    const respond = responses[Math.min(call, responses.length - 1)]!
    call += 1
    return respond()
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function requestCalls(fetchMock: ReturnType<typeof mockFetch>) {
  return fetchMock.mock.calls.filter(([url]) => url === '/api/registration-requests') as unknown as [string, RequestInit][]
}

const keyOf = ([, init]: [string, RequestInit]) => (init.headers as Record<string, string>)['Idempotency-Key']

async function fillForm(user = userEvent.setup()) {
  await user.type(await screen.findByLabelText('Nombre comercial'), '  Serviteca El Roble ')
  await user.type(screen.getByLabelText('NIT'), '900.123.456-7')
  await user.type(screen.getByLabelText('Teléfono'), '300 123 4567')
  await user.type(screen.getByLabelText('Nombre completo'), 'Laura Gómez')
  await user.type(screen.getByLabelText('Correo'), 'laura@elroble.co')
  await user.click(screen.getByRole('checkbox', { name: 'Acepto la Política de tratamiento de datos personales y los Términos y condiciones' }))
  return user
}

const submit = () => screen.getByRole('button', { name: 'Enviar solicitud' })

describe('solicitud de cuenta', () => {
  it('tiene un unico h1, los campos de la API y ninguno de usuario o contrasena', async () => {
    renderRoute('/registro')

    const headings = await screen.findAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent('Solicita tu cuenta')
    expect(screen.getByText(/Revisamos cada solicitud y, si la aprobamos, te enviamos un correo para activar la cuenta/)).toBeInTheDocument()
    expect(primaryActions()).toHaveLength(1)
    const business = screen.getByRole('group', { name: '1. Datos de la serviteca' })
    for (const label of ['Nombre comercial', 'NIT', 'Teléfono', 'Código de tu serviteca']) {
      expect(within(business).getByLabelText(label)).toBeInTheDocument()
    }
    const admin = screen.getByRole('group', { name: '2. Administrador' })
    for (const label of ['Nombre completo', 'Correo']) {
      expect(within(admin).getByLabelText(label)).toBeInTheDocument()
    }
    expect(screen.getByLabelText('Correo')).toHaveAccessibleDescription('Aquí te escribimos para activar la cuenta.')
    expect(screen.queryByLabelText('Usuario')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument()
    expect(screen.getByText('Tu serviteca empieza aquí.')).toBeInTheDocument()
    const photo = document.querySelector('.register-photo')!
    expect(photo).toHaveAttribute('alt', '')
  })

  it('la autorizacion se da solo en la casilla: no hay nota de aceptacion bajo el boton', async () => {
    renderRoute('/registro')

    expect(await screen.findByText(/Creas tu usuario y tu contraseña, y dejamos listas la Caja General/)).toBeInTheDocument()
    expect(screen.queryByText(/Al enviar la solicitud aceptas/)).not.toBeInTheDocument()
  })

  it('sugiere el codigo desde el nombre comercial hasta que se edita a mano', async () => {
    const user = userEvent.setup()
    renderRoute('/registro')
    const name = await screen.findByLabelText('Nombre comercial')
    const slug = screen.getByLabelText('Código de tu serviteca')

    await user.type(name, 'Serviteca El Roble')
    expect(slug).toHaveValue('serviteca-el-roble')

    await user.clear(slug)
    await user.type(slug, 'EL-Roble 2')
    expect(slug).toHaveValue('el-roble2')

    await user.type(name, ' Norte')
    expect(slug).toHaveValue('el-roble2')
  })

  it('enviar vacio muestra todos los errores, lleva el foco al primero y no llama al backend', async () => {
    const fetchMock = mockFetch(() => Promise.resolve(jsonResponse(accepted, 202)))
    const user = userEvent.setup()
    renderRoute('/registro')
    await user.click(await screen.findByRole('button', { name: 'Enviar solicitud' }))

    const name = screen.getByLabelText('Nombre comercial')
    expect(name).toHaveFocus()
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(name).toHaveAccessibleDescription('Escribe el nombre comercial.')
    expect(screen.getByRole('alert')).toHaveTextContent('Revisa los 7 campos marcados.')
    expect(requestCalls(fetchMock)).toHaveLength(0)
  })

  it('valida como el backend al salir de cada campo: NIT, telefono, correo y codigo reservado', async () => {
    const user = userEvent.setup()
    renderRoute('/registro')
    await user.type(await screen.findByLabelText('NIT'), '901234567-8X')
    await user.tab()
    expect(screen.getByText(/^El NIT solo admite dígitos/)).toBeInTheDocument()

    await user.tab()
    expect(screen.getByLabelText('Teléfono')).toHaveAttribute('aria-invalid', 'true')

    await user.type(screen.getByLabelText('Correo'), 'laura@')
    await user.tab()
    expect(screen.getByText('Escribe un correo válido, por ejemplo nombre@correo.com.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Código de tu serviteca'), 'activar')
    await user.tab()
    expect(screen.getByText('Este identificador está reservado. Elige otro.')).toBeInTheDocument()
  })

  it('sin aceptar los terminos no se envia y el foco va a la casilla', async () => {
    const fetchMock = mockFetch(() => Promise.resolve(jsonResponse(accepted, 202)))
    renderRoute('/registro')
    const user = await fillForm()

    await user.click(screen.getByRole('checkbox'))
    await user.click(submit())

    expect(screen.getByRole('checkbox')).toHaveFocus()
    expect(screen.getByText('Acepta la Política de tratamiento de datos personales y los Términos y condiciones para continuar.')).toBeInTheDocument()
    expect(requestCalls(fetchMock)).toHaveLength(0)
  })

  it('envia el cuerpo exacto con Idempotency-Key y tras el 202 explica lo que sigue sin prometer plazos', async () => {
    const fetchMock = mockFetch(() => Promise.resolve(jsonResponse(accepted, 202)))
    const router = renderRoute('/registro')
    const user = await fillForm()

    await user.click(submit())

    const heading = await screen.findByRole('heading', { level: 1, name: 'Recibimos tu solicitud' })
    await waitFor(() => expect(heading).toHaveFocus())
    const [call] = requestCalls(fetchMock)
    const [url, init] = call!
    expect(url).toBe('/api/registration-requests')
    expect(init.method).toBe('POST')
    expect(keyOf(call!)).toMatch(/^[A-Za-z0-9._:-]{8,100}$/)
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined()
    expect(JSON.parse(init.body as string)).toEqual({
      businessName: 'Serviteca El Roble',
      nit: '900123456-7',
      phone: '300 123 4567',
      slug: 'serviteca-el-roble',
      adminFullName: 'Laura Gómez',
      adminEmail: 'laura@elroble.co',
      acceptTerms: true,
      policyVersion: '2026-11-01',
    })
    expect(screen.getByText(/Vamos a revisar los datos de/)).toHaveTextContent(
      'Vamos a revisar los datos de Serviteca El Roble. Si la aprobamos, te enviaremos a laura@elroble.co un correo con el enlace para activar la cuenta y crear tu usuario.',
    )
    expect(screen.getByText(/revisa la carpeta de spam/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'hola@servibox.co' })).toHaveAttribute('href', 'mailto:hola@servibox.co')
    expect(document.body).not.toHaveTextContent(/horas|días|minutos|garantiza|llegará/i)
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    // Sin sesion: la solicitud no crea serviteca ni usuario.
    expect(router.state.location.pathname).toBe('/registro')
    expect(getToken()).toBeNull()
    expect(localStorage.getItem('servibox.tenantSlug')).toBeNull()
  })

  it('reintentar el mismo envio reutiliza la clave; cambiar los datos usa una nueva', async () => {
    const fetchMock = mockFetch(
      () => Promise.reject(new TypeError('Failed to fetch')),
      () => Promise.reject(new TypeError('Failed to fetch')),
      () => Promise.resolve(jsonResponse(accepted, 202)),
    )
    renderRoute('/registro')
    const user = await fillForm()

    await user.click(submit())
    await screen.findByRole('alert')
    await user.click(submit())
    await waitFor(() => expect(requestCalls(fetchMock)).toHaveLength(2))
    const [first, second] = requestCalls(fetchMock)
    expect(keyOf(second!)).toBe(keyOf(first!))

    await user.type(screen.getByLabelText('Teléfono'), '1')
    await user.click(submit())
    await screen.findByRole('heading', { level: 1, name: 'Recibimos tu solicitud' })
    const third = requestCalls(fetchMock)[2]!
    expect(keyOf(third)).not.toBe(keyOf(first!))
    expect(JSON.parse(third[1].body as string).phone).toBe('300 123 45671')
  })

  it('con la compuerta apagada (404) dice que el registro aun no esta disponible y como contactar', async () => {
    mockFetch(() => Promise.resolve(jsonResponse({ error: 'Recurso no encontrado', status: 404 }, 404)))
    renderRoute('/registro')
    const user = await fillForm()

    await user.click(submit())

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('El registro todavía no está disponible')
    expect(alert).toHaveTextContent('Aún no estamos recibiendo solicitudes de cuenta. Si quieres usar ServiBox en tu serviteca, escríbenos a hola@servibox.co.')
    expect(within(alert).getByRole('link', { name: 'hola@servibox.co' })).toHaveAttribute('href', 'mailto:hola@servibox.co')
    expect(alert).not.toHaveTextContent(/WhatsApp|\+57/)
    expect(screen.getByLabelText('Nombre comercial')).toHaveValue('  Serviteca El Roble ')
  })

  it('un 400 se muestra en el Alert con el mensaje mapeado sin perder lo digitado', async () => {
    mockFetch(() => Promise.resolve(jsonResponse({ error: 'El identificador demo esta reservado', status: 400 }, 400)))
    renderRoute('/registro')
    const user = await fillForm()

    await user.click(submit())

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos enviar la solicitud')
    expect(alert).toHaveTextContent('El código demo está reservado. Elige otro.')
    expect(screen.getByLabelText('Nombre comercial')).toHaveValue('  Serviteca El Roble ')
  })

  it('un codigo no disponible (409) queda bajo el codigo con el foco y desaparece al cambiarlo', async () => {
    mockFetch(() => Promise.resolve(jsonResponse({ error: 'El codigo solicitado no esta disponible', status: 409 }, 409)))
    renderRoute('/registro')
    const user = await fillForm()

    await user.click(submit())

    const slug = screen.getByLabelText('Código de tu serviteca')
    expect(await screen.findByText('Este código ya no está disponible. Elige otro.')).toBeInTheDocument()
    expect(slug).toHaveAttribute('aria-invalid', 'true')
    await waitFor(() => expect(slug).toHaveFocus())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await user.type(slug, '-2')
    expect(screen.queryByText('Este código ya no está disponible. Elige otro.')).not.toBeInTheDocument()
  })

  it('una clave reutilizada con otros datos (409) avisa y el siguiente envio usa una clave nueva', async () => {
    const fetchMock = mockFetch(
      () => Promise.resolve(jsonResponse({ error: 'La clave de reintento ya se uso con otros datos', status: 409 }, 409)),
      () => Promise.resolve(jsonResponse(accepted, 202)),
    )
    renderRoute('/registro')
    const user = await fillForm()

    await user.click(submit())
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos confirmar el envío porque los datos cambiaron. Envía la solicitud de nuevo.')
    await user.click(submit())

    await screen.findByRole('heading', { level: 1, name: 'Recibimos tu solicitud' })
    const [first, second] = requestCalls(fetchMock)
    expect(keyOf(second!)).not.toBe(keyOf(first!))
  })

  it.each([
    [900, 'Recibimos demasiadas solicitudes desde esta conexión. Inténtalo de nuevo más tarde. Podrás intentarlo de nuevo en 15 minutos.'],
    [undefined, 'Recibimos demasiadas solicitudes desde esta conexión. Inténtalo de nuevo más tarde.'],
  ])('un 429 con Retry-After %s muestra el mensaje y el tiempo si viene', async (retryAfter, text) => {
    mockFetch(() => Promise.resolve(retryResponse('Demasiadas solicitudes desde esta conexion, intenta de nuevo mas tarde', 429, retryAfter)))
    renderRoute('/registro')
    const user = await fillForm()

    await user.click(submit())

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Espera antes de enviar de nuevo')
    expect(alert).toHaveTextContent(text)
    if (retryAfter === undefined) expect(alert).not.toHaveTextContent('Podrás intentarlo')
  })

  it('regresion: seis envios sin cambiar datos llegan al backend con la misma clave y el sexto muestra el 429', async () => {
    // Antes, tras el 409 de codigo no disponible el formulario dejaba de enviar con el mismo
    // codigo y el limite de 5 por hora del backend nunca se veia.
    const slugTaken = () => Promise.resolve(jsonResponse({ error: 'El codigo solicitado no esta disponible', status: 409 }, 409))
    const fetchMock = mockFetch(
      () => Promise.reject(new TypeError('Failed to fetch')),
      slugTaken, slugTaken, slugTaken, slugTaken,
      () => Promise.resolve(retryResponse('Demasiadas solicitudes desde esta conexion, intenta de nuevo mas tarde', 429, 2819)),
    )
    renderRoute('/registro')
    const user = await fillForm()

    await user.click(submit())
    await screen.findByRole('alert')
    for (let sent = 2; sent <= 6; sent += 1) {
      await user.click(submit())
      await waitFor(() => expect(requestCalls(fetchMock)).toHaveLength(sent))
      await waitFor(() => expect(submit()).toBeEnabled())
    }

    const calls = requestCalls(fetchMock)
    expect(new Set(calls.map(keyOf)).size).toBe(1)
    expect(new Set(calls.map(([, init]) => init.body)).size).toBe(1)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Espera antes de enviar de nuevo')
    expect(alert).toHaveTextContent('Recibimos demasiadas solicitudes desde esta conexión. Inténtalo de nuevo más tarde. Podrás intentarlo de nuevo en 47 minutos.')
    expect(screen.queryByText('Este código ya no está disponible. Elige otro.')).not.toBeInTheDocument()
  })

  it('un error de red o un 500 muestran el mensaje generico sin contacto', async () => {
    mockFetch(() => Promise.reject(new TypeError('Failed to fetch')))
    renderRoute('/registro')
    const user = await fillForm()

    await user.click(submit())
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos enviar la solicitud')
    expect(alert).toHaveTextContent('No pudimos completar la acción. Revisa tu conexión e inténtalo de nuevo.')
    expect(alert).not.toHaveTextContent(/Failed|WhatsApp/)

    mockFetch(() => Promise.resolve(jsonResponse({ error: 'Error interno del servidor', status: 500 }, 500)))
    await user.click(submit())
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Revisa tu conexión e inténtalo de nuevo.'))
    expect(screen.getByRole('alert')).not.toHaveTextContent('interno')
  })

  it('no envia dos veces y muestra el estado de carga', async () => {
    let resolve: (response: Response) => void = () => {}
    const fetchMock = mockFetch(() => new Promise<Response>((done) => (resolve = done)))
    renderRoute('/registro')
    const user = await fillForm()

    await user.dblClick(submit())

    const loading = await screen.findByRole('button', { name: 'Enviando solicitud…' })
    expect(loading).toBeDisabled()
    const form = screen.getByRole('form', { name: 'Solicitar cuenta' })
    expect(form).toHaveAttribute('aria-busy', 'true')
    fireEvent.submit(form)
    fireEvent.submit(form)
    expect(requestCalls(fetchMock)).toHaveLength(1)
    resolve(jsonResponse(accepted, 202))
    expect(await screen.findByRole('heading', { level: 1, name: 'Recibimos tu solicitud' })).toBeInTheDocument()
  })

  it('un 409 tardio solo marca el codigo enviado', async () => {
    let resolve: (response: Response) => void = () => {}
    mockFetch(() => new Promise<Response>((done) => (resolve = done)))
    renderRoute('/registro')
    const user = await fillForm()
    await user.click(submit())
    const slug = screen.getByLabelText('Código de tu serviteca')
    await user.type(slug, '-2')
    resolve(jsonResponse({ error: 'El codigo solicitado no esta disponible', status: 409 }, 409))
    await waitFor(() => expect(slug).toHaveFocus())
    expect(slug).not.toHaveAttribute('aria-invalid')
    await user.keyboard('{Backspace}{Backspace}')
    expect(slug).toHaveAttribute('aria-invalid', 'true')
  })

  it('los enlaces de la casilla abren en una pestana nueva sin referrer y hay vuelta al login', async () => {
    renderRoute('/registro')

    await screen.findByRole('checkbox')
    const label = within(document.querySelector('label[for="acceptTerms"]') as HTMLElement)
    const policy = label.getByRole('link', { name: 'Política de tratamiento de datos personales' })
    const terms = label.getByRole('link', { name: 'Términos y condiciones' })
    expect(policy).toHaveAttribute('href', '/politica-de-datos')
    expect(terms).toHaveAttribute('href', '/terminos')
    for (const link of [policy, terms]) {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/')
  })

  it('la casilla empieza sin marcar, sin error y sin descripcion', async () => {
    renderRoute('/registro')

    const checkbox = await screen.findByRole('checkbox', { name: 'Acepto la Política de tratamiento de datos personales y los Términos y condiciones' })
    expect(checkbox).not.toBeChecked()
    expect(checkbox).not.toHaveAttribute('aria-invalid')
    expect(checkbox).not.toHaveAttribute('aria-describedby')
  })

  it('sin marcar la casilla el error queda asociado al campo y el teclado llega a los enlaces', async () => {
    const fetchMock = mockFetch(() => Promise.resolve(jsonResponse(accepted, 202)))
    renderRoute('/registro')
    const user = await fillForm()
    const checkbox = screen.getByRole('checkbox')

    await user.click(checkbox)
    await user.click(submit())

    expect(checkbox).toHaveFocus()
    expect(checkbox).toHaveAttribute('aria-invalid', 'true')
    expect(checkbox).toHaveAccessibleDescription('Acepta la Política de tratamiento de datos personales y los Términos y condiciones para continuar.')
    expect(requestCalls(fetchMock)).toHaveLength(0)
    const label = within(document.querySelector('label[for="acceptTerms"]') as HTMLElement)
    await user.tab()
    expect(label.getByRole('link', { name: 'Política de tratamiento de datos personales' })).toHaveFocus()
    await user.tab()
    expect(label.getByRole('link', { name: 'Términos y condiciones' })).toHaveFocus()
  })

  it('la version de la politica viaja tambien al reintentar, con la misma clave', async () => {
    const fetchMock = mockFetch(
      () => Promise.reject(new TypeError('Failed to fetch')),
      () => Promise.resolve(jsonResponse(accepted, 202)),
    )
    renderRoute('/registro')
    const user = await fillForm()

    await user.click(submit())
    await screen.findByRole('alert')
    await user.click(submit())
    await screen.findByRole('heading', { level: 1, name: 'Recibimos tu solicitud' })

    const [first, second] = requestCalls(fetchMock)
    expect(keyOf(second!)).toBe(keyOf(first!))
    expect(JSON.parse(second![1].body as string).policyVersion).toBe('2026-11-01')
  })

  it.each([
    ['La version de la politica es obligatoria', 'No pudimos registrar la versión de la política que aceptaste. Recarga la página e inténtalo de nuevo.'],
    ['La version de la politica no es valida', 'La versión de la política que aceptaste no es válida. Recarga la página e inténtalo de nuevo.'],
    ['La politica fue actualizada; recarga la pagina para continuar', 'Actualizamos la política de datos. Recarga la página para continuar.'],
  ])('el 400 "%s" muestra su mensaje con un boton para recargar sin perder lo digitado', async (backend, text) => {
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })
    mockFetch(() => Promise.resolve(jsonResponse({ error: backend, status: 400 }, 400)))
    renderRoute('/registro')
    const user = await fillForm()

    await user.click(submit())

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos enviar la solicitud')
    expect(alert).toHaveTextContent(text)
    expect(screen.getByLabelText('Nombre comercial')).toHaveValue('  Serviteca El Roble ')
    expect(primaryActions()).toHaveLength(1)
    await user.click(within(alert).getByRole('button', { name: 'Recargar la página' }))
    expect(reload).toHaveBeenCalledOnce()
  })

  it('otro 400 no ofrece recargar la pagina', async () => {
    mockFetch(() => Promise.resolve(jsonResponse({ error: 'El identificador demo esta reservado', status: 400 }, 400)))
    renderRoute('/registro')
    const user = await fillForm()

    await user.click(submit())

    expect(within(await screen.findByRole('alert')).queryByRole('button')).not.toBeInTheDocument()
  })

  it('con sesion redirige a /inicio', async () => {
    saveToken(validToken())
    const router = renderRoute('/registro')

    await screen.findByRole('heading', { name: 'Inicio' })
    expect(router.state.location.pathname).toBe('/inicio')
  })

  it('fija el titulo del documento', async () => {
    renderRoute('/registro')

    await screen.findByRole('heading', { name: 'Solicita tu cuenta' })
    expect(document.title).toBe('Solicitar cuenta | ServiBox')
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      expect.stringContaining('Solicita la cuenta de tu serviteca'),
    )
  })
})
