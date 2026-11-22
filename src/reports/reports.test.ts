import { describe, expect, it } from 'vitest'
import { isFullCalendarMonth, periodTitle, previousPeriod, rangeDays, validateRange, variation } from './reports'

describe('validateRange', () => {
  it.each(['2026-02-30', '2026-13-01', '2026-00-01', 'ayer', '2026-1-01'])('rechaza la fecha inexistente o mal formada %s en cualquiera de los extremos', (date) => {
    expect(validateRange(date, '2026-12-31')).toEqual({ valid: false, errors: { desde: 'Escribe una fecha válida.' } })
    expect(validateRange('2026-01-01', date)).toEqual({ valid: false, errors: { hasta: 'Escribe una fecha válida.' } })
  })

  it('pide las dos fechas', () => {
    expect(validateRange('', '')).toEqual({
      errors: { desde: 'Elige la fecha de inicio.', hasta: 'Elige la fecha de fin.' },
      valid: false,
    })
    expect(validateRange('2026-10-01', '').valid).toBe(false)
  })

  it('rechaza un rango invertido', () => {
    expect(validateRange('2026-10-19', '2026-10-01')).toEqual({
      errors: { hasta: 'Hasta no puede ser anterior a Desde.' },
      valid: false,
    })
  })

  it('acepta exactamente 366 dias y rechaza 367', () => {
    expect(rangeDays('2026-01-01', '2027-01-01')).toBe(366)
    expect(validateRange('2026-01-01', '2027-01-01')).toEqual({ errors: {}, valid: true })
    expect(validateRange('2026-01-01', '2027-01-02')).toEqual({
      errors: { hasta: 'El período no puede pasar de 366 días. Acorta el rango.' },
      valid: false,
    })
  })

  it('un solo dia es valido', () => {
    expect(rangeDays('2026-10-19', '2026-10-19')).toBe(1)
    expect(validateRange('2026-10-19', '2026-10-19').valid).toBe(true)
  })
})

describe('previousPeriod', () => {
  it('es el periodo de igual duracion que termina el dia anterior', () => {
    expect(previousPeriod('2026-10-01', '2026-10-18')).toEqual({ desde: '2026-09-13', hasta: '2026-09-30' })
  })

  it('cruza el fin de mes', () => {
    expect(previousPeriod('2026-03-01', '2026-03-31')).toEqual({ desde: '2026-01-29', hasta: '2026-02-28' })
    expect(previousPeriod('2026-09-01', '2026-09-30')).toEqual({ desde: '2026-08-02', hasta: '2026-08-31' })
  })

  it('cruza el fin de ano', () => {
    expect(previousPeriod('2027-01-01', '2027-01-10')).toEqual({ desde: '2026-12-22', hasta: '2026-12-31' })
  })

  it('un rango de un dia se compara con el dia anterior', () => {
    expect(previousPeriod('2026-10-19', '2026-10-19')).toEqual({ desde: '2026-10-18', hasta: '2026-10-18' })
    expect(previousPeriod('2027-01-01', '2027-01-01')).toEqual({ desde: '2026-12-31', hasta: '2026-12-31' })
  })
})

describe('variation', () => {
  it('sube y baja redondeado al entero', () => {
    expect(variation(112, 100)).toBe(12)
    expect(variation(97, 100)).toBe(-3)
    expect(variation(48_620_000, 43_400_000)).toBe(12)
    expect(variation(100, 100)).toBe(0)
  })

  it('sin anterior no hay porcentaje', () => {
    expect(variation(500, 0)).toBeNull()
  })

  it('con anterior negativo usa su valor absoluto', () => {
    expect(variation(50, -100)).toBe(150)
    expect(variation(-150, -100)).toBe(-50)
  })
})

describe('periodTitle', () => {
  it('detecta un mes calendario completo', () => {
    expect(isFullCalendarMonth('2026-10-01', '2026-10-31')).toBe(true)
    expect(isFullCalendarMonth('2026-02-01', '2026-02-28')).toBe(true)
    expect(isFullCalendarMonth('2028-02-01', '2028-02-28')).toBe(false)
    expect(isFullCalendarMonth('2026-10-01', '2026-10-30')).toBe(false)
    expect(isFullCalendarMonth('2026-10-02', '2026-10-31')).toBe(false)
    expect(isFullCalendarMonth('2026-09-01', '2026-10-31')).toBe(false)
  })

  it('titula el mes con la inicial en mayuscula y si no, el rango', () => {
    expect(periodTitle('2026-10-01', '2026-10-31')).toBe('Octubre de 2026')
    expect(periodTitle('2026-09-01', '2026-09-30')).toBe('Septiembre de 2026')
    expect(periodTitle('2026-10-01', '2026-10-19')).toBe('01/10/2026 a 19/10/2026')
  })
})
