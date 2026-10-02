import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import * as authService from '@/services/auth'
import type { ChangePasswordPayload, LoginCredentials, User } from '@/services/auth'
import { httpError, makeUser, networkError } from '@/services/__tests__/fixtures'
import { useAuthStore } from '../auth'

vi.mock('@/services/auth', () => ({
  login: vi.fn<(credentials: LoginCredentials) => Promise<User>>(),
  logout: vi.fn<() => Promise<void>>(),
  fetchMe: vi.fn<() => Promise<User>>(),
  changePassword: vi.fn<(payload: ChangePasswordPayload) => Promise<void>>(),
}))

const passwordPayload: ChangePasswordPayload = {
  current_password: '123@Senha',
  password: 'Nova@Senha1',
  password_confirmation: 'Nova@Senha1',
}

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(authService.login).mockReset()
    vi.mocked(authService.logout).mockReset()
    vi.mocked(authService.fetchMe).mockReset()
    vi.mocked(authService.changePassword).mockReset()
  })

  it('começa sem usuário e sem ter consultado a sessão', () => {
    const auth = useAuthStore()

    expect(auth.user).toBeNull()
    expect(auth.loaded).toBe(false)
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.mustChangePassword).toBe(false)
  })

  it('carrega o usuário da sessão', async () => {
    vi.mocked(authService.fetchMe).mockResolvedValue(makeUser({ must_change_password: true }))
    const auth = useAuthStore()

    await auth.ensureLoaded()

    expect(auth.loaded).toBe(true)
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.mustChangePassword).toBe(true)
  })

  it('fica sem usuário quando a API responde 401', async () => {
    vi.mocked(authService.fetchMe).mockRejectedValue(httpError(401))
    const auth = useAuthStore()

    await auth.ensureLoaded()

    expect(auth.loaded).toBe(true)
    expect(auth.isAuthenticated).toBe(false)
  })

  it('consulta a sessão uma vez só, mesmo com chamadas simultâneas e repetidas', async () => {
    vi.mocked(authService.fetchMe).mockResolvedValue(makeUser())
    const auth = useAuthStore()

    await Promise.all([auth.ensureLoaded(), auth.ensureLoaded()])
    await auth.ensureLoaded()

    expect(authService.fetchMe).toHaveBeenCalledTimes(1)
  })

  it('trata a API fora como sem sessão e tenta de novo na chamada seguinte', async () => {
    vi.mocked(authService.fetchMe).mockRejectedValueOnce(networkError())
    vi.mocked(authService.fetchMe).mockResolvedValueOnce(makeUser())
    const auth = useAuthStore()

    await expect(auth.ensureLoaded()).resolves.toBeUndefined()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.loaded).toBe(false)

    await auth.ensureLoaded()
    expect(auth.isAuthenticated).toBe(true)
    expect(authService.fetchMe).toHaveBeenCalledTimes(2)
  })

  it('guarda o usuário devolvido pelo login', async () => {
    const credentials = { login: 'maria.souza', password: 'Minha@Senha1', remember: true }
    vi.mocked(authService.login).mockResolvedValue(makeUser({ id: 5 }))
    const auth = useAuthStore()

    const user = await auth.login(credentials)

    expect(authService.login).toHaveBeenCalledWith(credentials)
    expect(user.id).toBe(5)
    expect(auth.user?.id).toBe(5)
    expect(auth.loaded).toBe(true)
  })

  it('não guarda usuário quando o login falha', async () => {
    vi.mocked(authService.login).mockRejectedValue(httpError(422))
    const auth = useAuthStore()

    await expect(auth.login({ login: 'a', password: 'b', remember: false })).rejects.toThrow(
      'HTTP 422',
    )
    expect(auth.isAuthenticated).toBe(false)
  })

  it('baixa a pendência depois de trocar a senha', async () => {
    vi.mocked(authService.fetchMe).mockResolvedValue(makeUser({ must_change_password: true }))
    vi.mocked(authService.changePassword).mockResolvedValue()
    const auth = useAuthStore()
    await auth.ensureLoaded()

    await auth.changePassword(passwordPayload)

    expect(authService.changePassword).toHaveBeenCalledWith(passwordPayload)
    expect(auth.mustChangePassword).toBe(false)
    expect(auth.isAuthenticated).toBe(true)
  })

  it('mantém a pendência quando a troca de senha falha', async () => {
    vi.mocked(authService.fetchMe).mockResolvedValue(makeUser({ must_change_password: true }))
    vi.mocked(authService.changePassword).mockRejectedValue(httpError(422))
    const auth = useAuthStore()
    await auth.ensureLoaded()

    await expect(auth.changePassword(passwordPayload)).rejects.toThrow('HTTP 422')
    expect(auth.mustChangePassword).toBe(true)
  })

  it('limpa o usuário ao sair', async () => {
    vi.mocked(authService.fetchMe).mockResolvedValue(makeUser())
    vi.mocked(authService.logout).mockResolvedValue()
    const auth = useAuthStore()
    await auth.ensureLoaded()

    await auth.logout()

    expect(auth.isAuthenticated).toBe(false)
  })

  it('limpa o usuário mesmo se a chamada de sair falhar', async () => {
    vi.mocked(authService.fetchMe).mockResolvedValue(makeUser())
    vi.mocked(authService.logout).mockRejectedValue(networkError())
    const auth = useAuthStore()
    await auth.ensureLoaded()

    await expect(auth.logout()).resolves.toBeUndefined()
    expect(auth.isAuthenticated).toBe(false)
  })

  it('clear tira o usuário sem ir à rede e marca a sessão como consultada', async () => {
    vi.mocked(authService.fetchMe).mockResolvedValue(makeUser())
    const auth = useAuthStore()
    await auth.ensureLoaded()

    auth.clear()
    await auth.ensureLoaded()

    expect(auth.isAuthenticated).toBe(false)
    expect(authService.fetchMe).toHaveBeenCalledTimes(1)
    expect(authService.logout).not.toHaveBeenCalled()
  })

  it('requirePasswordChange marca a troca como pendente', async () => {
    vi.mocked(authService.fetchMe).mockResolvedValue(makeUser())
    const auth = useAuthStore()
    await auth.ensureLoaded()

    auth.requirePasswordChange()

    expect(auth.mustChangePassword).toBe(true)
  })
})
