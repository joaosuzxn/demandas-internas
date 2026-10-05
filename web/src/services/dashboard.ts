import { http, type Resource } from './http'
import type { DemandCategory, DemandFilters } from './demands'

// Indicadores do dashboard (item 0030): uma rota por card. Os filtros são os mesmos nas três: categoria e
// período pela data de criação (`AAAA-MM-DD`, dias inteiros no horário de Brasília; sem datas = tudo).
export type DashboardFilters = Omit<DemandFilters, 'search'>

export type DashboardSummary = { total: number; pending: number; in_progress: number; finished: number }

export type DashboardCategoryTotal = { category: DemandCategory; total: number }

// Até 93 dias (o maior "3 meses") a API manda um ponto por dia; acima disso, um por mês (a data é o dia 1).
export type DashboardGranularity = 'day' | 'month'

export type DashboardPoint = { date: string; created: number; finished: number }

export type DashboardTrend = { granularity: DashboardGranularity; points: DashboardPoint[] }

export async function getDashboardSummary(filters: DashboardFilters): Promise<DashboardSummary> {
  const { data } = await http.get<Resource<DashboardSummary>>('/dashboard/summary', { params: filters })
  return data.data
}

export async function getDashboardCategories(
  filters: DashboardFilters,
): Promise<DashboardCategoryTotal[]> {
  const { data } = await http.get<Resource<DashboardCategoryTotal[]>>('/dashboard/categories', {
    params: filters,
  })
  return data.data
}

export async function getDashboardTrend(filters: DashboardFilters): Promise<DashboardTrend> {
  const { data } = await http.get<Resource<DashboardTrend>>('/dashboard/trend', { params: filters })
  return data.data
}
