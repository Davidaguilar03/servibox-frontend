import { describe, expect, it } from 'vitest'
import {
  RESERVED_DOCUMENT_MESSAGE,
  buildCreateRequest,
  buildUpdateRequest,
  emptyCounterpartyForm,
  validateCounterpartyForm,
  type CounterpartyFormValues,
} from './counterpartyForm'

const valid: CounterpartyFormValues = {
  name: 'Taller El Cruce',
  documentType: 'NIT',
  documentNumber: '800555',
  email: '',
  phone: '',
}

const errorsFor = (change: Partial<CounterpartyFormValues>) => validateCounterpartyForm({ ...valid, ...change })

describe('validateCounterpartyForm', () => {
  it('acepta un tercero con los obligatorios', () => {
    expect(validateCounterpartyForm(valid)).toEqual({})
  })

  it('exige nombre y numero, y nada mas en un formulario vacio', () => {
    expect(validateCounterpartyForm(emptyCounterpartyForm())).toEqual({
      name: 'Escribe el nombre o la razón social.',
      documentNumber: 'Escribe el número de documento.',
    })
    expect(errorsFor({ name: '   ' }).name).toBe('Escribe el nombre o la razón social.')
  })

  it('aplica las longitudes de la entidad', () => {
    expect(errorsFor({ name: 'a'.repeat(150) }).name).toBeUndefined()
    expect(errorsFor({ name: 'a'.repeat(151) }).name).toBe('Usa hasta 150 caracteres.')
    expect(errorsFor({ documentNumber: '1'.repeat(26) }).documentNumber).toBe('Usa hasta 25 caracteres.')
    expect(errorsFor({ email: `${'a'.repeat(140)}@correo.com` }).email).toBe('Usa hasta 150 caracteres.')
    expect(errorsFor({ phone: '3'.repeat(26) }).phone).toBe('Usa hasta 25 caracteres.')
  })

  it('valida el formato del correo', () => {
    expect(errorsFor({ email: 'pagos@elcruce.co' }).email).toBeUndefined()
    expect(errorsFor({ email: 'pagos@elcruce' }).email).toBe('Escribe un correo válido, como nombre@correo.com.')
    expect(errorsFor({ email: 'pagos elcruce.co' }).email).toBe('Escribe un correo válido, como nombre@correo.com.')
  })

  it('acepta en el celular solo digitos, espacios, +, - y parentesis', () => {
    expect(errorsFor({ phone: '+57 (310) 555-1234' }).phone).toBeUndefined()
    expect(errorsFor({ phone: '310 555 12a4' }).phone).toBe('Usa solo números, espacios, +, - y paréntesis.')
  })

  it('bloquea el documento del Consumidor final, con o sin espacios', () => {
    expect(errorsFor({ documentNumber: ' 222222222222 ' }).documentNumber).toBe(RESERVED_DOCUMENT_MESSAGE)
  })
})

describe('cuerpos de la peticion', () => {
  const typed = { ...valid, name: ' Taller El Cruce ', documentNumber: ' 800555 ' }

  it('el POST lleva el rol, recorta y omite correo y celular vacios', () => {
    expect(buildCreateRequest(typed, 'PROVEEDOR')).toEqual({
      role: 'PROVEEDOR',
      name: 'Taller El Cruce',
      documentType: 'NIT',
      documentNumber: '800555',
    })
    expect(buildCreateRequest({ ...typed, email: ' a@b.co ', phone: ' 310 ' }, 'CLIENTE')).toMatchObject({ email: 'a@b.co', phone: '310' })
  })

  it('el PUT lleva todos los campos editables, sin rol, y null en los vacios', () => {
    expect(buildUpdateRequest(typed)).toEqual({
      name: 'Taller El Cruce',
      documentType: 'NIT',
      documentNumber: '800555',
      email: null,
      phone: null,
    })
  })
})
