import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { createPinia, type Pinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import {
  AxiosError,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import type { ChangePasswordPayload, LoginCredentials, User } from '@/services/auth'
import { useAuthStore } from '@/stores/auth'
import { http } from '../http'
import { installHttpInterceptors } from '../httpInterceptors'
import { makeUser } from './fixtures'

vi.mock('@/services/auth', () => ({
  login: vi.fn<(credentials: LoginCredentials) => Promise<User>>(),
  logout: vi.fn<() => Promise<void>>(),
  fetchMe: vi.fn<() => Promise<User>>(),
  changePassword: vi.fn<(payload: ChangePasswordPayload) => Promise<void>>(),
}))

type Reply = { status: number; data?: unknown }

const Stub = defineComponent({ render: () => null })
const originalAdapter = http.defaults.adapter

let router: Router
let pinia: Pinia
let interceptorId: number
let requestedUrls: string[]

// Troca a rede por respostas combinadas, na ordem das requisições.
function reply(...replies: Reply[]) {
  const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
    requestedUrls.push(config.url ?? '')
    const next = replies.shift() ?? { status: 200 }
    const response: AxiosResponse = {
      status: next.status,
      statusText: '',
      data: next.data ?? {},
      headers: {},
      config,
    }

    if (next.status >= 400) {
      throw new AxiosError(`HTTP ${next.status}`, 'ERR_BAD_REQUEST', config, undefined, response)
    }

    return response
  }
  http.defaults.adapter = adapter
}

describe('interceptor de resposta', () => {
  beforeEach(async () => {
    requestedUrls = []
    pinia = createPinia()
    useAuthStore(pinia).user = makeUser()
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: Stub },
        { path: '/login', name: 'login', component: Stub },
        { path: '/change-password', name: 'change-password', component: Stub },
        { path: '/reports', name: 'reports', component: Stub },
      ],
    })
    await router.push('/reports')
    await router.isReady()
    interceptorId = installHttpInterceptors(router, pinia)
  })

  afterEach(() => {
    http.interceptors.response.eject(interceptorId)
    http.defaults.adapter = originalAdapter
  })

  it('no 401, limpa a sessão, vai para o login guardando a tela atual e rejeita o erro', async () => {
    reply({ status: 401, data: { message: 'Não autenticado.' } })

    await expect(http.get('/users')).rejects.toMatchObject({ response: { status: 401 } })
    await flushPromises()

    expect(useAuthStore(pinia).isAuthenticated).toBe(false)
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query).toEqual({ redirect: '/reports' })
  })

  it('no 401 com skipAuthRedirect, não mexe na sessão nem navega', async () => {
    reply({ status: 401 })

    await expect(http.get('/me', { skipAuthRedirect: true })).rejects.toMatchObject({
      response: { status: 401 },
    })
    await flushPromises()

    expect(useAuthStore(pinia).isAuthenticated).toBe(true)
    expect(router.currentRoute.value.name).toBe('reports')
  })

  it('no 401 já na tela de login, fica onde está', async () => {
    await router.push('/login')
    reply({ status: 401 })

    await expect(http.get('/users')).rejects.toBeDefined()
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/login')
  })

  it('no 403 de troca pendente, marca a pendência e vai para a troca de senha', async () => {
    reply({ status: 403, data: { message: 'Troque a senha.', code: 'PASSWORD_CHANGE_REQUIRED' } })

    await expect(http.get('/users')).rejects.toMatchObject({ response: { status: 403 } })
    await flushPromises()

    expect(useAuthStore(pinia).mustChangePassword).toBe(true)
    expect(router.currentRoute.value.name).toBe('change-password')
  })

  it('no 403 sem code, só devolve o erro', async () => {
    reply({ status: 403, data: { message: 'Acesso negado.' } })

    await expect(http.get('/users')).rejects.toMatchObject({ response: { status: 403 } })
    await flushPromises()

    expect(useAuthStore(pinia).mustChangePassword).toBe(false)
    expect(router.currentRoute.value.name).toBe('reports')
  })

  it('no 419, renova o cookie CSRF e repete a requisição uma vez', async () => {
    reply({ status: 419 }, { status: 204 }, { status: 200, data: { ok: true } })

    const response = await http.post('/logout')

    expect(response.data).toEqual({ ok: true })
    expect(requestedUrls).toEqual(['/logout', '/sanctum/csrf-cookie', '/logout'])
  })

  it('no 419 repetido, devolve o erro sem entrar em laço', async () => {
    reply({ status: 419 }, { status: 204 }, { status: 419 })

    await expect(http.post('/logout')).rejects.toMatchObject({ response: { status: 419 } })

    expect(requestedUrls).toEqual(['/logout', '/sanctum/csrf-cookie', '/logout'])
  })

  it('no 419, se a renovação do cookie falhar, devolve o erro original', async () => {
    reply({ status: 419 }, { status: 500 })

    await expect(http.post('/logout')).rejects.toMatchObject({ response: { status: 419 } })

    expect(requestedUrls).toEqual(['/logout', '/sanctum/csrf-cookie'])
  })

  it('deixa passar os outros erros sem navegar', async () => {
    reply({ status: 422, data: { message: 'x', errors: { login: ['y'] } } })

    await expect(http.post('/login')).rejects.toMatchObject({ response: { status: 422 } })
    await flushPromises()

    expect(useAuthStore(pinia).isAuthenticated).toBe(true)
    expect(router.currentRoute.value.name).toBe('reports')
  })

  it('não mexe nas respostas de sucesso', async () => {
    reply({ status: 200, data: { ok: true } })

    const response = await http.get('/health')

    expect(response.data).toEqual({ ok: true })
  })
})
