import { describe, expect, it } from 'vitest'
import { pageItems, paginate } from './pagination'

const items = Array.from({ length: 231 }, (_, index) => index + 1)

describe('paginate', () => {
  it('corta paginas de 25 con su rango', () => {
    expect(paginate(items, 1)).toMatchObject({ page: 1, totalPages: 10, total: 231, from: 1, to: 25 })
    expect(paginate(items, 1).rows).toHaveLength(25)
    expect(paginate(items, 10)).toMatchObject({ page: 10, from: 226, to: 231 })
    expect(paginate(items, 10).rows).toEqual([226, 227, 228, 229, 230, 231])
  })

  it('lleva una pagina fuera de rango a la primera o la ultima', () => {
    expect(paginate(items, 0).page).toBe(1)
    expect(paginate(items, 99).page).toBe(10)
    expect(paginate(items, Number.NaN).page).toBe(1)
  })

  it('sin filas tiene una pagina y rango en cero', () => {
    expect(paginate([], 3)).toMatchObject({ rows: [], page: 1, totalPages: 1, total: 0, from: 0, to: 0 })
  })
})

describe('pageItems', () => {
  it('muestra todas hasta 7 paginas', () => {
    expect(pageItems(1, 3)).toEqual([1, 2, 3])
    expect(pageItems(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('con mas, la primera, la ultima y las vecinas de la actual', () => {
    expect(pageItems(1, 10)).toEqual([1, 2, 'gap', 10])
    expect(pageItems(5, 10)).toEqual([1, 'gap', 4, 5, 6, 'gap', 10])
    expect(pageItems(10, 10)).toEqual([1, 'gap', 9, 10])
    expect(pageItems(3, 10)).toEqual([1, 2, 3, 4, 'gap', 10])
  })
})
