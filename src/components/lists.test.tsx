/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { saveToken } from '../auth/session'
import { periodRange, rangeLabel, shortDate, type PeriodKey } from '../lib/period'
import { jsonResponse, primaryActions, renderRoute, validToken } from '../test/utils'
import { Button } from './Button'
import { CellButton, CellLink, cellLinkClasses } from './CellLink'
import { FilterBar } from './FilterBar'
import { ListHeader } from './ListHeader'
import { PendingBalance } from './PendingBalance'
import { PeriodPicker } from './PeriodPicker'
import { TabList } from './SegmentedControl'

function inRouter(element: React.ReactNode) {
  const router = createMemoryRouter([{ path: '*', element }])
  return render(<RouterProvider router={router} />)
}

describe('periodos en la zona del negocio', () => {
  it('calcula cada rango a partir de hoy, con los bordes de mes y de ano', () => {
    expect(periodRange('este-mes', '2026-10-24')).toEqual({ desde: '2026-10-01', hasta: '2026-10-24' })
    expect(periodRange('este-mes', '2026-10-01')).toEqual({ desde: '2026-10-01', hasta: '2026-10-01' })
    expect(periodRange('mes-anterior', '2026-03-31')).toEqual({ desde: '2026-02-01', hasta: '2026-02-28' })
    expect(periodRange('mes-anterior', '2026-01-15')).toEqual({ desde: '2025-12-01', hasta: '2025-12-31' })
    expect(periodRange('mes-anterior', '2028-03-01')).toEqual({ desde: '2028-02-01', hasta: '2028-02-29' })
    expect(periodRange('ultimos-30', '2026-03-01')).toEqual({ desde: '2026-01-31', hasta: '2026-03-01' })
    expect(periodRange('este-ano', '2026-01-01')).toEqual({ desde: '2026-01-01', hasta: '2026-01-01' })
    expect(periodRange('este-ano', '2026-12-31')).toEqual({ desde: '2026-01-01', hasta: '2026-12-31' })
    expect(periodRange('esta-semana', '2026-10-25')).toEqual({ desde: '2026-10-19', hasta: '2026-10-25' })
  })

  it('etiqueta el rango en texto corto', () => {
    expect(shortDate('2026-10-01')).toBe('1 oct. 2026')
    expect(rangeLabel({ desde: '2026-10-01', hasta: '2026-10-24' })).toBe('1 oct. 2026 al 24 oct. 2026')
    expect(rangeLabel({ desde: '2026-12-31', hasta: '2026-12-31' })).toBe('31 dic. 2026')
  })
})

type Demo = Extract<PeriodKey, 'este-mes' | 'mes-anterior' | 'todas' | 'personalizado'>

function Picker({ initial = 'este-mes' as Demo }) {
  const today = '2026-10-24'
  const [value, setValue] = useState<Demo>(initial)
  const [custom, setCustom] = useState({ desde: '2026-10-20', hasta: '2026-10-10' })
  const invalid = custom.desde > custom.hasta
  const range =
    value === 'todas' ? null : value === 'personalizado' ? (invalid ? null : custom) : periodRange(value, today)
  return (
    <PeriodPicker
      options={[
        { value: 'este-mes', label: 'Este mes' },
        { value: 'mes-anterior', label: 'Mes anterior' },
        { value: 'todas', label: 'Todas' },
        { value: 'personalizado', label: 'Personalizado' },
      ]}
      value={value}
      onChange={setValue}
      range={range}
      custom={{
        desde: { value: custom.desde, onChange: (event) => setCustom({ ...custom, desde: event.target.value }) },
        hasta: { value: custom.hasta, onChange: (event) => setCustom({ ...custom, hasta: event.target.value }) },
        errors: invalid ? { hasta: 'Hasta no puede ser anterior a Desde.' } : {},
      }}
    />
  )
}

describe('PeriodPicker', () => {
  it('muestra las opciones de la pantalla, su valor por defecto y la etiqueta del rango', () => {
    render(<Picker />)
    const select = screen.getByLabelText('Período')
    expect(select).toHaveValue('este-mes')
    expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Este mes',
      'Mes anterior',
      'Todas',
      'Personalizado',
    ])
    expect(select).toHaveAccessibleDescription('1 oct. 2026 al 24 oct. 2026')
    expect(screen.queryByLabelText('Desde')).not.toBeInTheDocument()
  })

  it('con teclado cambia el periodo y Personalizado valida Desde mayor que Hasta', async () => {
    const user = userEvent.setup()
    render(<Picker />)
    const select = screen.getByLabelText('Período')
    await user.tab()
    expect(select).toHaveFocus()

    await user.selectOptions(select, 'mes-anterior')
    expect(select).toHaveAccessibleDescription('1 sep. 2026 al 30 sep. 2026')
    await user.selectOptions(select, 'todas')
    expect(select).not.toHaveAccessibleDescription()

    await user.selectOptions(select, 'personalizado')
    expect(screen.getByLabelText('Desde')).toHaveValue('2026-10-20')
    expect(screen.getByText('Hasta no puede ser anterior a Desde.')).toBeInTheDocument()
    await user.clear(screen.getByLabelText('Hasta'))
    await user.type(screen.getByLabelText('Hasta'), '2026-10-22')
    expect(screen.queryByText('Hasta no puede ser anterior a Desde.')).not.toBeInTheDocument()
    expect(select).toHaveAccessibleDescription('20 oct. 2026 al 22 oct. 2026')
  })
})

