import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { saveToken } from '../auth/session'
import { jsonResponse, renderRoute, validToken } from '../test/utils'

/** Ancho de pantalla: desde lg (1024 px) es escritorio. */
function stubViewport(desktop: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: desktop,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
}

/** Toda peticion queda pendiente: el shell no depende de los datos de la pagina. */
function pendingApi() {
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})))
}

const aside = () => screen.getByRole('navigation', { name: 'Principal' }).closest('aside') as HTMLElement
const content = () => screen.getByRole('banner').parentElement as HTMLElement

describe('shell', () => {
  beforeEach(() => {
    saveToken(validToken())
    pendingApi()
  })

  describe('menu movil', () => {
    it('cerrado bajo lg el menu es inerte; en escritorio no', async () => {
      stubViewport(false)
      renderRoute('/inicio')
      await screen.findByRole('heading', { level: 1, name: 'Inicio' })

      expect(aside()).toHaveAttribute('inert')
      expect(content()).not.toHaveAttribute('inert')
    })

    it('en escritorio el menu no es inerte ni lo controla el boton', async () => {
      stubViewport(true)
      renderRoute('/inicio')
      await screen.findByRole('heading', { level: 1, name: 'Inicio' })

      expect(aside()).not.toHaveAttribute('inert')
      expect(content()).not.toHaveAttribute('inert')
      expect(screen.getByRole('button', { name: 'Abrir menú' })).toHaveAttribute('aria-expanded', 'false')
    })

    it('abrir lleva el foco al menu, deja el contenido inerte, y Esc lo cierra y devuelve el foco', async () => {
      stubViewport(false)
      const user = userEvent.setup()
      renderRoute('/inicio')
      await screen.findByRole('heading', { level: 1, name: 'Inicio' })

      const button = screen.getByRole('button', { name: 'Abrir menú' })
      expect(button).toHaveAttribute('aria-expanded', 'false')
      expect(button).toHaveAttribute('aria-controls', 'menu-lateral')
      expect(aside()).toHaveAttribute('id', 'menu-lateral')

      await user.click(button)
      expect(button).toHaveAttribute('aria-expanded', 'true')
      expect(aside()).not.toHaveAttribute('inert')
      expect(content()).toHaveAttribute('inert')
      expect(within(aside()).getByRole('link', { name: 'Inicio' })).toHaveFocus()

      await user.keyboard('{Escape}')
      expect(button).toHaveAttribute('aria-expanded', 'false')
      expect(aside()).toHaveAttribute('inert')
      expect(content()).not.toHaveAttribute('inert')
      await waitFor(() => expect(button).toHaveFocus())
    })

    it('con el menu abierto Tab no sale de el', async () => {
      stubViewport(false)
      const user = userEvent.setup()
      renderRoute('/inicio')
      await screen.findByRole('heading', { level: 1, name: 'Inicio' })

      await user.click(screen.getByRole('button', { name: 'Abrir menú' }))
      const first = within(aside()).getByRole('link', { name: 'Inicio' })
      const last = within(aside()).getByRole('button', { name: 'Salir' })
      last.focus()
      await user.tab()
      expect(first).toHaveFocus()
      await user.tab({ shift: true })
      expect(last).toHaveFocus()
    })
  })

  it('Saltar al contenido es el primer enfocable y lleva el foco al main', async () => {
    stubViewport(true)
    const user = userEvent.setup()
    renderRoute('/inicio')
    await screen.findByRole('heading', { level: 1, name: 'Inicio' })

    await user.tab()
    const skip = screen.getByRole('link', { name: 'Saltar al contenido' })
    expect(skip).toHaveFocus()
    await user.click(skip)
    expect(screen.getByRole('main')).toHaveFocus()
    expect(screen.getByRole('main')).toHaveAttribute('id', 'contenido')
  })

  describe('titulo del documento', () => {
    it.each([
      ['/inicio', 'Inicio · ServiBox'],
      ['/ventas', 'Facturas de venta · ServiBox'],
      ['/ventas/nueva', 'Nueva factura · ServiBox'],
      ['/ventas/5', 'Detalle de factura · ServiBox'],
      ['/compras', 'Facturas de compra · ServiBox'],
      ['/inventario', 'Productos · ServiBox'],
      ['/cuentas', 'Movimientos · ServiBox'],
      ['/reportes', 'Reportes · ServiBox'],
      ['/configuracion', 'Configuración · ServiBox'],
    ])('%s se titula %s', async (path, title) => {
      stubViewport(true)
      renderRoute(path)
      await waitFor(() => expect(document.title).toBe(title))
    })
  })

  describe('miga de pan', () => {
    it('los tramos previos son enlaces y el ultimo es la pagina actual', async () => {
      stubViewport(true)
      renderRoute('/ventas/nueva')

      const crumbs = await screen.findByRole('navigation', { name: 'Ruta de navegación' })
      expect(within(crumbs).getByRole('list')).toBeInTheDocument()
      expect(within(crumbs).getByRole('link', { name: 'Ventas' })).toHaveAttribute('href', '/ventas')
      expect(within(crumbs).getByRole('link', { name: 'Facturas de venta' })).toHaveAttribute('href', '/ventas')
      const current = within(crumbs).getByText('Nueva factura')
      expect(current).toHaveAttribute('aria-current', 'page')
      expect(within(crumbs).queryByRole('link', { name: 'Nueva factura' })).not.toBeInTheDocument()
      expect(within(crumbs).getAllByText('/').every((separator) => separator.getAttribute('aria-hidden') === 'true')).toBe(true)
    })
  })
})

describe('Cuentas conserva su miga con una cuenta elegida', () => {
  beforeEach(() => {
    saveToken(validToken())
    stubViewport(true)
  })

  it('Cuentas / Movimientos / la cuenta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        const path = new URL(url, 'http://localhost').pathname
        if (path === '/api/treasury/accounts') {
          return Promise.resolve(jsonResponse([{ id: 1, name: 'Caja General', type: 'EFECTIVO', currentBalance: 0, initialBalance: 0 }]))
        }
        return Promise.resolve(jsonResponse([]))
      }),
    )
    renderRoute('/cuentas')

    const crumbs = screen.getByRole('navigation', { name: 'Ruta de navegación' })
    await within(crumbs).findByText('Caja General')
    expect(within(crumbs).getByRole('link', { name: 'Cuentas' })).toHaveAttribute('href', '/cuentas')
    expect(within(crumbs).getByRole('link', { name: 'Movimientos' })).toHaveAttribute('href', '/cuentas')
    expect(within(crumbs).getByText('Caja General')).toHaveAttribute('aria-current', 'page')
    expect(document.title).toBe('Caja General · ServiBox')
  })
})
