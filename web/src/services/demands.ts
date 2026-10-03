import { http } from './http'

export type DemandStatus = 'pending' | 'in_progress' | 'finished'

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

// Resposta paginada da API: a página atual, a última e o total de solicitações que batem com o filtro.
export type DemandPage = {
  data: Demand[]
  meta: { total: number; current_page: number; last_page: number }
}

// Uma coluna do quadro: o que já foi carregado (página a página, na rolagem) e o total daquela situação.
export type DemandBoardColumn = {
  items: Demand[]
  total: number
  /** Última página já carregada; há mais enquanto for menor que `lastPage`. */
  page: number
  lastPage: number
  /** A página seguinte está a caminho: a coluna não pede outra até ela chegar. */
  loadingMore: boolean
  loadMoreError: string | null
}

export type DemandBoard = Record<DemandStatus, DemandBoardColumn>

export type ListDemandsParams = {
  status?: DemandStatus
  search?: string
  page?: number
}

export const DEMAND_CATEGORY_LABELS: Record<DemandCategory, string> = {
  it: 'TI',
  hr: 'RH',
  purchasing: 'Compras',
  finance: 'Financeiro',
  infrastructure: 'Infraestrutura',
}

export const DEMAND_STATUS_LABELS: Record<DemandStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  finished: 'Finalizado',
}

// Corpo de criar e editar. A categoria vazia (nada escolhido) vai assim mesmo: quem recusa é a API, com 422.
export type DemandPayload = {
  title: string
  description: string
  category: DemandCategory | ''
}

type DemandResponse = { data: Demand }

export async function listDemands(params: ListDemandsParams = {}): Promise<DemandPage> {
  const { data } = await http.get<DemandPage>('/demands', { params })
  return data
}

export async function getDemand(id: number): Promise<Demand> {
  const { data } = await http.get<DemandResponse>(`/demands/${id}`)
  return data.data
}

export async function createDemand(payload: DemandPayload): Promise<Demand> {
  const { data } = await http.post<DemandResponse>('/demands', payload)
  return data.data
}

export async function updateDemand(id: number, payload: DemandPayload): Promise<Demand> {
  const { data } = await http.put<DemandResponse>(`/demands/${id}`, payload)
  return data.data
}

// A situação só muda pelas ações próprias da API (iniciar, finalizar, reabrir); o corpo de editar nunca leva o status.
export async function startDemand(id: number): Promise<Demand> {
  const { data } = await http.post<DemandResponse>(`/demands/${id}/start`)
  return data.data
}

export async function closeDemand(id: number): Promise<Demand> {
  const { data } = await http.post<DemandResponse>(`/demands/${id}/close`)
  return data.data
}

export async function reopenDemand(id: number): Promise<Demand> {
  const { data } = await http.post<DemandResponse>(`/demands/${id}/reopen`)
  return data.data
}

export async function deleteDemand(id: number): Promise<void> {
  await http.delete(`/demands/${id}`)
}
