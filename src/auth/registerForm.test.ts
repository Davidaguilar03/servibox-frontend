import { describe, expect, it } from 'vitest'
import {
  EMPTY_REGISTER_VALUES,
  normalizeSlugInput,
  suggestSlug,
  toRegisterRequest,
  validateRegister,
  type RegisterValues,
} from './registerForm'

const valid: RegisterValues = {
  businessName: 'Serviteca El Roble',
  nit: '900123456-7',
  phone: '+57 (300) 123-4567',
  slug: 'el-roble',
  adminFullName: 'Laura Gómez',
  adminEmail: 'laura@elroble.co',
  adminUsername: 'laura.gomez',
  password: 'secreta123',
  acceptTerms: true,
}

const errorOf = (changes: Partial<RegisterValues>) => validateRegister({ ...valid, ...changes })

describe('sugerencia del identificador', () => {
  it('quita tildes y enies y pasa a minusculas', () => {
    expect(suggestSlug('Llantería Peña Ñandú')).toBe('llanteria-pena-nandu')
  })

  it('cambia espacios y simbolos por un solo guion', () => {
    expect(suggestSlug('Autollantas A&C  S.A.S.')).toBe('autollantas-a-c-s-a-s')
    expect(suggestSlug(`taller${'-'.repeat(2)}el${'-'.repeat(3)}roble`)).toBe('taller-el-roble')
  })

  it('sin guion al inicio ni al final', () => {
    expect(suggestSlug('  ¡Serviteca El Roble!  ')).toBe('serviteca-el-roble')
    expect(suggestSlug('-roble-')).toBe('roble')
  })

  it('corta en 30 caracteres sin dejar un guion al final', () => {
    expect(suggestSlug('a'.repeat(40))).toBe('a'.repeat(30))
    expect(suggestSlug(`${'a'.repeat(29)} b`)).toBe('a'.repeat(29))
  })

  it('un nombre vacio o sin letras da vacio', () => {
    expect(suggestSlug('')).toBe('')
    expect(suggestSlug(' &%$ ')).toBe('')
  })
})

describe('normalizacion del identificador al escribir', () => {
  it('pasa a minusculas y descarta lo no permitido', () => {
    expect(normalizeSlugInput('EL-ROBLE')).toBe('el-roble')
    expect(normalizeSlugInput('El Roble_2!á')).toBe('elroble2')
  })
})

