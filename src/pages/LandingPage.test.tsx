/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { saveToken } from '../auth/session'
import { SUPPORT_EMAIL, WHATSAPP_DISPLAY, WHATSAPP_URL } from '../config/contact'
import { renderRoute, validToken } from '../test/utils'

/** Los enlaces que se ven como boton primario. */
const primaryLinks = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>('[data-variant="primary"]')]

const section = (name: string) => screen.getByRole('heading', { level: 2, name }).closest('section') as HTMLElement

describe('landing', () => {
  it('tiene un solo h1 con el titular, el subtitulo y su titulo de documento', async () => {
    renderRoute('/')

    const h1 = await screen.findByRole('heading', { level: 1 })
    expect(h1).toHaveTextContent('Una venta. Inventario y caja al día.')
    expect(h1).toHaveClass('text-display')
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

  it('los encabezados van en orden y las secciones llevan text-title', async () => {
    renderRoute('/')
    await screen.findByRole('heading', { level: 1 })

    const levels = [...document.querySelectorAll('h1, h2, h3')].map((heading) => Number(heading.tagName[1]))
    levels.forEach((level, index) => {
      if (index > 0) expect(level - levels[index - 1]!).toBeLessThanOrEqual(1)
    })
    for (const name of ['Lo que haces con ServiBox', 'Y también', 'Preguntas frecuentes']) {
      expect(screen.getByRole('heading', { level: 2, name })).toHaveClass('text-title')
    }
  })

  it('la barra tiene Crear cuenta como unico primario e Iniciar sesion secundario', async () => {
    renderRoute('/')
    const header = await screen.findByRole('banner')

    const login = within(header).getByRole('link', { name: 'Iniciar sesión' })
    const register = within(header).getByRole('link', { name: 'Crear cuenta' })
    expect(login).toHaveAttribute('href', '/login')
    expect(login).not.toHaveAttribute('data-variant', 'primary')
    expect(register).toHaveAttribute('href', '/registro')
    expect(primaryLinks(header)).toEqual([register])
  })

  it('el hero tiene un solo boton primario, la captura real y su leyenda', async () => {
    renderRoute('/')
    const hero = (await screen.findByRole('heading', { level: 1 })).closest('section') as HTMLElement

    expect(primaryLinks(hero)).toHaveLength(1)
    expect(within(hero).getByRole('link', { name: 'Crear mi serviteca' })).toHaveAttribute('href', '/registro')
    const image = within(hero).getByRole('img')
    expect(image.getAttribute('src')).toMatch(/assets\/landing\/hero-inicio\.webp$/)
    expect(image).toHaveAttribute('fetchpriority', 'high')
    expect(image).not.toHaveAttribute('loading')
    expect(image).toHaveAttribute('width', '1200')
    expect(image).toHaveAttribute('height', '836')
    expect(image.getAttribute('alt')).not.toBe('')
    expect(within(hero).getByText('Pantalla real de ServiBox con datos de demostración.')).toBeInTheDocument()
  })

  it('tres bloques de lo que haces, cada uno con su captura y alt', async () => {
    renderRoute('/')
    await screen.findByRole('heading', { level: 1 })
    const flows = section('Lo que haces con ServiBox')

    const blocks = within(flows).getAllByRole('article')
    expect(blocks.map((block) => within(block).getByRole('heading', { level: 3 }).textContent)).toEqual([
      'Registra una venta y todo se actualiza',
      'Sabe qué se te acaba',
      'Mira cuánto ganas de verdad',
    ])
    const names = ['flujo-venta', 'flujo-inventario', 'flujo-reportes']
    blocks.forEach((block, index) => {
      const image = within(block).getByRole('img')
      expect(image.getAttribute('src')).toMatch(new RegExp(`assets/landing/${names[index]}\\.webp$`))
      expect(image.getAttribute('alt')?.trim()).not.toBe('')
      expect(image).toHaveAttribute('loading', 'lazy')
      expect(image).toHaveAttribute('decoding', 'async')
      expect(image).toHaveAttribute('width', '1200')
      expect(image).toHaveAttribute('height', '836')
    })
  })

  it('Y tambien es una lista y la empresa piloto una sola linea', async () => {
    renderRoute('/')
    await screen.findByRole('heading', { level: 1 })

    expect(within(section('Y también')).getAllByRole('listitem')).toHaveLength(5)
    expect(
      screen.getByText(
        'ServiBox se probó en Autollantas A&C S.A.S., un negocio de llantas, lubricantes y servicios automotrices.',
      ),
    ).toBeInTheDocument()
  })

  it('las 5 preguntas frecuentes estan cerradas y se abren', async () => {
    const user = userEvent.setup()
    renderRoute('/')
    await screen.findByRole('heading', { level: 1 })

    const details = [...section('Preguntas frecuentes').querySelectorAll('details')]
    expect(details).toHaveLength(5)
    for (const item of details) expect(item).not.toHaveAttribute('open')
    const dian = details.find((item) => item.textContent?.includes('¿Reemplaza la facturación electrónica de la DIAN?'))
    expect(dian?.textContent).toContain('No emite facturas electrónicas')

    // jsdom no activa summary con Enter ni espacio: el teclado se verifica en el navegador.
    await user.click(details[0]!.querySelector('summary') as HTMLElement)
    expect(details[0]).toHaveAttribute('open')
  })

  it('el cierre y el pie usan los contactos de contact.ts y el pie enlaza los terminos', async () => {
    renderRoute('/')
    await screen.findByRole('heading', { level: 1 })

    const closing = screen
      .getByRole('heading', { level: 2, name: 'Registra tu serviteca y empieza a llevar ventas e inventario hoy mismo.' })
      .closest('section') as HTMLElement
    expect(primaryLinks(closing)).toHaveLength(1)
    for (const area of [closing, screen.getByRole('contentinfo')]) {
      expect(within(area).getByRole('link', { name: WHATSAPP_DISPLAY })).toHaveAttribute('href', WHATSAPP_URL)
      expect(within(area).getByRole('link', { name: SUPPORT_EMAIL })).toHaveAttribute('href', `mailto:${SUPPORT_EMAIL}`)
    }
    const footer = screen.getByRole('contentinfo')
    expect(within(footer).getByRole('link', { name: 'Términos y tratamiento de datos' })).toHaveAttribute('href', '/terminos')
    expect(within(footer).getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login')
    expect(within(footer).getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/registro')
    expect(primaryLinks(footer)).toHaveLength(0)
  })

  it('con sesion muestra Ir al panel en lugar de iniciar sesion y crear cuenta', async () => {
    saveToken(validToken())
    renderRoute('/')
    const header = await screen.findByRole('banner')

    expect(within(header).getByRole('link', { name: 'Ir al panel' })).toHaveAttribute('href', '/inicio')
    expect(within(header).queryByRole('link', { name: 'Iniciar sesión' })).not.toBeInTheDocument()
    expect(within(header).queryByRole('link', { name: 'Crear cuenta' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Crear mi serviteca' })).not.toBeInTheDocument()
  })
})

describe('terminos', () => {
  it('tiene titulo, fecha, las cinco secciones, la Ley 1581 y los contactos', async () => {
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
    expect(screen.getByRole('link', { name: WHATSAPP_DISPLAY })).toHaveAttribute('href', WHATSAPP_URL)
    expect(screen.getByRole('link', { name: SUPPORT_EMAIL })).toHaveAttribute('href', `mailto:${SUPPORT_EMAIL}`)
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
  it.each(['/', '/login', '/registro', '/terminos'])('%s no usa frases prohibidas', async (path) => {
    renderRoute(path)
    await screen.findByRole('heading', { level: 1 })

    const text = document.body.textContent?.toLowerCase() ?? ''
    for (const phrase of FORBIDDEN) expect(text).not.toContain(phrase.toLowerCase())
  })

  it.each([
    ['/', 'ServiBox | Ventas, inventario y caja para servitecas'],
    ['/login', 'Iniciar sesión | ServiBox'],
    ['/registro', 'Crear cuenta | ServiBox'],
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

  it('contact.ts es la unica fuente del WhatsApp y del correo', () => {
    const files = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)],
      )
    const offenders = files('src')
      .map((path) => relative('src', path).replaceAll('\\', '/'))
      .filter((file) => /\.(tsx?|css)$/.test(file) && !/\.test\.tsx?$/.test(file) && file !== 'config/contact.ts')
      .filter((file) => /300 000 0000|573000000000|hola@servibox\.example/.test(readFileSync(join('src', file), 'utf-8')))
    expect(offenders).toEqual([])
    expect(readFileSync('index.html', 'utf-8')).not.toMatch(/573000000000|hola@servibox/)
  })

  it('las capturas existen en src/assets/landing y pesan 250 KB o menos', () => {
    for (const name of ['hero-inicio', 'flujo-venta', 'flujo-inventario', 'flujo-reportes']) {
      const size = statSync(`src/assets/landing/${name}.webp`).size
      expect(size).toBeGreaterThan(0)
      expect(size).toBeLessThanOrEqual(250 * 1024)
    }
  })
})
