import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import * as authService from '@/services/auth'
import type { ChangePasswordPayload, LoginCredentials, User } from '@/services/auth'
import { httpError, makeUser, networkError } from '@/services/__tests__/fixtures'
import { installAuthGuard } from '../guard'
import { routes } from '../routes'

vi.mock('@/services/auth', () => ({
  login: vi.fn<(credentials: LoginCredentials) => Promise<User>>(),
  logout: vi.fn<() => Promise<void>>(),
  fetchMe: vi.fn<() => Promise<User>>(),
  changePassword: vi.fn<(payload: ChangePasswordPayload) => Promise<void>>(),
}))

function makeRouter() {
  const router = createRouter({ history: createMemoryHistory(), routes })
  installAuthGuard(router)
  return router
}

function withoutSession() {
  vi.mocked(authService.fetchMe).mockRejectedValue(httpError(401))
}

function withSession(overrides: Partial<User> = {}) {
  vi.mocked(authService.fetchMe).mockResolvedValue(makeUser(overrides))
}

describe('guarda de autenticação', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(authService.fetchMe).mockReset()
  })

  it('sem sessão, manda a home para o login sem redirect', async () => {
    withoutSession()
    const router = makeRouter()

    await router.push('/')

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query).toEqual({})
  })

  it('sem sessão, manda rota protegida para o login guardando o endereço pedido', async () => {
    withoutSession()
    const router = makeRouter()

    await router.push('/change-password')

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query).toEqual({ redirect: '/change-password' })
  })

  it('sem sessão, deixa abrir o login', async () => {
    withoutSession()
    const router = makeRouter()

    await router.push('/login')

    expect(router.currentRoute.value.name).toBe('login')
  })

  it('manda endereço inexistente para o login', async () => {
    withoutSession()
    const router = makeRouter()

    await router.push('/nao-existe')

    expect(router.currentRoute.value.name).toBe('login')
  })

  it('com a API fora, mostra o login em vez de travar', async () => {
    vi.mocked(authService.fetchMe).mockRejectedValue(networkError())
    const router = makeRouter()

    await router.push('/')

    expect(router.currentRoute.value.name).toBe('login')
  })

  it.each([['/'], ['/login'], ['/nao-existe']])(
    'com a troca de senha pendente, manda %s para a troca de senha',
    async (path) => {
      withSession({ must_change_password: true })
      const router = makeRouter()

      await router.push(path)

      expect(router.currentRoute.value.name).toBe('change-password')
    },
  )

  it('com a troca de senha pendente, deixa abrir a troca de senha', async () => {
    withSession({ must_change_password: true })
    const router = makeRouter()

    await router.push('/change-password')

    expect(router.currentRoute.value.name).toBe('change-password')
  })

  it.each([['/login'], ['/change-password'], ['/nao-existe']])(
    'com a senha já trocada, manda %s para as solicitações (a home)',
    async (path) => {
      withSession()
      const router = makeRouter()

      await router.push(path)

      expect(router.currentRoute.value.name).toBe('demands')
    },
  )

  it('com a senha já trocada, a home abre as solicitações', async () => {
    withSession()
    const router = makeRouter()

    await router.push('/')

    expect(router.currentRoute.value.name).toBe('demands')
  })

  it('deixa o administrador abrir as telas da administração', async () => {
    withSession({ role: 'admin' })
    const router = makeRouter()

    await router.push('/admin')
    expect(router.currentRoute.value.name).toBe('admin')

    await router.push('/admin/usuarios/novo')
    expect(router.currentRoute.value.name).toBe('admin-user-new')

    await router.push('/admin/usuarios/3/editar')
    expect(router.currentRoute.value.name).toBe('admin-user-edit')
  })

  it.each(['/admin', '/admin/usuarios/novo', '/admin/usuarios/3/editar'])(
    'manda o colaborador que abre %s para a home',
    async (path) => {
      withSession({ role: 'employee' })
      const router = makeRouter()

      await router.push(path)

      expect(router.currentRoute.value.name).toBe('demands')
    },
  )

  it('admin com senha pendente continua indo para a troca', async () => {
    withSession({ role: 'admin', must_change_password: true })
    const router = makeRouter()

    await router.push('/admin')

    expect(router.currentRoute.value.name).toBe('change-password')
  })

  it('consulta a sessão uma vez só em várias navegações', async () => {
    withSession()
    const router = makeRouter()

    await router.push('/')
    await router.push('/login')
    await router.push('/change-password')

    expect(authService.fetchMe).toHaveBeenCalledTimes(1)
  })
})
