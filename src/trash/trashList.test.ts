import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TRASH_FILTERS,
  annulledInvoices,
  filterTrash,
  parseTrashFilters,
  trashFiltersToParams,
  type TrashInvoice,
} from './trashList'

type Row = TrashInvoice & { party: string }

const row = (id: number, fields: Partial<Row>): Row => ({
  id,
  invoiceNumber: `FV-${String(id).padStart(4, '0')}`,
  invoiceDate: '2026-10-01',
  paymentType: 'CONTADO',
  status: 'ANULADA',
  total: 1000,
  party: `Tercero ${id}`,
  ...fields,
})

const rows = [
  row(1, { invoiceDate: '2026-10-05', party: 'José Pérez' }),
  row(2, { invoiceDate: '2026-10-10', paymentType: 'CREDITO', party: 'Transportes Boyacá' }),
  row(3, { invoiceDate: '2026-09-20', paymentType: 'CREDITO' }),
  row(4, { invoiceDate: '2026-10-10', status: 'PAGADA' }),
  row(5, { invoiceDate: '2025-12-31', status: 'PENDIENTE' }),
  row(6, { invoiceDate: '2025-12-31' }),
  row(9, { invoiceDate: '2026-10-10' }),
]

const ids = (list: Row[]) => list.map((item) => item.id)
const today = '2026-10-22'
const party = (item: Row) => item.party

describe('papelera', () => {
  it('solo muestra las anuladas, por fecha descendente y luego id descendente', () => {
    expect(ids(annulledInvoices(rows))).toEqual([9, 2, 1, 3, 6])
  })

  it('por defecto el periodo es Todas', () => {
    expect(parseTrashFilters(new URLSearchParams())).toEqual(DEFAULT_TRASH_FILTERS)
    expect(ids(filterTrash(rows, DEFAULT_TRASH_FILTERS, today, party))).toEqual([9, 2, 1, 3, 6])
  })

  it('filtra por periodo de la fecha de la factura', () => {
    const at = (periodo: typeof DEFAULT_TRASH_FILTERS.periodo) => ids(filterTrash(rows, { ...DEFAULT_TRASH_FILTERS, periodo }, today, party))
    expect(at('este-mes')).toEqual([9, 2, 1])
    expect(at('mes-anterior')).toEqual([3])
    expect(at('este-ano')).toEqual([9, 2, 1, 3])
  })

  it('filtra por forma de pago', () => {
    expect(ids(filterTrash(rows, { ...DEFAULT_TRASH_FILTERS, pago: 'CREDITO' }, today, party))).toEqual([2, 3])
  })

  it('busca por numero o tercero sin mayusculas ni tildes', () => {
    const search = (q: string) => ids(filterTrash(rows, { ...DEFAULT_TRASH_FILTERS, q }, today, party))
    expect(search('fv-0009')).toEqual([9])
    expect(search('JOSE PEREZ')).toEqual([1])
    expect(search('boyaca')).toEqual([2])
    expect(search('nadie')).toEqual([])
  })

  it('la URL guarda solo lo distinto de lo de por defecto, ida y vuelta', () => {
    const filters = { q: 'boyacá', pago: 'CREDITO' as const, periodo: 'este-mes' as const, pagina: 2 }
    const params = trashFiltersToParams(filters)
    expect(params.toString()).toBe('q=boyac%C3%A1&pago=CREDITO&periodo=este-mes&pagina=2')
    expect(parseTrashFilters(params)).toEqual(filters)
    expect(trashFiltersToParams(DEFAULT_TRASH_FILTERS).toString()).toBe('')
  })

  it('un valor desconocido vale lo de por defecto', () => {
    expect(parseTrashFilters(new URLSearchParams('pago=TARJETA&periodo=siempre&pagina=-3'))).toEqual(DEFAULT_TRASH_FILTERS)
  })
})
