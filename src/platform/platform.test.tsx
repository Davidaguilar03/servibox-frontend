import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getToken, saveToken } from '../auth/session'
import { jsonResponse, makeToken, renderRoute, validToken } from '../test/utils'
import { getPlatformToken, readPlatformSession, savePlatformSession } from './platformSession'

type Handler = (url: URL, init?: RequestInit) => Response | Promise<Response>

const exp = () => Math.floor(Date.now() / 1000) + 900
const platformToken = () => makeToken({ sub: '1', iss: 'servibox-platform', aud: 'platform', identityType: 'PLATFORM', exp: exp() })
const tenantToken = () => makeToken({ sub: 'admin', role: 'ADMIN', identityType: 'TENANT', exp: exp() })
const identity = { id: 1, email: 'operador@example.test' }

const metrics = {
  tenants: { ACTIVE: 7, SUSPENDED: 1 },
  users: { total: 23, active: 20, inactive: 3 },
  registrationRequests: { PENDING: 9, APPROVED: 1, REJECTED: 0, CANCELLED: 0, ACTIVATED: 4 },
  outboxMessages: { PENDING: 2, SENT: 11, FAILED: 1 },
}

const request = (n: number, createdAt = '2026-10-29T15:00:00.000001', reservationExpired = false) => ({
  id: `req-${n}`,
  status: 'PENDING',
  businessName: `Taller de prueba ${n}`,
  nit: '900000000',
  phone: '3000000000',
  slug: `taller-prueba-${n}`,
  contactName: `Contacto ${n}`,
  contactEmail: `contacto${n}@example.test`,
  createdAt,
  reservationExpiresAt: '2026-11-05T15:00:00',
  reservationExpired,
  reviewedAt: null,
  reviewerId: null,
  rejectionReason: null,
  version: 0,
  matches: null,
})

const page = (items: unknown[], totalElements = items.length) => ({ items, page: 0, size: 5, totalElements, totalPages: 1 })

function mockApi(handlers: Record<string, Handler>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost')
    const handler = handlers[url.pathname]
    if (!handler) throw new Error(`Sin respuesta para ${url.pathname}`)
    return handler(url, init)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function defaultApi(overrides: Record<string, Handler> = {}) {
  return mockApi({
    '/api/platform/auth/me': () => jsonResponse(identity),
    '/api/platform/metrics': () => jsonResponse(metrics),
    '/api/platform/registration-requests': () => jsonResponse(page([request(1), request(2)])),
    ...overrides,
  })
}

const callsTo = (fetchMock: ReturnType<typeof mockApi>, path: string) =>
  fetchMock.mock.calls.filter(([input]) => new URL(String(input), 'http://localhost').pathname === path)

const authorization = (call: unknown[] | undefined) =>
  ((call?.[1] as RequestInit | undefined)?.headers as Record<string, string> | undefined)?.Authorization

function signInPlatform() {
  savePlatformSession(platformToken(), identity)
}

describe('acceso de plataforma', () => {
  it('sin sesion de plataforma /plataforma lleva a su propio acceso, aunque haya sesion de serviteca', async () => {
    defaultApi()
    saveToken(validToken())
    const router = renderRoute('/plataforma')

    expect(await screen.findByRole('heading', { level: 1, name: 'Acceso de plataforma' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/plataforma/login')
    expect(screen.queryByLabelText('Código de tu serviteca')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Crear cuenta|Registr|Olvid/i })).not.toBeInTheDocument()
  })

  it('inicia sesion con correo y contrasena sin token y sin tocar la sesion de serviteca', async () => {
    const user = userEvent.setup()
    const fetchMock = defaultApi({
      '/api/platform/auth/login': () => jsonResponse({ token: platformToken(), admin: identity }),
    })
    const tenant = validToken()
    saveToken(tenant)
    const router = renderRoute('/plataforma/login')

    await user.type(await screen.findByLabelText('Correo'), ' operador@example.test ')
    await user.type(screen.getByLabelText('Contraseña'), 'clave-segura')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Resumen' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/plataforma')
    const [login] = callsTo(fetchMock, '/api/platform/auth/login')
    expect(JSON.parse(String(login?.[1]?.body))).toEqual({ email: 'operador@example.test', password: 'clave-segura' })
    expect(authorization(login)).toBeUndefined()
    expect(getPlatformToken()).not.toBeNull()
    expect(getToken()).toBe(tenant)
  })

  it('con credenciales invalidas pide revisar correo y contrasena, sin mencionar la serviteca', async () => {
    const user = userEvent.setup()
    defaultApi({ '/api/platform/auth/login': () => jsonResponse({ error: 'Credenciales invalidas', status: 401 }, 401) })
    renderRoute('/plataforma/login')

    await user.type(await screen.findByLabelText('Correo'), 'operador@example.test')
    await user.type(screen.getByLabelText('Contraseña'), 'equivocada')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByText('Revisa tu correo y tu contraseña.')).toBeInTheDocument()
    expect(screen.queryByText(/código de tu serviteca/i)).not.toBeInTheDocument()
    expect(getPlatformToken()).toBeNull()
  })

  it('con sesion de plataforma el acceso lleva al Resumen', async () => {
    defaultApi()
    signInPlatform()
    const router = renderRoute('/plataforma/login')

    await screen.findByRole('heading', { level: 1, name: 'Resumen' })
    expect(router.state.location.pathname).toBe('/plataforma')
  })

  it('una ruta desconocida de plataforma vuelve al Resumen', async () => {
    defaultApi()
    signInPlatform()
    const router = renderRoute('/plataforma/no-existe')

    await screen.findByRole('heading', { level: 1, name: 'Resumen' })
    expect(router.state.location.pathname).toBe('/plataforma')
  })
})

