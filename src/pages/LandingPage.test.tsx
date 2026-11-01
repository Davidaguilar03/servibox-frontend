/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { saveToken } from '../auth/session'
import { SUPPORT_EMAIL } from '../config/contact'
import { renderRoute, validToken } from '../test/utils'

/** Los enlaces que se ven como boton primario. */
const primaryLinks = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>('[data-variant="primary"]')]

const section = (name: string) => screen.getByRole('heading', { level: 2, name }).closest('section') as HTMLElement

describe('landing', () => {
  it('tiene un solo h1 con el titular, el subtitulo y su titulo de documento', async () => {
    renderRoute('/')

    const h1 = await screen.findByRole('heading', { level: 1 })
    expect(h1).toHaveTextContent('Tu serviteca,bajo control.De verdad.')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(
      screen.getByText(
        'Registra una venta y ServiBox actualiza el inventario y la caja al instante. Para servitecas y talleres.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveAttribute('id', 'contenido')
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Saltar al contenido' })).toHaveAttribute('href', '#contenido')
    expect(document.title).toBe('ServiBox | Ventas, inventario y caja para servitecas')
  })

  it('los encabezados van en orden y las secciones tienen nombre accesible', async () => {
    renderRoute('/')
    await screen.findByRole('heading', { level: 1 })

    const levels = [...document.querySelectorAll('h1, h2, h3')].map((heading) => Number(heading.tagName[1]))
    levels.forEach((level, index) => {
      if (index > 0) expect(level - levels[index - 1]!).toBeLessThanOrEqual(1)
    })
    for (const name of ['Una venta. Todo conectado.', 'Lo que necesitas, en orden.', 'Lo que quieres saber.']) {
      expect(section(name)).toHaveAccessibleName(name)
    }
  })

  it('la barra tiene Solicitar cuenta como unico primario e Iniciar sesion secundario', async () => {
    renderRoute('/')
    const header = await screen.findByRole('group', { name: 'Navegación y acceso' })

    const login = within(header).getByRole('link', { name: 'Iniciar sesión' })
    const register = within(header).getByRole('link', { name: 'Solicitar cuenta' })
    expect(login).toHaveAttribute('href', '/login')
    expect(login).not.toHaveAttribute('data-variant', 'primary')
    expect(register).toHaveAttribute('href', '/registro')
    expect(primaryLinks(header)).toEqual([register])
  })

  it('la portada ofrece registro, mecanico y panel de Inicio sin rotulos de captura', async () => {
    renderRoute('/')
    const hero = (await screen.findByRole('heading', { level: 1 })).closest('section') as HTMLElement

    expect(primaryLinks(hero)).toHaveLength(1)
    expect(within(hero).getByRole('link', { name: 'Solicitar mi cuenta' })).toHaveAttribute('href', '/registro')
    const ambient = screen.getByRole('banner').querySelector('img[src$="hero-workshop-mechanic-v2.webp"]')!
    expect(ambient.getAttribute('src')).toMatch(/hero-workshop-mechanic-v2\.webp$/)
    expect(ambient).toHaveAttribute('alt', '')
    const dashboard = within(hero).getByRole('img', { name: /^Panel de Inicio/ })
    expect(dashboard.getAttribute('src')).toMatch(/product-visuals-v2\/hero-dashboard\.webp$/)
    expect(dashboard).toHaveAttribute('width', '1586')
    expect(dashboard).toHaveAttribute('height', '992')
    expect(dashboard).toHaveAttribute('fetchpriority', 'high')
    expect(ambient).not.toHaveAttribute('loading')
    expect(within(hero).getByRole('link', { name: 'Conoce cómo funciona' })).toHaveAttribute('href', '#como-funciona')
    expect(hero.querySelector('img[src*="hero-inicio"]')).not.toBeInTheDocument()
  })

  it('las imagenes ambientales son decorativas y reservan dimensiones sin reemplazar texto o acciones', async () => {
    renderRoute('/')
    const hero = (await screen.findByRole('heading', { level: 1 })).closest('header')!
    const faq = section('Lo que quieres saber.')
    const closing = screen.getByRole('heading', { level: 2, name: /Tu próxima venta,/ }).closest('section')!
    for (const [area, name, width, height] of [
      [hero, 'hero-workshop-mechanic-v2', '1280', '960'],
      [screen.getByRole('main'), 'faq-workshop-panorama-v2', '1942', '809'],
      [closing, 'cta-tire', '640', '960'],
    ] as const) {
      const image = area.querySelector(`img[src$="${name}.webp"]`)!
      expect(image.getAttribute('src')).toMatch(new RegExp(`${name}\\.webp$`))
      expect(image).toHaveAttribute('alt', '')
      expect(image).toHaveAttribute('width', width)
      expect(image).toHaveAttribute('height', height)
      if (area !== hero) {
        expect(image).toHaveAttribute('loading', 'lazy')
        expect(image).toHaveAttribute('decoding', 'async')
      }
    }
    expect(within(closing).getByRole('link', { name: 'Solicitar mi cuenta' })).toHaveAttribute('href', '/registro')
    expect(faq.querySelectorAll('summary')).toHaveLength(5)
  })

  it('el flujo explica la venta, el descuento de productos y el cobro de credito sin anticiparlo', async () => {
    renderRoute('/')
    await screen.findByRole('heading', { level: 1 })
    const flows = section('Una venta. Todo conectado.')
    const blocks = within(flows).getAllByRole('listitem')
    expect(blocks.map((block) => within(block).getByRole('heading', { level: 3 }).textContent)).toEqual([
      'Registra la venta',
      'Actualiza el inventario',
      'Refleja el pago en caja',
    ])
    expect(blocks[1]).toHaveTextContent('El stock de los productos vendidos se descuenta automáticamente.')
    expect(flows).not.toHaveTextContent(/productos o servicios|servicios no descuentan/i)
    expect(blocks[2]).toHaveTextContent('Si vendes a crédito, el dinero entra cuando registras cada abono.')
    for (const [index, name, width, height] of [[0, 'step-sale', '1448', '1086'], [1, 'stock-panel', '1448', '1086'], [2, 'step-payment', '1122', '1402']] as const) {
      const image = within(blocks[index]!).getByRole('img')
      expect(image.getAttribute('src')).toMatch(new RegExp(`${name}\\.webp$`))
      expect(image).toHaveAttribute('width', width)
      expect(image).toHaveAttribute('height', height)
      expect(image).toHaveAttribute('loading', 'lazy')
    }
  })

  it('presenta las funciones existentes sin mencionar empresa ni negocio piloto', async () => {
    renderRoute('/')
    await screen.findByRole('heading', { level: 1 })

    const features = section('Lo que necesitas, en orden.')
    expect(within(features).getAllByRole('article')).toHaveLength(3)
    expect(within(features).getByText('Compras a proveedores con sus pagos.')).toBeInTheDocument()
    const reports = section('Menos archivos sueltos. Más claridad.')
    const preview = within(reports).getByRole('img')
    expect(preview).toHaveAccessibleDescription(/ventas sin IVA, costo de lo vendido, utilidad bruta, otros ingresos, gastos operativos y utilidad neta/)
    const featureStock = within(features).getByRole('img', { name: 'Productos con stock bajo y sus alertas.' })
    expect(featureStock.getAttribute('src')).toMatch(/product-visuals-v2\/stock-panel\.webp$/)
    const stepStock = within(section('Una venta. Todo conectado.')).getByRole('img', { name: 'Productos con stock bajo y sus alertas.' })
    expect(featureStock.getAttribute('src')).toBe(stepStock.getAttribute('src'))
    expect(within(features).getByRole('img', { name: /^Saldos de cuentas/ }).getAttribute('src')).toMatch(/product-visuals-v2\/feature-balances\.webp$/)
    expect(reports).not.toHaveTextContent('Compras')
    expect(document.body).not.toHaveTextContent(/Autollantas|A&C|empresa piloto|negocio piloto|se probó en/i)
  })

  it('los recursos no llevan rotulos de referencia y los controles dibujados no son acciones de la landing', async () => {
    renderRoute('/')
    await screen.findByRole('heading', { level: 1 })
    const reports = section('Menos archivos sueltos. Más claridad.')
    expect(document.body).not.toHaveTextContent(/Vista ilustrativa|Referencia|Captura real/i)
    for (const image of screen.getAllByRole('img')) expect(image).not.toHaveAccessibleName(/captura real|vista ilustrativa|referencia/i)
    expect(within(reports).getByRole('img').getAttribute('src')).toMatch(/feature-reports\.webp$/)
    expect(within(reports).getByRole('img')).toHaveAttribute('width', '1122')
    expect(within(reports).getByRole('img')).toHaveAttribute('height', '1402')
    const modules = within(reports).getByRole('list', { name: 'Áreas del producto' })
    expect(within(modules).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Ventas', 'Inventario', 'Cuentas', 'Reportes'])
    expect(within(reports).queryByRole('tab')).not.toBeInTheDocument()
    expect(within(reports).queryByRole('button')).not.toBeInTheDocument()
    expect(within(reports).queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Agregar producto|Guardar factura|PDF|Excel/ })).not.toBeInTheDocument()
  })

  it('las 5 preguntas frecuentes estan cerradas y se abren', async () => {
    const user = userEvent.setup()
    renderRoute('/')
    await screen.findByRole('heading', { level: 1 })

    const details = [...section('Lo que quieres saber.').querySelectorAll('details')]
    expect(details).toHaveLength(5)
    for (const item of details) expect(item).not.toHaveAttribute('open')
    const dian = details.find((item) => item.textContent?.includes('¿Reemplaza la facturación electrónica de la DIAN?'))
    expect(dian?.textContent).toContain('No emite facturas electrónicas')

    // jsdom no activa summary con Enter ni espacio: el teclado se verifica en el navegador.
    for (const item of details) {
      const summary = item.querySelector('summary') as HTMLElement
      await user.click(summary)
      expect(item).toHaveAttribute('open')
      await user.click(summary)
      expect(item).not.toHaveAttribute('open')
    }
  })

  it('el cierre lleva al registro y el pie conserva los destinos existentes sin contactos de ejemplo', async () => {
    const user = userEvent.setup()
    renderRoute('/')
    await screen.findByRole('heading', { level: 1 })

    const closing = screen
      .getByRole('heading', { level: 2, name: /Tu próxima venta,/ })
      .closest('section') as HTMLElement
    expect(within(closing).getByRole('link', { name: 'Solicitar mi cuenta' })).toHaveAttribute('href', '/registro')
    for (const area of [closing, screen.getByRole('contentinfo')]) {
      expect(within(area).queryByRole('link', { name: /WhatsApp|\+57/ })).not.toBeInTheDocument()
      expect(within(area).queryByRole('link', { name: SUPPORT_EMAIL })).not.toBeInTheDocument()
    }
    const footer = screen.getByRole('contentinfo')
    expect(within(footer).getByRole('link', { name: 'Términos y tratamiento de datos' })).toHaveAttribute('href', '/terminos')
    expect(within(footer).getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login')
    expect(within(footer).getByRole('link', { name: 'Solicitar cuenta' })).toHaveAttribute('href', '/registro')
    expect(primaryLinks(footer)).toHaveLength(0)
    await user.click(within(closing).getByRole('link', { name: 'Solicitar mi cuenta' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Solicita tu cuenta' })).toBeInTheDocument()
  })

  it('con sesion muestra Ir al panel en lugar de iniciar sesion y crear cuenta', async () => {
    saveToken(validToken())
    renderRoute('/')
    const header = await screen.findByRole('group', { name: 'Navegación y acceso' })

    expect(within(header).getByRole('link', { name: 'Ir al panel' })).toHaveAttribute('href', '/inicio')
    expect(within(header).queryByRole('link', { name: 'Iniciar sesión' })).not.toBeInTheDocument()
    expect(within(header).queryByRole('link', { name: 'Solicitar cuenta' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Solicitar mi cuenta' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Solicitar cuenta' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Iniciar sesión' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Ir al panel' })).toHaveLength(4)
    for (const link of screen.getAllByRole('link', { name: 'Ir al panel' })) expect(link).toHaveAttribute('href', '/inicio')
  })

  it('todas las anclas tienen un destino visible y no hay controles sin accion ni contactos ficticios', async () => {
    renderRoute('/')
    await screen.findByRole('heading', { level: 1 })
    const navigation = screen.getByRole('navigation', { name: 'Navegación principal' })
    expect(within(navigation).getAllByRole('link')).toHaveLength(3)
    for (const link of screen.getAllByRole('link')) {
      const href = link.getAttribute('href')!
      expect(href).not.toBe('#')
      expect(href).not.toMatch(/\.example|wa\.me|mailto:/)
      if (href.startsWith('#')) expect(document.getElementById(href.slice(1))).toBeVisible()
      else expect(['/', '/login', '/registro', '/terminos']).toContain(href)
    }
    expect(document.querySelector('img[src*="hero-inicio"], img[src*="flujo-"]')).not.toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(/prueba gratis|garantizado|%|\$|300 000 0000|\.example/i)
  })

  it.each([
    ['Iniciar sesión', 'Inicia sesión'],
    ['Solicitar cuenta', 'Solicita tu cuenta'],
  ])('la accion %s abre su pagina publica', async (action, heading) => {
    const user = userEvent.setup()
    renderRoute('/')
    const header = await screen.findByRole('group', { name: 'Navegación y acceso' })
    await user.click(within(header).getByRole('link', { name: action }))
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
  })
})

describe('terminos', () => {
  it('tiene titulo, fecha, las cinco secciones, la Ley 1581 y el correo, sin telefono mientras no exista', async () => {
    renderRoute('/terminos')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Términos de uso y tratamiento de datos' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Última actualización: 25 de octubre de 2026')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      'Qué es ServiBox',
      'Tu cuenta',
      'Qué datos tratamos y para qué',
      'Tus derechos',
      'Seguridad y cambios',
    ])
    expect(screen.getByText(/Ley 1581 de 2012/)).toBeInTheDocument()
    expect(screen.getByText(/No emite facturas electrónicas ante la DIAN/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: SUPPORT_EMAIL })).toHaveAttribute('href', 'mailto:hola@servibox.co')
    expect(screen.getByText(/Para hacerlo, escríbenos al correo/)).toBeInTheDocument()
    expect(document.querySelector('a[href^="tel:"], a[href*="wa.me"]')).not.toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(/WhatsApp|\+57/)
    expect(screen.getByRole('link', { name: 'Volver a la página principal' })).toHaveAttribute('href', '/')
    expect(document.title).toBe('Términos | ServiBox')
  })
})

const FORBIDDEN = [
  'Tu negocio en buenas manos',
  'plataforma integral',
  'solución',
  'optimiza',
  'potencia',
  'revoluciona',
  'todo en uno',
  'Próximamente',
  'Vista de ejemplo',
  'Cliente 1',
]

describe('paginas publicas', () => {
  it.each(['/', '/login', '/registro', '/activar', '/terminos'])('%s no usa frases prohibidas', async (path) => {
    renderRoute(path)
    await screen.findByRole('heading', { level: 1 })

    const text = document.body.textContent?.toLowerCase() ?? ''
    for (const phrase of FORBIDDEN) expect(text).not.toContain(phrase.toLowerCase())
  })

  it.each([
    ['/', 'ServiBox | Ventas, inventario y caja para servitecas'],
    ['/login', 'Iniciar sesión | ServiBox'],
    ['/registro', 'Solicitar cuenta | ServiBox'],
    ['/activar', 'Activar cuenta | ServiBox'],
    ['/terminos', 'Términos | ServiBox'],
  ])('%s fija el titulo %s', async (path, title) => {
    renderRoute(path)
    await screen.findByRole('heading', { level: 1 })
    expect(document.title).toBe(title)
  })

  it('index.html trae la meta description de la landing', () => {
    const html = readFileSync('index.html', 'utf-8')
    expect(html).toMatch(
      /<meta\s+name="description"\s+content="Registra una venta y ServiBox actualiza el inventario y la caja al instante\. Para servitecas y talleres\."/,
    )
  })

  it('contact.ts es la unica fuente del correo y no quedan los contactos de demostracion', () => {
    const files = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)],
      )
    const offenders = files('src')
      .map((path) => relative('src', path).replaceAll('\\', '/'))
      .filter((file) => /\.(tsx?|css)$/.test(file) && !/\.test\.tsx?$/.test(file) && file !== 'config/contact.ts')
      .filter((file) => /hola@servibox|300 000 0000|573000000000/.test(readFileSync(join('src', file), 'utf-8')))
    expect(offenders).toEqual([])
    expect(readFileSync('index.html', 'utf-8')).not.toMatch(/573000000000|hola@servibox/)
    const contact = readFileSync('src/config/contact.ts', 'utf-8')
    expect(contact).toContain("SUPPORT_EMAIL = 'hola@servibox.co'")
    expect(contact).not.toMatch(/\.example|300 000 0000|573000000000/)
  })

  it('conserva el favicon compartido con el simbolo de marca', () => {
    expect(readFileSync('index.html', 'utf-8')).toMatch(/rel="icon"[^>]*href="\/src\/brand\/symbol.svg"/)
  })

  it('los recursos son WebP y el producto conserva codificacion sin perdida con peso acotado', () => {
    for (const name of ['hero-workshop-mechanic-v2', 'faq-workshop-panorama-v2', 'cta-tire', ...['hero-dashboard', 'step-sale', 'stock-panel', 'step-payment', 'feature-balances', 'feature-reports'].map((name) => `product-visuals-v2/${name}`)]) {
      const file = readFileSync(`src/assets/landing/${name}.webp`)
      expect(file.toString('ascii', 0, 4)).toBe('RIFF')
      expect(file.toString('ascii', 8, 12)).toBe('WEBP')
      if (name.startsWith('product-visuals-v2/')) {
        expect(file.toString('ascii', 12, 16)).toBe('VP8L')
        expect(file.length).toBeLessThan(1024 * 1024)
      } else {
        expect(file.length).toBeLessThan(180 * 1024)
      }
    }
  })
})
