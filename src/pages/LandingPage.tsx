import { Link } from 'react-router'
import { ChevronDown } from 'lucide-react'
import { useSession } from '../auth/session'
import { WordmarkLink } from '../brand/WordmarkLink'
import { buttonClasses } from '../components/buttonStyles'
import { iconSm } from '../components/icons'
import { SkipLink } from '../components/SkipLink'
import { SUPPORT_EMAIL, WHATSAPP_DISPLAY, WHATSAPP_URL } from '../config/contact'
import { usePageMeta } from '../lib/usePageMeta'
import heroInicio from '../assets/landing/hero-inicio.webp'
import flujoVenta from '../assets/landing/flujo-venta.webp'
import flujoInventario from '../assets/landing/flujo-inventario.webp'
import flujoReportes from '../assets/landing/flujo-reportes.webp'

const focusRing = 'focus-ring'
const linkClass = `rounded-control font-semibold text-brand-ink hover:underline ${focusRing}`
const container = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8'

// Capturas reales del panel con el tenant demo a 1440x900, recortadas al contenido (1200x836).
const SHOT = { width: 1200, height: 836 }

const LANDING_TITLE = 'ServiBox | Ventas, inventario y caja para servitecas'
const LANDING_DESCRIPTION =
  'Registra una venta y ServiBox actualiza el inventario y la caja al instante. Para servitecas y talleres.'

const flows = [
  {
    title: 'Registra una venta y todo se actualiza',
    text: 'Eliges los productos y ServiBox descuenta el inventario y suma el pago a tu caja o cuenta. Si la venta es a crédito, queda pendiente de cobro y vas registrando los abonos.',
    src: flujoVenta,
    alt: 'Pantalla Nueva factura de ServiBox con dos productos cargados, el total de la venta y el aviso de cuántas unidades se descuentan del inventario.',
  },
  {
    title: 'Sabe qué se te acaba',
    text: 'Cada producto avisa cuando su stock está bajo, crítico o en cero, según los umbrales de su categoría. El precio sugerido se calcula con tus costos y tus márgenes.',
    src: flujoInventario,
    alt: 'Pantalla de productos de ServiBox con el total de productos, las alertas de stock y la lista con costo, precio sugerido y estado de cada producto.',
  },
  {
    title: 'Mira cuánto ganas de verdad',
    text: 'La utilidad bruta sale de lo que vendiste menos lo que costaba. Le sumas tus otros ingresos, le restas los gastos y descargas el estado de resultados en PDF o Excel para tu contador.',
    src: flujoReportes,
    alt: 'Pantalla de reportes de ServiBox con la vista previa del estado de resultados del mes: ventas, costo de lo vendido, utilidad bruta, gastos y utilidad neta.',
  },
]

const extras = [
  'Compras a proveedores con sus pagos.',
  'Cuentas de efectivo, bancos y billeteras digitales.',
  'Clientes y proveedores.',
  'Gastos operativos y otros ingresos.',
  'Transferencias entre cuentas.',
]

const faqs = [
  { question: '¿Tengo que instalar algo?', answer: 'No. ServiBox funciona desde el navegador del computador o del celular.' },
  {
    question: '¿Mis datos se mezclan con los de otras servitecas?',
    answer: 'No. La información de cada serviteca se guarda por separado y solo la ve quien tiene acceso a esa cuenta.',
  },
  {
    question: '¿Reemplaza la facturación electrónica de la DIAN?',
    answer:
      'No. ServiBox sirve para llevar el control interno de tu negocio: ventas, compras, inventario y caja. No emite facturas electrónicas ante la DIAN.',
  },
  {
    question: '¿Puedo sacar reportes para mi contador?',
    answer: 'Sí. Descargas el estado de resultados y los movimientos de tus cuentas en PDF o Excel.',
  },
  { question: '¿Cuánto cuesta?', answer: 'Escríbenos por WhatsApp o al correo y te contamos.' },
]

