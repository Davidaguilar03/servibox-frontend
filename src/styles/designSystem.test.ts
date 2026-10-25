/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ICON_STROKE, iconLg, iconMd, iconSm } from '../components/icons'

// Guarda del sistema de diseno base (docs/ai-context/05-DESIGN-SYSTEM.md). Lee el codigo de
// src del disco, como tokens.test.ts, y busca clases fuera del sistema. Sigue la logica del
// barrido de la auditoria visual (barrido_clases.py).

const ROOT = 'src'

/** Fuera del alcance: las pruebas y los tokens. */
const EXCLUDED = [
  /\.test\.tsx?$/,
  /^test\//,
  /^styles\/tokens\.css$/,
]

/** Lo unico que flota y por eso lleva sombra. Las tarjetas, tablas y paneles se separan con borde. */
const FLOATING_SHADOWS: Record<string, string[]> = {
  // Dialogo modal.
  'components/Modal.tsx': ['shadow-overlay'],
  // Aviso flotante.
  'components/Toaster.tsx': ['shadow-raised'],
  // Lista desplegable del combobox.
  'components/ComboboxField.tsx': ['shadow-raised'],
  // Menu movil (overlay).
  'layout/AppShell.tsx': ['shadow-overlay'],
  // Enlace "Saltar al contenido" (landing y shell) cuando recibe foco.
  'components/SkipLink.tsx': ['shadow-raised'],
  // Barra de acciones fija al pie del formulario de producto.
  'pages/ProductFormPage.tsx': ['shadow-raised'],
  // Panel del menu de usuario de la barra superior.
  'layout/UserMenu.tsx': ['shadow-raised'],
}

/**
 * Roles con lugar fijo: text-title solo en el h1 de la pantalla (y en la marca), text-section
 * solo en titulos h2 y h3 (secciones y modales), text-figure solo en el valor de indicadores y
 * totales destacados y text-display solo en el h1 de la landing (excepcion documentada).
 */
const TITLE_BRAND_FILES = ['brand/Wordmark.tsx', 'layout/AppShell.tsx']
const FIGURE_FILES = [
  // Definicion de la utilidad.
  'index.css',
  'components/IndicatorCard.tsx',
  'pages/DashboardPage.tsx',
  'pages/AccountsPage.tsx',
  'pages/NewSaleInvoicePage.tsx',
  'pages/NewPurchaseInvoicePage.tsx',
  'pages/SaleDetailPage.tsx',
  'pages/PurchaseDetailPage.tsx',
]
const DISPLAY_FILES = ['index.css', 'pages/LandingPage.tsx']
/** La landing usa text-title tambien en sus titulos de seccion (h2). */
const TITLE_H2_FILES = ['pages/LandingPage.tsx']

/** Desplazamientos de 1 px documentados: solapar el borde de las pestanas y centrar el icono del Alert. */
const ONE_PX_OFFSETS: Record<string, string[]> = {
  'components/SegmentedControl.tsx': ['-mb-px'],
  'components/Alert.tsx': ['mt-px'],
}

const VARIANTS = String.raw`(?:[\w-]+:)*`
const SPACING = String.raw`(?:p|px|py|pt|pb|pl|pr|ps|pe|m|mx|my|mt|mb|ml|mr|ms|me|gap|gap-x|gap-y|size|h|w|min-h|min-w|max-h|max-w|top|right|left|bottom|inset|inset-x|inset-y|space-y|space-x|translate-x|translate-y|scroll-mt|scroll-pt)`

