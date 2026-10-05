import { describe, it, expect, beforeEach } from 'vitest'
import {
  demandsBoardRoute,
  parseBoardQuery,
  rememberBoardQuery,
  toBoardQuery,
} from '../demandsBoardQuery'

describe('parseBoardQuery', () => {
  it('lê os filtros válidos da query', () => {
    expect(
      parseBoardQuery({
        search: ' monitor ',
        category: 'hr',
        created_from: '2026-10-01',
        created_to: '2026-10-03',
      }),
    ).toEqual({
      search: 'monitor',
      category: 'hr',
      created_from: '2026-10-01',
      created_to: '2026-10-03',
    })
  })

  it('ignora o que não é filtro válido', () => {
    expect(
      parseBoardQuery({
        search: '   ',
        category: 'xyz',
        created_from: 'ontem',
        created_to: '2026-02-31',
        status: 'pending',
      }),
    ).toEqual({})
  })

  it('ignora data antes de 2000, o piso da API', () => {
    expect(parseBoardQuery({ created_from: '0002-10-01', created_to: '1999-12-31' })).toEqual({})
    expect(parseBoardQuery({ created_from: '2000-01-01' })).toEqual({ created_from: '2000-01-01' })
  })

  it('ignora valor repetido (array) e busca maior que o limite da API', () => {
    expect(parseBoardQuery({ category: ['hr', 'it'], search: 'a'.repeat(101) })).toEqual({})
  })

  it('período invertido não vale: as duas pontas saem', () => {
    expect(
      parseBoardQuery({ category: 'it', created_from: '2026-10-03', created_to: '2026-10-01' }),
    ).toEqual({ category: 'it' })
  })
})

describe('toBoardQuery', () => {
  it('leva só o que está preenchido', () => {
    expect(toBoardQuery({ category: 'it' })).toEqual({ category: 'it' })
    expect(toBoardQuery({})).toEqual({})
  })
})

describe('demandsBoardRoute', () => {
  beforeEach(() => sessionStorage.clear())

  it('sem quadro lembrado, é o quadro sem filtros', () => {
    expect(demandsBoardRoute()).toEqual({ name: 'demands', query: {} })
  })

  it('volta com os filtros do último quadro', () => {
    rememberBoardQuery({ category: 'hr', search: 'monitor' })

    expect(demandsBoardRoute()).toEqual({
      name: 'demands',
      query: { category: 'hr', search: 'monitor' },
    })
  })

  it('o que estiver guardado passa pela mesma limpeza da URL', () => {
    sessionStorage.setItem('demands-board-query', '{"category":"xyz","search":"ok"}')
    expect(demandsBoardRoute()).toEqual({ name: 'demands', query: { search: 'ok' } })

    sessionStorage.setItem('demands-board-query', 'não é json')
    expect(demandsBoardRoute()).toEqual({ name: 'demands', query: {} })
  })
})
