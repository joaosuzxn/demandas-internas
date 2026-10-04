import { describe, it, expect, vi, afterEach } from 'vitest'
import type { AxiosResponse } from 'axios'
import { http } from '../http'
import {
  activateUser,
  createUser,
  deactivateUser,
  getUser,
  listUsers,
  resetUserPassword,
  updateUser,
} from '../users'
import { makeUser } from './fixtures'

function ok<T>(data: T, status = 200): AxiosResponse<T> {
  return { status, data } as AxiosResponse<T>
}

const payload = {
  name: 'Maria Souza',
  username: 'maria.souza',
  cpf: '123.456.789-09',
  email: 'maria@example.com',
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('users service', () => {
  it('lista com busca e página na query e traduz a paginação', async () => {
    const get = vi.spyOn(http, 'get').mockResolvedValue(
      ok({ data: [makeUser()], meta: { total: 41, current_page: 2, last_page: 3 } }),
    )

    expect(await listUsers({ search: 'ana', page: 2 })).toEqual({
      items: [makeUser()],
      page: 2,
      lastPage: 3,
      total: 41,
    })
    expect(get).toHaveBeenCalledWith('/users', { params: { search: 'ana', page: 2 } })
  })

  it('busca, cadastra e edita devolvendo o que vem em data', async () => {
    vi.spyOn(http, 'get').mockResolvedValue(ok({ data: makeUser() }))
    const post = vi.spyOn(http, 'post').mockResolvedValue(ok({ data: makeUser() }, 201))
    const put = vi.spyOn(http, 'put').mockResolvedValue(ok({ data: makeUser() }))

    expect(await getUser(1)).toEqual(makeUser())
    expect(http.get).toHaveBeenCalledWith('/users/1')
    expect(await createUser(payload)).toEqual(makeUser())
    expect(post).toHaveBeenCalledWith('/users', payload)
    expect(await updateUser(1, payload)).toEqual(makeUser())
    expect(put).toHaveBeenCalledWith('/users/1', payload)
  })

  it('manda as ações de acesso para as rotas delas', async () => {
    const post = vi.spyOn(http, 'post').mockResolvedValue(ok({ data: makeUser() }))

    expect(await deactivateUser(7)).toEqual(makeUser())
    expect(post).toHaveBeenLastCalledWith('/users/7/deactivate')
    expect(await activateUser(7)).toEqual(makeUser())
    expect(post).toHaveBeenLastCalledWith('/users/7/activate')

    post.mockResolvedValue(ok('', 204))
    await expect(resetUserPassword(7)).resolves.toBeUndefined()
    expect(post).toHaveBeenLastCalledWith('/users/7/reset-password')
  })
})