const RULES = {
  text: new RegExp(String.raw`(?<![\w-])${VARIANTS}text-(?:xs|sm|base|lg|[2-9]?xl|h1|h2|h3|\[[^\]]+\])(?![\w-])`, 'g'),
  shadow: new RegExp(String.raw`(?<![\w-])${VARIANTS}shadow-(?!none(?![\w-]))[\w\[\]().,%/-]+`, 'g'),
  halfStep: new RegExp(String.raw`(?<![\w-])-?${VARIANTS}-?${SPACING}-(?:\d+\.\d+|px)(?![\w-])`, 'g'),
  arbitraryPx: new RegExp(String.raw`(?<![\w-])-?${VARIANTS}[a-z][\w-]*-\[[^\]\s'"\x60]*?\d+(?:\.\d+)?px[^\]\s'"\x60]*\]`, 'g'),
  rounded: new RegExp(
    String.raw`(?<![\w-])${VARIANTS}rounded-(?!(?:[trblsexy]{1,2}-)?(?:control|surface|pill|none)(?![\w-]))[\w\[\].-]+|(?<=["'\x60])${VARIANTS}rounded(?=["'\x60\s])|(?<=\s)${VARIANTS}rounded(?=["'\x60])`,
    'g',
  ),
  iconPx: /\b(?:size|strokeWidth)=\{\s*[\d.]+\s*\}/g,
  mono: new RegExp(String.raw`(?<![\w-])${VARIANTS}font-mono(?![\w-])`, 'g'),
  motion: new RegExp(String.raw`(?<![\w-])${VARIANTS}(?:duration-\d+|duration-\[[^\]]+\]|ease-(?:linear|in|out|in-out))(?![\w-])`, 'g'),
  role: new RegExp(String.raw`(?<![\w-])${VARIANTS}text-(?:title|section|figure|display)(?![\w-])`, 'g'),
}

/** Etiqueta JSX que abre el elemento donde aparece la clase: `h1`, `p`... */
function openingTag(code: string, index: number) {
  return /^<([a-z][\w]*)/.exec(code.slice(code.lastIndexOf('<', index)))?.[1]
}

function misplacedRole(token: string, tag: string | undefined, file: string) {
  if (token.endsWith('text-title'))
    return tag !== 'h1' && !TITLE_BRAND_FILES.includes(file) && !(tag === 'h2' && TITLE_H2_FILES.includes(file))
  if (token.endsWith('text-section')) return tag !== 'h2' && tag !== 'h3'
  if (token.endsWith('text-display')) return !DISPLAY_FILES.includes(file) || (file.endsWith('.tsx') && tag !== 'h1')
  return !FIGURE_FILES.includes(file)
}

export type Rule = keyof typeof RULES

/** Quita comentarios para no confundir la documentacion con clases. */
function stripComments(source: string) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\w])\/\/[^\n]*/g, '$1')
}

/** Valor en px de un medio paso o de un valor arbitrario no multiplo de 4. */
function arbitraryOffGrid(token: string) {
  const values = [...token.matchAll(/(\d+(?:\.\d+)?)px/g)].map((match) => Number(match[1]))
  return values.some((value) => value % 4 !== 0)
}

/** Clases fuera del sistema de diseno en un archivo, como `regla: clase`. */
export function violations(source: string, file: string): string[] {
  const code = stripComments(source)
  const found: string[] = []
  const add = (rule: Rule, token: string) => found.push(`${rule}: ${token}`)

  for (const match of code.matchAll(RULES.text)) add('text', match[0])
  for (const match of code.matchAll(RULES.shadow)) {
    if (!(FLOATING_SHADOWS[file] ?? []).includes(match[0])) add('shadow', match[0])
  }
  for (const match of code.matchAll(RULES.halfStep)) {
    if (!(ONE_PX_OFFSETS[file] ?? []).includes(match[0])) add('halfStep', match[0])
  }
  for (const match of code.matchAll(RULES.arbitraryPx)) {
    if (arbitraryOffGrid(match[0])) add('arbitraryPx', match[0])
  }
  for (const match of code.matchAll(RULES.rounded)) add('rounded', match[0])
  if (file.endsWith('.tsx')) for (const match of code.matchAll(RULES.iconPx)) add('iconPx', match[0])
  for (const match of code.matchAll(RULES.mono)) add('mono', match[0])
  for (const match of code.matchAll(RULES.motion)) add('motion', match[0])
  for (const match of code.matchAll(RULES.role)) {
    if (misplacedRole(match[0], openingTag(code, match.index), file)) add('role', match[0])
  }
  return found
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(tsx?|css)$/.test(entry.name) ? [path] : []
  })
}

const files = sourceFiles(ROOT)
  .map((path) => relative(ROOT, path).replaceAll('\\', '/'))
  .filter((file) => !EXCLUDED.some((pattern) => pattern.test(file)))

