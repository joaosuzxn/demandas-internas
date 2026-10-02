import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import * as authService from '@/services/auth'
import type { ChangePasswordPayload, LoginCredentials, User } from '@/services/auth'
import { httpError, makeUser, networkError } from '@/services/__tests__/fixtures'
import { useAuthStore } from '@/stores/auth'
import ChangePasswordForm from '../ChangePasswordForm.vue'

vi.mock('@/services/auth', () => ({
  login: vi.fn<(credentials: LoginCredentials) => Promise<User>>(),
  logout: vi.fn<() => Promise<void>>(),
  fetchMe: vi.fn<() => Promise<User>>(),
  changePassword: vi.fn<(payload: ChangePasswordPayload) => Promise<void>>(),
}))

const Stub = defineComponent({ render: () => null })

// O que os dois auxiliares abaixo precisam de um campo achado com wrapper.get().
type FieldWrapper = { element: Element; classes(): string[] }

// A chacoalhada fica no contêiner em volta do campo.
function isShaking(input: FieldWrapper): boolean {
  return input.element.parentElement?.classList.contains('animate-shake') ?? false
}

function isRed(input: FieldWrapper): boolean {
  return input.classes().includes('border-red-400')
}

// loginPassword: a senha que a pessoa acabou de digitar no login (null = chegou à tela sem passar por ele).
async function mountForm(loginPassword: string | null = null) {
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
  auth.user = makeUser({ username: 'maria.souza', must_change_password: true })
  auth.loginPassword = loginPassword

  const wrapper = mount(ChangePasswordForm, { global: { plugins: [pinia, router] } })

  async function submit(current = '123@Senha', next = 'Nova@Senha1', confirmation = next) {
    const currentField = wrapper.find('input[name="current_password"]')
    if (currentField.exists()) {
      await currentField.setValue(current)
    }
    await wrapper.get('input[name="password"]').setValue(next)
    await wrapper.get('input[name="password_confirmation"]').setValue(confirmation)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
  }

  return { wrapper, router, auth, submit }
}

