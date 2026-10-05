import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import UserForm from '../UserForm.vue'
import * as usersService from '@/services/users'
import type { UserPayload } from '@/services/users'
import type { User } from '@/services/auth'
import { httpError, makeUser, networkError } from '@/services/__tests__/fixtures'

vi.mock('@/services/users', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/users')>()),
  createUser: vi.fn<(payload: UserPayload) => Promise<User>>(),
  updateUser: vi.fn<(id: number, payload: UserPayload) => Promise<User>>(),
}))

const Stub = defineComponent({ render: () => null })

async function mountForm(props: { editing?: User } = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/admin', name: 'admin', component: Stub }],
  })
  // Sem a navegação inicial pronta, o Vue Router avisa (VUE_ROUTER_R0004) ao montar um RouterLink.
  await router.push('/admin')
  await router.isReady()
  return mount(UserForm, {
    props: { cancelTo: { name: 'admin' }, submitLabel: 'Cadastrar usuário', ...props },
    global: { plugins: [router] },
  })
}

// Ordem dos campos: Nome, Usuário, CPF, E-mail.
function inputs(wrapper: Awaited<ReturnType<typeof mountForm>>) {
  const [name, username, cpf, email] = wrapper.findAll('input')
  return { name: name!, username: username!, cpf: cpf!, email: email! }
}

describe('UserForm', () => {
  beforeEach(() => {
    vi.mocked(usersService.createUser).mockReset()
    vi.mocked(usersService.updateUser).mockReset()
  })

  it('cadastra com o que foi digitado, CPF mascarado, e avisa quem usa', async () => {
    vi.mocked(usersService.createUser).mockResolvedValue(makeUser())
    const wrapper = await mountForm()
    const fields = inputs(wrapper)

    expect(wrapper.text()).toContain(
      'O usuário entra com a senha padrão e precisa trocá-la no primeiro acesso.',
    )

    await fields.name.setValue('Maria Souza')
    await fields.username.setValue('maria.souza')
    await fields.cpf.setValue('12345678909')
    await fields.email.setValue('maria@example.com')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(usersService.createUser).toHaveBeenCalledWith({
      name: 'Maria Souza',
      username: 'maria.souza',
      cpf: '123.456.789-09',
      email: 'maria@example.com',
    })
    expect(wrapper.emitted('saved')).toEqual([[makeUser()]])
  })

  it('na edição, começa preenchido com o CPF formatado e salva aquele usuário', async () => {
    const user = makeUser({ id: 7, cpf: '12345678909' })
    vi.mocked(usersService.updateUser).mockResolvedValue(user)
    const wrapper = await mountForm({ editing: user })

    expect((inputs(wrapper).cpf.element as HTMLInputElement).value).toBe('123.456.789-09')
    expect(wrapper.text()).not.toContain('senha padrão')

    await inputs(wrapper).name.setValue('Maria S. Souza')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(usersService.updateUser).toHaveBeenCalledWith(7, {
      name: 'Maria S. Souza',
      username: 'maria.souza',
      cpf: '123.456.789-09',
      email: 'maria@example.com',
    })
  })

  it('mostra o 422 sob cada campo e apaga o erro do campo que é mexido', async () => {
    vi.mocked(usersService.createUser).mockRejectedValue(
      httpError(422, {
        message: 'erro',
        errors: { username: ['Usuário já cadastrado.'], cpf: ['CPF inválido.'] },
      }),
    )
    const wrapper = await mountForm()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Usuário já cadastrado.')
    expect(wrapper.text()).toContain('CPF inválido.')
    expect(wrapper.emitted('saved')).toBeUndefined()

    await inputs(wrapper).username.setValue('outro')
    expect(wrapper.text()).not.toContain('Usuário já cadastrado.')
    expect(wrapper.text()).toContain('CPF inválido.')
  })

  it('mostra a mensagem geral quando o servidor não responde', async () => {
    vi.mocked(usersService.createUser).mockRejectedValue(networkError())
    const wrapper = await mountForm()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-form-error]').text()).toBe(
      'Não foi possível falar com o servidor. Tente novamente.',
    )
  })

  it('trava o botão enquanto envia', async () => {
    vi.mocked(usersService.createUser).mockReturnValue(new Promise(() => {}))
    const wrapper = await mountForm()

    await wrapper.get('form').trigger('submit')

    const submit = wrapper.get('button[type="submit"]')
    expect(submit.attributes('disabled')).toBeDefined()
    expect(submit.text()).toBe('Salvando…')
  })
})