describe('guarda del sistema de diseno', () => {
  it('lee los archivos de la app', () => {
    expect(files).toContain('components/DataTable.tsx')
    expect(files).toContain('index.css')
    for (const page of ['LandingPage', 'LoginPage', 'RegisterPage', 'TermsPage']) expect(files).toContain(`pages/${page}.tsx`)
  })

  it.each(files)('%s usa solo la escala, las sombras, la rejilla, los radios y los iconos del sistema', (file) => {
    expect(violations(readFileSync(join(ROOT, file), 'utf-8'), file)).toEqual([])
  })

  it('falla con un caso malo', () => {
    const bad = `
      <p className="text-sm md:text-lg text-[13px] shadow-card p-1.5 gap-x-2.5 w-[110px] rounded-lg font-mono duration-300 rounded">
        <X size={18} strokeWidth={2} />
      </p>`
    expect(violations(bad, 'pages/Fake.tsx')).toEqual([
      'text: text-sm',
      'text: md:text-lg',
      'text: text-[13px]',
      'shadow: shadow-card',
      'halfStep: p-1.5',
      'halfStep: gap-x-2.5',
      'arbitraryPx: text-[13px]',
      'arbitraryPx: w-[110px]',
      'rounded: rounded-lg',
      'rounded: rounded',
      'iconPx: size={18}',
      'iconPx: strokeWidth={2}',
      'mono: font-mono',
      'motion: duration-300',
    ])
  })

  it('falla con un rol fuera de su lugar', () => {
    const bad = `
      <p className="text-title">Titulo en un parrafo</p>
      <p className="text-section">Seccion en un parrafo</p>
      <p className="text-figure">$ 1.000</p>`
    expect(violations(bad, 'pages/Fake.tsx')).toEqual(['role: text-title', 'role: text-section', 'role: text-figure'])
    expect(violations('<p className="mt-2 text-figure text-text">', 'components/IndicatorCard.tsx')).toEqual([])
  })

  it('text-display solo en el h1 de la landing', () => {
    expect(violations('<h1 className="text-display text-text">Titular</h1>', 'pages/LandingPage.tsx')).toEqual([])
    expect(violations('<p className="text-display">Titular</p>', 'pages/LandingPage.tsx')).toEqual(['role: text-display'])
    expect(violations('<h1 className="text-display">Titular</h1>', 'pages/LoginPage.tsx')).toEqual(['role: text-display'])
    expect(violations('<h2 className="md:text-display">Titular</h2>', 'pages/DashboardPage.tsx')).toEqual(['role: md:text-display'])
    // Los titulos de seccion de la landing van en text-title; en el resto de la app no.
    expect(violations('<h2 className="text-title">Seccion</h2>', 'pages/LandingPage.tsx')).toEqual([])
    expect(violations('<h2 className="text-title">Seccion</h2>', 'pages/LoginPage.tsx')).toEqual(['role: text-title'])
  })

  it('los tokens de legado de la landing, el login y el registro ya no existen', () => {
    for (const name of ['text-h1', 'text-h2', 'text-h3', 'radius-tag', 'radius-card', 'radius-container', 'shadow-card', 'shadow-menu', 'shadow-modal']) {
      expect(tokens).not.toMatch(new RegExp(String.raw`--${name}:`))
    }
    expect(tokens).not.toMatch(/--text-display:/)
    expect(violations('<p className="text-h2 rounded-card shadow-card">', 'pages/LandingPage.tsx')).toEqual([
      'text: text-h2',
      'shadow: shadow-card',
      'rounded: rounded-card',
    ])
  })

  it('acepta lo que el sistema permite', () => {
    const good = `
      // Un comentario con text-sm y shadow-card no cuenta.
      <h1 className="text-title">Titulo</h1>
      <h2 id="seccion" className="mb-4 text-section text-text">Seccion</h2>
      <p className="text-body text-small text-label text-button p-1 gap-2 w-[112px] rounded-control md:rounded-surface rounded-pill rounded-none border-b-2 monto codigo duration-(--duration-fast) ease-standard">
        <X {...iconSm} />
      </p>
      const rounded = Math.round(value)`
    expect(violations(good, 'pages/Fake.tsx')).toEqual([])
  })

  it('solo deja sombra en lo que flota y en la sombra que le toca', () => {
    expect(violations('className="shadow-overlay"', 'components/Modal.tsx')).toEqual([])
    expect(violations('className="shadow-raised"', 'components/Modal.tsx')).toEqual(['shadow: shadow-raised'])
    expect(violations('className="shadow-raised"', 'components/DataTable.tsx')).toEqual(['shadow: shadow-raised'])
  })
})

