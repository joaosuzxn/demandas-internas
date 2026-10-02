import type { RouteRecordRaw } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    // Só com sessão (e com a senha padrão já trocada, exceto a própria troca).
    requiresAuth?: boolean
    // Só sem sessão: quem já entrou é mandado para a home.
    guestOnly?: boolean
  }
}

// Nunca começar um caminho com /api ou /sanctum: são da API (ADR 0001).
export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: HomeView, meta: { requiresAuth: true } },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/change-password',
    name: 'change-password',
    component: () => import('@/views/ChangePasswordView.vue'),
    meta: { requiresAuth: true },
  },
  // Endereço inexistente: vai para a home (e a guarda manda ao login se não houver sessão).
  // O redirect usa `path` e não `name` porque o redirect por nome herda o parâmetro `pathMatch` e gera aviso do Vue Router.
  { path: '/:pathMatch(.*)*', redirect: { path: '/' } },
]
