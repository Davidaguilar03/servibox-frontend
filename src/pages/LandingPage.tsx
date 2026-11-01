import { Link } from 'react-router'
import { ArrowLeftRight, ArrowRight, ChartNoAxesCombined, Check, ChevronDown, Package, ReceiptText, ShoppingCart, TriangleAlert, Truck, Users, Wallet } from 'lucide-react'
import { useSession } from '../auth/session'
import { WordmarkLink } from '../brand/WordmarkLink'
import { buttonClasses } from '../components/buttonStyles'
import { iconLg, iconSm } from '../components/icons'
import { SkipLink } from '../components/SkipLink'
import { GLOSSARY } from '../copy/glossary'
import { PRIVACY_POLICY_PATH, TERMS_PATH } from '../legal/legalContent'
import { usePageMeta } from '../lib/usePageMeta'
import heroWorkshop from '../assets/landing/hero-workshop-mechanic-v2.webp'
import faqWorkshop from '../assets/landing/faq-workshop-panorama-v2.webp'
import ctaTire from '../assets/landing/cta-tire.webp'
import heroDashboard from '../assets/landing/product-screens/hero-dashboard.webp'
import stepSale from '../assets/landing/product-visuals-v2/step-sale.webp'
import stockPanel from '../assets/landing/product-visuals-v2/stock-panel.webp'
import stepPayment from '../assets/landing/product-screens/step-payment.webp'
import featureBalances from '../assets/landing/product-screens/feature-balances.webp'
import featureReports from '../assets/landing/product-screens/feature-reports.webp'
import './LandingPage.css'

const linkClass = 'inline-flex min-h-touch items-center rounded-control font-semibold text-brand-ink hover:underline focus-ring'
const navLink = `${linkClass} w-full justify-center text-center sm:w-auto`
const card = 'rounded-surface border border-border bg-surface'
const footerLink = 'inline-flex min-h-touch items-center rounded-control hover:underline focus-ring'
const container = 'landing-container'
const LANDING_TITLE = 'ServiBox | Ventas, inventario y caja para servitecas'
const LANDING_DESCRIPTION = 'Registra una venta y ServiBox descuenta el inventario. De contado, el dinero entra a la cuenta que elijas; a crédito, con cada abono. Para servitecas y talleres.'

const steps = [
  { title: 'Registra la venta', text: 'Elige los productos y registra cómo te paga el cliente.', src: stepSale, width: 1448, height: 1086, alt: 'Ilustración de los productos de una venta con su cantidad y precio sin IVA.' },
  { title: 'Actualiza el inventario', text: 'El stock de los productos vendidos se descuenta automáticamente.', src: stockPanel, width: 1448, height: 1086, alt: 'Ilustración de una lista de productos con stock bajo, sus unidades y su estado de alerta.' },
  { title: 'Refleja el pago en caja', text: 'Si vendes a crédito, el dinero entra cuando registras cada abono.', src: stepPayment, width: 780, height: 992, alt: 'Abono registrado de una factura y resumen con total, abonado y saldo pendiente.' },
]
const extras = [
  { text: 'Compras a proveedores con sus pagos.', icon: Truck },
  { text: 'Clientes y proveedores.', icon: Users },
  { text: 'Gastos operativos y otros ingresos.', icon: ReceiptText },
  { text: 'Transferencias entre cuentas.', icon: ArrowLeftRight },
]
const faqs = [
  { question: '¿Tengo que instalar algo?', answer: 'No. ServiBox funciona desde el navegador del computador o del celular.' },
  { question: '¿Puedo llevar ventas a crédito?', answer: 'Sí. La venta queda pendiente de cobro y puedes registrar los abonos del cliente a medida que los recibes.' },
  { question: '¿Mis datos se mezclan con los de otras servitecas?', answer: 'No. Dentro de la aplicación, las ventas, el inventario, la caja y los clientes de tu serviteca solo los ven sus usuarios. El equipo de ServiBox gestiona los datos de la cuenta: nombre, NIT, teléfono, usuarios y correos.' },
  { question: '¿Puedo sacar reportes para mi contador?', answer: 'Sí. Descargas el estado de resultados y los movimientos de tus cuentas en PDF o Excel.' },
  { question: '¿Reemplaza la facturación electrónica de la DIAN?', answer: 'No. ServiBox sirve para llevar el control interno de tu negocio: ventas, compras, inventario y caja. No emite facturas electrónicas ante la DIAN.' },
]

