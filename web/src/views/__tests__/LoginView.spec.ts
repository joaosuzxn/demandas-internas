import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import * as authService from '@/services/auth'
import type { ChangePasswordPayload, LoginCredentials, User } from '@/services/auth'
import { httpError, makeUser, networkError } from '@/services/__tests__/fixtures'
import LoginView from '../LoginView.vue'

vi.mock('@/services/auth', () => ({
  login: vi.fn<(credentials: LoginCredentials) => Promise<User>>(),
  logout: vi.fn<() => Promise<void>>(),
  fetchMe: vi.fn<() => Promise<User>>(),
  changePassword: vi.fn<(payload: ChangePasswordPayload) => Promise<void>>(),
}))

const Stub = defineComponent({ render: () => null })

async function mountLogin(path = '/login') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: Stub },
      { path: '/login', name: 'login', component: Stub },
      { path: '/change-password', name: 'change-password', component: Stub },
      { path: '/reports', name: 'reports', component: Stub },
    ],
  })
  await router.push(path)
  await router.isReady()

  const wrapper = mount(LoginView, { global: { plugins: [createPinia(), router] } })

  async function submit(login = 'maria.souza', password = 'Minha@Senha1') {
    await wrapper.get('input[name="login"]').setValue(login)
    await wrapper.get('input[name="password"]').setValue(password)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
  }

  return { wrapper, router, submit }
}

describe('LoginView', () => {
  beforeEach(() => {
    vi.mocked(authService.login).mockReset()
  })

  it('mostra o título, os campos e o botão em português', async () => {
    const { wrapper } = await mountLogin()

    expect(wrapper.get('h1').text()).toBe('Entrar')
    expect(wrapper.get('input[name="login"]').attributes('placeholder')).toBe('Usuário ou e-mail')
    expect(wrapper.get('input[name="login"]').attributes('autocomplete')).toBe('username')
    expect(wrapper.get('input[name="password"]').attributes('placeholder')).toBe('Senha')
    expect(wrapper.get('input[name="password"]').attributes('type')).toBe('password')
    expect(wrapper.get('input[name="password"]').attributes('autocomplete')).toBe('current-password')
    expect(wrapper.text()).toContain('Lembrar-me')
    expect(wrapper.get('button[type="submit"]').text()).toBe('Entrar')
  })

  it('não tem link de recuperação de senha nem de cadastro', async () => {
    const { wrapper } = await mountLogin()

    expect(wrapper.findAll('a')).toHaveLength(0)
    expect(wrapper.text()).not.toMatch(/esquec|cadastr|regist|forgot/i)
  })

  it('envia usuário, senha e lembrar-me desmarcado por padrão', async () => {
    vi.mocked(authService.login).mockResolvedValue(makeUser())
    const { submit } = await mountLogin()

    await submit('maria.souza', 'Minha@Senha1')

    expect(authService.login).toHaveBeenCalledWith({
      login: 'maria.souza',
      password: 'Minha@Senha1',
      remember: false,
    })
  })

  it('envia lembrar-me quando marcado', async () => {
    vi.mocked(authService.login).mockResolvedValue(makeUser())
    const { wrapper, submit } = await mountLogin()

    await wrapper.get('input[name="remember"]').setValue(true)
    await submit()

    expect(authService.login).toHaveBeenCalledWith(expect.objectContaining({ remember: true }))
  })

  it('vai para a home depois de entrar', async () => {
    vi.mocked(authService.login).mockResolvedValue(makeUser())
    const { router, submit } = await mountLogin()

    await submit()

    expect(router.currentRoute.value.name).toBe('home')
  })

  it('vai para a troca de senha quando ela está pendente, ignorando o redirect', async () => {
    vi.mocked(authService.login).mockResolvedValue(makeUser({ must_change_password: true }))
    const { router, submit } = await mountLogin('/login?redirect=/reports')

    await submit()

    expect(router.currentRoute.value.name).toBe('change-password')
  })

  it('volta para o endereço pedido antes do login', async () => {
    vi.mocked(authService.login).mockResolvedValue(makeUser())
    const { router, submit } = await mountLogin('/login?redirect=/reports')

    await submit()

    expect(router.currentRoute.value.fullPath).toBe('/reports')
  })

  it('ignora redirect para fora do site', async () => {
    vi.mocked(authService.login).mockResolvedValue(makeUser())
    const { router, submit } = await mountLogin('/login?redirect=//evil.example')

    await submit()

    expect(router.currentRoute.value.fullPath).toBe('/')
  })

  it('mostra o erro de credencial sob o campo de usuário e limpa a senha', async () => {
    vi.mocked(authService.login).mockRejectedValue(
      httpError(422, {
        message: 'Credenciais inválidas.',
        errors: { login: ['Credenciais inválidas.'] },
      }),
    )
    const { wrapper, router, submit } = await mountLogin()

    await submit()

    const field = wrapper.get('input[name="login"]')
    const alert = wrapper.get('[role="alert"]')
    expect(alert.text()).toBe('Credenciais inválidas.')
    expect(field.attributes('aria-describedby')).toBe(alert.attributes('id'))
    expect((wrapper.get('input[name="password"]').element as HTMLInputElement).value).toBe('')
    expect((field.element as HTMLInputElement).value).toBe('maria.souza')
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('mostra a mensagem do limite de tentativas', async () => {
    vi.mocked(authService.login).mockRejectedValue(
      httpError(429, { message: 'Muitas tentativas de login. Tente novamente em 42 segundos.' }),
    )
    const { wrapper, submit } = await mountLogin()

    await submit()

    expect(wrapper.get('[data-testid="general-error"]').text()).toBe(
      'Muitas tentativas de login. Tente novamente em 42 segundos.',
    )
  })

  it('avisa quando não consegue falar com o servidor', async () => {
    vi.mocked(authService.login).mockRejectedValue(networkError())
    const { wrapper, submit } = await mountLogin()

    await submit()

    expect(wrapper.get('[data-testid="general-error"]').text()).toBe(
      'Não foi possível falar com o servidor. Tente novamente.',
    )
  })

  it('apaga os erros anteriores ao enviar de novo', async () => {
    vi.mocked(authService.login).mockRejectedValueOnce(
      httpError(422, { message: 'x', errors: { login: ['Credenciais inválidas.'] } }),
    )
    vi.mocked(authService.login).mockReturnValueOnce(new Promise(() => {}))
    const { wrapper, submit } = await mountLogin()

    await submit()
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)

    await submit()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('desabilita o botão durante o envio e não envia duas vezes', async () => {
    let finish!: (user: User) => void
    vi.mocked(authService.login).mockReturnValue(
      new Promise<User>((resolve) => {
        finish = resolve
      }),
    )
    const { wrapper, submit } = await mountLogin()

    await submit()
    const button = wrapper.get('button[type="submit"]')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toBe('Entrando…')

    await wrapper.get('form').trigger('submit')
    expect(authService.login).toHaveBeenCalledTimes(1)

    finish(makeUser())
    await flushPromises()
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })
})
