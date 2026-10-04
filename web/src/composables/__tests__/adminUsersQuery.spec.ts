import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { adminUsersRoute, rememberAdminUsersQuery } from '../adminUsersQuery'

describe('adminUsersQuery', () => {
  beforeEach(() => sessionStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('sem visita anterior, a rota é a lista sem busca nem página', () => {
    expect(adminUsersRoute()).toEqual({ name: 'admin', query: {} })
  })

  it('devolve a busca e a página da última visita', () => {
    rememberAdminUsersQuery({ busca: ' ana ', pagina: '3' })

    expect(adminUsersRoute()).toEqual({ name: 'admin', query: { busca: 'ana', pagina: '3' } })
  })

  it('não guarda o que não vale (página 1, inválida, busca vazia ou grande demais)', () => {
    rememberAdminUsersQuery({ busca: '   ', pagina: '1' })
    expect(adminUsersRoute()).toEqual({ name: 'admin', query: {} })

    rememberAdminUsersQuery({ busca: 'a'.repeat(101), pagina: 'x' })
    expect(adminUsersRoute()).toEqual({ name: 'admin', query: {} })

    rememberAdminUsersQuery({ pagina: '2.5' })
    expect(adminUsersRoute()).toEqual({ name: 'admin', query: {} })
  })

  it('ignora conteúdo corrompido no armazenamento', () => {
    sessionStorage.setItem('admin-users-query', '{quebrado')
    expect(adminUsersRoute()).toEqual({ name: 'admin', query: {} })

    sessionStorage.setItem('admin-users-query', '{"busca":["a"],"pagina":"-2"}')
    expect(adminUsersRoute()).toEqual({ name: 'admin', query: {} })
  })

  it('segue sem armazenamento disponível', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })

    expect(() => rememberAdminUsersQuery({ busca: 'ana' })).not.toThrow()
    expect(adminUsersRoute()).toEqual({ name: 'admin', query: {} })
  })
})
