import type { LocationQuery, LocationQueryRaw, RouteLocationRaw } from 'vue-router'
import { DEMAND_CATEGORY_LABELS, type DemandCategory, type DemandFilters } from '@/services/demands'
import { isFilterDay } from '@/utils/dates'
import { SEARCH_MAX, readRememberedQuery, rememberQuery, single } from '@/utils/query'

// Os filtros do quadro moram na URL (`/solicitacoes?category=hr&created_from=…`), com os nomes da API (item 0027):
// o filtro se compartilha, sobrevive ao F5 e o voltar do navegador o desfaz.

const STORAGE_KEY = 'demands-board-query'

function isCategory(value: string): value is DemandCategory {
  return Object.prototype.hasOwnProperty.call(DEMAND_CATEGORY_LABELS, value)
}

/**
 * Os filtros que a URL traz. O que não vale (categoria desconhecida, data impossível, período invertido) é
 * ignorado em silêncio (data antes de 2000 também): o quadro abre como se aquele filtro não existisse, em vez de um erro.
 */
export function parseBoardQuery(query: LocationQuery | Record<string, unknown>): DemandFilters {
  const filters: DemandFilters = {}

  const search = single(query.search)?.trim()
  if (search && search.length <= SEARCH_MAX) filters.search = search

  const category = single(query.category)
  if (category && isCategory(category)) filters.category = category

  const from = single(query.created_from)
  const to = single(query.created_to)
  const validFrom = from && isFilterDay(from) ? from : undefined
  const validTo = to && isFilterDay(to) ? to : undefined
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

// O último quadro fica na sessão do navegador (a aba): o "voltar" das telas da solicitação volta para ele.
export function rememberBoardQuery(filters: DemandFilters): void {
  rememberQuery(STORAGE_KEY, toBoardQuery(filters))
}

/** O quadro de solicitações com os filtros da última visita — destino do "voltar" das telas da solicitação. */
export function demandsBoardRoute(): RouteLocationRaw {
  return { name: 'demands', query: toBoardQuery(parseBoardQuery(readRememberedQuery(STORAGE_KEY))) }
}
