import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import {
  CalendarClock,
  ChartColumn,
  FileSpreadsheet,
  Lock,
  Menu,
  Package,
  ShoppingCart,
  Truck,
  Unlink,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useSession } from '../auth/session'
import { WordmarkLink } from '../brand/WordmarkLink'
import { buttonClasses } from '../components/buttonStyles'
import { DataTable, type Column } from '../components/DataTable'
import { IndicatorCard } from '../components/IndicatorCard'
import { StatusBadge, type BadgeStatus } from '../components/StatusBadge'
import { formatCurrency } from '../lib/format'
import { usePageMeta } from '../lib/usePageMeta'

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

const anchors = [
  { href: '#producto', label: 'Producto' },
  { href: '#modulos', label: 'Módulos' },
  { href: '#como-funciona', label: 'Cómo funciona' },
  // La captura no trae datos de contacto: la ancla lleva al pie. Ver 03-DECISIONS.md.
  { href: '#contacto', label: 'Contacto' },
]

const problems: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: FileSpreadsheet,
    title: 'Tres archivos separados',
    text: 'Hoy cada venta se anota a mano en tres archivos de Excel: ventas, inventario y cuentas.',
  },
  {
    icon: Unlink,
    title: 'Nada se actualiza solo',
    text: 'Los archivos no se hablan entre sí. Las inconsistencias pasan desapercibidas.',
  },
  {
    icon: CalendarClock,
    title: 'Conciliar a fin de mes',
    text: 'Al cierre toca revisar archivo por archivo para que las cifras cuadren.',
  },
]

const modules: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Package, title: 'Inventario', text: 'Productos, categorías, existencias y alertas de stock bajo.' },
  { icon: ShoppingCart, title: 'Ventas', text: 'Facturas de contado y a crédito, abonos y papelera.' },
  { icon: Truck, title: 'Compras', text: 'Facturas de proveedores, pagos y papelera.' },
  { icon: Wallet, title: 'Cuentas', text: 'Caja y bancos, movimientos y transferencias.' },
  { icon: ChartColumn, title: 'Panel de control', text: 'Indicadores del mes, stock bajo y reportes para descargar.' },
]

const steps = [
  {
    title: 'Registra tu serviteca',
    text: 'Crea tu cuenta con los datos del negocio y del administrador. Dejamos lista la Caja General, las categorías base y el IVA.',
  },
  { title: 'Carga tu catálogo', text: 'Agrega tus productos con su costo y su precio de venta.' },
  {
    title: 'Vende y controla',
    text: 'Cada venta y cada compra actualizan el inventario y las cuentas. Revisa tus cifras cuando quieras.',
  },
]

const values = [
  { title: 'Eficiencia', text: 'Optimiza tu tiempo y tus procesos.' },
  { title: 'Confiabilidad', text: 'Tu negocio en buenas manos.' },
  { title: 'Control', text: 'Decisiones basadas en datos reales.' },
  { title: 'Enfoque', text: 'Nosotros cuidamos lo administrativo.' },
]

interface SampleSale {
  number: string
  customer: string
  total: number
  status: BadgeStatus
}

// Datos ficticios de la vista de ejemplo: no son clientes ni cifras reales.
const sampleSales: SampleSale[] = [
  { number: 'FV-0001', customer: 'Cliente de ejemplo 1', total: 350000, status: 'PAGADA' },
  { number: 'FV-0002', customer: 'Cliente de ejemplo 2', total: 1200000, status: 'PENDIENTE' },
  { number: 'FV-0003', customer: 'Consumidor final', total: 180000, status: 'PAGADA' },
]

const sampleColumns: Column<SampleSale>[] = [
  { header: 'Factura', render: (row) => <span className="font-mono">{row.number}</span> },
  { header: 'Cliente', render: (row) => row.customer },
  { header: 'Total', align: 'right', render: (row) => formatCurrency(row.total) },
  { header: 'Estado', render: (row) => <StatusBadge status={row.status} /> },
]

/** Vista de ejemplo del panel con los componentes reales. Solo decorativa. */
function DashboardPreview() {
  return (
    <div aria-hidden inert className="overflow-hidden rounded-card bg-canvas p-4 shadow-modal sm:p-6">
      <p className="font-display text-h3 text-text">Inicio</p>
      <p className="text-small text-text-muted">Vista de ejemplo con datos ficticios</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <IndicatorCard label="Ventas del mes" value={formatCurrency(1730000)} />
        <IndicatorCard label="Utilidad" value={formatCurrency(420000)} />
      </div>
      <div className="mt-3 rounded-card border border-border bg-surface p-4 shadow-card">
        <p className="mb-2 text-small font-medium text-text">Últimas ventas</p>
        <DataTable
          columns={sampleColumns}
          rows={sampleSales}
          rowKey={(row) => row.number}
          loading={false}
          error={false}
          onRetry={() => {}}
          emptyMessage=""
        />
      </div>
    </div>
  )
}

