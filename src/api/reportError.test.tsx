import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { saveToken } from '../auth/session'
import { WHATSAPP_DISPLAY, WHATSAPP_URL } from '../config/contact'
import { Toaster } from '../components/Toaster'
import { ApiError } from '../lib/api'
import { CONTACT_TOO_LONG_MESSAGE, NIT_FORMAT_MESSAGE, nitError, normalizeNit, phoneError } from '../lib/validation/contact'
import { jsonResponse, renderRoute, validToken } from '../test/utils'
import { MESSAGES } from './errorMessages'
import { isInlineError, reportError, useReportedError } from './reportError'

describe('reportError', () => {
  it('400 y 409 van en linea; red, 5xx, 403 y 404 en un toast de error persistente', () => {
    render(<Toaster />)
    expect(reportError(new ApiError('Ya existe una cuenta con el nombre Caja', 409))).toBe('Ya existe una cuenta con el nombre Caja.')
    expect(reportError(new ApiError('El monto del abono debe ser mayor a cero', 400))).toBe('El valor del abono debe ser mayor que cero.')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    act(() => {
      expect(reportError(new TypeError('Failed to fetch'))).toBeNull()
    })
    const toast = screen.getByRole('alert')
    expect(toast).toHaveTextContent(MESSAGES.network)
    expect(screen.getByRole('button', { name: 'Cerrar aviso' })).toBeInTheDocument()
    // El WhatsApp del mensaje de red es un enlace a src/config/contact.ts.
    expect(screen.getByRole('link', { name: WHATSAPP_DISPLAY })).toHaveAttribute('href', WHATSAPP_URL)

    act(() => {
      reportError(new ApiError('Factura no encontrada: 9', 404))
      reportError(new ApiError('Solo un administrador puede editar los datos de la serviteca', 403))
    })
    expect(screen.getAllByRole('alert').map((item) => item.textContent)).toEqual([
      MESSAGES.network,
      'No encontramos esa factura. Puede que ya no exista.',
      'Solo un administrador puede editar los datos de la serviteca.',
    ])
  })

  it('el 401 no se muestra aqui (lo resuelve la sesion) y sin Toaster todo puede ir en linea', () => {
    expect(reportError(new ApiError('No autenticado', 401))).toBeNull()
    expect(reportError(new ApiError('Error interno del servidor', 500), { inlineOnly: true })).toBe(MESSAGES.network)
    expect(isInlineError(new ApiError('x', 409))).toBe(true)
    expect(isInlineError(new ApiError('x', 404))).toBe(false)
  })

  it('el hook muestra el toast una sola vez por error y nunca pierde el mensaje', () => {
    const error = new ApiError('Error interno del servidor', 500)
    function Screen({ value }: { value: unknown }) {
      const inline = useReportedError(value)
      return <p data-testid="inline">{inline ?? 'sin texto en linea'}</p>
    }
    render(<Toaster />)
    const { rerender } = render(<Screen value={error} />)
    rerender(<Screen value={error} />)
    expect(screen.getAllByRole('alert')).toHaveLength(1)
    expect(screen.getByTestId('inline')).toHaveTextContent('sin texto en linea')

    rerender(<Screen value={new ApiError('La factura FV-0001 ya esta anulada', 400)} />)
    expect(screen.getByTestId('inline')).toHaveTextContent('La factura FV-0001 ya está anulada.')
  })

  it('cada pantalla que muestra errores de sus acciones pasa por la regla unica', () => {
    for (const file of [
      'accounts/AccountModals.tsx',
      'manualMovements/ManualMovementModals.tsx',
      'pages/SaleDetailPage.tsx',
      'pages/PurchaseDetailPage.tsx',
      'pages/ProductFormPage.tsx',
      'pages/CategoriesPage.tsx',
      'trash/TrashPage.tsx',
      'settings/TenantProfileTab.tsx',
    ]) {
      expect(readFileSync(`src/${file}`, 'utf-8'), file).toContain('useReportedError(')
    }
  })
})

describe('sesion vencida', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('un 401 cierra la sesion y el login avisa que vencio', async () => {
    saveToken(validToken())
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse({ error: 'No autenticado', status: 401 }, 401))))
    const router = renderRoute('/inicio')
    expect(await screen.findByText('Tu sesión venció. Inicia sesión de nuevo.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('sin token pero con la identidad guardada tambien avisa', async () => {
    sessionStorage.setItem('servibox.identity', JSON.stringify({ username: 'admin', role: 'ADMIN', tenantName: 'Demo', tenantSlug: 'demo' }))
    renderRoute('/ventas')
    expect(await screen.findByText('Tu sesión venció. Inicia sesión de nuevo.')).toBeInTheDocument()
  })

  it('al entrar sin sesion previa no avisa', async () => {
    renderRoute('/ventas')
    await screen.findByRole('heading', { name: 'Inicia sesión' })
    expect(screen.queryByText('Tu sesión venció. Inicia sesión de nuevo.')).not.toBeInTheDocument()
  })
})

describe('validacion de contacto (registro y Configuracion)', () => {
  it('NIT con puntos y espacios se normaliza; formato y largo', () => {
    expect(normalizeNit('900.123.456-7')).toBe('900123456-7')
    expect(nitError('900.123.456-7')).toBeUndefined()
    expect(nitError('900123456-78')).toBe(NIT_FORMAT_MESSAGE)
    expect(nitError('')).toBe('Ingresa el NIT de tu serviteca.')
    expect(nitError('1'.repeat(26))).toBe(CONTACT_TOO_LONG_MESSAGE)
  })

  it('telefono con digitos, espacios, +, - y parentesis', () => {
    expect(phoneError('+57 (300) 123-4567')).toBeUndefined()
    expect(phoneError('300-abc')).toBe('El teléfono solo admite dígitos, espacios, +, - y paréntesis.')
    expect(phoneError(' ')).toBe('Ingresa el teléfono de contacto.')
  })

  it('el registro y Configuracion usan el mismo modulo', () => {
    for (const file of ['auth/registerForm.ts', 'settings/settingsForms.ts']) {
      expect(readFileSync(`src/${file}`, 'utf-8'), file).toContain("from '../lib/validation/contact'")
    }
  })
})

describe('barra lateral compacta', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  function stubWidth(width: number) {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: Number(/\d+/.exec(query)?.[0]) <= width,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
  }

  async function open(width: number) {
    stubWidth(width)
    saveToken(validToken())
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse([]))))
    renderRoute('/ventas')
    return screen.findByRole('button', { name: /(Expandir|Contraer) menú/ })
  }

  it('a 1100 px arranca contraida, solo iconos con nombre accesible y title', async () => {
    expect(await open(1100)).toHaveAccessibleName('Expandir menú')
    const link = screen.getByRole('link', { name: 'Inventario' })
    expect(link).toHaveAttribute('title', 'Inventario')
  })

  it('a 1300 px arranca expandida', async () => {
    expect(await open(1300)).toHaveAccessibleName('Contraer menú')
    expect(screen.getByRole('link', { name: 'Inventario' })).not.toHaveAttribute('title')
  })

  it('recuerda la eleccion del usuario', async () => {
    const toggle = await open(1100)
    fireEvent.click(toggle)
    expect(toggle).toHaveAccessibleName('Contraer menú')
    expect(localStorage.getItem('servibox.sidebar')).toBe('expanded')
  })

  it('con la eleccion guardada manda la eleccion, no el ancho', async () => {
    localStorage.setItem('servibox.sidebar', 'collapsed')
    expect(await open(1300)).toHaveAccessibleName('Expandir menú')
  })
})
