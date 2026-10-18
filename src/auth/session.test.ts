import { describe, expect, it } from 'vitest'
import { clearSession, getToken, readSession, roleLabel, saveToken } from './session'
import { makeToken, validToken } from '../test/utils'

const identity = { username: 'laura', role: 'ADMIN', tenantName: 'Autollantas A&C', tenantSlug: 'autollantas' }

describe('sesion', () => {
  it('con identidad usa la del login', () => {
    const token = validToken()
    saveToken(token, identity)

    const session = readSession(token, sessionStorage.getItem('servibox.identity'))

    expect(session).toMatchObject(identity)
    expect(session?.expiresAt).toBeGreaterThan(Date.now() / 1000)
  })

  it('sin identidad usa el sub del JWT y el slug recordado', () => {
    localStorage.setItem('servibox.tenantSlug', 'demo')
    const token = makeToken({ sub: 'admin', role: 'CAJERO', exp: Math.floor(Date.now() / 1000) + 60 })
    saveToken(token)

    expect(sessionStorage.getItem('servibox.identity')).toBeNull()
    expect(readSession(token, null)).toMatchObject({
      username: 'admin',
      role: 'CAJERO',
      tenantName: 'demo',
      tenantSlug: 'demo',
    })
  })

  it('una identidad ilegible no rompe la sesion', () => {
    const token = validToken()

    expect(readSession(token, '{no es json')).toMatchObject({ username: 'admin', role: 'ADMIN', tenantSlug: '' })
    expect(readSession(token, JSON.stringify({ username: 'laura' }))).toMatchObject({ username: 'admin' })
  })

  it('un token vencido no es sesion aunque haya identidad', () => {
    const expired = makeToken({ sub: 'admin', role: 'ADMIN', exp: Math.floor(Date.now() / 1000) - 60 })

    expect(readSession(expired, JSON.stringify(identity))).toBeNull()
  })

  it('al cerrar borra el token y la identidad', () => {
    saveToken(validToken(), identity)

    clearSession()

    expect(getToken()).toBeNull()
    expect(sessionStorage.getItem('servibox.identity')).toBeNull()
  })

  it('traduce los roles con tilde', () => {
    expect(roleLabel('ADMIN')).toBe('Administrador')
    expect(roleLabel('MECANICO')).toBe('Mecánico')
    expect(roleLabel('CAJERO')).toBe('Cajero')
  })
})
