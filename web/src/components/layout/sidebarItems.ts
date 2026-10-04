import type { IconName } from '@/components/icons/icons'

export interface SidebarItem {
  label: string
  icon: IconName
  /** Nome da rota aberta pelo item (ver `router/routes.ts`). */
  routeName: string
}

// Dashboard e Demandas; as demais opções do menu ainda não foram definidas.
export const SIDEBAR_ITEMS: readonly SidebarItem[] = [
  { label: 'Dashboard', icon: 'layout-dashboard', routeName: 'dashboard' },
  { label: 'Demandas', icon: 'clipboard-list', routeName: 'demands' },
]
