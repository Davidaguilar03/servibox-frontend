import { Link } from 'react-router'
import { WordmarkLink } from '../brand/WordmarkLink'
import { SUPPORT_EMAIL, WHATSAPP_DISPLAY, WHATSAPP_URL } from '../config/contact'
import { usePageMeta } from '../lib/usePageMeta'

const linkClass =
  'rounded-control font-semibold text-brand-ink hover:underline focus-ring'

/**
 * Terminos de uso y tratamiento de datos. Texto sin revision legal: el responsable figura como
 * "ServiBox" hasta tener razon social, NIT y direccion. Ver docs/ai-context/03-DECISIONS.md.
 */
export function TermsPage() {
  usePageMeta('Términos | ServiBox', 'Términos de uso de ServiBox y cómo tratamos los datos de tu serviteca.')

  return (
    <main className="min-h-screen bg-canvas px-4 py-12 sm:px-6">
      <article className="mx-auto w-full max-w-2xl rounded-surface border border-border bg-surface p-6 sm:p-8">
        <WordmarkLink />
        <h1 className="mt-6 text-title text-text">Términos de uso y tratamiento de datos</h1>
        <p className="mt-1 text-small text-text-muted">Última actualización: 25 de octubre de 2026</p>

        <div className="mt-8 flex flex-col gap-8 text-body text-text">
          <section aria-labelledby="terminos-que-es">
            <h2 id="terminos-que-es" className="text-section">
              Qué es ServiBox
            </h2>
            <p className="mt-2">
              ServiBox es una herramienta de gestión interna para servitecas y talleres: ventas, compras, inventario,
              cuentas y reportes. No emite facturas electrónicas ante la DIAN ni reemplaza a tu contador.
            </p>
          </section>

          <section aria-labelledby="terminos-cuenta">
            <h2 id="terminos-cuenta" className="text-section">
              Tu cuenta
            </h2>
            <p className="mt-2">
              Eres responsable de cuidar tus claves y de los datos que ingresas. Cada serviteca tiene su información
              separada: solo la ve quien tiene acceso a esa cuenta.
            </p>
          </section>

          <section aria-labelledby="terminos-datos">
            <h2 id="terminos-datos" className="text-section">
              Qué datos tratamos y para qué
            </h2>
            <p className="mt-2">Solo tratamos los datos que pide el registro y los que ingresas en la aplicación:</p>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
              <li>De la serviteca: nombre comercial, NIT, teléfono y código de la serviteca.</li>
              <li>
                Del administrador: nombre completo, correo, usuario y contraseña. La contraseña se guarda cifrada.
              </li>
              <li>
                De tus clientes y proveedores: nombre, tipo y número de documento, correo y teléfono, si los registras.
              </li>
              <li>
                De la operación: productos, categorías, facturas de venta y de compra, abonos y pagos, cuentas,
                movimientos, gastos, otros ingresos y la configuración para el precio sugerido.
              </li>
            </ul>
            <p className="mt-2">
              Los usamos solo para prestar el servicio. No los vendemos ni los cedemos a terceros, salvo obligación
              legal.
            </p>
          </section>

          <section aria-labelledby="terminos-derechos">
            <h2 id="terminos-derechos" className="text-section">
              Tus derechos
            </h2>
            <p className="mt-2">
              Según la Ley 1581 de 2012, puedes conocer, actualizar, rectificar y suprimir tus datos, y revocar la
              autorización que nos diste. Para hacerlo, escríbenos por WhatsApp al{' '}
              <a href={WHATSAPP_URL} target="_blank" rel="noopener" className={linkClass}>
                {WHATSAPP_DISPLAY}
              </a>{' '}
              o al correo{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>
                {SUPPORT_EMAIL}
              </a>
              . El responsable del tratamiento es ServiBox.
            </p>
          </section>

          <section aria-labelledby="terminos-seguridad">
            <h2 id="terminos-seguridad" className="text-section">
              Seguridad y cambios
            </h2>
            <p className="mt-2">
              Tomamos medidas razonables para proteger tu información. Si cambiamos estos términos, lo avisamos en
              esta página con una nueva fecha de actualización.
            </p>
          </section>
        </div>

        <p className="mt-8 border-t border-border pt-6 text-small">
          <Link to="/" className={linkClass}>
            Volver a la página principal
          </Link>
        </p>
      </article>
    </main>
  )
}