describe('ListHeader', () => {
  afterEach(() => vi.unstubAllGlobals())

  const secondary = [
    <Button key="a" variant="secondary">
      Clientes
    </Button>,
    <Button key="b" variant="secondary">
      Papelera
    </Button>,
  ]

  it('desde lg muestra las secundarias en linea y una sola primaria', () => {
    inRouter(<ListHeader title="Facturas" primary={<Button>Registrar venta</Button>} secondary={secondary} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Facturas' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clientes' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Más' })).not.toBeInTheDocument()
    expect(document.querySelectorAll('[data-variant="primary"]')).toHaveLength(1)
  })

  it('bajo lg agrupa 2 o mas secundarias en Más, que cierra con Esc y devuelve el foco', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} }))
    const user = userEvent.setup()
    inRouter(<ListHeader title="Facturas" primary={<Button>Registrar venta</Button>} secondary={secondary} />)

    const more = screen.getByRole('button', { name: 'Más' })
    expect(more).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: 'Clientes' })).not.toBeInTheDocument()
    await user.click(more)
    expect(more).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Papelera' })).toBeInTheDocument()

    await user.tab()
    await user.keyboard('{Escape}')
    expect(more).toHaveAttribute('aria-expanded', 'false')
    expect(more).toHaveFocus()

    await user.click(more)
    await user.click(screen.getByRole('heading', { level: 1 }))
    expect(more).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'Registrar venta' })).toHaveAttribute('data-variant', 'primary')
  })

  it('con una sola secundaria no usa Más', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} }))
    inRouter(<ListHeader title="Gastos" primary={<Button>Nuevo gasto</Button>} secondary={[secondary[0]]} />)
    expect(screen.queryByRole('button', { name: 'Más' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clientes' })).toBeInTheDocument()
  })
})

describe('FilterBar', () => {
  it('ofrece Limpiar filtros solo con filtros activos', async () => {
    const onClear = vi.fn()
    const { rerender } = render(
      <FilterBar active={false} onClear={onClear}>
        {[<input key="q" aria-label="Buscar" />]}
      </FilterBar>,
    )
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument()

    rerender(
      <FilterBar active onClear={onClear}>
        {[<input key="q" aria-label="Buscar" />]}
      </FilterBar>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(onClear).toHaveBeenCalledOnce()
  })
})

describe('CellLink', () => {
  it('enlace y boton de celda comparten un solo estilo en rol small', () => {
    inRouter(
      <>
        <CellLink to="/ventas/1">Ver detalle</CellLink>
        <CellButton>Editar</CellButton>
      </>,
    )
    expect(screen.getByRole('link', { name: 'Ver detalle' }).className.trim()).toBe(cellLinkClasses)
    expect(screen.getByRole('button', { name: 'Editar' }).className.trim()).toBe(cellLinkClasses)
    expect(cellLinkClasses).toContain('text-small')
    expect(cellLinkClasses).toContain('focus-visible:underline')
  })
})

describe('Saldo pendiente', () => {
  it.each([
    ['pagada', { status: 'PAGADA', pendingBalance: 0 }, '$ 0', 'text-text-muted'],
    ['parcial', { status: 'PENDIENTE', pendingBalance: 400000 }, '$ 400.000', 'text-text'],
    ['pendiente', { status: 'PENDIENTE', pendingBalance: 1380000 }, '$ 1.380.000', 'text-text'],
    ['anulada', { status: 'ANULADA', pendingBalance: 0 }, '—', 'text-text-muted'],
  ] as const)('%s', (_, invoice, text, tone) => {
    render(<PendingBalance invoice={invoice} />)
    const value = screen.getByText(text)
    expect(value).toHaveClass('monto', tone)
  })
})

describe('pestanas', () => {
  it('Configuracion reparte el ancho por igual en rol small, sin desplazamiento', () => {
    render(
      <TabList aria-label="Secciones" fill options={[{ value: 'a', label: 'Datos de la serviteca' }, { value: 'b', label: 'Configuración financiera' }]} value="a" onChange={() => {}} />,
    )
    const list = screen.getByRole('tablist')
    expect(list).not.toHaveClass('overflow-x-auto')
    for (const tab of screen.getAllByRole('tab')) {
      expect(tab).toHaveClass('flex-1', 'min-w-0', 'text-small', 'min-h-touch')
      expect(tab).not.toHaveClass('whitespace-nowrap')
    }
  })

  it('Productos se desplaza y lleva a la vista la pestana elegida', async () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    function Tabs() {
      const [value, setValue] = useState('a')
      return (
        <TabList
          aria-label="Categorías"
          options={['a', 'b', 'c'].map((key) => ({ value: key, label: `Categoría ${key}` }))}
          value={value}
          onChange={setValue}
        />
      )
    }
    render(<Tabs />)
    expect(screen.getByRole('tablist')).toHaveClass('overflow-x-auto')
    expect(screen.getAllByRole('tab')[0]).toHaveClass('text-small', 'whitespace-nowrap')
    scrollIntoView.mockClear()

    await userEvent.click(screen.getByRole('tab', { name: 'Categoría c' }))
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' })
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(screen.getByRole('tab', { name: 'Categoría c' }))
  })
})

