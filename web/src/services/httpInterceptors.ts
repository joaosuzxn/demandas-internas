import { isAxiosError } from 'axios'
import type { Pinia } from 'pinia'
import type { Router } from 'vue-router'
import { loginLocation } from '@/router/redirect'
import { useAuthStore } from '@/stores/auth'
import { csrfCookie, http } from './http'

// Fica fora do http.ts para o cliente HTTP não importar a store nem o router (importação circular).
// O erro é sempre rejeitado de novo: a tela que fez a chamada precisa parar o "carregando".
export function installHttpInterceptors(router: Router, pinia: Pinia): number {
  return http.interceptors.response.use(undefined, async (error: unknown) => {
    if (!isAxiosError(error) || !error.response || !error.config) {
      throw error
    }

    const { status, data } = error.response
    const config = error.config
    const auth = useAuthStore(pinia)

    // Token CSRF vencido (aba aberta há muito tempo): renova e repete uma única vez.
    if (status === 419 && !config.csrfRetried) {
      config.csrfRetried = true

      try {
        await csrfCookie()
      } catch {
        throw error
      }

      return http.request(config)
    }

    // Sessão encerrada: conta desativada, senha redefinida pelo admin ou sessão expirada.
    if (status === 401 && !config.skipAuthRedirect) {
      auth.clear()

      const current = router.currentRoute.value
      if (current.name !== 'login') {
        void router.push(loginLocation(current.fullPath))
      }
    }

    if (status === 403 && isPasswordChangeRequired(data)) {
      auth.requirePasswordChange()
      void router.push({ name: 'change-password' })
    }

    throw error
  })
}

function isPasswordChangeRequired(data: unknown): boolean {
  return (
    typeof data === 'object' &&
    data !== null &&
    'code' in data &&
    data.code === 'PASSWORD_CHANGE_REQUIRED'
  )
}
