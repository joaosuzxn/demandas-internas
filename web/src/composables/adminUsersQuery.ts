import type { LocationQueryRaw, RouteLocationNamedRaw } from 'vue-router'
import { SEARCH_MAX, readRememberedQuery, rememberQuery, single } from '@/utils/query'

// A lista de usuários mora na URL (`/admin?busca=&pagina=`); aqui fica o que o "voltar" da edição e do
// cadastro precisa para reabrir a mesma lista.

const STORAGE_KEY = 'admin-users-query'

export interface AdminUsersQuery {
  busca?: string
  pagina?: string
}

/** Só o que vale: busca preenchida e dentro do teto, página inteira maior que 1. */
function sanitize(query: Record<string, unknown>): AdminUsersQuery {
  const result: AdminUsersQuery = {}

  const search = single(query.busca)?.trim()
  if (search && search.length <= SEARCH_MAX) result.busca = search

  const page = Number(single(query.pagina))
  if (Number.isInteger(page) && page > 1) result.pagina = String(page)

  return result
}

export function rememberAdminUsersQuery(query: Record<string, unknown>): void {
  rememberQuery(STORAGE_KEY, sanitize(query))
}

/** A lista de usuários com a busca e a página da última visita — destino do "voltar" da edição e do cadastro. */
export function adminUsersRoute(): RouteLocationNamedRaw {
  return { name: 'admin', query: sanitize(readRememberedQuery(STORAGE_KEY)) as LocationQueryRaw }
}
