// Contactos reales de ServiBox: unica fuente de la interfaz. Ver docs/ai-context/02-CONVENTIONS.md.
export const SUPPORT_EMAIL = 'hola@servibox.co'

export interface WhatsAppContact {
  /** Como se lee el numero, con el prefijo +57. */
  display: string
  /** Enlace wa.me del mismo numero. */
  url: string
}

/**
 * Telefono de WhatsApp: aun no existe. Mientras sea undefined no se muestra ninguna linea de
 * telefono, enlace tel: ni WhatsApp.
 */
export const WHATSAPP: WhatsAppContact | undefined = undefined
