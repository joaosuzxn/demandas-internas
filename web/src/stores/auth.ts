import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { isAxiosError } from 'axios'
import * as authService from '@/services/auth'
import type { ChangePasswordPayload, LoginCredentials, User } from '@/services/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  // true depois que a SPA sabe se existe sessão (com ou sem usuário).
  const loaded = ref(false)
  let loading: Promise<void> | null = null
  // Senha digitada no login, guardada só em memória e só enquanto a troca obrigatória está pendente:
  // a tela de troca a envia como senha atual, para a pessoa não digitar de novo.
  const loginPassword = ref<string | null>(null)

  const isAuthenticated = computed(() => user.value !== null)
  const mustChangePassword = computed(() => user.value?.must_change_password === true)

  // Consulta a sessão uma vez. Nunca rejeita: com a API fora, segue como "sem sessão" e
  // tenta de novo na próxima chamada, para a tela de login aparecer em vez de uma página em branco.
  function ensureLoaded(): Promise<void> {
    if (loaded.value) {
      return Promise.resolve()
    }

    loading ??= load().finally(() => {
      loading = null
    })

    return loading
  }

  async function load(): Promise<void> {
    try {
      user.value = await authService.fetchMe()
      loaded.value = true
    } catch (error) {
      user.value = null
      loaded.value = isAxiosError(error) && error.response?.status === 401
    }
  }

  async function login(credentials: LoginCredentials): Promise<User> {
    const loggedIn = await authService.login(credentials)
    user.value = loggedIn
    loaded.value = true
    loginPassword.value = loggedIn.must_change_password ? credentials.password : null

    return loggedIn
  }

  async function changePassword(payload: ChangePasswordPayload): Promise<void> {
    await authService.changePassword(payload)
    loginPassword.value = null

    if (user.value) {
      user.value = { ...user.value, must_change_password: false }
    }
  }

  // O usuário pediu para sair: a SPA esquece a sessão mesmo se a chamada falhar.
  async function logout(): Promise<void> {
    try {
      await authService.logout()
    } catch {
      // segue para o clear()
    } finally {
      clear()
    }
  }

  function clear(): void {
    user.value = null
    loaded.value = true
    loginPassword.value = null
  }

  // A senha guardada deixou de servir (a API a recusou): não fica na memória.
  function forgetLoginPassword(): void {
    loginPassword.value = null
  }

  function requirePasswordChange(): void {
    if (user.value) {
      user.value = { ...user.value, must_change_password: true }
    }
  }

  return {
    user,
    loaded,
    loginPassword,
    isAuthenticated,
    mustChangePassword,
    ensureLoaded,
    login,
    changePassword,
    logout,
    clear,
    forgetLoginPassword,
    requirePasswordChange,
  }
})
