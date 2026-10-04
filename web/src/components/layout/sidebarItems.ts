import type { IconName } from '@/components/icons/icons'

export interface SidebarItem {
  label: string
  icon: IconName
  /** Nome da rota aberta pelo item (ver `router/routes.ts`). */
  routeName: string
  /** Só aparece para o administrador. */
  adminOnly?: boolean
}

// Solicitações, Dashboard e, só para o administrador, a Administração.
export const SIDEBAR_ITEMS: readonly SidebarItem[] = [
  { label: 'Solicitações', icon: 'clipboard-list', routeName: 'demands' },
  { label: 'Dashboard', icon: 'layout-dashboard', routeName: 'dashboard' },
  { label: 'Administração', icon: 'users', routeName: 'admin', adminOnly: true },
]
