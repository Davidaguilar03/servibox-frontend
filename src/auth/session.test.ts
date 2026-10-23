import { describe, expect, it } from 'vitest'
import { clearSession, displayName, getToken, initials, readSession, roleLabel, saveToken, updateTenantName } from './session'
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

  it('guarda y lee el nombre completo cuando viene', () => {
    const token = validToken()
    saveToken(token, { ...identity, fullName: 'Laura Gómez' })

    expect(readSession(token, sessionStorage.getItem('servibox.identity'))).toMatchObject({ fullName: 'Laura Gómez' })
  })

  it('una identidad guardada sin nombre completo sigue funcionando', () => {
    const token = validToken()

    const session = readSession(token, JSON.stringify(identity))

    expect(session).toMatchObject(identity)
    expect(session?.fullName).toBeUndefined()
    expect(readSession(token, JSON.stringify({ ...identity, fullName: null }))?.fullName).toBeUndefined()
  })
})

describe('nombre e iniciales del usuario', () => {
  it('dos palabras: primera letra de cada una', () => {
    expect(initials({ username: 'laura', fullName: 'Laura Gómez' })).toBe('LG')
  })

  it('mas de dos: primer nombre y ultimo apellido', () => {
    expect(initials({ username: 'laura', fullName: 'laura maría gómez pérez' })).toBe('LP')
  })

  it('una sola palabra: sus dos primeras letras', () => {
    expect(initials({ username: 'x', fullName: 'Ángela' })).toBe('ÁN')
  })

  it('sin nombre completo usa el username', () => {
    expect(initials({ username: 'laura.gomez' })).toBe('LG')
    expect(initials({ username: 'admin', fullName: '  ' })).toBe('AD')
    expect(displayName({ username: 'admin' })).toBe('admin')
    expect(displayName({ username: 'laura', fullName: 'Laura Gómez' })).toBe('Laura Gómez')
  })
})

describe('nombre de la serviteca', () => {
  it('cambia el nombre en la identidad sin tocar el token ni el resto', () => {
    const token = validToken()
    saveToken(token, { ...identity, fullName: 'Laura Gómez' })

    updateTenantName('Autollantas Norte')

    expect(getToken()).toBe(token)
    expect(JSON.parse(sessionStorage.getItem('servibox.identity') ?? '')).toEqual({
      ...identity,
      fullName: 'Laura Gómez',
      tenantName: 'Autollantas Norte',
    })
  })

  it('sin identidad guardada la arma desde el JWT', () => {
    localStorage.setItem('servibox.tenantSlug', 'demo')
    saveToken(validToken())

    updateTenantName('Demo Norte')

    expect(JSON.parse(sessionStorage.getItem('servibox.identity') ?? '')).toEqual({
      username: 'admin',
      role: 'ADMIN',
      tenantName: 'Demo Norte',
      tenantSlug: 'demo',
    })
  })
})
