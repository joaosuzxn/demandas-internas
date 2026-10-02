import type { RouteLocationNormalized, RouteLocationRaw, Router } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { loginLocation } from './redirect'

type AuthState = { isAuthenticated: boolean; mustChangePassword: boolean }

export function installAuthGuard(router: Router): void {
  router.beforeEach(async (to) => {
    const auth = useAuthStore()
    await auth.ensureLoaded()

    return destinationFor(to, auth)
  })
}

// true = segue para onde ia; senão, o destino para onde a pessoa é mandada.
function destinationFor(to: RouteLocationNormalized, auth: AuthState): RouteLocationRaw | true {
  if (!auth.isAuthenticated) {
    return to.meta.requiresAuth ? loginLocation(to.fullPath) : true
  }

  // Senha padrão pendente: só a tela de troca abre (a API bloqueia o resto do mesmo jeito).
  if (auth.mustChangePassword) {
    return to.name === 'change-password' ? true : { name: 'change-password' }
  }

  if (to.name === 'change-password' || to.meta.guestOnly) {
    return { name: 'home' }
  }

  return true
}
