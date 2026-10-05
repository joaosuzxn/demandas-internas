import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import NewUserView from '../NewUserView.vue'
import * as usersService from '@/services/users'
import type { UserPayload } from '@/services/users'
import type { User } from '@/services/auth'
import { makeUser } from '@/services/__tests__/fixtures'
import { rememberAdminUsersQuery } from '@/composables/adminUsersQuery'

vi.mock('@/services/users', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/users')>()),
  createUser: vi.fn<(payload: UserPayload) => Promise<User>>(),
}))

const Stub = defineComponent({ render: () => null })

describe('NewUserView', () => {
  beforeEach(() => sessionStorage.clear())

  it('volta à lista com a busca e a página da última visita (salvar, voltar e cancelar)', async () => {
    rememberAdminUsersQuery({ busca: 'ana', pagina: '2' })
    vi.mocked(usersService.createUser).mockResolvedValue(makeUser())
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/admin', name: 'admin', component: Stub },
        { path: '/admin/usuarios/novo', name: 'admin-user-new', component: NewUserView },
      ],
    })
    await router.push('/admin/usuarios/novo')
    const wrapper = mount(NewUserView, { global: { plugins: [router] } })

    const hrefs = wrapper.findAll('a').map((link) => link.attributes('href'))
    expect(hrefs.filter((href) => href === '/admin?busca=ana&pagina=2')).toHaveLength(2)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ busca: 'ana', pagina: '2' })
    expect(router.options.history.state.notice).toBe('Usuário cadastrado.')
  })

  it('volta à lista com o aviso depois de cadastrar', async () => {
    vi.mocked(usersService.createUser).mockResolvedValue(makeUser())
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/admin', name: 'admin', component: Stub },
        { path: '/admin/usuarios/novo', name: 'admin-user-new', component: NewUserView },
      ],
    })
    await router.push('/admin/usuarios/novo')
    const wrapper = mount(NewUserView, { global: { plugins: [router] } })

    expect(wrapper.get('h1').text()).toBe('Novo usuário')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('admin')
    expect(router.options.history.state.notice).toBe('Usuário cadastrado.')
  })
})
