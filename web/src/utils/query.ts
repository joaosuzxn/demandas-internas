// Filtros que moram na URL (o quadro, a lista de usuários, o dashboard) e o "voltar" que reabre a última lista.

/** Teto do `search` na API (`SearchDemandsRequest` e `ListUsersRequest`). */
export const SEARCH_MAX = 100

/** Pausa na digitação antes de consultar a API: uma consulta por tecla seria uma requisição a mais por letra. */
export const TYPING_PAUSE_MS = 300

/** Valor de um parâmetro da URL; repetido (`?a=1&a=2` vira array) ou ausente não vale. */
export function single(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

// A última lista fica na sessão do navegador (a aba). O armazenamento pode faltar (modo privado, bloqueado):
// sem ele, o voltar só perde os filtros. Quem relê passa o resultado pelo próprio sanitize.
export function rememberQuery(key: string, query: object): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(query))
  } catch {
    // sem armazenamento: nada a lembrar
  }
}

export function readRememberedQuery(key: string): Record<string, unknown> {
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(key) ?? '{}')
    return typeof saved === 'object' && saved !== null ? (saved as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}
