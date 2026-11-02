import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { saveToken } from '../auth/session'
import { jsonResponse, renderRoute, validToken } from '../test/utils'
import type { RouteHandle } from './AppShell'

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
const content = () => screen.getByRole('main').parentElement as HTMLElement

describe('shell', () => {
  beforeEach(() => {
    saveToken(validToken())
    pendingApi()
  })

  describe('menu movil', () => {
    it.each([
      ['Ingresos', 'Clientes', '/ventas/clientes'],
      ['Egresos', 'Proveedores', '/compras/proveedores'],
    ])('%s expande sin cerrar el panel y su hijo navega y lo cierra', async (group, child, path) => {
      stubViewport(false)
      localStorage.setItem('servibox.sidebar', 'collapsed')
      const user = userEvent.setup()
      const router = renderRoute('/inicio')
      const menu = screen.getByRole('button', { name: 'Abrir menú' })
      await user.click(menu)
      const parent = within(aside()).getByRole('button', { name: group })
      await user.click(parent)
      expect(parent).toHaveAttribute('aria-expanded', 'true')
      expect(menu).toHaveAttribute('aria-expanded', 'true')
      expect(parent).toHaveFocus()
      expect(content()).toHaveAttribute('inert')
      expect(router.state.location.pathname).toBe('/inicio')
      expect(localStorage.getItem('servibox.sidebar')).toBe('collapsed')
      within(aside()).getByRole('link', { name: child }).focus()
      fireEvent.click(parent)
      expect(parent).toHaveFocus()
      expect(within(aside()).queryByRole('link', { name: child })).not.toBeInTheDocument()
      await user.tab()
      expect(within(aside()).getByRole(group === 'Ingresos' ? 'button' : 'link', {
        name: group === 'Ingresos' ? 'Egresos' : 'Inventario',
      })).toHaveFocus()
      await user.click(parent)
      await user.click(within(aside()).getByRole('link', { name: child }))
      expect(router.state.location.pathname).toBe(path)
      expect(aside()).toHaveAttribute('inert')
      expect(content()).not.toHaveAttribute('inert')
      await waitFor(() => expect(screen.getByRole('button', { name: 'Abrir menú' })).toHaveFocus())
    })

    it('cerrado bajo lg el menu es inerte; en escritorio no', async () => {
      stubViewport(false)
      renderRoute('/inicio')
      await screen.findByRole('heading', { level: 1, name: 'Inicio' })

      expect(aside()).toHaveAttribute('inert')
      expect(content()).not.toHaveAttribute('inert')
      expect(screen.queryByRole('button', { name: /^(Expandir|Contraer) menú$/ })).not.toBeInTheDocument()
    })

    it('en escritorio el menu no es inerte ni lo controla el boton', async () => {
      stubViewport(true)
      renderRoute('/inicio')
      await screen.findByRole('heading', { level: 1, name: 'Inicio' })

      expect(aside()).not.toHaveAttribute('inert')
      expect(content()).not.toHaveAttribute('inert')
      expect(screen.getByRole('button', { name: 'Abrir menú' })).toHaveAttribute('aria-expanded', 'false')
    })

    it.each(['/inicio', '/reportes', '/configuracion', '/configuracion?tab=financiera'])('abrir en %s lleva el foco al menu, deja el contenido inerte, y Esc lo cierra y devuelve el foco', async (path) => {
      stubViewport(false)
      const user = userEvent.setup()
      renderRoute(path)
      await screen.findByRole('heading', { level: 1, name: path === '/inicio' ? 'Inicio' : path === '/reportes' ? 'Reportes' : 'Configuración' })

      const button = screen.getByRole('button', { name: 'Abrir menú' })
      expect(screen.getByRole('main')).toContainElement(button)
      expect(button).toHaveAttribute('aria-expanded', 'false')
      expect(button).toHaveAttribute('aria-controls', 'menu-lateral')
      expect(aside()).toHaveAttribute('id', 'menu-lateral')

      button.focus()
      await user.keyboard('{Enter}')
      expect(button).toHaveAttribute('aria-expanded', 'true')
      expect(aside()).not.toHaveAttribute('inert')
      expect(content()).toHaveAttribute('inert')
      expect(within(aside()).getByRole('link', { name: 'ServiBox, ir a Inicio' })).toHaveFocus()
      // Abierto flota sobre el contenido: lleva la sombra overlay, que se quita en escritorio.
      expect(aside()).toHaveClass('shadow-overlay', 'lg:shadow-none')

      await user.keyboard('{Escape}')
      expect(button).toHaveAttribute('aria-expanded', 'false')
      expect(aside()).toHaveAttribute('inert')
      expect(aside()).not.toHaveClass('shadow-overlay')
      expect(content()).not.toHaveAttribute('inert')
      await waitFor(() => expect(button).toHaveFocus())
    })

    it('con el menu abierto Tab no sale de el', async () => {
      stubViewport(false)
      const user = userEvent.setup()
      renderRoute('/inicio')
      await screen.findByRole('heading', { level: 1, name: 'Inicio' })

      await user.click(screen.getByRole('button', { name: 'Abrir menú' }))
      const first = within(aside()).getByRole('link', { name: 'ServiBox, ir a Inicio' })
      const last = within(aside()).getByRole('button', { name: 'Menú de usuario de admin' })
      last.focus()
      await user.tab()
      expect(first).toHaveFocus()
      await user.tab({ shift: true })
      expect(last).toHaveFocus()
    })
  })

  describe('navegacion agrupada', () => {
    it('distingue padres y facturas con iconos decorativos de escala y trazo uniformes', async () => {
      stubViewport(true)
      const user = userEvent.setup()
      renderRoute('/inicio')
      const nav = screen.getByRole('navigation', { name: 'Principal' })
      for (const [name, icon] of [['Ingresos', 'trending-up'], ['Egresos', 'trending-down']]) {
        const parent = within(nav).getByRole('button', { name })
        expect(parent.querySelector('svg')).toHaveClass(`lucide-${icon}`)
        await user.click(parent)
      }
      for (const [name, icon] of [
        ['Facturas de venta', 'shopping-cart'], ['Otros ingresos', 'circle-plus'], ['Clientes', 'users'],
        ['Facturas de compra', 'truck'], ['Gastos operativos', 'receipt'], ['Proveedores', 'truck'],
      ]) {
        const link = within(nav).getByRole('link', { name })
        expect(link).toHaveAccessibleName(name)
        expect(link.querySelector('svg')).toHaveClass(`lucide-${icon}`)
      }
      for (const icon of nav.querySelectorAll('svg')) {
        expect(icon).toHaveAttribute('aria-hidden', 'true')
        expect(icon).toHaveAttribute('width', '20')
        expect(icon).toHaveAttribute('height', '20')
        expect(icon).toHaveAttribute('stroke-width', '1.5')
      }
      expect(within(nav).queryByRole('img')).not.toBeInTheDocument()
    })

    it('conserva el orden, destinos y listas anidadas sin enlaces ficticios', async () => {
      stubViewport(true)
      const user = userEvent.setup()
      renderRoute('/inicio')
      const nav = screen.getByRole('navigation', { name: 'Principal' })
      const list = nav.querySelector('ul')!
      expect([...list.children].map((item) => item.firstElementChild?.textContent)).toEqual([
        'Inicio', 'Ingresos', 'Egresos', 'Inventario', 'Tesorería', 'Reportes',
      ])
      for (const name of ['Ingresos', 'Egresos']) {
        const parent = within(nav).getByRole('button', { name })
        expect(parent.tagName).toBe('BUTTON')
        expect(parent).toHaveAttribute('type', 'button')
        const children = document.getElementById(parent.getAttribute('aria-controls')!)!
        expect(children.tagName).toBe('UL')
        expect(parent.parentElement).toContainElement(children)
        await user.click(parent)
      }
      expect(within(nav).getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
        ['Inicio', '/inicio'], ['Facturas de venta', '/ventas'], ['Otros ingresos', '/ventas/ingresos'],
        ['Clientes', '/ventas/clientes'], ['Facturas de compra', '/compras'], ['Gastos operativos', '/compras/gastos'],
        ['Proveedores', '/compras/proveedores'], ['Inventario', '/inventario'], ['Tesorería', '/cuentas'], ['Reportes', '/reportes'],
      ])
      expect(within(nav).queryByRole('menu')).not.toBeInTheDocument()
    })

    it.each([
      ['/ventas', 'Ingresos', 'Facturas de venta'],
      ['/ventas/nueva?cliente=3', 'Ingresos', 'Facturas de venta'],
      ['/ventas/23', 'Ingresos', 'Facturas de venta'],
      ['/ventas/papelera?periodo=todas', 'Ingresos', 'Facturas de venta'],
      ['/ventas/ingresos?periodo=hoy', 'Ingresos', 'Otros ingresos'],
      ['/ventas/clientes?q=Ana', 'Ingresos', 'Clientes'],
      ['/compras', 'Egresos', 'Facturas de compra'],
      ['/compras/nueva?proveedor=4', 'Egresos', 'Facturas de compra'],
      ['/compras/23', 'Egresos', 'Facturas de compra'],
      ['/compras/papelera', 'Egresos', 'Facturas de compra'],
      ['/compras/gastos', 'Egresos', 'Gastos operativos'],
      ['/compras/proveedores', 'Egresos', 'Proveedores'],
    ])('la entrada directa %s abre %s con un solo hijo activo', (path, group, child) => {      stubViewport(true)
      const router = renderRoute(path)
      const nav = screen.getByRole('navigation', { name: 'Principal' })
      const parent = within(nav).getByRole('button', { name: group })
      expect(parent).toHaveAttribute('aria-expanded', 'true')
      expect(parent).toHaveAttribute('data-active', 'true')
      expect(parent).not.toHaveAttribute('aria-current')
      const list = document.getElementById(parent.getAttribute('aria-controls')!)!
      expect(list).not.toHaveAttribute('inert')
      expect(list).toHaveAttribute('aria-hidden', 'false')
      expect(list.parentElement).toHaveClass('grid-rows-[1fr]')
      const active = within(nav).getAllByRole('link').filter((link) => link.getAttribute('aria-current') === 'page')
      expect(active.map((link) => link.textContent)).toEqual([child])
      expect(router.state.location.pathname + router.state.location.search).toBe(path)
      expect((router.state.matches.at(-1)?.route.handle as RouteHandle).breadcrumb[0]).toEqual({ label: group, to: undefined })
    })

    it.each(['Ingresos', 'Egresos'])('%s responde a Enter y Espacio sin navegar ni dejar hijos en Tab al cerrar', async (group) => {
      stubViewport(true)
      const user = userEvent.setup()
      const router = renderRoute('/inicio')
      const parent = screen.getByRole('button', { name: group })
      parent.focus()
      await user.keyboard('{Enter}')
      expect(parent).toHaveAttribute('aria-expanded', 'true')
      const list = document.getElementById(parent.getAttribute('aria-controls')!)!
      await user.tab()
      expect(within(list).getAllByRole('link')[0]).toHaveFocus()
      // Cierre externo con un hijo enfocado recupera el foco antes de ocultarlo.
      fireEvent.click(parent)
      expect(parent).toHaveFocus()
      expect(list).toHaveAttribute('inert')
      expect(list).toHaveAttribute('aria-hidden', 'true')
      expect(list).not.toHaveAttribute('hidden')
      expect(within(list).getAllByRole('link', { hidden: true }).every((link) => link.tabIndex === -1)).toBe(true)
      expect(within(list).queryByRole('link')).not.toBeInTheDocument()
      await user.tab()
      expect(list).not.toContainElement(document.activeElement as HTMLElement)
      parent.focus()
      await user.keyboard(' ')
      expect(parent).toHaveAttribute('aria-expanded', 'true')
      expect(list).not.toHaveAttribute('inert')
      expect(list).toHaveAttribute('aria-hidden', 'false')
      expect(within(list).getAllByRole('link').every((link) => link.tabIndex === 0)).toBe(true)
      expect(router.state.location.pathname).toBe('/inicio')
    })

    it('cerrar el grupo activo conserva indicador y navegar, query, atras y adelante lo reabren', async () => {
      stubViewport(true)
      const user = userEvent.setup()
      const router = renderRoute('/ventas/clientes?q=Ana')
      const income = screen.getByRole('button', { name: 'Ingresos' })
      await user.click(income)
      expect(income).toHaveAttribute('aria-expanded', 'false')
      expect(income).toHaveAttribute('data-active', 'true')
      await act(() => router.navigate('/ventas/clientes?q=Luis'))
      expect(income).toHaveAttribute('aria-expanded', 'true')
      await user.click(income)
      await act(() => router.navigate('/compras/gastos'))
      const expense = screen.getByRole('button', { name: 'Egresos' })
      expect(expense).toHaveAttribute('aria-expanded', 'true')
      expect(income).toHaveAttribute('data-active', 'false')
      await user.click(expense)
      await act(() => router.navigate(-1))
      expect(income).toHaveAttribute('aria-expanded', 'true')
      expect(router.state.location.search).toBe('?q=Luis')
      await act(() => router.navigate(1))
      expect(expense).toHaveAttribute('aria-expanded', 'true')
      expect(income).toHaveAttribute('aria-expanded', 'true')
      expect(within(screen.getByRole('navigation', { name: 'Principal' })).getAllByRole('link')
        .filter((link) => link.getAttribute('aria-current') === 'page').map((link) => link.textContent)).toEqual(['Gastos operativos'])
    })

    it('una recarga reabre el grupo de la URL sin persistir preferencias de grupos', async () => {
      stubViewport(true)
      const user = userEvent.setup()
      renderRoute('/ventas/clientes')
      await user.click(screen.getByRole('button', { name: 'Ingresos' }))
      expect(localStorage.length).toBe(0)
      cleanup()
      renderRoute('/ventas/clientes')
      expect(screen.getByRole('button', { name: 'Ingresos' })).toHaveAttribute('aria-expanded', 'true')
    })

    it('contraer por cambio de ancho recupera el foco de un hijo oculto', async () => {
      let wide = true
      const listeners = new Set<() => void>()
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query === '(min-width: 1024px)' || wide,
        addEventListener: (_: string, listener: () => void) => listeners.add(listener),
        removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
      }))
      renderRoute('/ventas')
      screen.getByRole('link', { name: 'Facturas de venta' }).focus()
      act(() => {
        wide = false
        for (const listener of [...listeners]) listener()
      })
      expect(screen.getByRole('button', { name: 'Expandir menú' })).toHaveFocus()
      expect(screen.getByRole('button', { name: 'Ingresos' })).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByRole('link', { name: 'Facturas de venta' })).not.toBeInTheDocument()
      expect(localStorage.length).toBe(0)
    })

    it.each([['Ingresos', '{Enter}', 'Facturas de venta'], ['Egresos', ' ', 'Facturas de compra']])(
      'en compacto %s expande el sidebar por teclado, conserva foco y guarda la preferencia actual', async (group, key, child) => {
        stubViewport(true)
        localStorage.setItem('servibox.sidebar', 'collapsed')
        const user = userEvent.setup()
        renderRoute('/ventas')
        const parent = screen.getByRole('button', { name: group })
        expect(parent).toHaveAttribute('aria-expanded', 'false')
        parent.focus()
        await user.keyboard(key)
        expect(parent).toHaveFocus()
        expect(parent).toHaveAttribute('aria-expanded', 'true')
        expect(localStorage.getItem('servibox.sidebar')).toBe('expanded')
        expect(localStorage.length).toBe(1)
        await user.tab()
        expect(screen.getByRole('link', { name: child })).toHaveFocus()
        const toggle = screen.getByRole('button', { name: 'Contraer menú' })
        fireEvent.click(toggle)
        expect(toggle).toHaveFocus()
        expect(parent).toHaveAttribute('aria-expanded', 'false')
        expect(localStorage.getItem('servibox.sidebar')).toBe('collapsed')
        expect(screen.queryByRole('link', { name: child })).not.toBeInTheDocument()
      },
    )
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
      ['/cuentas', 'Tesorería · ServiBox'],
      ['/reportes', 'Reportes · ServiBox'],
      ['/configuracion', 'Configuración · ServiBox'],
    ])('%s se titula %s', async (path, title) => {
      stubViewport(true)
      renderRoute(path)
      await waitFor(() => expect(document.title).toBe(title))
    })
  })

  describe('miga de pan', () => {
    it('Inicio y Ventas omiten la barra y conservan el titulo de pestana', async () => {
      stubViewport(true)
      const router = renderRoute('/inicio')
      expect(screen.queryByRole('banner')).not.toBeInTheDocument()
      expect(screen.queryByRole('navigation', { name: 'Ruta de navegación' })).not.toBeInTheDocument()
      expect(document.title).toBe('Inicio · ServiBox')
      await act(() => router.navigate('/ventas'))
      expect(screen.queryByRole('banner')).not.toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1, name: 'Facturas de venta' })).toBeInTheDocument()
      expect(document.title).toBe('Facturas de venta · ServiBox')
      await act(() => router.navigate(-1))
      expect(screen.queryByRole('banner')).not.toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1, name: 'Inicio' })).toBeInTheDocument()
      expect(document.title).toBe('Inicio · ServiBox')
    })

    it('Productos, su modal y Categorias omiten la barra y conservan menu movil', async () => {
      stubViewport(false)
      const user = userEvent.setup()
      const router = renderRoute('/inventario')
      expect(screen.queryByRole('banner')).not.toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1, name: 'Productos' })).toBeInTheDocument()
      expect(document.title).toBe('Productos · ServiBox')
      const button = within(screen.getByRole('main')).getByRole('button', { name: 'Abrir menú' })
      button.focus()
      await user.keyboard('{Enter}')
      expect(button).toHaveAttribute('aria-expanded', 'true')
      expect(aside()).not.toHaveAttribute('inert')
      await user.keyboard('{Escape}')
      await waitFor(() => expect(button).toHaveFocus())

      await act(() => router.navigate('/inventario/categorias'))
      expect(screen.queryByRole('banner')).not.toBeInTheDocument()
      expect(screen.queryByRole('navigation', { name: 'Ruta de navegación' })).not.toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1, name: 'Categorías' })).toBeInTheDocument()
      expect(within(screen.getByRole('main')).getByRole('button', { name: 'Abrir menú' })).toBeInTheDocument()
      expect(document.title).toBe('Categorías · ServiBox')
      await act(() => router.navigate('/inventario/nuevo'))
      expect(screen.queryByRole('banner')).not.toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1, name: 'Productos' })).toBeInTheDocument()
      expect(document.title).toBe('Nuevo producto · ServiBox')
      await act(() => router.navigate('/inventario'))
      expect(screen.queryByRole('banner')).not.toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1, name: 'Productos' })).toBeInTheDocument()
    })

    it('las rutas de Ventas y Compras conservan el menu movil en el contenido', async () => {
      stubViewport(false)
      const router = renderRoute('/ventas')
      for (const path of ['/ventas', '/ventas/nueva', '/ventas/23', '/ventas/papelera', '/ventas/clientes', '/ventas/ingresos']) {
        await act(() => router.navigate(path))
        expect(screen.queryByRole('banner')).not.toBeInTheDocument()
        expect(within(screen.getByRole('main')).getByRole('button', { name: 'Abrir menú' })).toBeInTheDocument()
      }
      for (const path of ['/compras', '/compras/nueva', '/compras/23', '/compras/papelera', '/compras/proveedores', '/compras/gastos']) {
        await act(() => router.navigate(path))
        expect(screen.queryByRole('banner')).not.toBeInTheDocument()
        expect(within(screen.getByRole('main')).getByRole('button', { name: 'Abrir menú' })).toBeInTheDocument()
      }
    })

    it('Nueva venta conserva regreso dentro del contenido y el titulo de pestana', async () => {
      stubViewport(true)
      renderRoute('/ventas/nueva')

      expect(screen.queryByRole('banner')).not.toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Volver a Facturas de venta' })).toHaveAttribute('href', '/ventas')
      expect(document.title).toBe('Nueva factura · ServiBox')
    })
  })

  it('Configuracion esta separada de operaciones y conserva su ruta activa', async () => {
    stubViewport(true)
    renderRoute('/configuracion?tab=financiera')
    const operations = screen.getByRole('navigation', { name: 'Principal' })
    expect(within(operations).queryByRole('link', { name: 'Configuración' })).not.toBeInTheDocument()
    expect(within(operations).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Inicio', 'Inventario', 'Tesorería', 'Reportes',
    ])
    const settings = within(screen.getByRole('navigation', { name: 'Administración' })).getByRole('link', { name: 'Configuración' })
    expect(settings).toHaveAttribute('href', '/configuracion')
    expect(settings).toHaveAttribute('aria-current', 'page')
  })

  it.each(['expanded', 'collapsed'])('el control superior en modo %s conserva foco, estado y preferencia', async (choice) => {
    stubViewport(true)
    localStorage.setItem('servibox.sidebar', choice)
    const user = userEvent.setup()
    renderRoute('/inicio')
    const header = within(aside()).getByRole('group', { name: 'Cabecera del menú lateral' })
    const brand = within(header).getByRole('link', { name: 'ServiBox, ir a Inicio' })
    const name = choice === 'expanded' ? 'Contraer menú' : 'Expandir menú'
    const toggle = within(header).getByRole('button', { name })
    expect(toggle).toHaveAttribute('title', name)
    expect(toggle).toHaveAttribute('aria-expanded', String(choice === 'expanded'))
    expect(brand.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const operations = within(aside()).getByRole('navigation', { name: 'Principal' })
    expect(toggle.compareDocumentPosition(operations) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    toggle.focus()
    await user.keyboard('{Enter}')
    expect(toggle).toHaveFocus()
    expect(toggle).toHaveAttribute('aria-expanded', String(choice !== 'expanded'))
    expect(localStorage.getItem('servibox.sidebar')).toBe(choice === 'expanded' ? 'collapsed' : 'expanded')
    expect(within(header).getAllByRole('button')).toHaveLength(1)
    const settings = within(aside()).getByRole('link', { name: 'Configuración' })
    const userMenu = within(aside()).getByRole('button', { name: /Menú de usuario/ })
    expect(settings.compareDocumentPosition(userMenu) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it.each([[1024, true], [1279, true], [1280, false]])('a %s px el simbolo compacto respeta el ancho por defecto', async (width, compact) => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: Number(/\d+/.exec(query)?.[0]) <= width,
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
    }))
    renderRoute('/inicio')
    const brand = within(aside()).getByRole('link', { name: 'ServiBox, ir a Inicio' })
    expect(brand).toHaveAttribute('href', '/inicio')
    expect(brand.querySelector('img')).not.toBeNull()
    expect(brand.textContent).toBe(compact ? '' : 'ServiBox')
    expect(screen.getByRole('button', { name: compact ? 'Expandir menú' : 'Contraer menú' })).toBeInTheDocument()
  })

  it('si localStorage rechaza la preferencia se puede expandir y contraer sin perder acceso al usuario', async () => {
    stubViewport(true)
    const originalGet = Storage.prototype.getItem
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key: string) {
      if (this === localStorage && key === 'servibox.sidebar') throw new Error('No disponible')
      return originalGet.call(this, key)
    })
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('No disponible') })
    try {
      const user = userEvent.setup()
      renderRoute('/inicio')
      await user.click(screen.getByRole('button', { name: 'Contraer menú' }))
      expect(screen.getByRole('button', { name: 'Expandir menú' })).toBeInTheDocument()
      expect(within(aside()).getByRole('button', { name: /Menú de usuario/ })).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Expandir menú' }))
      expect(screen.getByRole('button', { name: 'Contraer menú' })).toBeInTheDocument()
    } finally {
      get.mockRestore()
      set.mockRestore()
    }
  })
})

describe('Cuentas conserva su miga con una cuenta elegida', () => {
  beforeEach(() => {
    saveToken(validToken())
    stubViewport(true)
  })

  it('Cuentas conserva titulo, menu movil y cuenta seleccionada sin barra superior', async () => {
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

    await screen.findByRole('button', { name: /^Caja General/ })
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Tesorería' })).toBeInTheDocument()
    expect(document.title).toBe('Caja General · ServiBox')
    expect(within(screen.getByRole('main')).getByRole('button', { name: 'Abrir menú' })).toBeInTheDocument()
  })
})