/** Pagina publica de presentacion. Ver 03-DECISIONS.md para el origen de los textos. */
export function LandingPage() {
  usePageMeta(
    'ServiBox · Ventas, inventario y cuentas de tu serviteca',
    'Registra una venta y el inventario y la cuenta se actualizan solos. ServiBox, para servitecas y talleres.',
  )
  const session = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      menuButton.current?.focus()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [menuOpen])

  const primaryCta = session
    ? { to: '/inicio', label: 'Ir al panel' }
    : { to: '/registro', label: 'Crea tu cuenta' }
  const navLinkClass = `rounded-tag text-small font-medium text-text-muted transition-colors duration-(--duration-fast) hover:text-text ${focusRing}`

  return (
    <div id="landing" className="min-h-screen overflow-x-hidden bg-surface">
      <a
        href="#contenido"
        className={`sr-only z-50 rounded-control bg-surface px-4 py-2 text-small font-medium text-text shadow-menu focus:not-sr-only focus:fixed focus:top-2 focus:left-2 ${focusRing}`}
      >
        Saltar al contenido
      </a>

      <header className="sticky top-0 z-40 border-b border-border bg-surface">
        <div className="mx-auto flex h-topbar max-w-content items-center gap-4 px-4 sm:px-6 lg:px-8">
          <WordmarkLink />

          <nav aria-label="Secciones" className="ml-auto hidden lg:block">
            <ul className="flex items-center gap-8">
              {anchors.map(({ href, label }) => (
                <li key={href}>
                  <a href={href} className={navLinkClass}>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-8">
            {session ? (
              <Link to="/inicio" className={buttonClasses('secondary')}>
                Ir al panel
              </Link>
            ) : (
              <>
                <Link to="/login" className={`hidden sm:inline-flex ${buttonClasses('secondary')}`}>
                  Iniciar sesión
                </Link>
                <Link to="/registro" className={`hidden sm:inline-flex ${buttonClasses('secondary')}`}>
                  Crear cuenta
                </Link>
              </>
            )}
            <button
              ref={menuButton}
              type="button"
              aria-expanded={menuOpen}
              aria-controls="menu-secciones"
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              onClick={() => setMenuOpen((open) => !open)}
              className={`flex size-touch items-center justify-center rounded-control text-text hover:bg-neutral-100 lg:hidden ${focusRing}`}
            >
              {menuOpen ? <X size={20} strokeWidth={1.5} aria-hidden /> : <Menu size={20} strokeWidth={1.5} aria-hidden />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav id="menu-secciones" aria-label="Secciones" className="border-t border-border bg-surface shadow-menu lg:hidden">
            <ul className="flex flex-col px-4 py-2 sm:px-6">
              {anchors.map(({ href, label }) => (
                <li key={href}>
                  <a
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex min-h-touch items-center text-body text-text ${focusRing}`}
                  >
                    {label}
                  </a>
                </li>
              ))}
              {!session && (
                <>
                  <li className="sm:hidden">
                    <Link to="/login" className={`flex min-h-touch items-center text-body text-text ${focusRing}`}>
                      Iniciar sesión
                    </Link>
                  </li>
                  <li className="sm:hidden">
                    <Link to="/registro" className={`flex min-h-touch items-center text-body text-text ${focusRing}`}>
                      Crear cuenta
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </nav>
        )}
      </header>

      <main id="contenido" tabIndex={-1} className="outline-none">
        <section id="producto" aria-labelledby="titulo-portada" className="relative scroll-mt-16 overflow-hidden bg-nav">
          <div
            className="absolute inset-0 bg-brand/20 [clip-path:polygon(62%_0,80%_0,56%_100%,38%_100%)]"
            aria-hidden
          />
          <div className="relative mx-auto grid max-w-content items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
            <div className="max-w-xl">
              <p className="font-mono text-label uppercase text-text-subtle">Para servitecas y talleres</p>
              <h1 id="titulo-portada" className="mt-4 text-h1 text-text-inverse sm:text-display">
                Una venta. Inventario y caja al día.
              </h1>
              <p className="mt-6 text-body text-neutral-300">
                Registra una venta y el inventario y la cuenta se actualizan solos. Para propietarios, administradoras
                y vendedores de servitecas y talleres, sin perfil técnico.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link to={primaryCta.to} className={buttonClasses('primary')}>
                  {primaryCta.label}
                </Link>
                {!session && (
                  <Link to="/login" className={`rounded-tag text-button text-text-inverse hover:underline ${focusRing}`}>
                    Iniciar sesión
                  </Link>
                )}
              </div>
              <p className="mt-6 flex items-start gap-2 text-small text-text-subtle">
                <Lock size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden />
                Sin instalación. Cada serviteca administra su información de forma aislada y segura, desde cualquier
                dispositivo con internet.
              </p>
            </div>
            <DashboardPreview />
          </div>
        </section>

        <section aria-labelledby="titulo-problema" className="mx-auto max-w-content px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <p className="font-mono text-label uppercase text-text-muted">El problema</p>
          <h2 id="titulo-problema" className="mt-2 text-h2 text-text sm:text-h1">
            Deja atrás los tres archivos de Excel
          </h2>
          <p className="mt-3 max-w-2xl text-body text-text-muted">
            Hoy una venta se anota en tres archivos que no se actualizan entre sí. Las diferencias aparecen a fin de
            mes, cuando ya es tarde.
          </p>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {problems.map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-card border border-border bg-surface p-6 shadow-card">
                <span className="flex size-10 items-center justify-center rounded-control bg-warning-bg text-warning">
                  <Icon size={20} strokeWidth={1.5} aria-hidden />
                </span>
                <h3 className="mt-4 text-h3 text-text">{title}</h3>
                <p className="mt-2 text-small text-text-muted">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="modulos" aria-labelledby="titulo-modulos" className="scroll-mt-16 bg-canvas">
          <div className="mx-auto max-w-content px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <p className="font-mono text-label uppercase text-text-muted">Módulos</p>
            <h2 id="titulo-modulos" className="mt-2 text-h2 text-text sm:text-h1">
              Todo lo administrativo, en un solo lugar
            </h2>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
              {modules.map(({ icon: Icon, title, text }) => (
                <li key={title} className="rounded-card border border-border bg-surface p-6 shadow-card">
                  <span className="flex size-10 items-center justify-center rounded-control bg-error-bg text-brand-ink">
                    <Icon size={20} strokeWidth={1.5} aria-hidden />
                  </span>
                  <h3 className="mt-4 text-h3 text-text">{title}</h3>
                  <p className="mt-2 text-small text-text-muted">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="como-funciona"
          aria-labelledby="titulo-como-funciona"
          className="mx-auto max-w-content scroll-mt-16 px-4 py-16 sm:px-6 lg:px-8 lg:py-24"
        >
          <p className="font-mono text-label uppercase text-text-muted">Cómo funciona</p>
          <h2 id="titulo-como-funciona" className="mt-2 text-h2 text-text sm:text-h1">
            Empieza a usarlo el mismo día
          </h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {steps.map(({ title, text }, index) => (
              <li key={title}>
                <span className="font-display text-h1 text-brand-ink" aria-hidden>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-2 text-h3 text-text">{title}</h3>
                <p className="mt-2 text-small text-text-muted">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="titulo-llamado" className="mx-auto max-w-content px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
          <div className="flex flex-col gap-6 rounded-container bg-nav p-8 md:flex-row md:items-center md:justify-between md:p-12">
            <div>
              <h2 id="titulo-llamado" className="text-h2 text-text-inverse">
                Tu negocio en buenas manos
              </h2>
              <p className="mt-2 text-body text-neutral-300">
                Registra tu serviteca y deja que ServiBox cuide lo administrativo.
              </p>
            </div>
            <Link to={primaryCta.to} className={`shrink-0 ${buttonClasses('primary')}`}>
              {primaryCta.label}
            </Link>
          </div>
        </section>
      </main>

      <footer id="contacto" className="scroll-mt-16 border-t border-border bg-surface">
        <div className="mx-auto max-w-content px-4 py-12 sm:px-6 lg:px-8">
          <WordmarkLink />
          <dl className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map(({ title, text }) => (
              <div key={title}>
                <dt className="font-display text-h3 text-text">{title}</dt>
                <dd className="mt-1 text-small text-text-muted">{text}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-small text-text-muted sm:flex-row sm:items-center sm:justify-between">
            <Link to="/terminos" className={`rounded-tag font-medium text-brand-ink hover:underline ${focusRing}`}>
              Términos y condiciones
            </Link>
            <p>ServiBox · v1.0 · 2026</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
