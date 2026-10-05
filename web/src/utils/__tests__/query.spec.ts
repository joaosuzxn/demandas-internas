import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { readRememberedQuery, rememberQuery, single } from '../query'

describe('utils/query', () => {
  beforeEach(() => sessionStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('single aceita só texto: valor repetido na URL (array) ou ausente não vale', () => {
    expect(single('hr')).toBe('hr')
    expect(single(['hr', 'it'])).toBeUndefined()
    expect(single(undefined)).toBeUndefined()
  })

  it('lembra e relê a query da aba', () => {
    rememberQuery('chave', { busca: 'ana' })

    expect(readRememberedQuery('chave')).toEqual({ busca: 'ana' })
  })

  it('sem nada guardado, ou com lixo, relê vazio', () => {
    expect(readRememberedQuery('nada')).toEqual({})

    sessionStorage.setItem('lixo', '{quebrado')
    expect(readRememberedQuery('lixo')).toEqual({})

    sessionStorage.setItem('texto', '"só texto"')
    expect(readRememberedQuery('texto')).toEqual({})
  })

  it('sem armazenamento (modo privado, bloqueado), não quebra', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })

    expect(() => rememberQuery('chave', { busca: 'ana' })).not.toThrow()
    expect(readRememberedQuery('chave')).toEqual({})
  })
})
