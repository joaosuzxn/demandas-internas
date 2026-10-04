import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter, type HistoryState } from 'vue-router'
import AdminUsersView from '../AdminUsersView.vue'
import * as usersService from '@/services/users'
import type { ListUsersParams, UserPage } from '@/services/users'
import { makeUser, networkError } from '@/services/__tests__/fixtures'
import { adminUsersRoute } from '@/composables/adminUsersQuery'

vi.mock('@/services/users', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/users')>()),
  listUsers: vi.fn<(params?: ListUsersParams) => Promise<UserPage>>(),
}))

const Stub = defineComponent({ render: () => null })
const list = vi.mocked(usersService.listUsers)

function page(overrides: Partial<UserPage> = {}): UserPage {
  return { items: [makeUser()], page: 1, lastPage: 1, total: 1, ...overrides }
}

async function mountView(path = '/admin', state?: HistoryState) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin', name: 'admin', component: AdminUsersView },
      { path: '/admin/usuarios/novo', name: 'admin-user-new', component: Stub },
      { path: '/admin/usuarios/:id/editar', name: 'admin-user-edit', component: Stub },
    ],
  })
  await router.push(state ? { path, state } : path)
  const wrapper = mount(AdminUsersView, { global: { plugins: [router] } })
  await flushPromises()
  return { router, wrapper }
}

