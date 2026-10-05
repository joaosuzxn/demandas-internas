import { describe, it, expect } from 'vitest'
import { formatDate, isDate, isFilterDay } from '../dates'

describe('utils/dates', () => {
  it('formatDate mostra a data curta em pt-BR, ou um traço sem data', () => {
    expect(formatDate('2026-10-03T12:00:00+00:00')).toBe('03/10/2026')
    expect(formatDate(null)).toBe('—')
  })

  it('isDate aceita só AAAA-MM-DD que existe no calendário', () => {
    expect(isDate('2026-02-28')).toBe(true)
    expect(isDate('2026-02-31')).toBe(false)
    expect(isDate('20260-10-01')).toBe(false)
  })

  it('isFilterDay também exige o piso de 2000', () => {
    expect(isFilterDay('2000-01-01')).toBe(true)
    expect(isFilterDay('1999-12-31')).toBe(false)
  })
})
