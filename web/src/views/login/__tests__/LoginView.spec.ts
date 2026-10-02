import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import type { ChangePasswordPayload, LoginCredentials, User } from '@/services/auth'
import { makeUser } from '@/services/__tests__/fixtures'
import { routes } from '@/router/routes'
import { useAuthStore } from '@/stores/auth'

vi.mock('@/services/auth', () => ({
  login: vi.fn<(credentials: LoginCredentials) => Promise<User>>(),
  logout: vi.fn<() => Promise<void>>(),
  fetchMe: vi.fn<() => Promise<User>>(),
  changePassword: vi.fn<(payload: ChangePasswordPayload) => Promise<void>>(),
}))

const App = defineComponent({ render: () => h(RouterView) })

// As rotas de verdade, sem a guarda: aqui interessa a tela, não quem pode abri-la.
async function mountAt(path: string) {
  const router = createRouter({ history: createMemoryHistory(), routes })
  const pinia = createPinia()
  useAuthStore(pinia).user = makeUser({ must_change_password: true })

  await router.push(path)
  await router.isReady()

  const wrapper = mount(App, { global: { plugins: [pinia, router] } })
  await flushPromises()

  return { wrapper, router }
}

describe('LoginView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mostra o login em /login, dentro do card de vidro sobre a foto de fundo', async () => {
    const { wrapper } = await mountAt('/login')

    expect(wrapper.get('main section h1').text()).toBe('Bem-vindo ao DI')
    expect(wrapper.get('main > img').attributes('alt')).toBe('')
    expect(wrapper.get('main > img').attributes('aria-hidden')).toBe('true')
  })

  it('mostra a troca de senha em /change-password', async () => {
    const { wrapper } = await mountAt('/change-password')

    expect(wrapper.get('main section h1').text()).toBe('Crie sua nova senha')
  })

  it('troca o conteúdo sem desmontar o card ao ir do login para a troca de senha e de volta', async () => {
    const { wrapper, router } = await mountAt('/login')
    const card = wrapper.get('section').element

    await router.push('/change-password')
    await flushPromises()

    expect(wrapper.get('section').element).toBe(card)
    expect(wrapper.get('h1').text()).toBe('Crie sua nova senha')

    await router.push('/login')
    await flushPromises()

    expect(wrapper.get('section').element).toBe(card)
    expect(wrapper.get('h1').text()).toBe('Bem-vindo ao DI')
  })
})
