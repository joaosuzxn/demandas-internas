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

async function mountLayout(path = '/demandas') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/dashboard', name: 'dashboard', component: Stub },
      {
        path: '/demandas',
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

  it('mantém Demandas destacado na tela de uma demanda', async () => {
    const { wrapper } = await mountLayout('/demandas/12')

    expect(wrapper.get('a[aria-current="page"]').text()).toContain('Demandas')
  })
})
