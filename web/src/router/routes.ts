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

// Login e troca de senha usam a mesma tela: o Vue Router reaproveita a instância ao ir de uma rota
// para a outra, então o card fica montado e só troca o conteúdo, com animação.
const LoginView = () => import('@/views/login/LoginView.vue')
const DefaultLayout = () => import('@/layouts/DefaultLayout.vue')
const DemandsView = () => import('@/views/demands/DemandsView.vue')

// Nunca começar um caminho com /api ou /sanctum: são da API (ADR 0001).
export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: HomeView, meta: { requiresAuth: true } },
  { path: '/login', name: 'login', component: LoginView, meta: { guestOnly: true } },
  {
    path: '/change-password',
    name: 'change-password',
    component: LoginView,
    meta: { requiresAuth: true },
  },
  // Telas com a sidebar: o layout é o pai, a tela de demandas é a filha.
  {
    path: '/demandas',
    component: DefaultLayout,
    meta: { requiresAuth: true },
    children: [{ path: '', name: 'demands', component: DemandsView }],
  },
  // Endereço inexistente: vai para a home (e a guarda manda ao login se não houver sessão).
  // O redirect usa `path` e não `name` porque o redirect por nome herda o parâmetro `pathMatch` e gera aviso do Vue Router.
  { path: '/:pathMatch(.*)*', redirect: { path: '/' } },
]
