import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { saveToken } from '../auth/session'
import { renderRoute, validToken } from '../test/utils'

/** Los enlaces que se ven como boton primario: llevan el fondo `bg-action`. */
const primaryLinks = (container: HTMLElement) =>
  within(container)
    .queryAllByRole('link')
    .filter((link) => link.className.includes('bg-action'))

describe('landing', () => {
  it('muestra las secciones con un solo h1 y su titulo de documento', async () => {
    renderRoute('/')

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Una venta. Inventario y caja al día.')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    for (const name of [
      'Deja atrás los tres archivos de Excel',
      'Todo lo administrativo, en un solo lugar',
      'Empieza a usarlo el mismo día',
      'Tu negocio en buenas manos',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument()
    }
    for (const name of ['Inventario', 'Ventas', 'Compras', 'Cuentas', 'Panel de control']) {
      expect(screen.getByRole('heading', { level: 3, name })).toBeInTheDocument()
    }
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveAttribute('id', 'contenido')
    expect(screen.getByRole('contentinfo')).toHaveTextContent('ServiBox · v1.0 · 2026')
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Confiabilidad')
    expect(screen.getByRole('link', { name: 'Saltar al contenido' })).toHaveAttribute('href', '#contenido')
    expect(document.title).toBe('ServiBox · Ventas, inventario y cuentas de tu serviteca')
  })

  it('las anclas llevan a su seccion y Contacto al pie', async () => {
    renderRoute('/')
    const nav = await screen.findByRole('navigation', { name: 'Secciones' })

    for (const [name, href] of [
      ['Producto', '#producto'],
      ['Módulos', '#modulos'],
      ['Cómo funciona', '#como-funciona'],
      ['Contacto', '#contacto'],
    ] as const) {
      const link = within(nav).getByRole('link', { name })
      expect(link).toHaveAttribute('href', href)
      expect(document.getElementById(href.slice(1))).not.toBeNull()
    }
    expect(screen.getByRole('contentinfo')).toHaveAttribute('id', 'contacto')
  })

  it('sin sesion ofrece iniciar sesion y crear cuenta', async () => {
    renderRoute('/')
    const header = await screen.findByRole('banner')

    expect(within(header).getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login')
    expect(within(header).getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/registro')
    expect(screen.getAllByRole('link', { name: 'Crea tu cuenta' })[0]).toHaveAttribute('href', '/registro')
    expect(screen.getByRole('link', { name: 'Términos y condiciones' })).toHaveAttribute('href', '/terminos')
  })

  it('un solo boton primario por tramo y ninguno en el encabezado', async () => {
    renderRoute('/')
    const header = await screen.findByRole('banner')

    expect(primaryLinks(header)).toHaveLength(0)
    const sections = screen.getByRole('main').querySelectorAll('section')
    for (const section of sections) expect(primaryLinks(section).length).toBeLessThanOrEqual(1)
    expect(primaryLinks(screen.getByRole('main'))).toHaveLength(2)
    expect(primaryLinks(screen.getByRole('contentinfo'))).toHaveLength(0)
  })

  it('la vista de ejemplo esta oculta para lectores de pantalla', async () => {
    renderRoute('/')

    const sample = (await screen.findByText('Vista de ejemplo con datos ficticios')).closest('[aria-hidden]')
    expect(sample).not.toBeNull()
    expect(within(sample as HTMLElement).getByText('Cliente de ejemplo 1')).toBeInTheDocument()
  })

  it('el menu movil se abre, cierra con Esc y al elegir una opcion', async () => {
    const user = userEvent.setup()
    renderRoute('/')
    const button = await screen.findByRole('button', { name: 'Abrir menú' })
    expect(button).toHaveAttribute('aria-expanded', 'false')

    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    const menu = document.getElementById('menu-secciones') as HTMLElement
    expect(within(menu).getByRole('link', { name: 'Módulos' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById('menu-secciones')).toBeNull()
    expect(button).toHaveFocus()

    await user.click(button)
    await user.click(within(document.getElementById('menu-secciones') as HTMLElement).getByRole('link', { name: 'Cómo funciona' }))
    expect(document.getElementById('menu-secciones')).toBeNull()
  })

  it('con sesion muestra Ir al panel en lugar de iniciar sesion y crear cuenta', async () => {
    saveToken(validToken())
    renderRoute('/')
    const header = await screen.findByRole('banner')

    expect(within(header).getByRole('link', { name: 'Ir al panel' })).toHaveAttribute('href', '/inicio')
    expect(within(header).queryByRole('link', { name: 'Iniciar sesión' })).not.toBeInTheDocument()
    expect(within(header).queryByRole('link', { name: 'Crear cuenta' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Crea tu cuenta' })).not.toBeInTheDocument()
  })
})

describe('terminos', () => {
  it('es una pagina proximamente con enlace de regreso', async () => {
    renderRoute('/terminos')

    expect(await screen.findByRole('heading', { level: 1, name: 'Términos y condiciones' })).toBeInTheDocument()
    expect(screen.getByText(/Próximamente/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a la página principal' })).toHaveAttribute('href', '/')
    expect(document.title).toBe('Términos y condiciones · ServiBox')
  })
})
