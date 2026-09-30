import { describe, it, expect, vi, afterEach } from 'vitest'
import type { AxiosResponse } from 'axios'
import { http, csrfCookie } from '../http'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('http', () => {
  it('fala com /api levando cookies e o token XSRF', () => {
    expect(http.defaults.baseURL).toBe('/api')
    expect(http.defaults.withCredentials).toBe(true)
    expect(http.defaults.withXSRFToken).toBe(true)
  })

  it('busca o cookie CSRF do Sanctum fora do prefixo /api', async () => {
    const get = vi.spyOn(http, 'get').mockResolvedValue({ status: 204 } as AxiosResponse)
    await csrfCookie()
    expect(get).toHaveBeenCalledWith('/sanctum/csrf-cookie', { baseURL: '/' })
  })
})
