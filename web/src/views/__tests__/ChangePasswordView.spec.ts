import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import * as authService from '@/services/auth'
import type { ChangePasswordPayload, LoginCredentials, User } from '@/services/auth'
import { httpError, makeUser, networkError } from '@/services/__tests__/fixtures'
import { useAuthStore } from '@/stores/auth'
import ChangePasswordView from '../ChangePasswordView.vue'

vi.mock('@/services/auth', () => ({
  login: vi.fn<(credentials: LoginCredentials) => Promise<User>>(),
  logout: vi.fn<() => Promise<void>>(),
  fetchMe: vi.fn<() => Promise<User>>(),
  changePassword: vi.fn<(payload: ChangePasswordPayload) => Promise<void>>(),
}))

const Stub = defineComponent({ render: () => null })

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: Stub },
      { path: '/login', name: 'login', component: Stub },
      { path: '/change-password', name: 'change-password', component: Stub },
    ],
  })
  await router.push('/change-password')
  await router.isReady()

  const pinia = createPinia()
  const auth = useAuthStore(pinia)
  auth.user = makeUser({ must_change_password: true })

  const wrapper = mount(ChangePasswordView, { global: { plugins: [pinia, router] } })

  async function submit(current = '123@Senha', next = 'Nova@Senha1', confirmation = next) {
    await wrapper.get('input[name="current_password"]').setValue(current)
    await wrapper.get('input[name="password"]').setValue(next)
    await wrapper.get('input[name="password_confirmation"]').setValue(confirmation)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
  }

  return { wrapper, router, auth, submit }
}

describe('ChangePasswordView', () => {
  beforeEach(() => {
    vi.mocked(authService.changePassword).mockReset()
    vi.mocked(authService.logout).mockReset()
  })

  it('mostra o título, o aviso, os campos e a dica da senha', async () => {
    const { wrapper } = await mountView()

    expect(wrapper.get('h1').text()).toBe('Trocar senha')
    expect(wrapper.text()).toContain('Por segurança, troque a senha padrão antes de continuar.')
    expect(wrapper.get('input[name="current_password"]').attributes('placeholder')).toBe('Senha atual')
    expect(wrapper.get('input[name="current_password"]').attributes('autocomplete')).toBe(
      'current-password',
    )
    expect(wrapper.get('input[name="password"]').attributes('placeholder')).toBe('Nova senha')
    expect(wrapper.get('input[name="password"]').attributes('autocomplete')).toBe('new-password')
    expect(wrapper.get('input[name="password_confirmation"]').attributes('placeholder')).toBe(
      'Confirmar nova senha',
    )
    expect(wrapper.get('[data-testid="hint"]').text()).toBe(
      'Mínimo de 8 caracteres, com letra maiúscula, minúscula, número e símbolo.',
    )
    expect(wrapper.get('button[type="submit"]').text()).toBe('Salvar')
    for (const input of wrapper.findAll('input')) {
      expect(input.attributes('type')).toBe('password')
    }
  })

  it('envia os três campos e vai para a home', async () => {
    vi.mocked(authService.changePassword).mockResolvedValue()
    const { router, auth, submit } = await mountView()

    await submit('123@Senha', 'Nova@Senha1', 'Nova@Senha1')

    expect(authService.changePassword).toHaveBeenCalledWith({
      current_password: '123@Senha',
      password: 'Nova@Senha1',
      password_confirmation: 'Nova@Senha1',
    })
    expect(auth.mustChangePassword).toBe(false)
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('mostra o erro da senha atual sob o campo dela', async () => {
    vi.mocked(authService.changePassword).mockRejectedValue(
      httpError(422, {
        message: 'A senha atual está incorreta.',
        errors: { current_password: ['A senha atual está incorreta.'] },
      }),
    )
    const { wrapper, router, submit } = await mountView()

    await submit()

    const alert = wrapper.get('[role="alert"]')
    expect(alert.text()).toBe('A senha atual está incorreta.')
    expect(wrapper.get('input[name="current_password"]').attributes('aria-describedby')).toBe(
      alert.attributes('id'),
    )
    expect(router.currentRoute.value.name).toBe('change-password')
  })

  it('mostra o erro da nova senha no lugar da dica', async () => {
    vi.mocked(authService.changePassword).mockRejectedValue(
      httpError(422, {
        message: 'A confirmação da senha não confere.',
        errors: { password: ['A confirmação da senha não confere.'] },
      }),
    )
    const { wrapper, submit } = await mountView()

    await submit('123@Senha', 'Nova@Senha1', 'Outra@Senha1')

    const alert = wrapper.get('[role="alert"]')
    expect(alert.text()).toBe('A confirmação da senha não confere.')
    expect(wrapper.get('input[name="password"]').attributes('aria-describedby')).toBe(
      alert.attributes('id'),
    )
    expect(wrapper.find('[data-testid="hint"]').exists()).toBe(false)
  })

  it('mostra a mensagem do limite de tentativas', async () => {
    vi.mocked(authService.changePassword).mockRejectedValue(
      httpError(429, { message: 'Muitas tentativas. Tente novamente em 30 segundos.' }),
    )
    const { wrapper, submit } = await mountView()

    await submit()

    expect(wrapper.get('[data-testid="general-error"]').text()).toBe(
      'Muitas tentativas. Tente novamente em 30 segundos.',
    )
  })

  it('avisa quando não consegue falar com o servidor', async () => {
    vi.mocked(authService.changePassword).mockRejectedValue(networkError())
    const { wrapper, submit } = await mountView()

    await submit()

    expect(wrapper.get('[data-testid="general-error"]').text()).toBe(
      'Não foi possível falar com o servidor. Tente novamente.',
    )
  })

  it('desabilita o botão durante o envio e não envia duas vezes', async () => {
    let finish!: () => void
    vi.mocked(authService.changePassword).mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve
      }),
    )
    const { wrapper, submit } = await mountView()

    await submit()
    const button = wrapper.get('button[type="submit"]')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toBe('Salvando…')

    await wrapper.get('form').trigger('submit')
    expect(authService.changePassword).toHaveBeenCalledTimes(1)

    finish()
    await flushPromises()
  })

  it('sai e volta para o login', async () => {
    vi.mocked(authService.logout).mockResolvedValue()
    const { wrapper, router, auth } = await mountView()

    await wrapper.get('[data-testid="logout"]').trigger('click')
    await flushPromises()

    expect(authService.logout).toHaveBeenCalledTimes(1)
    expect(auth.isAuthenticated).toBe(false)
    expect(router.currentRoute.value.name).toBe('login')
  })
})
