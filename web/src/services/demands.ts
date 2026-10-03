import { http } from './http'

export type DemandStatus = 'open' | 'closed'

export type DemandCategory = 'it' | 'hr' | 'purchasing' | 'finance' | 'infrastructure'

// Espelho do DemandResource da API.
export type Demand = {
  id: number
  title: string
  description: string
  category: DemandCategory
  status: DemandStatus
  requester: { id: number; name: string }
  created_at: string | null
  updated_at: string | null
}

// Resposta paginada da API: a página atual e o total de solicitações que batem com o filtro.
export type DemandPage = {
  data: Demand[]
  meta: { total: number }
}

// Uma coluna do quadro: as solicitações carregadas e o total que existe para aquela situação.
export type DemandBoardColumn = { items: Demand[]; total: number }

export type DemandBoard = Record<DemandStatus, DemandBoardColumn>

export type ListDemandsParams = {
  status?: DemandStatus
  search?: string
}

export const DEMAND_CATEGORY_LABELS: Record<DemandCategory, string> = {
  it: 'TI',
  hr: 'RH',
  purchasing: 'Compras',
  finance: 'Financeiro',
  infrastructure: 'Infraestrutura',
}

export async function listDemands(params: ListDemandsParams = {}): Promise<DemandPage> {
  const { data } = await http.get<DemandPage>('/demands', { params })
  return data
}
