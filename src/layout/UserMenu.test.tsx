import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getToken, saveToken } from '../auth/session'
import { renderRoute, validToken } from '../test/utils'

/** Toda peticion queda pendiente: el menu no depende de los datos de la pagina. */
function pendingApi() {
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})))
}

function login(role = 'MECANICO') {
  saveToken(validToken(), {
    username: 'laura.gomez',
    role,
    tenantName: 'Serviteca El Roble',
    tenantSlug: 'el-roble',
    fullName: 'Laura María Gómez',
  })
}

const userButton = () => screen.getByRole('button', { name: 'Menú de usuario de Laura María Gómez' })
const panel = () => document.getElementById(userButton().getAttribute('aria-controls') ?? '')

async function setup(path = '/inicio') {
  const user = userEvent.setup()
  const router = renderRoute(path)
  await screen.findByRole('heading', { level: 1 })
  return { user, router }
}

describe('menu de usuario', () => {
  beforeEach(() => {
    pendingApi()
    login()
  })

  it('vive al pie del sidebar con identidad real y no se duplica en la barra superior', async () => {
    await setup()
    const content = screen.getByRole('main')
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(within(content).queryByRole('button', { name: /Menú de usuario/ })).not.toBeInTheDocument()
    const aside = screen.getByRole('navigation', { name: 'Principal' }).closest('aside') as HTMLElement
    const button = within(aside).getByRole('button', { name: 'Menú de usuario de Laura María Gómez' })
    expect(within(button).getByText('LG')).toBeInTheDocument()
    expect(within(button).getByText('Serviteca El Roble')).toBeInTheDocument()
    expect(within(button).getByText('Mecánico')).toBeInTheDocument()
    expect(screen.queryByText('Administrador')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Menú de usuario/ })).toHaveLength(1)
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).not.toHaveAttribute('aria-haspopup')
    expect(panel()).toBeNull()

    const settings = within(aside).getByRole('link', { name: 'Configuración' })
    expect(settings.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(content).getByText(/Resumen de Serviteca El Roble/)).toBeInTheDocument()
  })

  it('abre con clic, lleva el foco al panel y muestra nombre, rol traducido y serviteca; otro clic lo cierra', async () => {
    const { user } = await setup()
    await user.click(userButton())

    expect(userButton()).toHaveAttribute('aria-expanded', 'true')
    const opened = panel() as HTMLElement
    expect(opened).not.toHaveAttribute('role')
    expect(opened).toHaveClass('shadow-raised', 'rounded-surface')
    expect(opened).toHaveFocus()
    expect(within(opened).getByText('Laura María Gómez')).toBeInTheDocument()
    expect(within(opened).getByText('Mecánico')).toBeInTheDocument()
    expect(within(opened).getByText('Serviteca El Roble')).toBeInTheDocument()
    expect(within(opened).getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument()

    await user.click(userButton())
    expect(userButton()).toHaveAttribute('aria-expanded', 'false')
    expect(panel()).toBeNull()
  })

  it.each([
    ['ADMIN', 'Administrador'],
    ['CAJERO', 'Cajero'],
  ])('traduce el rol %s como %s', async (role, label) => {
    login(role)
    const { user } = await setup()
    await user.click(userButton())
    expect(within(panel() as HTMLElement).getByText(label)).toBeInTheDocument()
  })

  it('Esc lo cierra y devuelve el foco al boton', async () => {
    const { user } = await setup()
    await user.click(userButton())
    await user.keyboard('{Escape}')

    expect(panel()).toBeNull()
    expect(userButton()).toHaveAttribute('aria-expanded', 'false')
    expect(userButton()).toHaveFocus()
  })

  it('con el teclado: Enter abre, Tab llega a Cerrar sesion y Esc vuelve al boton', async () => {
    const { user } = await setup()
    userButton().focus()
    await user.keyboard('{Enter}')
    expect(panel()).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(userButton()).toHaveFocus()
  })

  it('si el foco sale del menu con Tab, el panel se cierra', async () => {
    const { user } = await setup()
    await user.click(userButton())
    await user.tab()
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toHaveFocus()
    await user.tab()
    expect(panel()).toBeNull()
  })

  it('el clic fuera lo cierra', async () => {
    const { user } = await setup()
    await user.click(userButton())
    await user.click(screen.getByRole('main'))
    expect(panel()).toBeNull()
  })

  it('se cierra al cambiar de ruta', async () => {
    const { user, router } = await setup()
    await user.click(userButton())
    await router.navigate('/ventas')
    await screen.findByRole('heading', { level: 1, name: 'Facturas de venta' })
    expect(router.state.location.pathname).toBe('/ventas')
    expect(panel()).toBeNull()
    expect(userButton()).toHaveAttribute('aria-expanded', 'false')
  })

  it('Cerrar sesion cierra la sesion y vuelve a /login', async () => {
    const { user, router } = await setup()
    await user.click(userButton())
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(getToken()).toBeNull()
    await screen.findByRole('heading', { name: 'Inicia sesión' })
    expect(router.state.location.pathname).toBe('/login')
  })

  it('contraido mantiene nombre accesible, apertura con teclado y cerrar sesion', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    localStorage.setItem('servibox.sidebar', 'collapsed')
    const { user, router } = await setup()
    expect(userButton()).toHaveAttribute('title', 'Menú de usuario de Laura María Gómez')
    expect(within(userButton()).getByText('LG')).toBeInTheDocument()
    userButton().focus()
    await user.keyboard('{Enter}')
    await user.tab()
    await user.keyboard('{Enter}')
    expect(getToken()).toBeNull()
    await screen.findByRole('heading', { name: 'Inicia sesión' })
    expect(router.state.location.pathname).toBe('/login')
  })

  it('en movil Esc cierra primero el usuario y luego el lateral, devolviendo cada foco', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    const { user } = await setup()
    const mobile = screen.getByRole('button', { name: 'Abrir menú' })
    await user.click(mobile)
    await user.click(userButton())
    await user.keyboard('{Escape}')
    expect(panel()).toBeNull()
    expect(userButton()).toHaveFocus()
    expect(mobile).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{Escape}')
    expect(mobile).toHaveAttribute('aria-expanded', 'false')
    expect(mobile).toHaveFocus()
  })

  it('en movil el foco de Cerrar sesion vuelve al primer enlace sin salir del lateral', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    const { user } = await setup()
    await user.click(screen.getByRole('button', { name: 'Abrir menú' }))
    await user.click(userButton())
    await user.tab()
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('link', { name: 'ServiBox, ir a Inicio' })).toHaveFocus()
    expect(panel()).toBeNull()
  })
})