describe('ChangePasswordForm', () => {
  beforeEach(() => {
    vi.mocked(authService.changePassword).mockReset()
    vi.mocked(authService.logout).mockReset()
  })

  it('mostra o título, a explicação, o usuário e os campos de senha', async () => {
    const { wrapper } = await mountForm()
    const username = wrapper.get('input[name="username"]')

    expect(wrapper.get('h1').text()).toBe('Crie sua nova senha')
    expect(wrapper.text()).toContain('Você entrou com a senha padrão.')
    expect(wrapper.text()).toContain(
      'no mínimo 8 caracteres, com letras maiúsculas, minúsculas, números e símbolos',
    )
    expect((username.element as HTMLInputElement).value).toBe('maria.souza')
    expect(username.attributes('disabled')).toBeDefined()
    expect(username.attributes('autocomplete')).toBe('username')
    expect(wrapper.get('input[name="current_password"]').attributes('autocomplete')).toBe(
      'current-password',
    )
    expect(wrapper.get('input[name="password"]').attributes('autocomplete')).toBe('new-password')
    expect(wrapper.get('input[name="password_confirmation"]').attributes('autocomplete')).toBe(
      'new-password',
    )
    for (const name of ['current_password', 'password', 'password_confirmation']) {
      expect(wrapper.get(`input[name="${name}"]`).attributes('type')).toBe('password')
    }
    expect(wrapper.get('button[type="submit"]').text()).toBe('Salvar nova senha')
  })

  it('mantém o botão de salvar desabilitado até todos os campos visíveis serem digitados', async () => {
    const { wrapper } = await mountForm()
    const button = wrapper.get('button[type="submit"]')

    expect(button.attributes('disabled')).toBeDefined()

    await wrapper.get('input[name="current_password"]').setValue('123@Senha')
    await wrapper.get('input[name="password"]').setValue('Nova@Senha1')
    expect(button.attributes('disabled')).toBeDefined()

    await wrapper.get('input[name="password_confirmation"]').setValue('Nova@Senha1')
    expect(button.attributes('disabled')).toBeUndefined()

    await wrapper.get('input[name="password"]').setValue('')
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('vindo do login, o botão de salvar só depende da nova senha e da confirmação', async () => {
    const { wrapper } = await mountForm('123@Senha')
    const button = wrapper.get('button[type="submit"]')

    expect(button.attributes('disabled')).toBeDefined()

    await wrapper.get('input[name="password"]').setValue('Nova@Senha1')
    await wrapper.get('input[name="password_confirmation"]').setValue('Nova@Senha1')

    expect(button.attributes('disabled')).toBeUndefined()
  })

  it('envia os três campos e vai para a home', async () => {
    vi.mocked(authService.changePassword).mockResolvedValue()
    const { router, auth, submit } = await mountForm()

    await submit('123@Senha', 'Nova@Senha1', 'Nova@Senha1')

    expect(authService.changePassword).toHaveBeenCalledWith({
      current_password: '123@Senha',
      password: 'Nova@Senha1',
      password_confirmation: 'Nova@Senha1',
    })
    expect(auth.mustChangePassword).toBe(false)
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('vindo do login, não pede a senha atual e envia a que a pessoa acabou de digitar', async () => {
    vi.mocked(authService.changePassword).mockResolvedValue()
    const { wrapper, router, submit } = await mountForm('123@Senha')

    expect(wrapper.find('input[name="current_password"]').exists()).toBe(false)

    await submit(undefined, 'Nova@Senha1', 'Nova@Senha1')

    expect(authService.changePassword).toHaveBeenCalledWith({
      current_password: '123@Senha',
      password: 'Nova@Senha1',
      password_confirmation: 'Nova@Senha1',
    })
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('vindo do login, só cobra os dois campos que aparecem', async () => {
    const { wrapper, submit } = await mountForm('123@Senha')

    await submit(undefined, '', '')

    expect(authService.changePassword).not.toHaveBeenCalled()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(2)
  })

  it('volta a pedir a senha atual se a API recusar a que veio do login', async () => {
    vi.mocked(authService.changePassword).mockRejectedValueOnce(
      httpError(422, {
        message: 'A senha atual está incorreta.',
        errors: { current_password: ['A senha atual está incorreta.'] },
      }),
    )
    vi.mocked(authService.changePassword).mockResolvedValueOnce()
    const { wrapper, auth, submit } = await mountForm('123@Senha')

    await submit(undefined, 'Nova@Senha1', 'Nova@Senha1')

    expect(authService.changePassword).toHaveBeenNthCalledWith(1, {
      current_password: '123@Senha',
      password: 'Nova@Senha1',
      password_confirmation: 'Nova@Senha1',
    })
    // A senha recusada não serve mais: sai da memória.
    expect(auth.loginPassword).toBeNull()

    const current = wrapper.get('input[name="current_password"]')
    const alert = wrapper.get('[role="alert"]')
    expect(alert.text()).toBe('A senha atual está incorreta.')
    expect(current.attributes('aria-describedby')).toBe(alert.attributes('id'))

    await submit('Outra@Senha9', 'Nova@Senha1', 'Nova@Senha1')

    expect(authService.changePassword).toHaveBeenLastCalledWith({
      current_password: 'Outra@Senha9',
      password: 'Nova@Senha1',
      password_confirmation: 'Nova@Senha1',
    })
  })

  it('passa a pedir a senha atual se a senha do login sumir com a tela aberta', async () => {
    const { wrapper, auth } = await mountForm('123@Senha')

    auth.forgetLoginPassword()
    await flushPromises()

    expect(wrapper.find('input[name="current_password"]').exists()).toBe(true)
  })

  it('sem ter passado pelo login nesta visita, pede a senha atual', async () => {
    const { wrapper } = await mountForm()

    expect(wrapper.find('input[name="current_password"]').exists()).toBe(true)
  })

  it('não usa o aviso nativo do navegador para campo vazio', async () => {
    const { wrapper } = await mountForm()

    expect(wrapper.get('form').attributes('novalidate')).toBeDefined()
  })

  it('marca os campos vazios, chacoalha e não chama a API', async () => {
    const { wrapper, submit } = await mountForm()

    await submit('', '', '')

    const alerts = wrapper.findAll('[role="alert"]')
    expect(authService.changePassword).not.toHaveBeenCalled()
    expect(alerts.map((alert) => alert.text())).toEqual([
      'Preencha esse campo.',
      'Preencha esse campo.',
      'Preencha esse campo.',
    ])
    for (const name of ['current_password', 'password', 'password_confirmation']) {
      const input = wrapper.get(`input[name="${name}"]`)
      expect(input.attributes('aria-invalid')).toBe('true')
      expect(isRed(input) && isShaking(input)).toBe(true)
    }
  })

  it('marca só a confirmação quando só ela ficou vazia', async () => {
    const { wrapper, submit } = await mountForm()

    await submit('123@Senha', 'Nova@Senha1', '')

    const alerts = wrapper.findAll('[role="alert"]')
    expect(authService.changePassword).not.toHaveBeenCalled()
    expect(alerts).toHaveLength(1)
    expect(wrapper.get('input[name="password_confirmation"]').attributes('aria-describedby')).toBe(
      alerts[0]?.attributes('id'),
    )
    expect(wrapper.get('input[name="password"]').attributes('aria-invalid')).toBeUndefined()
  })

  it('chacoalha o campo que a API recusou e tira o erro quando a pessoa volta a digitar', async () => {
    vi.mocked(authService.changePassword).mockRejectedValue(
      httpError(422, {
        message: 'A senha deve conter pelo menos um símbolo.',
        errors: { password: ['A senha deve conter pelo menos um símbolo.'] },
      }),
    )
    const { wrapper, submit } = await mountForm()

    await submit('123@Senha', 'SemSimbolo1', 'SemSimbolo1')

    const password = wrapper.get('input[name="password"]')
    const alert = wrapper.get('[role="alert"]')
    expect(alert.text()).toBe('A senha deve conter pelo menos um símbolo.')
    expect(password.attributes('aria-describedby')).toBe(alert.attributes('id'))
    expect(isRed(password) && isShaking(password)).toBe(true)
    expect(isShaking(wrapper.get('input[name="password_confirmation"]'))).toBe(false)

    await password.setValue('Com@Simbolo1')

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(password.attributes('aria-invalid')).toBeUndefined()
  })

  it('mostra a mensagem do limite de tentativas', async () => {
    vi.mocked(authService.changePassword).mockRejectedValue(
      httpError(429, { message: 'Muitas tentativas. Tente novamente em 30 segundos.' }),
    )
    const { wrapper, submit } = await mountForm()

    await submit()

    expect(wrapper.get('[data-testid="general-error"]').text()).toBe(
      'Muitas tentativas. Tente novamente em 30 segundos.',
    )
  })

  it('avisa quando não consegue falar com o servidor', async () => {
    vi.mocked(authService.changePassword).mockRejectedValue(networkError())
    const { wrapper, submit } = await mountForm()

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
    const { wrapper, submit } = await mountForm()

    await submit()
    const button = wrapper.get('button[type="submit"]')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toBe('Salvando…')

    await wrapper.get('form').trigger('submit')
    expect(authService.changePassword).toHaveBeenCalledTimes(1)

    finish()
    await flushPromises()
    // Senha trocada: o botão continua desabilitado enquanto a tela navega.
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
  })

  it('sai e volta para o login', async () => {
    vi.mocked(authService.logout).mockResolvedValue()
    const { wrapper, router, auth } = await mountForm()

    await wrapper.get('[data-testid="logout"]').trigger('click')
    await flushPromises()

    expect(authService.logout).toHaveBeenCalledTimes(1)
    expect(auth.isAuthenticated).toBe(false)
    expect(router.currentRoute.value.name).toBe('login')
  })
})
