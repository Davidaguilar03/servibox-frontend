/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { saveToken } from '../auth/session'
import { renderRoute, validToken } from '../test/utils'
import { buttonClasses, type ButtonVariant } from './buttonStyles'
import { ComboboxField } from './ComboboxField'
import { IconButton } from './IconButton'
import { SearchField } from './SearchField'
import { SegmentedControl, TabList, type SegmentOption } from './SegmentedControl'
import { SelectField } from './SelectField'
import { TextField } from './TextField'

const classes = (element: Element) => element.className.split(/\s+/)

describe('IconButton', () => {
  it('lleva aria-label y area de 44 bajo lg y 36 desde lg', () => {
    render(
      <IconButton aria-label="Cerrar">
        <span />
      </IconButton>,
    )
    const button = screen.getByRole('button', { name: 'Cerrar' })
    expect(classes(button)).toEqual(expect.arrayContaining(['size-touch', 'lg:size-hit-row', 'focus-ring']))
  })

  it('el aria-label es obligatorio en el tipo', () => {
    // @ts-expect-error: sin aria-label no compila.
    const element = <IconButton>x</IconButton>
    expect(element).toBeTruthy()
  })
})

describe('Button', () => {
  it('todas las variantes miden igual: misma altura y mismo relleno horizontal', () => {
    const variants: ButtonVariant[] = ['primary', 'dark', 'secondary', 'text', 'danger']
    for (const variant of variants) {
      const list = buttonClasses(variant).split(/\s+/)
      expect(list).toEqual(expect.arrayContaining(['h-control-touch', 'lg:h-control', 'px-button-x', 'focus-ring']))
      // La variante solo cambia fondo, borde y color: ningun alto ni relleno propio.
      const sizing = list.filter((name) => /^(?:[\w-]+:)?(?:h|min-h|px|py|p)-/.test(name))
      expect(sizing).toEqual(['h-control-touch', 'lg:h-control', 'px-button-x'])
    }
  })

  it('ninguna pantalla pisa el relleno del boton de texto', () => {
    const offenders = appFiles().filter((file) => /variant="text"[^>]*className="[^"]*\b(?:px|py|h)-/.test(source(file)))
    expect(offenders).toEqual([])
  })
})

function Segmented({ options, initial }: { options: SegmentOption<string>[]; initial: string }) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <SegmentedControl aria-label="Periodo" options={options} value={value} onChange={setValue} />
      <p data-testid="valor">{value}</p>
    </>
  )
}

function Tabs() {
  const [value, setValue] = useState('a')
  return (
    <TabList
      aria-label="Secciones"
      options={[
        { value: 'a', label: 'Uno' },
        { value: 'b', label: 'Dos' },
        { value: 'c', label: 'Tres' },
      ]}
      value={value}
      onChange={setValue}
    />
  )
}

const periods = ['Hoy', 'Esta semana', 'Este mes', 'Mes anterior', 'Personalizado'].map((label) => ({ value: label, label }))

describe('SegmentedControl', () => {
  it('es un radiogroup con role=radio, aria-checked y un solo elemento tabulable', () => {
    render(<Segmented options={periods} initial="Este mes" />)
    const group = screen.getByRole('radiogroup', { name: 'Periodo' })
    const radios = within(group).getAllByRole('radio')
    expect(radios.map((radio) => radio.getAttribute('aria-checked'))).toEqual(['false', 'false', 'true', 'false', 'false'])
    expect(radios.filter((radio) => radio.tabIndex === 0)).toEqual([screen.getByRole('radio', { name: 'Este mes' })])
    expect(classes(radios[0]!)).toEqual(expect.arrayContaining(['min-h-touch', 'lg:min-h-control', 'rounded-pill', 'focus-ring']))
  })

  it('flechas, Inicio y Fin mueven el foco y eligen', async () => {
    const user = userEvent.setup()
    render(<Segmented options={periods} initial="Este mes" />)
    await user.tab()
    expect(screen.getByRole('radio', { name: 'Este mes' })).toHaveFocus()

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'Mes anterior' })).toHaveFocus()
    expect(screen.getByTestId('valor')).toHaveTextContent('Mes anterior')
    await user.keyboard('{End}')
    expect(screen.getByRole('radio', { name: 'Personalizado' })).toHaveAttribute('aria-checked', 'true')
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'Hoy' })).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('radio', { name: 'Personalizado' })).toHaveFocus()
    await user.keyboard('{Home}')
    expect(screen.getByTestId('valor')).toHaveTextContent('Hoy')
    expect(screen.getAllByRole('radio').filter((radio) => radio.tabIndex === 0)).toHaveLength(1)
    // Tab sale del grupo: no recorre cada opcion.
    await user.tab()
    expect(document.body).toHaveFocus()
  })

  it('con muchas opciones envuelve en lugar de desbordar', () => {
    const many = Array.from({ length: 12 }, (_, index) => ({ value: `o${index}`, label: `Opción ${index}` }))
    render(<Segmented options={many} initial="o0" />)
    expect(classes(screen.getByRole('radiogroup'))).toEqual(expect.arrayContaining(['flex', 'flex-wrap']))
  })
})

