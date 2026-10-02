import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import * as authService from '@/services/auth'
import type { ChangePasswordPayload, LoginCredentials, User } from '@/services/auth'
import { httpError, makeUser, networkError } from '@/services/__tests__/fixtures'
import LoginForm from '../LoginForm.vue'

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

  const wrapper = mount(LoginForm, { global: { plugins: [createPinia(), router] } })

  async function submit(login = 'maria.souza', password = 'Minha@Senha1') {
    await wrapper.get('input[name="login"]').setValue(login)
    await wrapper.get('input[name="password"]').setValue(password)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
  }

  return { wrapper, router, submit }
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.mocked(authService.login).mockReset()
  })

  it('mostra o título, os campos e o botão em português', async () => {
    const { wrapper } = await mountLogin()
    const login = wrapper.get('input[name="login"]')
    const password = wrapper.get('input[name="password"]')

    expect(wrapper.get('h1').text()).toBe('Bem-vindo ao DI')
    expect(wrapper.get(`label[for="${login.attributes('id')}"]`).text()).toBe('Usuário ou e-mail')
    expect(login.attributes('placeholder')).toBe('Digite seu usuário ou e-mail')
    expect(login.attributes('autocomplete')).toBe('username')
    expect(wrapper.get(`label[for="${password.attributes('id')}"]`).text()).toBe('Senha')
    expect(password.attributes('placeholder')).toBe('Digite sua senha')
    expect(password.attributes('type')).toBe('password')
    expect(password.attributes('autocomplete')).toBe('current-password')
    expect(wrapper.text()).toContain('Lembrar-me')
    expect(wrapper.get('button[type="submit"]').text()).toBe('Entrar')
  })

  it('não tem link de recuperação de senha nem de cadastro', async () => {
    const { wrapper } = await mountLogin()

    expect(wrapper.findAll('a')).toHaveLength(0)
    expect(wrapper.text()).not.toMatch(/esquec|cadastr|regist|forgot/i)
  })

  it('mantém o botão desabilitado até o usuário e a senha serem digitados', async () => {
    const { wrapper } = await mountLogin()
    const button = wrapper.get('button[type="submit"]')

    expect(button.attributes('disabled')).toBeDefined()

    await wrapper.get('input[name="login"]').setValue('maria.souza')
    expect(button.attributes('disabled')).toBeDefined()

    await wrapper.get('input[name="password"]').setValue('x')
    expect(button.attributes('disabled')).toBeUndefined()

    await wrapper.get('input[name="login"]').setValue('   ')
    expect(button.attributes('disabled')).toBeDefined()
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

  it('não usa o aviso nativo do navegador para campo vazio', async () => {
    const { wrapper } = await mountLogin()

    expect(wrapper.get('form').attributes('novalidate')).toBeDefined()
  })

  it('marca os campos vazios, chacoalha e não chama a API', async () => {
    const { wrapper, submit } = await mountLogin()

    await submit('', '')

    const login = wrapper.get('input[name="login"]')
    const password = wrapper.get('input[name="password"]')
    const alerts = wrapper.findAll('[role="alert"]')
    expect(authService.login).not.toHaveBeenCalled()
    expect(alerts.map((alert) => alert.text())).toEqual([
      'Preencha esse campo.',
      'Preencha esse campo.',
    ])
    expect(login.attributes('aria-describedby')).toBe(alerts[0]?.attributes('id'))
    expect(password.attributes('aria-describedby')).toBe(alerts[1]?.attributes('id'))
    expect(isRed(login) && isShaking(login)).toBe(true)
    expect(isRed(password) && isShaking(password)).toBe(true)
  })

  it('marca só o campo que ficou vazio', async () => {
    const { wrapper, submit } = await mountLogin()

    await submit('maria.souza', '')

    const login = wrapper.get('input[name="login"]')
    const alerts = wrapper.findAll('[role="alert"]')
    expect(authService.login).not.toHaveBeenCalled()
    expect(alerts).toHaveLength(1)
    expect(wrapper.get('input[name="password"]').attributes('aria-describedby')).toBe(
      alerts[0]?.attributes('id'),
    )
    expect(login.attributes('aria-invalid')).toBeUndefined()
    expect(isShaking(login)).toBe(false)
  })

  it('trata usuário só com espaços como campo vazio', async () => {
    const { wrapper, submit } = await mountLogin()

    await submit('   ', 'Minha@Senha1')

    const alerts = wrapper.findAll('[role="alert"]')
    expect(authService.login).not.toHaveBeenCalled()
    expect(alerts.map((alert) => alert.text())).toEqual(['Preencha esse campo.'])
    expect(wrapper.get('input[name="login"]').attributes('aria-describedby')).toBe(
      alerts[0]?.attributes('id'),
    )
  })

  it('com usuário ou senha errados, marca os dois campos e mostra uma mensagem só, na senha', async () => {
    vi.mocked(authService.login).mockRejectedValue(
      httpError(422, {
        message: 'Usuário ou senha incorretos.',
        errors: { login: ['Usuário ou senha incorretos.'] },
      }),
    )
    const { wrapper, router, submit } = await mountLogin()

    await submit()

    const login = wrapper.get('input[name="login"]')
    const password = wrapper.get('input[name="password"]')
    const alerts = wrapper.findAll('[role="alert"]')
    expect(alerts).toHaveLength(1)
    expect(alerts[0]?.text()).toBe('Usuário ou senha incorretos.')
    expect(password.attributes('aria-describedby')).toBe(alerts[0]?.attributes('id'))
    expect(login.attributes('aria-describedby')).toBeUndefined()
    expect(login.attributes('aria-invalid')).toBe('true')
    expect(password.attributes('aria-invalid')).toBe('true')
    expect(isRed(login) && isShaking(login)).toBe(true)
    expect(isRed(password) && isShaking(password)).toBe(true)
    expect((password.element as HTMLInputElement).value).toBe('')
    expect((login.element as HTMLInputElement).value).toBe('maria.souza')
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('tira o erro de credencial quando a pessoa volta a digitar', async () => {
    vi.mocked(authService.login).mockRejectedValue(
      httpError(422, { message: 'x', errors: { login: ['Usuário ou senha incorretos.'] } }),
    )
    const { wrapper, submit } = await mountLogin()
    await submit()

    await wrapper.get('input[name="password"]').setValue('o')

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.get('input[name="login"]').attributes('aria-invalid')).toBeUndefined()
    expect(wrapper.get('input[name="password"]').attributes('aria-invalid')).toBeUndefined()
  })

  it('tira o aviso de campo vazio só do campo em que a pessoa digitou', async () => {
    const { wrapper, submit } = await mountLogin()
    await submit('', '')

    await wrapper.get('input[name="login"]').setValue('m')

    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('input[name="login"]').attributes('aria-invalid')).toBeUndefined()
    expect(wrapper.get('input[name="password"]').attributes('aria-invalid')).toBe('true')
  })

  it('mostra a mensagem do limite de tentativas sem chacoalhar os campos', async () => {
    vi.mocked(authService.login).mockRejectedValue(
      httpError(429, { message: 'Muitas tentativas de login. Tente novamente em 42 segundos.' }),
    )
    const { wrapper, submit } = await mountLogin()

    await submit()

    expect(wrapper.get('[data-testid="general-error"]').text()).toBe(
      'Muitas tentativas de login. Tente novamente em 42 segundos.',
    )
    expect(isShaking(wrapper.get('input[name="login"]'))).toBe(false)
    expect(isShaking(wrapper.get('input[name="password"]'))).toBe(false)
    expect(wrapper.get('input[name="login"]').attributes('aria-invalid')).toBeUndefined()
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
      httpError(422, { message: 'x', errors: { login: ['Usuário ou senha incorretos.'] } }),
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

    // Login aceito: o botão continua desabilitado enquanto a tela navega, para não entrar duas vezes.
    finish(makeUser())
    await flushPromises()
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()

    await wrapper.get('form').trigger('submit')
    expect(authService.login).toHaveBeenCalledTimes(1)
  })

  it('depois de um erro, o botão volta a "Entrar" e reabilita quando a senha é digitada de novo', async () => {
    vi.mocked(authService.login).mockRejectedValue(
      httpError(422, { message: 'x', errors: { login: ['Usuário ou senha incorretos.'] } }),
    )
    const { wrapper, submit } = await mountLogin()

    await submit()

    // A senha foi limpa pelo erro: falta um campo, então o botão segue desabilitado.
    const button = wrapper.get('button[type="submit"]')
    expect(button.text()).toBe('Entrar')
    expect(button.attributes('disabled')).toBeDefined()

    await wrapper.get('input[name="password"]').setValue('Outra@Senha1')

    expect(button.attributes('disabled')).toBeUndefined()
  })

  it('não põe o foco no campo de usuário ao abrir, como no card do Órbita', async () => {
    const { wrapper } = await mountLogin()

    expect(document.activeElement).not.toBe(wrapper.get('input[name="login"]').element)
  })
})
