import { describe, expect, it } from 'vitest'
import { amountTextFromNumber, amountToDecimalText, caretAfterFormat, formatAmountText, normalizePastedAmount } from './amountInput'

describe('conversion entre la API y el campo', () => {
  it.each([
    [1500000, '1.500.000'],
    [397938.28, '397.938,28'],
    [0, '0'],
    [-5000, '-5.000'],
  ])('%s se muestra como %s', (value, text) => {
    expect(amountTextFromNumber(value)).toBe(text)
  })

  it.each([
    ['1.500.000', '1500000'],
    ['1.234,50', '1234.50'],
    ['1.000,', '1000.'],
    ['', ''],
  ])('%s se valida como %s', (text, decimal) => {
    expect(amountToDecimalText(text)).toBe(decimal)
  })
})

describe('formatAmountText', () => {
  it.each([
    ['', ''],
    ['0', '0'],
    ['999', '999'],
    ['1000', '1.000'],
    ['1234567', '1.234.567'],
    ['1.234.567', '1.234.567'],
    ['12.34', '1.234'],
    ['007', '7'],
    ['000', '0'],
    ['12a3$', '123'],
    ['98500,50', '98.500,50'],
    ['1.234,', '1.234,'],
    ['1,2,3', '1,23'],
  ])('%s queda %s', (text, expected) => {
    expect(formatAmountText(text)).toBe(expected)
  })
})

describe('caretAfterFormat', () => {
  it.each([
    // Texto del campo antes de formatear, cursor y posicion esperada.
    ['1234', 4, 5],
    ['1.2934', 3, 2],
    ['1.234', 3, 3],
    ['1.24', 3, 2],
    ['91.234', 1, 1],
    ['01.234', 1, 0],
    ['0', 1, 1],
    ['1.234,5', 7, 7],
    ['', 0, 0],
  ])('en %s con el cursor en %i queda en %i', (raw, caret, expected) => {
    expect(caretAfterFormat(raw, caret, formatAmountText(raw))).toBe(expected)
  })
})

describe('normalizePastedAmount', () => {
  it.each([
    ['1234567', '1234567'],
    ['1.234.567', '1234567'],
    ['1,234,567', '1234567'],
    ['$ 98.500', '98500'],
    ['98,500', '98500'],
    ['98.500,50', '98500,50'],
    ['98,500.50', '98500,50'],
    ['98500.50', '98500,50'],
    ['98.5', '98,5'],
    ['98.', '98'],
    ['abc', ''],
  ])('%s queda %s', (text, expected) => {
    expect(normalizePastedAmount(text)).toBe(expected)
  })
})
