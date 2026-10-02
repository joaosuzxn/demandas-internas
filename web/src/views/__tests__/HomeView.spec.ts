import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios'
import HomeView from '../HomeView.vue'
import { getHealth, type Health } from '@/services/health'
import * as authService from '@/services/auth'
import type { ChangePasswordPayload, LoginCredentials, User } from '@/services/auth'
import { makeUser } from '@/services/__tests__/fixtures'
import { useAuthStore } from '@/stores/auth'

vi.mock('@/services/health', () => ({ getHealth: vi.fn<() => Promise<Health>>() }))
vi.mock('@/services/auth', () => ({
  login: vi.fn<(credentials: LoginCredentials) => Promise<User>>(),
  logout: vi.fn<() => Promise<void>>(),
  fetchMe: vi.fn<() => Promise<User>>(),
  changePassword: vi.fn<(payload: ChangePasswordPayload) => Promise<void>>(),
}))

const Stub = defineComponent({ render: () => null })

function plugins() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: Stub },
      { path: '/login', name: 'login', component: Stub },
    ],
  })
  const pinia = createPinia()
  useAuthStore(pinia).user = makeUser()

  return { router, pinia }
}

function montarSemEsperar() {
  const { router, pinia } = plugins()
  return mount(HomeView, { global: { plugins: [pinia, router] } })
}

async function montar() {
  const wrapper = montarSemEsperar()
  await flushPromises()
  return wrapper
}

function erroHttp(status: number): AxiosError {
  const response = {
    status,
    statusText: '',
    data: {},
    headers: {},
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse
  return new AxiosError(`HTTP ${status}`, 'ERR_BAD_RESPONSE', undefined, undefined, response)
}

describe('HomeView', () => {
  beforeEach(() => {
    vi.mocked(getHealth).mockReset()
  })

  it('mostra o nome do sistema', async () => {
    vi.mocked(getHealth).mockResolvedValue({ status: 'ok', app: 'Demandas Internas', database: 'ok' })
    const wrapper = await montar()
    expect(wrapper.get('h1').text()).toBe('Demandas Internas')
  })

  it('mostra que está verificando enquanto a API não responde', () => {
    vi.mocked(getHealth).mockReturnValue(new Promise(() => {}))
    const wrapper = montarSemEsperar()
    expect(wrapper.get('[data-testid="estado"]').text()).toBe('Verificando a API…')
  })

  it('mostra API e banco ok quando o health responde 200', async () => {
    vi.mocked(getHealth).mockResolvedValue({ status: 'ok', app: 'Demandas Internas', database: 'ok' })
    const wrapper = await montar()
    const estado = wrapper.get('[data-testid="estado"]').text()
    expect(estado).toContain('API ok')
    expect(estado).toContain('Banco ok')
  })

  it('mostra banco indisponível quando o health responde 503', async () => {
    vi.mocked(getHealth).mockRejectedValue(erroHttp(503))
    const wrapper = await montar()
    expect(wrapper.get('[role="alert"]').text()).toBe('Banco indisponível')
  })

  it('mostra que não fala com a API quando a rede falha', async () => {
    vi.mocked(getHealth).mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'))
    const wrapper = await montar()
    expect(wrapper.get('[role="alert"]').text()).toBe('Não foi possível falar com a API')
  })

  it('mostra que não fala com a API quando o nginx responde 502', async () => {
    vi.mocked(getHealth).mockRejectedValue(erroHttp(502))
    const wrapper = await montar()
    expect(wrapper.get('[role="alert"]').text()).toBe('Não foi possível falar com a API')
  })

  it('sai e volta para o login', async () => {
    vi.mocked(getHealth).mockResolvedValue({ status: 'ok', app: 'Demandas Internas', database: 'ok' })
    vi.mocked(authService.logout).mockResolvedValue()
    const { router, pinia } = plugins()
    await router.push('/')
    await router.isReady()
    const wrapper = mount(HomeView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    await wrapper.get('[data-testid="logout"]').trigger('click')
    await flushPromises()

    expect(authService.logout).toHaveBeenCalledTimes(1)
    expect(useAuthStore(pinia).isAuthenticated).toBe(false)
    expect(router.currentRoute.value.name).toBe('login')
  })
})