describe('separacion de sesiones', () => {
  it('un token de serviteca guardado como plataforma no es sesion de plataforma', async () => {
    defaultApi()
    savePlatformSession(tenantToken(), identity)
    const router = renderRoute('/plataforma')

    await screen.findByRole('heading', { level: 1, name: 'Acceso de plataforma' })
    expect(router.state.location.pathname).toBe('/plataforma/login')
  })

  it('un token de plataforma no abre las rutas de la serviteca', async () => {
    defaultApi()
    saveToken(platformToken())
    signInPlatform()
    const router = renderRoute('/inicio')

    await screen.findByRole('heading', { name: 'Inicia sesión' })
    expect(router.state.location.pathname).toBe('/login')
  })

  it('las peticiones de plataforma llevan solo el token de plataforma', async () => {
    const fetchMock = defaultApi()
    saveToken(validToken())
    signInPlatform()
    renderRoute('/plataforma')

    await screen.findAllByText('Taller de prueba 1')
    const platform = getPlatformToken()
    for (const path of ['/api/platform/auth/me', '/api/platform/metrics', '/api/platform/registration-requests']) {
      expect(authorization(callsTo(fetchMock, path)[0])).toBe(`Bearer ${platform}`)
    }
  })

  it('un 401 de plataforma cierra solo esa sesion y el acceso avisa que vencio', async () => {
    defaultApi({ '/api/platform/metrics': () => jsonResponse({ error: 'No autenticado', status: 401 }, 401) })
    const tenant = validToken()
    saveToken(tenant)
    signInPlatform()
    const router = renderRoute('/plataforma')

    expect(await screen.findByText('Tu sesión venció. Inicia sesión de nuevo.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/plataforma/login')
    expect(getPlatformToken()).toBeNull()
    expect(getToken()).toBe(tenant)
  })

  it('un 403 de identidad muestra acceso denegado sin reintentos ni redirecciones', async () => {
    const user = userEvent.setup()
    const fetchMock = defaultApi({ '/api/platform/auth/me': () => jsonResponse({ error: 'Acceso denegado', status: 403 }, 403) })
    signInPlatform()
    const router = renderRoute('/plataforma')

    expect(await screen.findByRole('heading', { level: 1, name: 'Acceso denegado' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/plataforma')
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(callsTo(fetchMock, '/api/platform/auth/me')).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    await screen.findByRole('heading', { level: 1, name: 'Acceso de plataforma' })
    expect(getPlatformToken()).toBeNull()
  })

  it('cerrar sesion de plataforma conserva la de serviteca y descarta la cache de plataforma', async () => {
    const user = userEvent.setup()
    const fetchMock = defaultApi({
      '/api/platform/auth/login': () => jsonResponse({ token: platformToken(), admin: identity }),
    })
    const tenant = validToken()
    saveToken(tenant)
    signInPlatform()
    const router = renderRoute('/plataforma')

    await screen.findAllByText('Taller de prueba 1')
    await user.click(screen.getByRole('button', { name: 'Menú de usuario de operador@example.test' }))
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    await screen.findByRole('heading', { level: 1, name: 'Acceso de plataforma' })
    expect(router.state.location.pathname).toBe('/plataforma/login')
    expect(getPlatformToken()).toBeNull()
    expect(getToken()).toBe(tenant)

    await user.type(screen.getByLabelText('Correo'), 'operador@example.test')
    await user.type(screen.getByLabelText('Contraseña'), 'clave-segura')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    await screen.findAllByText('Taller de prueba 1')
    // Sin cache previa: el Resumen vuelve a pedir sus datos.
    expect(callsTo(fetchMock, '/api/platform/metrics')).toHaveLength(2)
  })

  it('la sesion de plataforma exige token de plataforma vigente e identidad guardada', () => {
    const raw = JSON.stringify(identity)
    expect(readPlatformSession(platformToken(), raw)).toMatchObject(identity)
    expect(readPlatformSession(platformToken(), null)).toBeNull()
    expect(readPlatformSession(tenantToken(), raw)).toBeNull()
    expect(readPlatformSession(makeToken({ identityType: 'PLATFORM', exp: Math.floor(Date.now() / 1000) - 10 }), raw)).toBeNull()
  })
})

describe('shell de plataforma', () => {
  it('navegacion propia: solo Resumen, sin Configuracion ni modulos de la serviteca', async () => {
    defaultApi()
    signInPlatform()
    renderRoute('/plataforma')

    await screen.findByRole('heading', { level: 1, name: 'Resumen' })
    const nav = screen.getByRole('navigation', { name: 'Principal' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual(['Resumen'])
    expect(links[0]).toHaveAttribute('href', '/plataforma')
    expect(links[0]).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('link', { name: 'Configuración' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Facturas|Inventario|Reportes|Tesorería/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ServiBox, ir a Resumen' })).toHaveAttribute('href', '/plataforma')
    expect(screen.queryByRole('navigation', { name: 'Ruta de navegación' })).not.toBeInTheDocument()
    expect(document.title).toBe('Resumen · ServiBox')
  })

  it('el menu de usuario muestra el correo y el rol de plataforma', async () => {
    const user = userEvent.setup()
    defaultApi()
    signInPlatform()
    renderRoute('/plataforma')

    const button = await screen.findByRole('button', { name: 'Menú de usuario de operador@example.test' })
    expect(within(button).getByText('OP')).toBeInTheDocument()
    await user.click(button)
    const panel = document.getElementById(button.getAttribute('aria-controls') ?? '') as HTMLElement
    expect(within(panel).getByText('Administrador de plataforma')).toBeInTheDocument()
    expect(within(panel).queryByText('Administrador')).not.toBeInTheDocument()
  })

  it('el shell de la serviteca conserva Configuracion y su menu de usuario', async () => {
    mockApi({})
    saveToken(validToken())
    signInPlatform()
    renderRoute('/configuracion')

    await screen.findByRole('heading', { level: 1, name: 'Configuración' })
    expect(screen.getByRole('link', { name: 'ServiBox, ir a Inicio' })).toHaveAttribute('href', '/inicio')
    expect(screen.queryByText('Administrador de plataforma')).not.toBeInTheDocument()
  })
})

describe('Resumen de plataforma', () => {
  it('durante la carga no inventa contadores y conserva las ayudas al resolver las metricas', async () => {
    let resolveMetrics!: (response: Response) => void
    const pendingMetrics = new Promise<Response>((resolve) => { resolveMetrics = resolve })
    defaultApi({ '/api/platform/metrics': () => pendingMetrics })
    signInPlatform()
    renderRoute('/plataforma')

    const emails = (await screen.findByRole('heading', { name: 'Correos de activación' })).closest('section') as HTMLElement
    expect(emails.querySelector('[aria-busy]')).toBeInTheDocument()
    expect(within(emails).queryByText('0')).not.toBeInTheDocument()
    expect(within(emails).queryByText('Sin dato')).not.toBeInTheDocument()
    expect(within(emails).getByText(/no garantiza que llegue al buzón/)).toBeInTheDocument()
    const users = screen.getByText('Usuarios registrados').closest('div') as HTMLElement
    expect(within(users).queryByText('0')).not.toBeInTheDocument()
    expect(within(users).queryByRole('alert')).not.toBeInTheDocument()

    resolveMetrics(jsonResponse(metrics))
    expect(await within(users).findByText('23')).toBeInTheDocument()
    expect(within(users).getByText('20 activos, 3 inactivos')).toBeInTheDocument()
    expect(await within(emails).findByText('11')).toBeInTheDocument()
    expect(emails.querySelector('[aria-busy]')).not.toBeInTheDocument()
  })

  it('los KPI son los conteos de /api/platform/metrics', async () => {
    defaultApi()
    signInPlatform()
    renderRoute('/plataforma')

    const kpi = (label: string) => screen.getByText(label).closest('div') as HTMLElement
    await screen.findAllByText('Taller de prueba 1')
    await waitFor(() => expect(within(kpi('Servitecas activas')).getByText('7')).toBeInTheDocument())
    expect(within(kpi('Servitecas suspendidas')).getByText('1')).toBeInTheDocument()
    expect(within(kpi('Solicitudes pendientes')).getByText('9')).toBeInTheDocument()
    expect(within(kpi('Usuarios registrados')).getByText('23')).toBeInTheDocument()
    expect(screen.getByText('20 activos, 3 inactivos')).toBeInTheDocument()
    // Sin bloque Usuarios repetido ni graficas.
    expect(screen.queryByRole('heading', { name: 'Usuarios' })).not.toBeInTheDocument()
  })

  it('un conteo ausente es error de su tarjeta, no un cero', async () => {
    defaultApi({ '/api/platform/metrics': () => jsonResponse({ ...metrics, tenants: { ACTIVE: 7 } }) })
    signInPlatform()
    renderRoute('/plataforma')

    const kpi = (label: string) => screen.getByText(label).closest('div') as HTMLElement
    await waitFor(() => expect(within(kpi('Servitecas activas')).getByText('7')).toBeInTheDocument())
    expect(within(kpi('Servitecas suspendidas')).getByRole('alert')).toHaveTextContent('No pudimos cargar este dato.')
    expect(within(kpi('Servitecas suspendidas')).queryByText('0')).not.toBeInTheDocument()
  })

  it('si fallan las metricas, las solicitudes siguen visibles y cada bloque ofrece reintentar', async () => {
    const user = userEvent.setup()
    let fail = true
    const fetchMock = defaultApi({
      '/api/platform/metrics': () => (fail ? jsonResponse({ error: 'Error interno', status: 500 }, 500) : jsonResponse(metrics)),
    })
    signInPlatform()
    renderRoute('/plataforma')

    expect(await screen.findByText('No pudimos cargar los correos de activación.')).toBeInTheDocument()
    expect(screen.getAllByText('Taller de prueba 1').length).toBeGreaterThan(0)
    expect(screen.getAllByText('No pudimos cargar este dato.')).toHaveLength(4)
    expect(screen.queryByText('Pendientes')).not.toBeInTheDocument()

    fail = false
    const emails = screen.getByRole('heading', { name: 'Correos de activación' }).closest('section') as HTMLElement
    await user.click(within(emails).getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(within(emails).getByText('11')).toBeInTheDocument())
    expect(callsTo(fetchMock, '/api/platform/metrics').length).toBeGreaterThan(1)
  })

  it('si fallan las solicitudes, las metricas siguen visibles', async () => {
    defaultApi({ '/api/platform/registration-requests': () => jsonResponse({ error: 'Error interno', status: 500 }, 500) })
    signInPlatform()
    renderRoute('/plataforma')

    const requests = (await screen.findByRole('heading', { name: 'Solicitudes por revisar' })).closest('section') as HTMLElement
    expect(await within(requests).findByText('No pudimos cargar esta información.')).toBeInTheDocument()
    expect(within(requests).getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('20 activos, 3 inactivos')).toBeInTheDocument())
  })

  it('pide solo las pendientes, limita la lista y dice cuantas hay en total', async () => {
    const fetchMock = defaultApi({
      '/api/platform/registration-requests': () => jsonResponse(page([1, 2, 3, 4, 5].map((n) => request(n)), 9)),
    })
    signInPlatform()
    renderRoute('/plataforma')

    expect(await screen.findByText('Las 5 más recientes de 9 pendientes.')).toBeInTheDocument()
    const url = new URL(String(callsTo(fetchMock, '/api/platform/registration-requests')[0]?.[0]), 'http://localhost')
    expect(url.searchParams.get('status')).toBe('PENDING')
    expect(url.searchParams.get('size')).toBe('5')
    expect(url.searchParams.get('page')).toBe('0')
    const table = screen.getByRole('cell', { name: /Taller de prueba 5/ }).closest('table') as HTMLElement
    expect(within(table).getAllByRole('row')).toHaveLength(6)
    // Sin acciones de revision ni enlaces a pantallas que aun no existen.
    const section = screen.getByRole('heading', { name: 'Solicitudes por revisar' }).closest('section') as HTMLElement
    expect(within(section).queryByRole('link')).not.toBeInTheDocument()
    expect(within(section).queryByRole('button')).not.toBeInTheDocument()
  })

  it('cada solicitud muestra serviteca, codigo, responsable, fecha en Bogota y reserva vencida', async () => {
    defaultApi({
      '/api/platform/registration-requests': () => jsonResponse(page([request(1, '2026-10-30T03:30:00.000001', true)])),
    })
    signInPlatform()
    renderRoute('/plataforma')

    const table = (await screen.findByRole('cell', { name: /Taller de prueba 1/ })).closest('table') as HTMLElement
    expect(within(table).getByText('taller-prueba-1')).toBeInTheDocument()
    expect(within(table).getByText('Contacto 1')).toBeInTheDocument()
    // 03:30 UTC del 30 es el 29 en Bogota.
    expect(within(table).getByText('29/10/2026')).toBeInTheDocument()
    expect(within(table).getByText('Pendiente')).toBeInTheDocument()
    expect(within(table).getByText('Reserva vencida')).toBeInTheDocument()
    expect(screen.getByText('1 pendiente.')).toBeInTheDocument()
    expect(screen.queryByText('contacto1@example.test')).not.toBeInTheDocument()
  })

  it('sin solicitudes pendientes muestra el estado vacio', async () => {
    defaultApi({ '/api/platform/registration-requests': () => jsonResponse(page([])) })
    signInPlatform()
    renderRoute('/plataforma')

    expect(await screen.findByText('No hay solicitudes pendientes.')).toBeInTheDocument()
  })

  it('los correos de activacion muestran pendientes, enviados y fallidos, sin listado ni reintento', async () => {
    defaultApi()
    signInPlatform()
    renderRoute('/plataforma')

    const emails = (await screen.findByRole('heading', { name: 'Correos de activación' })).closest('section') as HTMLElement
    const value = (label: string) => within(emails).getByText(label).nextElementSibling
    await waitFor(() => expect(value('Pendientes')).toHaveTextContent('2'))
    expect(value('Enviados')).toHaveTextContent('11')
    expect(value('Fallidos')).toHaveTextContent('1')
    expect(within(emails).getByText(/no garantiza que llegue al buzón/)).toBeInTheDocument()
    expect(within(emails).queryByRole('button')).not.toBeInTheDocument()
    expect(within(emails).queryByRole('link')).not.toBeInTheDocument()
  })

  it('un contador de correos ausente se muestra sin dato, no como cero', async () => {
    defaultApi({ '/api/platform/metrics': () => jsonResponse({ ...metrics, outboxMessages: { PENDING: 0, SENT: 4 } }) })
    signInPlatform()
    renderRoute('/plataforma')

    const emails = (await screen.findByRole('heading', { name: 'Correos de activación' })).closest('section') as HTMLElement
    const value = (label: string) => within(emails).getByText(label).nextElementSibling
    await waitFor(() => expect(value('Enviados')).toHaveTextContent('4'))
    expect(value('Pendientes')).toHaveTextContent('0')
    expect(value('Fallidos')).toHaveTextContent('Sin dato')
  })
})
