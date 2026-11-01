import { describe, expect, it } from 'vitest'
import {
  EMPTY_REGISTER_VALUES,
  normalizeSlugInput,
  passwordError,
  suggestSlug,
  toRegisterRequest,
  usernameError,
  validateRegister,
  type RegisterValues,
} from './registerForm'
import { NIT_FORMAT_MESSAGE, normalizeNit } from '../lib/validation/contact'

const valid: RegisterValues = {
  businessName: 'Serviteca El Roble',
  nit: '900123456-7',
  phone: '+57 (300) 123-4567',
  slug: 'el-roble',
  adminFullName: 'Laura Gómez',
  adminEmail: 'laura@elroble.co',
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
      ['acceptTerms', 'adminEmail', 'adminFullName', 'businessName', 'nit', 'phone', 'slug'].sort(),
    )
  })

  it('nombre comercial obligatorio y de hasta 150', () => {
    expect(errorOf({ businessName: '   ' }).businessName).toBe('Escribe el nombre comercial.')
    expect(errorOf({ businessName: 'a'.repeat(150) }).businessName).toBeUndefined()
    expect(errorOf({ businessName: 'a'.repeat(151) }).businessName).toBe('Usa máximo 150 caracteres.')
  })

  it('NIT con y sin digito de verificacion, con puntos, hasta 25 (modulo comun con Configuracion)', () => {
    expect(errorOf({ nit: '900123456' }).nit).toBeUndefined()
    expect(errorOf({ nit: '900123456-7' }).nit).toBeUndefined()
    expect(errorOf({ nit: '901.234.567-8' }).nit).toBeUndefined()
    expect(errorOf({ nit: '900123456-78' }).nit).toBe(NIT_FORMAT_MESSAGE)
    expect(errorOf({ nit: '' }).nit).toBe('Ingresa el NIT de tu serviteca.')
    expect(errorOf({ nit: '1'.repeat(25) }).nit).toBeUndefined()
    expect(errorOf({ nit: '1'.repeat(26) }).nit).toBe('El NIT y el teléfono no pueden superar 25 caracteres.')
  })

  it('telefono con digitos, espacios, +, - y parentesis, hasta 25', () => {
    expect(errorOf({ phone: '300 123 4567' }).phone).toBeUndefined()
    expect(errorOf({ phone: '300-123-abc' }).phone).toBe('El teléfono solo admite dígitos, espacios, +, - y paréntesis.')
    expect(errorOf({ phone: '' }).phone).toBe('Ingresa el teléfono de contacto.')
    expect(errorOf({ phone: '1'.repeat(26) }).phone).toBe('El NIT y el teléfono no pueden superar 25 caracteres.')
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
    // Los mismos de SLUGS_RESERVADOS del backend, que suma las rutas de plataforma y activacion.
    expect(errorOf({ slug: 'plataforma' }).slug).toBe('Este identificador está reservado. Elige otro.')
    expect(errorOf({ slug: 'activar' }).slug).toBe('Este identificador está reservado. Elige otro.')
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
    expect(usernameError('ab')).toBe(message)
    expect(usernameError('a_b-c.d')).toBeUndefined()
    expect(usernameError('a'.repeat(50))).toBeUndefined()
    expect(usernameError('a'.repeat(51))).toBe(message)
    expect(usernameError('laura gomez')).toBe(message)
    expect(usernameError('')).toBe('Escribe un usuario.')
  })

  it('contrasena de 8 a 72 caracteres y 72 bytes', () => {
    expect(passwordError('')).toBe('Escribe una contraseña.')
    expect(passwordError('a'.repeat(7))).toBe('Usa al menos 8 caracteres.')
    expect(passwordError('a'.repeat(8))).toBeUndefined()
    expect(passwordError('a'.repeat(72))).toBeUndefined()
    expect(passwordError('a'.repeat(73))).toBe('Usa máximo 72 caracteres.')
    expect(passwordError('ñ'.repeat(40))).toBe('Usa máximo 72 caracteres.')
  })

  it('aceptar los terminos es obligatorio', () => {
    expect(errorOf({ acceptTerms: false }).acceptTerms).toBe('Acepta los términos de uso y el tratamiento de datos para continuar.')
  })
})

describe('cuerpo del registro', () => {
  it('recorta los textos, normaliza el NIT, deja el slug en minusculas y no lleva usuario ni contrasena', () => {
    expect(
      toRegisterRequest({
        ...valid,
        businessName: '  Serviteca El Roble ',
        nit: ' 900.123.456-7 ',
        slug: ' el-roble ',
      }),
    ).toEqual({
      businessName: 'Serviteca El Roble',
      nit: '900123456-7',
      phone: '+57 (300) 123-4567',
      slug: 'el-roble',
      adminFullName: 'Laura Gómez',
      adminEmail: 'laura@elroble.co',
      acceptTerms: true,
    })
  })
})

describe('normalizacion del NIT', () => {
  it('quita puntos y espacios y conserva el guion', () => {
    expect(normalizeNit('900.123.456-7')).toBe('900123456-7')
    expect(normalizeNit(' 900 123 456 ')).toBe('900123456')
    expect(normalizeNit('')).toBe('')
  })
})