function appFiles(dir = 'src'): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return appFiles(path)
    return /\.tsx$/.test(entry.name) && !/\.test\.tsx$/.test(entry.name) ? [relative('src', path).replaceAll('\\', '/')] : []
  })
}
const source = (file: string) => readFileSync(join('src', file), 'utf-8')

const LISTS = [
  'pages/SalesInvoicesPage.tsx',
  'pages/PurchaseInvoicesPage.tsx',
  'trash/TrashPage.tsx',
  'manualMovements/ManualMovementsPage.tsx',
  'pages/AccountsPage.tsx',
  'counterparties/CounterpartiesPage.tsx',
  'pages/ProductsPage.tsx',
  'pages/CategoriesPage.tsx',
]

describe('listados', () => {
  it('usan ListHeader, y FilterBar donde filtran', () => {
    for (const file of LISTS) expect(source(file), file).toContain('<ListHeader')
    for (const file of LISTS.filter((file) => !/Accounts|Categories/.test(file))) expect(source(file), file).toContain('<FilterBar')
  })

  it('un solo selector de periodo: PeriodPicker en cada pantalla que filtra por fechas', () => {
    for (const file of [
      'pages/SalesInvoicesPage.tsx',
      'pages/PurchaseInvoicesPage.tsx',
      'trash/TrashPage.tsx',
      'manualMovements/ManualMovementsPage.tsx',
      'pages/AccountsPage.tsx',
      'pages/ReportsPage.tsx',
    ]) {
      expect(source(file), file).toContain('<PeriodPicker')
    }
    // Ningun otro selector arma su lista de periodos ni sus campos Desde y Hasta.
    const own = appFiles().filter(
      (file) => file !== 'components/PeriodPicker.tsx' && /label="(?:Periodo|Período|Desde|Hasta)"/.test(source(file)),
    )
    expect(own).toEqual([])
  })

  it('los enlaces de celda no tienen estilos propios', () => {
    const own = appFiles().filter(
      (file) => file !== 'components/CellLink.tsx' && /hit-area[^'"`]*text-brand-ink/.test(source(file)),
    )
    // Fuera de celdas: Nuevo cliente o proveedor de las facturas y el enlace del aviso de configuracion.
    expect(own).toEqual(['pages/CategoriesPage.tsx', 'pages/NewPurchaseInvoicePage.tsx', 'pages/NewSaleInvoicePage.tsx', 'pages/ProductsPage.tsx'])
  })

  it('las facturas ordenan Numero, Fecha, Tercero, ..., Estado, Total, Saldo pendiente y acciones', () => {
    for (const [file, party] of [
      ['pages/SalesInvoicesPage.tsx', 'Cliente'],
      ['pages/PurchaseInvoicesPage.tsx', 'Proveedor'],
    ] as const) {
      const headers = [...source(file).matchAll(/header: '([^']*)'/g)].map((match) => match[1])
      expect(headers).toEqual(['N.º factura', 'Fecha', party, 'Vence', 'Forma de pago', 'Estado', 'Total', 'Saldo pendiente', ''])
    }
  })
})

describe('ningun listado muestra dos botones primarios', () => {
  afterEach(() => vi.unstubAllGlobals())

  it.each([
    ['/ventas', 'Facturas de venta'],
    ['/compras', 'Facturas de compra'],
    ['/ventas/papelera', 'Papelera de ventas'],
    ['/compras/gastos', 'Gastos operativos'],
    ['/cuentas', 'Cuentas'],
    ['/ventas/clientes', 'Clientes'],
    ['/compras/proveedores', 'Proveedores'],
    ['/inventario', 'Productos'],
    ['/inventario/categorias', 'Categorías'],
  ])('%s', async (path, title) => {
    saveToken(validToken())
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve(
          jsonResponse(
            /kpis|balance|financial-settings|next-invoice/.test(url)
              ? { totalSales: 0, netSales: 0, total: 0, expensesRate: 0.1, dianRate: 0, icaRate: 0 }
              : [],
          ),
        ),
      ),
    )
    renderRoute(path)
    await screen.findByRole('heading', { level: 1, name: title })
    expect(primaryActions().length).toBeLessThanOrEqual(1)
  })
})