describe('TabList', () => {
  it('es un tablist con role=tab, aria-selected, flechas y un solo tab en el orden', async () => {
    const user = userEvent.setup()
    render(<Tabs />)
    const list = screen.getByRole('tablist', { name: 'Secciones' })
    expect(classes(list)).toContain('overflow-x-auto')
    expect(within(list).getAllByRole('tab').filter((tab) => tab.tabIndex === 0)).toHaveLength(1)

    await user.tab()
    expect(screen.getByRole('tab', { name: 'Uno' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Dos' })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Tres' })).toHaveFocus()
    await user.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: 'Uno' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Tres' })).toHaveAttribute('tabindex', '-1')
  })
})

describe('campos', () => {
  it('usan el anillo de foco compartido y 44 de alto bajo lg', () => {
    render(
      <>
        <TextField label="Texto" />
        <SelectField label="Selector" options={[{ value: 'a', label: 'A' }]} />
        <SearchField label="Buscar" />
        <ComboboxField label="Combo" options={[]} value={null} onChange={() => {}} />
      </>,
    )
    for (const field of [
      screen.getByLabelText('Texto'),
      screen.getByLabelText('Selector'),
      screen.getByLabelText('Buscar'),
      screen.getByLabelText('Combo'),
    ]) {
      expect(classes(field)).toEqual(expect.arrayContaining(['focus-ring-field', 'h-control-touch', 'lg:h-control']))
      expect(classes(field)).not.toContain('outline-none')
    }
  })
})

describe('Saltar al contenido', () => {
  it('es el primer enfocable del panel, conserva su relleno y lleva el foco al main', async () => {
    saveToken(validToken())
    const user = userEvent.setup()
    renderRoute('/inicio')
    await screen.findByRole('heading', { level: 1, name: 'Inicio' })

    await user.tab()
    const skip = screen.getByRole('link', { name: 'Saltar al contenido' })
    expect(skip).toHaveFocus()
    expect(classes(skip)).toEqual(
      expect.arrayContaining(['focus:px-4', 'focus:py-2', 'rounded-control', 'shadow-raised', 'focus-ring']),
    )
    await user.keyboard('{Enter}')
    expect(screen.getByRole('main')).toHaveFocus()
    expect(screen.getByRole('main')).toHaveAttribute('tabindex', '-1')
  })

  it('la landing usa la misma implementacion', async () => {
    renderRoute('/')
    const skip = await screen.findByRole('link', { name: 'Saltar al contenido' })
    expect(skip.className).toBe(
      'sr-only z-50 rounded-control bg-surface text-small font-medium text-text shadow-raised focus-ring focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:px-4 focus:py-2',
    )
  })
})

describe('casillas y radios', () => {
  it('el area de clic de la casilla de terminos incluye el rotulo y mide 44', async () => {
    renderRoute('/registro')
    const checkbox = await screen.findByRole('checkbox')
    const label = document.querySelector(`label[for="${checkbox.id}"]`) as HTMLElement
    expect(classes(label)).toContain('min-h-touch')
    expect(label).toHaveTextContent('Acepto los términos de uso y el tratamiento de datos.')
  })

  it('impuestos de categoria y tarjetas de reporte envuelven su control en el rotulo', () => {
    expect(source('pages/CategoriesPage.tsx')).toMatch(/<label className="flex min-h-touch[^"]*">\s*<input\s+type="checkbox"/)
    expect(source('pages/ReportsPage.tsx')).toMatch(/<label[\s\S]{0,400}<input\s+type="radio"\s+name="report-type"/)
  })
})

describe('rol codigo', () => {
  it('no se parte en dos lineas', () => {
    expect(readFileSync('src/index.css', 'utf-8')).toMatch(/@utility codigo \{[^}]*white-space: nowrap;/)
  })
})

function appFiles(dir = 'src'): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return appFiles(path)
    return /\.tsx$/.test(entry.name) && !/\.test\.tsx$/.test(entry.name) ? [relative('src', path).replaceAll('\\', '/')] : []
  })
}

function source(file: string) {
  return readFileSync(join('src', file), 'utf-8')
}

/**
 * Excepciones con comportamiento propio (no son segmentados de texto): las tarjetas de cuenta
 * con su saldo (aria-pressed), las muestras de color de categoria y las tarjetas de tipo de
 * reporte con descripcion (radios nativos).
 */
const OWN_SELECTION: Record<string, string[]> = {
  'pages/AccountsPage.tsx': ['aria-pressed', 'aria-pressed'],
  'pages/CategoriesPage.tsx': ['type="radio"'],
  'pages/ReportsPage.tsx': ['type="radio"'],
}

describe('un solo segmentado', () => {
  it('ninguna pantalla implementa su propio segmentado o pestanas', () => {
    const pattern = /aria-pressed|role="(?:tab|tablist|radiogroup|radio)"|type="radio"/g
    const found: Record<string, string[]> = {}
    for (const file of appFiles()) {
      if (file === 'components/SegmentedControl.tsx') continue
      const matches = source(file).match(pattern)
      if (matches) found[file] = matches
    }
    expect(found).toEqual(OWN_SELECTION)
  })

  it('las pantallas migradas usan el componente unico', () => {
    for (const file of ['pages/AccountsPage.tsx', 'pages/NewSaleInvoicePage.tsx', 'pages/NewPurchaseInvoicePage.tsx', 'pages/ReportsPage.tsx']) {
      expect(source(file)).toContain('<SegmentedControl')
    }
    for (const file of ['settings/SettingsPage.tsx', 'pages/ProductsPage.tsx']) expect(source(file)).toContain('<TabList')
  })
})