describe('AdminUsersView', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    list.mockReset().mockResolvedValue(page())
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('lista cada usuário com selos, @usuário, e-mail, CPF formatado e link para a edição', async () => {
    list.mockResolvedValue(
      page({
        items: [
          makeUser({ id: 1, name: 'Administrador', role: 'admin' }),
          makeUser({ id: 2, name: 'Beto Lima', is_active: false, must_change_password: true }),
        ],
        total: 2,
      }),
    )
    const { wrapper } = await mountView()

    expect(list).toHaveBeenCalledWith({ search: undefined, page: 1 })
    const rows = wrapper.findAll('li')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('Administrador')
    expect(rows[0]!.text()).toContain('@maria.souza · maria@example.com · 123.456.789-09')
    expect(rows[0]!.find('a').attributes('href')).toBe('/admin/usuarios/1/editar')
    expect(rows[1]!.text()).toContain('Desativado')
    expect(rows[1]!.text()).toContain('Senha provisória')
    expect(rows[1]!.text()).not.toContain('Administrador')
    expect(wrapper.find('a[href="/admin/usuarios/novo"]').exists()).toBe(true)
  })

  it('lê a busca e a página da URL', async () => {
    list.mockResolvedValue(page({ page: 2, lastPage: 3, total: 41 }))
    const { wrapper } = await mountView('/admin?busca=ana&pagina=2')

    expect(list).toHaveBeenCalledWith({ search: 'ana', page: 2 })
    expect((wrapper.get('input[type="search"]').element as HTMLInputElement).value).toBe('ana')
    expect(wrapper.text()).toContain('Página 2 de 3')
  })

  it.each(['abc', '0', '-2', '1.5'])('trata ?pagina=%s como página 1', async (value) => {
    await mountView(`/admin?pagina=${value}`)

    expect(list).toHaveBeenCalledWith({ search: undefined, page: 1 })
  })

  it('grava a busca na URL depois da pausa, sem espaços nas pontas, de volta à página 1', async () => {
    const { router, wrapper } = await mountView('/admin?pagina=3')
    list.mockClear()

    await wrapper.get('input[type="search"]').setValue('  jo ')
    vi.advanceTimersByTime(299)
    await flushPromises()
    expect(list).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({ busca: 'jo' })
    expect(list).toHaveBeenCalledWith({ search: 'jo', page: 1 })
  })

  it('aplica a busca na hora com Enter', async () => {
    const { router, wrapper } = await mountView()

    const input = wrapper.get('input[type="search"]')
    await input.setValue('ana')
    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ busca: 'ana' })
  })

  it('descarta a resposta que chega depois de uma mais nova', async () => {
    let resolveOld!: (value: UserPage) => void
    const { wrapper } = await mountView()
    list
      .mockReturnValueOnce(new Promise((resolve) => (resolveOld = resolve)))
      .mockResolvedValueOnce(page({ items: [makeUser({ name: 'Ana Nova' })] }))

    const input = wrapper.get('input[type="search"]')
    await input.setValue('an')
    await input.trigger('keydown', { key: 'Enter' })
    // A primeira navegação termina (e o pedido de "an" sai) antes da segunda.
    await flushPromises()
    await input.setValue('ana')
    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    resolveOld(page({ items: [makeUser({ name: 'Resultado Velho' })] }))
    await flushPromises()

    expect(wrapper.text()).toContain('Ana Nova')
    expect(wrapper.text()).not.toContain('Resultado Velho')
  })

  it('vai para a última página quando a da URL passa dela', async () => {
    list
      .mockResolvedValueOnce(page({ items: [], page: 9, lastPage: 2, total: 21 }))
      .mockResolvedValueOnce(page({ page: 2, lastPage: 2, total: 21 }))
    const { router, wrapper } = await mountView('/admin?pagina=9')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ pagina: '2' })
    expect(list).toHaveBeenLastCalledWith({ search: undefined, page: 2 })
    expect(wrapper.text()).not.toContain('Nenhum usuário')
  })

  it('não mostra o vazio enquanto redireciona para a última página', async () => {
    list
      .mockResolvedValueOnce(page({ items: [], page: 9, lastPage: 2, total: 21 }))
      .mockResolvedValueOnce(page({ page: 2, lastPage: 2, total: 21 }))
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/admin', name: 'admin', component: AdminUsersView },
        { path: '/admin/usuarios/novo', name: 'admin-user-new', component: Stub },
        { path: '/admin/usuarios/:id/editar', name: 'admin-user-edit', component: Stub },
      ],
    })
    await router.push('/admin?pagina=9')
    // Segura a navegação do redirect: é o intervalo em que a tela já tem a resposta e ainda não a nova URL.
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    let holding = true
    router.beforeEach(async () => {
      if (holding) await gate
    })
    const wrapper = mount(AdminUsersView, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.text()).not.toContain('Nenhum usuário')
    expect(wrapper.find('[role="status"]').exists()).toBe(true)

    holding = false
    release()
    await flushPromises()
    expect(wrapper.text()).not.toContain('Nenhum usuário')
  })

  it('lembra a busca e a página para o voltar da edição', async () => {
    list.mockResolvedValue(page({ page: 2, lastPage: 3, total: 41 }))
    const { router } = await mountView('/admin?busca=ana&pagina=2')
    expect(adminUsersRoute()).toEqual({ name: 'admin', query: { busca: 'ana', pagina: '2' } })

    await router.push('/admin?busca=beto')
    await flushPromises()
    expect(adminUsersRoute()).toEqual({ name: 'admin', query: { busca: 'beto' } })
  })

  it('troca de página pela paginação, mantendo a busca', async () => {
    list.mockResolvedValue(page({ lastPage: 3, total: 41 }))
    const { router, wrapper } = await mountView('/admin?busca=ana')

    const next = wrapper.findAll('button').find((button) => button.text() === 'Próxima')!
    await next.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ busca: 'ana', pagina: '2' })
    expect(window.scrollTo).toHaveBeenCalled()
  })

  it('esconde a paginação quando há uma página só', async () => {
    const { wrapper } = await mountView()

    expect(wrapper.text()).not.toContain('Página 1 de 1')
  })

  it('mostra a mensagem de vazio com e sem busca', async () => {
    list.mockResolvedValue(page({ items: [], total: 0 }))

    expect((await mountView()).wrapper.text()).toContain('Nenhum usuário cadastrado.')
    expect((await mountView('/admin?busca=zzz')).wrapper.text()).toContain(
      'Nenhum usuário encontrado para esta busca.',
    )
  })

  it('mostra o erro e tenta de novo', async () => {
    list.mockRejectedValueOnce(networkError())
    const { wrapper } = await mountView()

    expect(wrapper.text()).toContain('Não foi possível falar com o servidor. Tente novamente.')

    const retry = wrapper.findAll('button').find((button) => button.text() === 'Tentar de novo')!
    await retry.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Maria Souza')
  })

  it('mostra o aviso de quem chega do formulário', async () => {
    const { wrapper } = await mountView('/admin', { notice: 'Usuário cadastrado.' })

    expect(wrapper.get('[data-arrival-notice]').text()).toContain('Usuário cadastrado.')
  })
})
