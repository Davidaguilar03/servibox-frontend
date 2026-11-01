import { describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { MESSAGES } from '../api/errorMessages'
import { reportError } from '../api/reportError'
import { Toaster } from '../components/Toaster'
import { renderRoute } from '../test/utils'

// Telefono opcional de contact.ts: este archivo simula que ya existe (numero de prueba, no
// real). Sin telefono, LandingPage.test y reportError.test cubren que no se muestra nada.
vi.mock('./contact', () => ({
  SUPPORT_EMAIL: 'hola@servibox.co',
  WHATSAPP: { display: '+57 310 555 0101', url: 'https://wa.me/573105550101' },
}))

describe('contactos con telefono definido', () => {
  it('terminos muestra WhatsApp y correo', async () => {
    renderRoute('/terminos')

    await screen.findByRole('heading', { level: 1 })
    expect(screen.getByRole('link', { name: '+57 310 555 0101' })).toHaveAttribute('href', 'https://wa.me/573105550101')
    expect(screen.getByRole('link', { name: 'hola@servibox.co' })).toHaveAttribute('href', 'mailto:hola@servibox.co')
    expect(screen.getByText(/escríbenos por WhatsApp al/)).toBeInTheDocument()
  })

  it('el mensaje de red invita al WhatsApp con enlace', () => {
    expect(MESSAGES.network).toContain('escríbenos por WhatsApp al +57 310 555 0101.')
    render(<Toaster />)
    act(() => {
      reportError(new TypeError('Failed to fetch'))
    })
    expect(screen.getByRole('link', { name: '+57 310 555 0101' })).toHaveAttribute('href', 'https://wa.me/573105550101')
  })
})
