import type { LocationQuery, LocationQueryRaw, RouteLocationRaw } from 'vue-router'
import { DEMAND_CATEGORY_LABELS, type DemandCategory, type DemandFilters } from '@/services/demands'

// Os filtros do quadro moram na URL (`/demandas?category=hr&created_from=…`), com os nomes da API (item 0027):
// o filtro se compartilha, sobrevive ao F5 e o voltar do navegador o desfaz.

/** Mesmo teto do `ListDemandsRequest`. */
export const SEARCH_MAX = 100
const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/
const STORAGE_KEY = 'demands-board-query'

function single(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

// `AAAA-MM-DD` que existe no calendário (31/02 não).
export function isDate(value: string): boolean {
  if (!DATE_FORMAT.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
}

function isCategory(value: string): value is DemandCategory {
  return Object.prototype.hasOwnProperty.call(DEMAND_CATEGORY_LABELS, value)
}

/**
 * Os filtros que a URL traz. O que não vale (categoria desconhecida, data impossível, período invertido) é
 * ignorado em silêncio: o quadro abre como se aquele filtro não existisse, em vez de um erro.
 */
export function parseBoardQuery(query: LocationQuery | Record<string, unknown>): DemandFilters {
  const filters: DemandFilters = {}

  const search = single(query.search)?.trim()
  if (search && search.length <= SEARCH_MAX) filters.search = search

  const category = single(query.category)
  if (category && isCategory(category)) filters.category = category

  const from = single(query.created_from)
  const to = single(query.created_to)
  const validFrom = from && isDate(from) ? from : undefined
  const validTo = to && isDate(to) ? to : undefined
  // As datas em `AAAA-MM-DD` se comparam como texto.
  if (!(validFrom && validTo && validTo < validFrom)) {
    if (validFrom) filters.created_from = validFrom
    if (validTo) filters.created_to = validTo
  }

  return filters
}

/** A query da URL: só o que está preenchido. */
export function toBoardQuery(filters: DemandFilters): LocationQueryRaw {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value))
}

// O último quadro fica na sessão do navegador (a aba): o "voltar" das telas da demanda volta para ele.
// O armazenamento pode faltar (modo privado, bloqueado): sem ele, o voltar só perde os filtros.
export function rememberBoardQuery(filters: DemandFilters): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toBoardQuery(filters)))
  } catch {
    // sem armazenamento: nada a lembrar
  }
}

function rememberedFilters(): DemandFilters {
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}')
    return typeof saved === 'object' && saved !== null ? parseBoardQuery(saved as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

/** O quadro de demandas com os filtros da última visita — destino do "voltar" das telas da demanda. */
export function demandsBoardRoute(): RouteLocationRaw {
  return { name: 'demands', query: toBoardQuery(rememberedFilters()) }
}
