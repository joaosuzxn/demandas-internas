import { createRouter, createWebHistory } from 'vue-router'
import { installAuthGuard } from './guard'
import { routes } from './routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

installAuthGuard(router)

export default router
