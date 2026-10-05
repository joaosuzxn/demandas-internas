import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import DefaultLayout from '../DefaultLayout.vue'
import * as authService from '@/services/auth'
import type { User } from '@/services/auth'
import { makeUser } from '@/services/__tests__/fixtures'
import { useAuthStore } from '@/stores/auth'

vi.mock('@/services/auth', () => ({
  login: vi.fn<(credentials: authService.LoginCredentials) => Promise<User>>(),
  logout: vi.fn<() => Promise<void>>(),
  fetchMe: vi.fn<() => Promise<User>>(),
  changePassword: vi.fn<(payload: authService.ChangePasswordPayload) => Promise<void>>(),
}))

const Stub = defineComponent({ render: () => null })

async function mountLayout(path = '/solicitacoes') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/dashboard', name: 'dashboard', component: Stub },
      {
        path: '/solicitacoes',
        component: DefaultLayout,
        children: [
          { path: '', name: 'demands', component: Stub },
          { path: ':id', name: 'demand', component: Stub, meta: { sidebarItem: 'demands' } },
        ],
      },
      { path: '/login', name: 'login', component: Stub },
    ],
  })
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().user = makeUser()

  await router.push(path)
  return {
    router,
    wrapper: mount(DefaultLayout, {
      global: { plugins: [pinia, router], stubs: { RouterView: true } },
    }),
  }
}

describe('DefaultLayout', () => {
  beforeEach(() => {
    vi.mocked(authService.logout).mockReset()
    vi.mocked(authService.logout).mockResolvedValue()
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  // Item 0032: o tema escuro só vale com o layout das telas internas montado.
  it('liga o tema escuro salvo nas telas internas e desliga ao sair delas', async () => {
    localStorage.setItem('demandas.theme', 'dark')
    const { wrapper } = await mountLayout()
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    // Ir para o login desmonta o layout (o roteador troca o componente da rota).
    wrapper.unmount()
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('o botão da sidebar alterna o tema e grava a escolha', async () => {
    localStorage.setItem('demandas.theme', 'light')
    const { wrapper } = await mountLayout()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Modo escuro')!
      .trigger('click')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('demandas.theme')).toBe('dark')
    wrapper.unmount()
  })

  it('ao sair, encerra a sessão e vai para o login', async () => {
    const { router, wrapper } = await mountLayout()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Sair')!
      .trigger('click')
    await flushPromises()

    expect(authService.logout).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('mantém Solicitações destacado na tela de uma solicitação', async () => {
    const { wrapper } = await mountLayout('/solicitacoes/12')

    expect(wrapper.get('a[aria-current="page"]').text()).toContain('Solicitações')
  })
})
