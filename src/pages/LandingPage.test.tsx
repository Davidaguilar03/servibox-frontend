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

/** Ancho y alto del encabezado de un WebP, con o sin perdida. */
function webpSize(file: Buffer) {
  const chunk = file.toString('ascii', 12, 16)
  if (chunk === 'VP8 ') return { width: file.readUInt16LE(26) & 0x3fff, height: file.readUInt16LE(28) & 0x3fff }
  if (chunk === 'VP8L') {
    const bits = file.readUInt32LE(21)
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
  }
  return { width: file.readUIntLE(24, 3) + 1, height: file.readUIntLE(27, 3) + 1 }
}

describe('landing', () => {
  it('tiene un solo h1 con el titular, el subtitulo y su titulo de documento', async () => {
    renderRoute('/')

    const h1 = await screen.findByRole('heading', { level: 1 })
    expect(h1).toHaveTextContent('Tu serviteca,bajo control.De verdad.')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(
      screen.getByText(
        'Registra una venta y ServiBox descuenta el inventario. De contado, el dinero entra a la cuenta que elijas; a crédito, con cada abono. Para servitecas y talleres.',
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
    const dashboard = within(hero).getByRole('img', { name: /^Panel de Inicio de ServiBox/ })
    expect(dashboard.getAttribute('src')).toMatch(/product-screens\/hero-dashboard\.webp$/)
    expect(dashboard).toHaveAttribute('width', '2074')
    expect(dashboard).toHaveAttribute('height', '1297')
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
    for (const [index, name, width, height] of [[0, 'step-sale', '1448', '1086'], [1, 'stock-panel', '1448', '1086'], [2, 'step-payment', '780', '992']] as const) {
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
    expect(within(features).queryByRole('img', { name: 'Ilustración de una lista de productos con stock bajo, sus unidades y su estado de alerta.' })).not.toBeInTheDocument()
    const stepStock = within(section('Una venta. Todo conectado.')).getByRole('img', { name: 'Ilustración de una lista de productos con stock bajo, sus unidades y su estado de alerta.' })
    expect(stepStock.getAttribute('src')).toMatch(/product-visuals-v2\/stock-panel\.webp$/)
    expect(document.querySelectorAll('img[src*="stock-panel"]')).toHaveLength(1)
    expect(within(features).getByRole('img', { name: /^Saldos de cuentas/ }).getAttribute('src')).toMatch(/product-screens\/feature-balances\.webp$/)
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
    expect(within(reports).getByRole('img')).toHaveAttribute('width', '1968')
    expect(within(reports).getByRole('img')).toHaveAttribute('height', '1235')
    const modules = within(reports).getByRole('list', { name: 'Áreas del producto' })
    expect(within(modules).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Ventas', 'Inventario', 'Cuentas', 'Reportes'])
    expect(within(reports).queryByRole('tab')).not.toBeInTheDocument()
    expect(within(reports).queryByRole('button')).not.toBeInTheDocument()
    expect(within(reports).queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Agregar producto|Guardar factura|PDF|Excel/ })).not.toBeInTheDocument()
  })

  it('las capturas describen la pantalla, las ilustraciones lo dicen y solo la portada carga sin diferir', async () => {
    renderRoute('/')
    await screen.findByRole('heading', { level: 1 })
    for (const [name, file, width, height] of [
      ['Abono registrado de una factura y resumen con total, abonado y saldo pendiente.', 'product-screens/step-payment', '780', '992'],
      ['Saldos de cuentas de banco, billetera digital y efectivo, con el total disponible.', 'product-screens/feature-balances', '1338', '832'],
      ['Reportes con formato PDF o Excel y vista previa del estado de resultados.', 'product-screens/feature-reports', '1968', '1235'],
      ['Ilustración de los productos de una venta con su cantidad y precio sin IVA.', 'product-visuals-v2/step-sale', '1448', '1086'],
    ] as const) {
      const image = screen.getByRole('img', { name })
      expect(image.getAttribute('src')).toMatch(new RegExp(`${file}\\.webp$`))
      expect(image).toHaveAttribute('width', width)
      expect(image).toHaveAttribute('height', height)
      expect(image).toHaveAttribute('loading', 'lazy')
    }
    const illustrations = ['step-sale', 'stock-panel']
    const products = [...document.querySelectorAll('.landing-product-frame img')]
    expect(products).toHaveLength(6)
    for (const image of products) {
      const isIllustration = illustrations.some((name) => image.getAttribute('src')!.includes(`product-visuals-v2/${name}`))
      expect(image.getAttribute('alt')!.startsWith('Ilustración de')).toBe(isIllustration)
    }
    const hero = screen.getByRole('img', { name: /^Panel de Inicio de ServiBox/ })
    expect(hero).toHaveAttribute('fetchpriority', 'high')
    expect(hero).not.toHaveAttribute('loading')
  })

  it('las afirmaciones corregidas aparecen y las retiradas no', async () => {
    renderRoute('/')
    await screen.findByRole('heading', { level: 1 })
    expect(screen.getByText('Comparte el archivo descargado con tu contador.')).toBeInTheDocument()
    expect(screen.getByText(/^Solicita tu cuenta\. Revisamos cada solicitud y, si la aprobamos/)).toBeInTheDocument()
    expect(screen.getByText(/^No\. Dentro de la aplicación, las ventas, el inventario, la caja y los clientes de tu serviteca solo los ven sus usuarios\. El equipo de ServiBox gestiona los datos de la cuenta: nombre, NIT, teléfono, usuarios y correos\.$/)).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(/al instante|Empieza a usar ServiBox|solo la ve quien tiene acceso|Comparte tus resultados/)
  })

  it('funciones ordena dos tarjetas de texto y una tarjeta unica de cuentas', async () => {
    renderRoute('/')
    await screen.findByRole('heading', { level: 1 })
    const features = section('Lo que necesitas, en orden.')
    const cards = within(features).getAllByRole('article')
    expect(cards.map((card) => within(card).getByRole('heading', { level: 3 }).textContent)).toEqual(['Ve cuánto ganas de verdad.', 'Entérate antes de quedarte sin stock.', 'Tus cuentas, al día.'])
    for (const card of cards) expect(within(card).getByRole('heading', { level: 3 })).not.toHaveClass('sr-only')
    expect(within(cards[0]!).queryByRole('img')).not.toBeInTheDocument()
    expect(within(cards[1]!).queryByRole('img')).not.toBeInTheDocument()
    expect(cards[1]).toHaveTextContent('Consulta tus alertas y las unidades disponibles en un solo lugar.')
    expect(cards[1]).toHaveTextContent('El precio sugerido se calcula con tus costos y tus márgenes.')
    expect(document.body).not.toHaveTextContent(/Sabe qué se está acabando/)
  })

  it('la tarjeta de cuentas une texto, imagen y un panel de una columna con cuatro filas', async () => {
    renderRoute('/')
    await screen.findByRole('heading', { level: 1 })
    const features = section('Lo que necesitas, en orden.')
    const accounts = within(features).getAllByRole('article')[2]!
    expect(accounts).toHaveClass('landing-accounts-card', 'md:col-span-2', 'lg:grid-cols-2')
    expect(accounts).toHaveTextContent('Efectivo, bancos y billeteras digitales en un solo lugar.')
    expect(within(accounts).getByRole('img').getAttribute('src')).toMatch(/feature-balances\.webp$/)
    const panel = within(accounts).getByRole('list')
    expect(panel).toHaveClass('landing-accounts-panel', 'bg-canvas', 'rounded-surface', 'auto-rows-fr', 'lg:grid-rows-4')
    expect(panel.className).not.toMatch(/grid-cols/)
    const items = within(panel).getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual(['Compras a proveedores con sus pagos.', 'Clientes y proveedores.', 'Gastos operativos y otros ingresos.', 'Transferencias entre cuentas.'])
    for (const item of items) {
      expect(item).toHaveClass('rounded-surface', 'border', 'bg-surface', 'flex', 'items-center', 'min-h-14')
      expect(item).not.toHaveClass('flex-col')
      expect(item.firstElementChild).toHaveClass('landing-accounts-icon')
      expect(item.lastChild?.nodeType).toBe(Node.TEXT_NODE)
      expect(item.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    }
    expect(within(features).getAllByRole('list')).toEqual([panel])
    expect(within(panel).queryByRole('heading')).not.toBeInTheDocument()
    expect(readFileSync('src/pages/LandingPage.css', 'utf-8')).toMatch(/\.landing-balances-visual \{\s+max-width: 669px;/)
  })

  it('las filas del panel crecen con el ancho, miden lo mismo y evitan palabras sueltas', async () => {
    renderRoute('/')
    await screen.findByRole('heading', { level: 1 })
    const panel = within(section('Lo que necesitas, en orden.')).getByRole('list')
    expect(panel).toHaveClass('auto-rows-fr')
    for (const icon of panel.querySelectorAll('.landing-accounts-icon')) expect(icon.querySelector('svg')).toBeInTheDocument()
    const css = readFileSync('src/pages/LandingPage.css', 'utf-8')
    expect(css).toMatch(/\.landing-accounts-panel li \{\s+font-size: 16px;\s+line-height: 1\.3;\s+text-wrap: balance;\s+\}\s+#landing \.landing-accounts-icon \{\s+width: 44px;\s+height: 44px;\s+\}\s+#landing \.landing-accounts-icon svg \{\s+width: 24px;\s+height: 24px;/)
    expect(css).toMatch(/@media \(max-width: 379\.98px\) \{\s+#landing \.landing-accounts-panel li \{\s+font-size: 15px;\s+\}\s+#landing \.landing-accounts-icon \{\s+width: 40px;\s+height: 40px;/)
    for (const [font, box, svg] of [[18, 48, 28], [20, 56, 32], [24, 64, 36], [26, 72, 40]]) {
      expect(css).toMatch(new RegExp(`\\.landing-accounts-panel li \\{\\s+font-size: ${font}px;\\s+\\}\\s+#landing \\.landing-accounts-icon \\{\\s+width: ${box}px;\\s+height: ${box}px;\\s+\\}\\s+#landing \\.landing-accounts-icon svg \\{\\s+width: ${svg}px;\\s+height: ${svg}px;`))
    }
  })

  it('en telefono la captura de reportes mide 640 px y se desplaza dentro de su contenedor', () => {
    const css = readFileSync('src/pages/LandingPage.css', 'utf-8')
    const phone = css.slice(css.indexOf('@media (max-width: 639.98px)'), css.indexOf('/* La imagen de saldos nunca supera'))
    expect(phone).toMatch(/\.landing-report-frame \{\s+overflow-x: auto;/)
    expect(phone).toMatch(/\.landing-report-frame img \{\s+width: 640px;\s+max-width: none;/)
    expect(phone).toMatch(/\.landing-report-visual::after \{[^}]*linear-gradient[^}]*pointer-events: none;/)
    expect(css.slice(css.indexOf('@media (min-width: 1024px)'))).not.toContain('overflow-x')
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
    expect(within(footer).getByRole('link', { name: 'Términos y condiciones' })).toHaveAttribute('href', '/terminos')
    expect(within(footer).getByRole('link', { name: 'Política de datos' })).toHaveAttribute('href', '/politica-de-datos')
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
      else expect(['/', '/login', '/registro', '/terminos', '/politica-de-datos']).toContain(href)
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
  it.each(['/', '/login', '/registro', '/activar', '/terminos', '/politica-de-datos'])('%s no usa frases prohibidas', async (path) => {
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
    ['/politica-de-datos', 'Política de datos | ServiBox'],
  ])('%s fija el titulo %s', async (path, title) => {
    renderRoute(path)
    await screen.findByRole('heading', { level: 1 })
    expect(document.title).toBe(title)
  })

  it('index.html trae la meta description de la landing', () => {
    const html = readFileSync('index.html', 'utf-8')
    expect(html).toMatch(
      /<meta\s+name="description"\s+content="Registra una venta y ServiBox descuenta el inventario\. De contado, el dinero entra a la cuenta que elijas; a crédito, con cada abono\. Para servitecas y talleres\."/,
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

  it('los recursos ambientales son WebP con peso acotado', () => {
    for (const name of ['hero-workshop-mechanic-v2', 'faq-workshop-panorama-v2', 'cta-tire']) {
      const file = readFileSync(`src/assets/landing/${name}.webp`)
      expect(file.toString('ascii', 0, 4)).toBe('RIFF')
      expect(file.toString('ascii', 8, 12)).toBe('WEBP')
      expect(file.length).toBeLessThan(180 * 1024)
    }
  })

  it.each([
    ['hero-dashboard', 2074, 1297],
    ['step-payment', 780, 992],
    ['feature-balances', 1338, 832],
    ['feature-reports', 1968, 1235],
  ])('la captura %s es WebP, mide %ix%i y pesa menos de 300 KB', (name, width, height) => {
    const file = readFileSync(`src/assets/landing/product-screens/${name}.webp`)
    expect(file.toString('ascii', 0, 4)).toBe('RIFF')
    expect(file.toString('ascii', 8, 12)).toBe('WEBP')
    expect(webpSize(file)).toEqual({ width, height })
    expect(file.length).toBeLessThan(300 * 1024)
  })

  it.each([
    ['step-sale', 1448, 1086],
    ['stock-panel', 1448, 1086],
  ])('la ilustracion %s conserva WebP sin perdida, mide %ix%i y su peso acotado', (name, width, height) => {
    const file = readFileSync(`src/assets/landing/product-visuals-v2/${name}.webp`)
    expect(file.toString('ascii', 0, 4)).toBe('RIFF')
    expect(file.toString('ascii', 8, 12)).toBe('WEBP')
    expect(file.toString('ascii', 12, 16)).toBe('VP8L')
    expect(webpSize(file)).toEqual({ width, height })
    expect(file.length).toBeLessThan(1024 * 1024)
  })

  it('cada carpeta de imagenes de producto contiene solo los archivos en uso', () => {
    expect(readdirSync('src/assets/landing/product-screens').sort()).toEqual(['feature-balances.webp', 'feature-reports.webp', 'hero-dashboard.webp', 'step-payment.webp'])
    expect(readdirSync('src/assets/landing/product-visuals-v2').sort()).toEqual(['step-sale.webp', 'stock-panel.webp'])
  })

  it('reportes usa la franja 2/3 sin limite de 520 px y un contenedor con padding y fondo de la captura', () => {
    const tsx = readFileSync('src/pages/LandingPage.tsx', 'utf-8')
    const css = readFileSync('src/pages/LandingPage.css', 'utf-8')
    expect(tsx).toContain('py-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]')
    expect(tsx).toContain('landing-product-frame landing-report-frame bg-canvas')
    expect(css).not.toMatch(/\.landing-report-visual \{[^}]*max-width/)
    expect(css).toMatch(/\.landing-report-frame \{\s+padding: 16px;/)
    expect(css).toMatch(/\.landing-report-frame \{\s+padding: 24px;/)
  })

  it('en telefono la rueda asoma recortada por el borde inferior y la foto del hero no va detras del texto', () => {
    const tsx = readFileSync('src/pages/LandingPage.tsx', 'utf-8')
    const css = readFileSync('src/pages/LandingPage.css', 'utf-8')
    expect(tsx).toContain('landing-closing-tire pointer-events-none justify-self-center md:absolute md:inset-y-0 md:right-0 md:w-1/4')
    expect(tsx).toContain('block h-auto w-full md:h-full md:object-cover md:object-top')
    expect(css).toMatch(/\.landing-closing-tire \{\s+justify-self: stretch;\s+aspect-ratio: 1 \/ 0\.74;\s+margin-inline: -16px;\s+margin-bottom: -32px;\s+overflow: hidden;/)
    expect(css).toMatch(/\.landing-closing-tire img \{\s+margin-top: -15\.6%;/)
    expect(tsx).toContain('landing-hero-scene')
    expect(tsx).not.toContain('relative bg-neutral-100 lg:bg-transparent')
    expect(css).toMatch(/\.landing-hero-scene \{\s+position: absolute;\s+inset: auto 0 0;/)
  })
})
