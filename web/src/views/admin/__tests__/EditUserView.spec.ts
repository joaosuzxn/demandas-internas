import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import EditUserView from '../EditUserView.vue'
import * as usersService from '@/services/users'
import type { UserPayload } from '@/services/users'
import type { User } from '@/services/auth'
import { httpError, makeUser, networkError } from '@/services/__tests__/fixtures'
import { rememberAdminUsersQuery } from '@/composables/adminUsersQuery'
import { useAuthStore } from '@/stores/auth'

vi.mock('@/services/users', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/users')>()),
  getUser: vi.fn<(id: number) => Promise<User>>(),
  updateUser: vi.fn<(id: number, payload: UserPayload) => Promise<User>>(),
  deactivateUser: vi.fn<(id: number) => Promise<User>>(),
}))

const Stub = defineComponent({ render: () => null })

// Quem está logado é o administrador de id 1.
async function mountView(id = 7) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin', name: 'admin', component: Stub },
      { path: '/admin/usuarios/:id/editar', name: 'admin-user-edit', component: EditUserView },
    ],
  })
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().user = makeUser({ id: 1, role: 'admin' })

  await router.push(`/admin/usuarios/${id}/editar`)
  const wrapper = mount(EditUserView, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return { router, wrapper }
}

describe('EditUserView', () => {
  beforeEach(() => {
    vi.mocked(usersService.getUser)
      .mockReset()
      .mockResolvedValue(makeUser({ id: 7, name: 'Ana Souza' }))
    vi.mocked(usersService.updateUser).mockReset()
    vi.mocked(usersService.deactivateUser).mockReset()
    sessionStorage.clear()
  })

  it('carrega o usuário no formulário e mostra o painel de acesso', async () => {
    const { wrapper } = await mountView()

    expect(usersService.getUser).toHaveBeenCalledWith(7)
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('Ana Souza')
    expect(wrapper.text()).toContain('Acesso')
    expect(wrapper.findAll('button').some((button) => button.text() === 'Desativar')).toBe(true)
  })

  it('volta à lista com o aviso depois de salvar', async () => {
    vi.mocked(usersService.updateUser).mockResolvedValue(makeUser({ id: 7 }))
    const { router, wrapper } = await mountView()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('admin')
    expect(router.options.history.state.notice).toBe('Usuário atualizado.')
  })

  it('volta à lista com a busca e a página da última visita (salvar, voltar e cancelar)', async () => {
    rememberAdminUsersQuery({ busca: 'ana', pagina: '2' })
    vi.mocked(usersService.updateUser).mockResolvedValue(makeUser({ id: 7 }))
    const { router, wrapper } = await mountView()

    const hrefs = wrapper.findAll('a').map((link) => link.attributes('href'))
    expect(hrefs.filter((href) => href === '/admin?busca=ana&pagina=2')).toHaveLength(2)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('admin')
    expect(router.currentRoute.value.query).toEqual({ busca: 'ana', pagina: '2' })
    expect(router.options.history.state.notice).toBe('Usuário atualizado.')
  })

  it('no 404, o link volta à lista com a busca e a página', async () => {
    rememberAdminUsersQuery({ busca: 'ana' })
    vi.mocked(usersService.getUser).mockRejectedValue(httpError(404, { message: 'x' }))
    const { wrapper } = await mountView()

    const links = wrapper.findAll('a[href="/admin?busca=ana"]')
    expect(links.length).toBeGreaterThanOrEqual(2)
  })

  it('trocar de usuário com uma confirmação aberta não a mantém', async () => {
    vi.mocked(usersService.getUser).mockImplementation(async (id) => makeUser({ id, name: `Pessoa ${id}` }))
    const { router, wrapper } = await mountView()

    await wrapper.findAll('button').find((b) => b.text() === 'Desativar')!.trigger('click')
    expect(wrapper.findAll('button').some((b) => b.text() === 'Confirmar')).toBe(true)

    await router.push('/admin/usuarios/8/editar')
    await flushPromises()

    expect(wrapper.findAll('button').some((b) => b.text() === 'Confirmar')).toBe(false)
  })

  it('ignora a resposta de um usuário que não é mais o da tela', async () => {
    let resolveOld!: (user: User) => void
    vi.mocked(usersService.getUser)
      .mockReset()
      .mockReturnValueOnce(new Promise((resolve) => (resolveOld = resolve)))
      .mockResolvedValueOnce(makeUser({ id: 8, name: 'Beto Novo' }))
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/admin', name: 'admin', component: Stub },
        { path: '/admin/usuarios/:id/editar', name: 'admin-user-edit', component: EditUserView },
      ],
    })
    const pinia = createPinia()
    setActivePinia(pinia)
    useAuthStore().user = makeUser({ id: 1, role: 'admin' })
    await router.push('/admin/usuarios/7/editar')
    const wrapper = mount(EditUserView, { global: { plugins: [pinia, router] } })
    await router.push('/admin/usuarios/8/editar')
    await flushPromises()
    resolveOld(makeUser({ id: 7, name: 'Ana Velha' }))
    await flushPromises()

    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('Beto Novo')
  })

  it('atualiza o painel de acesso com o que a ação devolveu', async () => {
    vi.mocked(usersService.deactivateUser).mockResolvedValue(
      makeUser({ id: 7, name: 'Ana Souza', is_active: false }),
    )
    const { wrapper } = await mountView()

    await wrapper.findAll('button').find((b) => b.text() === 'Desativar')!.trigger('click')
    await wrapper.findAll('button').find((b) => b.text() === 'Confirmar')!.trigger('click')
    await flushPromises()

    expect(wrapper.findAll('button').some((button) => button.text() === 'Reativar')).toBe(true)
  })

  it('não oferece ação de acesso na própria conta', async () => {
    vi.mocked(usersService.getUser).mockResolvedValue(makeUser({ id: 1, role: 'admin' }))
    const { wrapper } = await mountView(1)

    const labels = wrapper.findAll('button').map((button) => button.text())
    expect(labels).not.toContain('Desativar')
    expect(labels).not.toContain('Redefinir senha')
    expect(wrapper.text()).toContain('Esta é a sua conta')
  })

  it('no 404, diz que o usuário não foi encontrado, sem botão de tentar de novo', async () => {
    vi.mocked(usersService.getUser).mockRejectedValue(httpError(404, { message: 'Registro não encontrado.' }))
    const { wrapper } = await mountView()

    expect(wrapper.text()).toContain('Usuário não encontrado.')
    expect(wrapper.find('a[href="/admin"]').exists()).toBe(true)
    expect(wrapper.findAll('button').some((button) => button.text() === 'Tentar de novo')).toBe(false)
    expect(wrapper.text()).not.toContain('Acesso')
  })

  it('mostra os outros erros com tentar de novo', async () => {
    vi.mocked(usersService.getUser).mockRejectedValueOnce(networkError())
    const { wrapper } = await mountView()

    await wrapper.findAll('button').find((b) => b.text() === 'Tentar de novo')!.trigger('click')
    await flushPromises()

    expect(usersService.getUser).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Acesso')
  })
})
