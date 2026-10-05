import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import UserAccessPanel from '../UserAccessPanel.vue'
import * as usersService from '@/services/users'
import type { User } from '@/services/auth'
import { httpError, makeUser } from '@/services/__tests__/fixtures'

vi.mock('@/services/users', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/users')>()),
  deactivateUser: vi.fn<(id: number) => Promise<User>>(),
  activateUser: vi.fn<(id: number) => Promise<User>>(),
  resetUserPassword: vi.fn<(id: number) => Promise<void>>(),
}))

function mountPanel(user: User = makeUser({ id: 7, name: 'Ana Souza' }), isSelf = false) {
  return mount(UserAccessPanel, { props: { user, isSelf } })
}

function button(wrapper: ReturnType<typeof mountPanel>, text: string) {
  return wrapper.findAll('button').find((candidate) => candidate.text() === text)
}

describe('UserAccessPanel', () => {
  beforeEach(() => {
    vi.mocked(usersService.deactivateUser).mockReset()
    vi.mocked(usersService.activateUser).mockReset()
    vi.mocked(usersService.resetUserPassword).mockReset()
  })

  it('mostra a situação e o estado da senha', () => {
    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('Ativo')
    expect(wrapper.text()).toContain('Definida pelo usuário')

    const pending = mountPanel(makeUser({ is_active: false, must_change_password: true }))
    expect(pending.text()).toContain('Desativado')
    expect(pending.text()).toContain('Provisória — troca no próximo acesso')
    expect(button(pending, 'Reativar')).toBeDefined()
  })

  it('pergunta antes de desativar e cancela sem chamar a API', async () => {
    const wrapper = mountPanel()

    await button(wrapper, 'Desativar')!.trigger('click')
    expect(wrapper.text()).toContain('Desativar Ana? O acesso é cortado na hora.')
    await button(wrapper, 'Cancelar')!.trigger('click')

    expect(usersService.deactivateUser).not.toHaveBeenCalled()
    expect(button(wrapper, 'Desativar')).toBeDefined()
  })

  it('o foco vai para o Confirmar ao perguntar e volta ao botão da linha ao cancelar', async () => {
    const wrapper = mount(UserAccessPanel, {
      props: { user: makeUser({ id: 7, name: 'Ana Souza' }), isSelf: false },
      attachTo: document.body,
    })

    await button(wrapper, 'Redefinir senha')!.trigger('click')
    await flushPromises()
    expect(document.activeElement).toBe(button(wrapper, 'Confirmar')!.element)

    await button(wrapper, 'Cancelar')!.trigger('click')
    await flushPromises()
    expect(document.activeElement).toBe(button(wrapper, 'Redefinir senha')!.element)
    wrapper.unmount()
  })

  it('enquanto uma confirmação corre, a ação da outra linha fica travada', async () => {
    vi.mocked(usersService.resetUserPassword).mockReturnValue(new Promise(() => {}))
    const wrapper = mountPanel()

    await button(wrapper, 'Redefinir senha')!.trigger('click')
    await button(wrapper, 'Confirmar')!.trigger('click')

    expect(button(wrapper, 'Desativar')!.attributes('disabled')).toBeDefined()
  })

  it('desativa depois de confirmar e entrega o usuário atualizado a quem usa', async () => {
    const deactivated = makeUser({ id: 7, name: 'Ana Souza', is_active: false })
    vi.mocked(usersService.deactivateUser).mockResolvedValue(deactivated)
    const wrapper = mountPanel()

    await button(wrapper, 'Desativar')!.trigger('click')
    await button(wrapper, 'Confirmar')!.trigger('click')
    await flushPromises()

    expect(usersService.deactivateUser).toHaveBeenCalledWith(7)
    expect(wrapper.emitted('updated')).toEqual([[deactivated]])
    expect(wrapper.text()).toContain('Usuário desativado.')
  })

  it('reativa depois de confirmar', async () => {
    const user = makeUser({ id: 7, name: 'Ana Souza', is_active: false })
    vi.mocked(usersService.activateUser).mockResolvedValue({ ...user, is_active: true })
    const wrapper = mountPanel(user)

    await button(wrapper, 'Reativar')!.trigger('click')
    expect(wrapper.text()).toContain('Reativar Ana?')
    await button(wrapper, 'Confirmar')!.trigger('click')
    await flushPromises()

    expect(usersService.activateUser).toHaveBeenCalledWith(7)
    expect(wrapper.text()).toContain('Usuário reativado.')
  })

  it('redefine a senha e a marca como provisória', async () => {
    vi.mocked(usersService.resetUserPassword).mockResolvedValue()
    const user = makeUser({ id: 7, name: 'Ana Souza' })
    const wrapper = mountPanel(user)

    await button(wrapper, 'Redefinir senha')!.trigger('click')
    expect(wrapper.text()).toContain(
      'Redefinir a senha de Ana? Ela volta à padrão e a sessão aberta é encerrada.',
    )
    await button(wrapper, 'Confirmar')!.trigger('click')
    await flushPromises()

    expect(usersService.resetUserPassword).toHaveBeenCalledWith(7)
    expect(wrapper.emitted('updated')).toEqual([[{ ...user, must_change_password: true }]])
    expect(wrapper.text()).toContain('Senha redefinida para a padrão.')
  })

  it('mostra "Aguarde…" e trava o Confirmar enquanto a chamada não termina', async () => {
    let resolveCall!: (user: User) => void
    vi.mocked(usersService.deactivateUser).mockReturnValue(new Promise((resolve) => (resolveCall = resolve)))
    const wrapper = mountPanel()

    await button(wrapper, 'Desativar')!.trigger('click')
    await button(wrapper, 'Confirmar')!.trigger('click')

    const waiting = button(wrapper, 'Aguarde…')
    expect(waiting).toBeDefined()
    expect(waiting!.attributes('disabled')).toBeDefined()
    expect(button(wrapper, 'Cancelar')!.attributes('disabled')).toBeDefined()
    await waiting!.trigger('click')
    expect(usersService.deactivateUser).toHaveBeenCalledTimes(1)

    resolveCall(makeUser({ id: 7, is_active: false }))
    await flushPromises()
    expect(button(wrapper, 'Aguarde…')).toBeUndefined()
  })

  it('mostra "Aguarde…" também na redefinição de senha', async () => {
    let resolveCall!: () => void
    vi.mocked(usersService.resetUserPassword).mockReturnValue(new Promise((resolve) => (resolveCall = resolve)))
    const wrapper = mountPanel()

    await button(wrapper, 'Redefinir senha')!.trigger('click')
    await button(wrapper, 'Confirmar')!.trigger('click')

    expect(button(wrapper, 'Aguarde…')!.attributes('disabled')).toBeDefined()
    resolveCall()
    await flushPromises()
  })

  it('mostra o erro ao reativar e mantém o estado', async () => {
    vi.mocked(usersService.activateUser).mockRejectedValue(
      httpError(422, { errors: { is_active: ['Não foi possível reativar.'] } }),
    )
    const wrapper = mountPanel(makeUser({ id: 7, name: 'Ana Souza', is_active: false }))

    await button(wrapper, 'Reativar')!.trigger('click')
    await button(wrapper, 'Confirmar')!.trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('Não foi possível reativar.')
    expect(wrapper.emitted('updated')).toBeUndefined()
    expect(button(wrapper, 'Reativar')).toBeDefined()
  })

  it('mostra o erro ao redefinir a senha e não marca a senha como provisória', async () => {
    vi.mocked(usersService.resetUserPassword).mockRejectedValue(
      httpError(403, { message: 'Sem permissão para redefinir a senha.' }),
    )
    const wrapper = mountPanel()

    await button(wrapper, 'Redefinir senha')!.trigger('click')
    await button(wrapper, 'Confirmar')!.trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('Sem permissão para redefinir a senha.')
    expect(wrapper.emitted('updated')).toBeUndefined()
    expect(button(wrapper, 'Redefinir senha')).toBeDefined()
  })

  it('mantém uma confirmação aberta por vez', async () => {
    const wrapper = mountPanel()

    await button(wrapper, 'Desativar')!.trigger('click')
    await button(wrapper, 'Redefinir senha')!.trigger('click')

    expect(wrapper.findAll('button').filter((b) => b.text() === 'Confirmar')).toHaveLength(1)
    expect(wrapper.text()).not.toContain('Desativar Ana?')
  })

  it('mostra a mensagem da API e mantém o estado quando falha', async () => {
    vi.mocked(usersService.deactivateUser).mockRejectedValue(
      httpError(422, { errors: { is_active: ['Você não pode desativar a si mesmo.'] } }),
    )
    const wrapper = mountPanel()

    await button(wrapper, 'Desativar')!.trigger('click')
    await button(wrapper, 'Confirmar')!.trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('Você não pode desativar a si mesmo.')
    expect(wrapper.emitted('updated')).toBeUndefined()
  })

  it('não oferece ação na própria conta', () => {
    const wrapper = mountPanel(makeUser(), true)

    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.text()).toContain(
      'Esta é a sua conta: ela não pode ser desativada nem ter a senha redefinida por aqui.',
    )
  })
})
