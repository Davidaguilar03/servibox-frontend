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

  it('vive en la barra superior con las iniciales y la serviteca; ya no hay pildora ni bloque de usuario abajo', async () => {
    await setup()
    const header = screen.getByRole('banner')
    const button = within(header).getByRole('button', { name: 'Menú de usuario de Laura María Gómez' })
    expect(within(button).getByText('LG')).toBeInTheDocument()
    expect(within(button).getByText('Serviteca El Roble')).toHaveClass('hidden', 'md:inline')
    // La serviteca solo sale en el boton: no queda la pildora aparte.
    expect(within(header).getAllByText('Serviteca El Roble')).toHaveLength(1)
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).not.toHaveAttribute('aria-haspopup')
    expect(panel()).toBeNull()

    const aside = screen.getByRole('navigation', { name: 'Principal' }).closest('aside') as HTMLElement
    expect(within(aside).queryByText('LG')).not.toBeInTheDocument()
    expect(within(aside).queryByText('Laura María Gómez')).not.toBeInTheDocument()
    expect(within(aside).queryByRole('button', { name: 'Salir' })).not.toBeInTheDocument()
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
    await screen.findByRole('heading', { name: 'Iniciar sesión' })
    expect(router.state.location.pathname).toBe('/login')
  })
})
