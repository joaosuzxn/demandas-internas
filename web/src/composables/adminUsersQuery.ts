import type { LocationQueryRaw, RouteLocationNamedRaw } from 'vue-router'

// A lista de usuários mora na URL (`/admin?busca=&pagina=`); aqui fica o que o "voltar" da edição e do
// cadastro precisa para reabrir a mesma lista.

/** Mesmo teto do `search` na API. */
const SEARCH_MAX = 100
const STORAGE_KEY = 'admin-users-query'

export interface AdminUsersQuery {
  busca?: string
  pagina?: string
}

function single(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
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

// A última lista fica na sessão do navegador (a aba). Sem armazenamento (modo privado, bloqueado), o voltar
// só perde a busca e a página.
export function rememberAdminUsersQuery(query: Record<string, unknown>): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sanitize(query)))
  } catch {
    // sem armazenamento: nada a lembrar
  }
}

function rememberedQuery(): AdminUsersQuery {
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}')
    return typeof saved === 'object' && saved !== null ? sanitize(saved as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

/** A lista de usuários com a busca e a página da última visita — destino do "voltar" da edição e do cadastro. */
export function adminUsersRoute(): RouteLocationNamedRaw {
  return { name: 'admin', query: rememberedQuery() as LocationQueryRaw }
}