/** Capturas de la interfaz con datos genericos, ilustraciones de producto e imagenes ambientales. */
export function LandingPage() {
  usePageMeta(LANDING_TITLE, LANDING_DESCRIPTION)
  const session = useSession()
  const cta = session ? { to: '/inicio', label: 'Ir al panel' } : { to: '/registro', label: 'Solicitar mi cuenta' }

  return (
    <div id="landing" className="min-h-screen bg-neutral-100">
      <SkipLink />
      <header className="landing-hero">
        <div aria-hidden className="landing-hero-scene pointer-events-none z-0 overflow-hidden">
          <img src={heroWorkshop} alt="" width={1280} height={960} decoding="async" className="landing-hero-photo h-full w-full object-cover object-right-top" />
        </div>
        <div role="group" aria-label="Navegación y acceso" className={`${container} relative z-30 isolate pt-4`}>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-surface border border-border bg-surface p-4 lg:px-6">
            <WordmarkLink />
            <nav aria-label="Navegación principal" className="order-3 w-full border-t border-border pt-2 lg:order-none lg:w-auto lg:border-0 lg:pt-0">
              <ul className="grid grid-cols-3 gap-2 text-small sm:flex sm:flex-wrap sm:gap-x-6">
                <li><a href="#como-funciona" className={navLink}>Cómo funciona</a></li>
                <li><a href="#funciones" className={navLink}>Funciones</a></li>
                <li><a href="#preguntas" className={navLink}>Preguntas frecuentes</a></li>
              </ul>
            </nav>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              {session ? (
                <Link to="/inicio" className={`${buttonClasses('primary')} flex-auto sm:flex-none`} data-variant="primary">Ir al panel</Link>
              ) : (
                <>
                  <Link to="/login" className={`${buttonClasses('text')} flex-auto sm:flex-none`} data-variant="text">Iniciar sesión</Link>
                  <Link to="/registro" className={`${buttonClasses('primary')} flex-auto sm:flex-none`} data-variant="primary">Solicitar cuenta</Link>
                </>
              )}
            </div>
          </div>
        </div>
        <section aria-labelledby="titulo-portada">
          <div className={`${container} relative z-10 grid items-center gap-8 py-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:py-20`}>
            <div className="relative xl:pl-10">
              <p className="mb-4 text-label uppercase text-text-muted">Para servitecas y talleres</p>
              <h1 id="titulo-portada" className="landing-title text-text">Tu serviteca,<br /><span className="text-brand-ink">bajo control.</span><br />De verdad.</h1>
              <p className="mt-6 max-w-md text-body text-text-muted">Ventas, inventario y caja conectados en un solo lugar.</p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link to={cta.to} className={buttonClasses('primary')} data-variant="primary">{cta.label}</Link>
                <a href="#como-funciona" className={`${linkClass} gap-2 text-button`}>Conoce cómo funciona <ArrowRight {...iconSm} aria-hidden /></a>
              </div>
            </div>
            <figure className="relative isolate min-w-0 pt-20 lg:pt-40">
              <div aria-hidden className="pointer-events-none absolute inset-x-8 top-16 -z-10 h-40 rounded-surface bg-border-accent/40 lg:top-36" />
              <div className="landing-product-frame shadow-raised">
                <img src={heroDashboard} alt="Panel de Inicio de ServiBox con el menú lateral, indicadores de ventas y utilidad, productos con stock bajo, saldos de cuentas y últimas ventas." width={2074} height={1297} fetchPriority="high" className="block h-auto w-full" />
              </div>
            </figure>
          </div>
        </section>
      </header>

      <main id="contenido" tabIndex={-1} className="outline-none">
        <section id="como-funciona" aria-labelledby="titulo-flujo" className={`${container} scroll-mt-6 pb-12 lg:pb-16`}>
          <h2 id="titulo-flujo" className="landing-heading text-text">Una venta. <span className="text-brand-ink">Todo conectado.</span></h2>
          <p className="mt-3 max-w-2xl text-body text-text-muted">{LANDING_DESCRIPTION}</p>
          <ol className="mt-8 grid items-start gap-10 lg:grid-cols-3 lg:gap-8">
            {steps.map(({ title, text, src, width, height, alt }, index) => (
              <li key={title} className="relative min-w-0">
                <div className="flex items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-action text-small font-semibold text-text-inverse">{index + 1}</span>
                  <div>
                    <h3 className="landing-step-title text-section text-text">{title}</h3>
                    <p className="landing-description landing-prose mt-2 text-body text-text-muted">{text}</p>
                  </div>
                </div>
                <div className={`landing-product-frame landing-step-visual mt-4 ${index === 2 ? 'landing-step-payment' : ''}`}>
                  <img src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" className="block h-auto w-full" />
                </div>
                {index < steps.length - 1 && <ArrowRight {...iconLg} aria-hidden className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 rotate-90 text-brand-ink lg:top-1/2 lg:-right-7 lg:bottom-auto lg:left-auto lg:translate-x-0 lg:-translate-y-1/2 lg:rotate-0" />}
              </li>
            ))}
          </ol>
        </section>

        <section id="funciones" aria-labelledby="titulo-funciones" className="scroll-mt-6 bg-canvas">
          <div className={`${container} py-10 lg:py-12`}>
            <h2 id="titulo-funciones" className="landing-heading text-text">Lo que necesitas, en orden.</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <article className={`${card} min-w-0 p-6`}>
                <ChartNoAxesCombined {...iconLg} aria-hidden className="mb-4 text-brand-ink" />
                <h3 className="landing-feature-title text-text">Ve cuánto ganas de verdad.</h3>
                <p className="landing-prose mt-2 text-body text-text-muted">Ventas sin IVA menos costo de lo vendido: esa es tu utilidad bruta. Suma otros ingresos y resta gastos operativos para conocer tu utilidad neta.</p>
              </article>
              <article className={`${card} min-w-0 p-6`}>
                <TriangleAlert {...iconLg} aria-hidden className="mb-4 text-brand-ink" />
                <h3 className="landing-feature-title text-text">Entérate antes de quedarte sin stock.</h3>
                <p className="landing-prose mt-2 text-body text-text-muted">Consulta tus alertas y las unidades disponibles en un solo lugar.</p>
                <p className="mt-3 text-small text-text-muted">El precio sugerido se calcula con tus costos y tus márgenes.</p>
              </article>
              <article className={`${card} landing-accounts-card grid min-w-0 gap-6 p-6 md:col-span-2 lg:grid-cols-2`}>
                <div className="min-w-0">
                  <Wallet {...iconLg} aria-hidden className="mb-4 text-brand-ink" />
                  <h3 className="landing-feature-title text-text">Tus cuentas, al día.</h3>
                  <p className="landing-prose mt-2 text-body text-text-muted">Efectivo, bancos y billeteras digitales en un solo lugar.</p>
                  <div className="landing-product-frame landing-balances-visual mt-4">
                    <img src={featureBalances} alt="Saldos de cuentas de banco, billetera digital y efectivo, con el total disponible." width={1338} height={832} loading="lazy" decoding="async" className="block h-auto w-full" />
                  </div>
                </div>
                <ul className="landing-accounts-panel grid min-w-0 auto-rows-fr gap-2 rounded-surface bg-canvas p-2 sm:gap-4 sm:p-4 lg:grid-rows-4">
                  {extras.map(({ text, icon: Icon }) => (
                    <li key={text} className={`${card} flex min-h-14 items-center gap-3 p-3 text-body text-text sm:gap-4 sm:p-4 lg:px-6`}>
                      <span className="landing-accounts-icon flex shrink-0 items-center justify-center rounded-control bg-canvas text-brand-ink">
                        <Icon {...iconLg} aria-hidden />
                      </span>
                      {text}
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section aria-labelledby="titulo-reportes" className="bg-nav text-text-inverse">
          <div className={`${container} grid items-center gap-10 py-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]`}>
            <div>
              <p className="mb-4 text-label uppercase text-neutral-300">Tu negocio en una sola plataforma</p>
              <h2 id="titulo-reportes" className="landing-heading landing-report-title">Menos archivos sueltos. <span className="whitespace-nowrap text-brand">Más claridad.</span></h2>
              <p className="landing-description mt-4 max-w-lg text-body text-neutral-300">Consulta tus resultados por período y descarga el estado de resultados o los movimientos de tus cuentas en PDF o Excel.</p>
              <ul aria-label="Áreas del producto" className="mt-6 flex flex-wrap gap-3 text-small">
                {[{ label: 'Ventas', icon: ShoppingCart }, { label: 'Inventario', icon: Package }, { label: 'Cuentas', icon: Wallet }, { label: 'Reportes', icon: ChartNoAxesCombined }].map(({ label, icon: Icon }) => (
                  <li key={label} className="flex items-center gap-2 rounded-control border border-neutral-500 px-3 py-3"><Icon {...iconSm} aria-hidden />{label}</li>
                ))}
              </ul>
              <ul className="landing-description mt-6 space-y-3 text-body text-neutral-300">
                {['Revisa ventas, costos y utilidad del período.', 'Filtra por fechas y descarga en PDF o Excel.', 'Comparte el archivo descargado con tu contador.'].map((text) => <li key={text} className="flex items-start gap-3"><Check {...iconSm} aria-hidden className="mt-1 shrink-0 text-text-inverse" />{text}</li>)}
              </ul>
            </div>
            <figure className="landing-report-visual min-w-0">
              <div className="landing-product-frame landing-report-frame bg-canvas">
                <img src={featureReports} alt="Reportes con formato PDF o Excel y vista previa del estado de resultados." aria-describedby="landing-report-description" width={1968} height={1235} loading="lazy" decoding="async" className="block h-auto w-full" />
              </div>
              <p id="landing-report-description" className="sr-only">El estado de resultados incluye ventas sin IVA, costo de lo vendido, utilidad bruta, {GLOSSARY.otherIncome.toLowerCase()}, gastos operativos y utilidad neta; se puede descargar en PDF o Excel.</p>
            </figure>
          </div>
        </section>

        <div className="landing-faq-environment">
          <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
            <div className="landing-faq-scene">
              <img src={faqWorkshop} alt="" width={1942} height={809} loading="lazy" decoding="async" className="block h-auto w-full" />
            </div>
          </div>
          <section id="preguntas" aria-labelledby="titulo-preguntas" className={`${container} relative z-10 grid scroll-mt-6 items-start gap-8 pt-12 pb-8 lg:grid-cols-12 lg:pt-16 lg:pb-12`}>
            <div className="lg:col-span-5">
              <p className="mb-4 text-label uppercase text-text-muted">Preguntas frecuentes</p>
              <h2 id="titulo-preguntas" className="landing-heading text-text">Lo que quieres <span className="text-brand-ink">saber.</span></h2>
              <p className="mt-4 max-w-sm text-body text-text-muted">Resolvemos las dudas más comunes sobre ServiBox.</p>
            </div>
            <div className="space-y-3 lg:col-span-7">
              {faqs.map(({ question, answer }) => (
                <details key={question} className="group rounded-surface border border-border bg-surface px-5">
                  <summary className="flex min-h-touch cursor-pointer list-none items-center justify-between gap-4 rounded-control py-4 focus-ring [&::-webkit-details-marker]:hidden">
                    <h3 className="text-section text-text">{question}</h3>
                    <ChevronDown {...iconSm} aria-hidden className="shrink-0 text-text-muted group-open:rotate-180" />
                  </summary>
                  <p className="landing-prose pb-5 text-body text-text-muted">{answer}</p>
                </details>
              ))}
            </div>
          </section>

          <section aria-labelledby="titulo-cierre" className={`${container} relative z-10 pb-12`}>
            <div className="relative grid items-center gap-8 overflow-hidden rounded-surface bg-action p-8 text-text-inverse sm:p-12 md:grid-cols-12">
              <div className="md:col-span-8">
                <h2 id="titulo-cierre" className="landing-heading">Tu próxima venta,<br />con todo en orden.</h2>
                <p className="mt-4 max-w-lg text-body">Solicita tu cuenta. Revisamos cada solicitud y, si la aprobamos, te enviamos un correo para activarla y llevar el control de tu serviteca.</p>
                <div className="mt-6">
                  <Link to={cta.to} className={`${buttonClasses('secondary')} landing-closing-action shadow-raised focus-visible:outline-text-inverse`} data-variant="secondary">
                    {cta.label}<ArrowRight {...iconSm} aria-hidden className="shrink-0" />
                  </Link>
                </div>
              </div>
              <div aria-hidden className="landing-closing-tire pointer-events-none justify-self-center md:absolute md:inset-y-0 md:right-0 md:w-1/4">
                <img src={ctaTire} alt="" width={640} height={960} loading="lazy" decoding="async" className="block h-auto w-full md:h-full md:object-cover md:object-top" />
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="bg-nav text-text-inverse">
        <div className={`${container} flex flex-col gap-8 py-10 lg:flex-row lg:items-center lg:justify-between`}>
          <div>
            <WordmarkLink onDark />
            <p className="mt-3 text-small text-neutral-300">Ventas, inventario y caja para tu serviteca.</p>
          </div>
          <nav aria-label="Pie de página">
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-small">
              <li><a href="#funciones" className={footerLink}>Producto</a></li>
              <li><Link to={PRIVACY_POLICY_PATH} className={footerLink}>{GLOSSARY.privacyPolicyShort}</Link></li>
              <li><Link to={TERMS_PATH} className={footerLink}>{GLOSSARY.terms}</Link></li>
              <li><Link to={session ? '/inicio' : '/login'} className={footerLink}>{session ? 'Ir al panel' : 'Iniciar sesión'}</Link></li>
              {!session && <li><Link to="/registro" className={footerLink}>Solicitar cuenta</Link></li>}
            </ul>
          </nav>
        </div>
      </footer>
    </div>
  )
}
