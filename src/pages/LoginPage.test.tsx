import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getToken } from '../auth/session'
import { jsonResponse, renderRoute, validToken } from '../test/utils'

async function fillAndSubmit() {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Serviteca'), 'demo')
  await user.type(screen.getByLabelText('Usuario'), 'admin')
  await user.type(screen.getByLabelText('Contraseña'), 'admin123')
  await user.click(screen.getByRole('button', { name: 'Ingresar' }))
}

describe('formulario de login', () => {
  it('envia los tres campos, guarda la sesion y entra a la pagina pedida', async () => {
    const token = validToken()
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ token, user: { username: 'admin', role: 'ADMIN' }, tenant: { name: 'Serviteca Demo', slug: 'demo' } }))
    vi.stubGlobal('fetch', fetchMock)
    const router = renderRoute('/configuracion')

    await fillAndSubmit()

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/auth/login')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ tenantSlug: 'demo', username: 'admin', password: 'admin123' })
    expect(await screen.findByRole('heading', { name: 'Configuración' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/configuracion')
    expect(getToken()).toBe(token)
    expect(localStorage.getItem('servibox.tenantSlug')).toBe('demo')
    expect(JSON.parse(sessionStorage.getItem('servibox.identity') ?? '')).toEqual({
      username: 'admin',
      role: 'ADMIN',
      tenantName: 'Serviteca Demo',
      tenantSlug: 'demo',
    })
  })

  it('muestra la alerta ante un 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'Credenciales invalidas', status: 401 }, 401)),
    )
    renderRoute('/login')

    await fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent('Revisa tus datos e intenta de nuevo.')
    expect(getToken()).toBeNull()
  })

  it('recuerda la serviteca de la ultima vez', async () => {
    localStorage.setItem('servibox.tenantSlug', 'autollantas')
    renderRoute('/login')

    expect(await screen.findByLabelText('Serviteca')).toHaveValue('autollantas')
  })
})