const tokens = readFileSync('src/styles/tokens.css', 'utf-8')
const index = readFileSync('src/index.css', 'utf-8')
const token = (name: string) => new RegExp(String.raw`--${name}:\s*([^;]+);`).exec(tokens)?.[1]?.trim()

describe('tokens del sistema de diseno', () => {
  it.each([
    // Escala tipografica: tres tamanos de contenido y dos de componente.
    ['text-title', '24px'],
    ['text-title--line-height', '32px'],
    ['text-title--font-weight', '600'],
    ['text-section', '15px'],
    ['text-section--line-height', '1.6'],
    ['text-section--font-weight', '600'],
    // figure: 24/28 bajo md y 28/32 desde md.
    ['figure-size', '24px'],
    ['figure-line-height', '28px'],
    ['figure-size-md', '28px'],
    ['figure-line-height-md', '32px'],
    ['figure-font-weight', '600'],
    // display: solo el h1 de la landing, 32/36 bajo md y 40/44 desde md.
    ['display-size', '32px'],
    ['display-line-height', '36px'],
    ['display-size-md', '40px'],
    ['display-line-height-md', '44px'],
    ['display-font-weight', '700'],
    ['text-body', '15px'],
    ['text-body--font-weight', '400'],
    ['text-small', '13px'],
    ['text-small--font-weight', '400'],
    ['text-label', '12px'],
    ['text-label--line-height', '16px'],
    ['text-label--font-weight', '600'],
    ['text-button', '14px'],
    ['text-button--font-weight', '600'],
    // Alturas de control, areas tactiles y foco.
    ['control-height', '40px'],
    ['control-height-touch', '44px'],
    ['hit-min', '44px'],
    ['hit-row', '36px'],
    ['focus-ring', '2px solid var(--color-brand)'],
    ['focus-ring-offset', '2px'],
    ['focus-ring-on-tint', '2px solid var(--color-brand-ink)'],
    // Sombras: solo lo que flota.
    ['shadow-raised', '0 4px 12px rgb(0 0 0 / 10%)'],
    ['shadow-overlay', '0 16px 40px rgb(0 0 0 / 16%)'],
    // Radios.
    ['radius-control', '8px'],
    ['radius-surface', '12px'],
    ['radius-pill', '999px'],
    // Iconos.
    ['icon-sm', '16px'],
    ['icon-md', '20px'],
    ['icon-lg', '24px'],
    // Movimiento.
    ['duration-fast', '120ms'],
    ['duration-base', '200ms'],
    ['duration-slow', '320ms'],
    ['ease-standard', 'cubic-bezier(0.2, 0, 0, 1)'],
    ['default-transition-duration', 'var(--duration-fast)'],
    ['default-transition-timing-function', 'var(--ease-standard)'],
  ])('--%s vale %s', (name, value) => {
    expect(token(name)).toBe(value)
  })

  it('las constantes de icono siguen los tokens y usan un solo trazo', () => {
    expect([iconSm.size, iconMd.size, iconLg.size].map((size) => `${size}px`)).toEqual([
      token('icon-sm'),
      token('icon-md'),
      token('icon-lg'),
    ])
    expect(new Set([iconSm, iconMd, iconLg].map((icon) => icon.strokeWidth))).toEqual(new Set([ICON_STROKE]))
  })

  it('define las utilidades de foco y de zona de clic con los tokens', () => {
    expect(index).toMatch(/@utility focus-ring \{\s*&:focus-visible \{\s*outline: var\(--focus-ring\);\s*outline-offset: var\(--focus-ring-offset\);/)
    expect(index).toMatch(/@utility focus-ring-field \{\s*&:focus \{\s*outline: var\(--focus-ring\);/)
    expect(index).toMatch(/@utility hit-area \{[\s\S]*var\(--hit-min\)[\s\S]*var\(--hit-row\)/)
    expect(token('spacing-touch')).toBe('var(--hit-min)')
    expect(token('spacing-control')).toBe('var(--control-height)')
    expect(token('spacing-control-touch')).toBe('var(--control-height-touch)')
  })

  it('define los roles monto (cuerpo con numeros tabulares) y codigo (mono)', () => {
    expect(index).toMatch(/@utility monto \{[^}]*font-family: var\(--font-body\);[^}]*font-variant-numeric: tabular-nums;/)
    expect(index).toMatch(/@utility codigo \{[^}]*font-family: var\(--font-mono\);/)
  })
})
