import { describe, it, expect, vi, afterEach } from 'vitest'
import type { AxiosResponse } from 'axios'
import { http } from '../http'
import { changePassword, fetchMe, login, logout } from '../auth'
import { makeUser, networkError } from './fixtures'

function ok<T>(data: T): AxiosResponse<T> {
  return { status: 200, data } as AxiosResponse<T>
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('auth service', () => {
  it('busca o cookie CSRF antes de enviar o login e devolve o usuário', async () => {
    const order: string[] = []
    const get = vi.spyOn(http, 'get').mockImplementation(async () => {
      order.push('csrf')
      return ok(null)
    })
    const post = vi.spyOn(http, 'post').mockImplementation(async () => {
      order.push('login')
      return ok({ data: makeUser() })
    })

    const user = await login({ login: 'maria.souza', password: 'Minha@Senha1', remember: true })

    expect(order).toEqual(['csrf', 'login'])
    expect(get).toHaveBeenCalledWith('/sanctum/csrf-cookie', { baseURL: '/' })
    expect(post).toHaveBeenCalledWith('/login', {
      login: 'maria.souza',
      password: 'Minha@Senha1',
      remember: true,
    })
    expect(user).toEqual(makeUser())
  })

  it('não envia o login se o cookie CSRF falhar', async () => {
    vi.spyOn(http, 'get').mockRejectedValue(networkError())
    const post = vi.spyOn(http, 'post')

    await expect(login({ login: 'a', password: 'b', remember: false })).rejects.toThrow('Network Error')
    expect(post).not.toHaveBeenCalled()
  })

  it('sai sem redirecionar no 401', async () => {
    const post = vi.spyOn(http, 'post').mockResolvedValue({ status: 204 } as AxiosResponse)

    await logout()

    expect(post).toHaveBeenCalledWith('/logout', null, { skipAuthRedirect: true })
  })

  it('busca o usuário atual sem redirecionar no 401', async () => {
    const get = vi.spyOn(http, 'get').mockResolvedValue(ok({ data: makeUser({ id: 7 }) }))

    const user = await fetchMe()

    expect(get).toHaveBeenCalledWith('/me', { skipAuthRedirect: true })
    expect(user.id).toBe(7)
  })

  it('envia a troca de senha', async () => {
    const put = vi.spyOn(http, 'put').mockResolvedValue({ status: 204 } as AxiosResponse)
    const payload = {
      current_password: '123@Senha',
      password: 'Nova@Senha1',
      password_confirmation: 'Nova@Senha1',
    }

    await changePassword(payload)

    expect(put).toHaveBeenCalledWith('/me/password', payload)
  })
})