describe('validacion del registro', () => {
  it('datos validos no tienen errores', () => {
    expect(validateRegister(valid)).toEqual({})
  })

  it('el formulario vacio marca todos los campos', () => {
    expect(Object.keys(validateRegister(EMPTY_REGISTER_VALUES)).sort()).toEqual(
      ['acceptTerms', 'adminEmail', 'adminFullName', 'adminUsername', 'businessName', 'nit', 'password', 'phone', 'slug'].sort(),
    )
  })

  it('nombre comercial obligatorio y de hasta 150', () => {
    expect(errorOf({ businessName: '   ' }).businessName).toBe('Escribe el nombre comercial.')
    expect(errorOf({ businessName: 'a'.repeat(150) }).businessName).toBeUndefined()
    expect(errorOf({ businessName: 'a'.repeat(151) }).businessName).toBe('Usa máximo 150 caracteres.')
  })

  it('NIT con y sin digito de verificacion, hasta 25', () => {
    expect(errorOf({ nit: '900123456' }).nit).toBeUndefined()
    expect(errorOf({ nit: '900123456-7' }).nit).toBeUndefined()
    expect(errorOf({ nit: '901.234.567-8' }).nit).toMatch(/^Usa solo dígitos/)
    expect(errorOf({ nit: '900123456-78' }).nit).toMatch(/^Usa solo dígitos/)
    expect(errorOf({ nit: '' }).nit).toBe('Escribe el NIT.')
    expect(errorOf({ nit: '1'.repeat(25) }).nit).toBeUndefined()
    expect(errorOf({ nit: '1'.repeat(26) }).nit).toBe('Usa máximo 25 caracteres.')
  })

  it('telefono con digitos, espacios, +, - y parentesis, hasta 25', () => {
    expect(errorOf({ phone: '300 123 4567' }).phone).toBeUndefined()
    expect(errorOf({ phone: '300-123-abc' }).phone).toBe('Usa solo dígitos, espacios, +, - y paréntesis.')
    expect(errorOf({ phone: '' }).phone).toBe('Escribe el teléfono.')
    expect(errorOf({ phone: '1'.repeat(26) }).phone).toBe('Usa máximo 25 caracteres.')
  })

  it('identificador de 3 a 30, sin guion a los lados y no reservado', () => {
    expect(errorOf({ slug: '' }).slug).toBe('Escribe el identificador.')
    expect(errorOf({ slug: 'ab' }).slug).toBe('Usa de 3 a 30 caracteres: minúsculas, números y guiones.')
    expect(errorOf({ slug: 'abc' }).slug).toBeUndefined()
    expect(errorOf({ slug: 'a'.repeat(30) }).slug).toBeUndefined()
    expect(errorOf({ slug: 'a'.repeat(31) }).slug).toBe('Usa de 3 a 30 caracteres: minúsculas, números y guiones.')
    expect(errorOf({ slug: '-roble' }).slug).toBe('Quita el guion del inicio o del final.')
    expect(errorOf({ slug: 'roble-' }).slug).toBe('Quita el guion del inicio o del final.')
    expect(errorOf({ slug: 'demo' }).slug).toBe('Este identificador está reservado. Elige otro.')
  })

  it('nombre completo obligatorio y de hasta 150', () => {
    expect(errorOf({ adminFullName: '' }).adminFullName).toBe('Escribe tu nombre completo.')
    expect(errorOf({ adminFullName: 'a'.repeat(151) }).adminFullName).toBe('Usa máximo 150 caracteres.')
  })

  it('correo con formato valido y de hasta 150', () => {
    expect(errorOf({ adminEmail: 'laura@' }).adminEmail).toBe('Escribe un correo válido, por ejemplo nombre@correo.com.')
    expect(errorOf({ adminEmail: '' }).adminEmail).toBe('Escribe tu correo.')
    expect(errorOf({ adminEmail: `${'a'.repeat(140)}@correo.com` }).adminEmail).toBe('Usa máximo 150 caracteres.')
  })

  it('usuario de 3 a 50 con letras, numeros, punto, guion y guion bajo', () => {
    const message = 'Usa de 3 a 50 caracteres: letras, números, punto, guion y guion bajo.'
    expect(errorOf({ adminUsername: 'ab' }).adminUsername).toBe(message)
    expect(errorOf({ adminUsername: 'a_b-c.d' }).adminUsername).toBeUndefined()
    expect(errorOf({ adminUsername: 'a'.repeat(50) }).adminUsername).toBeUndefined()
    expect(errorOf({ adminUsername: 'a'.repeat(51) }).adminUsername).toBe(message)
    expect(errorOf({ adminUsername: 'laura gomez' }).adminUsername).toBe(message)
    expect(errorOf({ adminUsername: '' }).adminUsername).toBe('Escribe un usuario.')
  })

  it('contrasena de 8 a 72 caracteres y 72 bytes', () => {
    expect(errorOf({ password: '' }).password).toBe('Escribe una contraseña.')
    expect(errorOf({ password: 'a'.repeat(7) }).password).toBe('Usa al menos 8 caracteres.')
    expect(errorOf({ password: 'a'.repeat(8) }).password).toBeUndefined()
    expect(errorOf({ password: 'a'.repeat(72) }).password).toBeUndefined()
    expect(errorOf({ password: 'a'.repeat(73) }).password).toBe('Usa máximo 72 caracteres.')
    expect(errorOf({ password: 'ñ'.repeat(40) }).password).toBe('Usa máximo 72 caracteres.')
  })

  it('aceptar los terminos es obligatorio', () => {
    expect(errorOf({ acceptTerms: false }).acceptTerms).toBe('Acepta los términos y condiciones para continuar.')
  })
})

describe('cuerpo del registro', () => {
  it('recorta los textos, deja el slug en minusculas y la contrasena tal cual', () => {
    expect(
      toRegisterRequest({
        ...valid,
        businessName: '  Serviteca El Roble ',
        nit: ' 900123456-7 ',
        adminUsername: ' laura.gomez ',
        password: ' con espacios ',
      }),
    ).toEqual({
      businessName: 'Serviteca El Roble',
      nit: '900123456-7',
      phone: '+57 (300) 123-4567',
      slug: 'el-roble',
      adminFullName: 'Laura Gómez',
      adminEmail: 'laura@elroble.co',
      adminUsername: 'laura.gomez',
      password: ' con espacios ',
      acceptTerms: true,
    })
  })
})