/** WhatsApp y correo de src/config/contact.ts. */
function Contacts({ className = '' }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap gap-x-6 gap-y-2 text-small text-text-muted ${className}`}>
      <li>
        WhatsApp{' '}
        <a href={WHATSAPP_URL} target="_blank" rel="noopener" className={linkClass}>
          {WHATSAPP_DISPLAY}
        </a>
      </li>
      <li>
        Correo{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>
          {SUPPORT_EMAIL}
        </a>
      </li>
    </ul>
  )
}

/** Pagina publica de presentacion. Solo promete lo que existe: ver 02-CONVENTIONS.md. */
export function LandingPage() {
  usePageMeta(LANDING_TITLE, LANDING_DESCRIPTION)
  const session = useSession()

  const cta = session ? { to: '/inicio', label: 'Ir al panel' } : { to: '/registro', label: 'Crear mi serviteca' }

  return (
    <div id="landing" className="min-h-screen bg-surface">
      <SkipLink />

      <header className="border-b border-border bg-surface">
        <div className={`${container} flex min-h-topbar flex-wrap items-center justify-between gap-x-2 gap-y-2 py-2`}>
          <WordmarkLink />
          <div className="flex items-center gap-1 sm:gap-2">
            {session ? (
              <Link to="/inicio" className={buttonClasses('primary')} data-variant="primary">
                Ir al panel
              </Link>
            ) : (
              <>
                <Link to="/login" className={buttonClasses('text')} data-variant="text">
                  Iniciar sesión
                </Link>
                <Link to="/registro" className={`max-sm:px-3 ${buttonClasses('primary')}`} data-variant="primary">
                  Crear cuenta
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="contenido" tabIndex={-1} className="outline-none">
        <section aria-labelledby="titulo-portada" className={`${container} grid items-center gap-10 py-12 lg:grid-cols-12 lg:py-20`}>
          <div className="lg:col-span-5">
            <h1 id="titulo-portada" className="text-display text-text">
              Una venta. Inventario y caja al día.
            </h1>
            <p className="mt-4 max-w-md text-body text-text-muted">{LANDING_DESCRIPTION}</p>
            <Link to={cta.to} className={`mt-8 ${buttonClasses('primary')}`} data-variant="primary">
              {cta.label}
            </Link>
          </div>
          <figure className="lg:col-span-7">
            <img
              src={heroInicio}
              width={SHOT.width}
              height={SHOT.height}
              fetchPriority="high"
              alt="Pantalla de inicio de ServiBox con las ventas, el costo y la utilidad del mes, los productos con stock bajo y los saldos de las cuentas."
              className="h-auto w-full rounded-surface border border-border"
            />
            <figcaption className="mt-2 text-small text-text-muted">
              Pantalla real de ServiBox con datos de demostración.
            </figcaption>
          </figure>
        </section>

        <section aria-labelledby="titulo-flujos" className="border-t border-border bg-canvas">
          <div className={`${container} py-12 lg:py-20`}>
            <h2 id="titulo-flujos" className="text-title text-text">
              Lo que haces con ServiBox
            </h2>
            <div className="mt-10 flex flex-col gap-12 lg:gap-20">
              {flows.map(({ title, text, src, alt }, index) => (
                <article key={title} className="grid items-center gap-6 lg:grid-cols-12 lg:gap-10">
                  <div className={`lg:col-span-4 ${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                    <h3 className="text-section text-text">{title}</h3>
                    <p className="mt-2 text-body text-text-muted">{text}</p>
                  </div>
                  <img
                    src={src}
                    width={SHOT.width}
                    height={SHOT.height}
                    loading="lazy"
                    decoding="async"
                    alt={alt}
                    className={`h-auto w-full rounded-surface border border-border lg:col-span-8 ${index % 2 === 1 ? 'lg:order-1' : ''}`}
                  />
                </article>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="titulo-tambien" className={`${container} py-12 lg:py-20`}>
          <h2 id="titulo-tambien" className="text-title text-text">
            Y también
          </h2>
          <ul className="mt-6 grid list-disc gap-x-10 gap-y-2 pl-5 text-body text-text sm:grid-cols-2">
            {extras.map((extra) => (
              <li key={extra}>{extra}</li>
            ))}
          </ul>
          <p className="mt-10 border-t border-border pt-6 text-body text-text-muted">
            ServiBox se probó en Autollantas A&amp;C S.A.S., un negocio de llantas, lubricantes y servicios automotrices.
          </p>
        </section>

        <section aria-labelledby="titulo-preguntas" className="border-t border-border bg-canvas">
          <div className={`${container} py-12 lg:py-20`}>
            <h2 id="titulo-preguntas" className="text-title text-text">
              Preguntas frecuentes
            </h2>
            <div className="mt-6 max-w-3xl divide-y divide-border border-y border-border">
              {faqs.map(({ question, answer }) => (
                <details key={question} className="group">
                  <summary
                    className={`flex min-h-touch cursor-pointer list-none items-center justify-between gap-4 rounded-control py-3 [&::-webkit-details-marker]:hidden ${focusRing}`}
                  >
                    <h3 className="text-section text-text">{question}</h3>
                    <ChevronDown
                      {...iconSm}
                      aria-hidden
                      className="shrink-0 text-text-muted transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <p className="pb-4 text-body text-text-muted">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="titulo-cierre" className={`${container} py-12 lg:py-20`}>
          <h2 id="titulo-cierre" className="max-w-2xl text-title text-text">
            Registra tu serviteca y empieza a llevar ventas e inventario hoy mismo.
          </h2>
          <Link to={cta.to} className={`mt-6 ${buttonClasses('primary')}`} data-variant="primary">
            {cta.label}
          </Link>
          <Contacts className="mt-6" />
        </section>
      </main>

      <footer className="border-t border-border bg-surface">
        <div className={`${container} flex flex-col gap-6 py-10 md:flex-row md:items-start md:justify-between`}>
          <WordmarkLink />
          <nav aria-label="Pie de página">
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-small">
              <li>
                <Link to="/terminos" className={linkClass}>
                  Términos y tratamiento de datos
                </Link>
              </li>
              <li>
                <Link to="/login" className={linkClass}>
                  Iniciar sesión
                </Link>
              </li>
              <li>
                <Link to="/registro" className={linkClass}>
                  Crear cuenta
                </Link>
              </li>
            </ul>
          </nav>
          <Contacts />
        </div>
      </footer>
    </div>
  )
}
