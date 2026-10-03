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

export const DEMAND_STATUS_LABELS: Record<DemandStatus, string> = {
  open: 'A fazer',
  closed: 'Finalizado',
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

// A situação só muda pelas ações próprias da API; o corpo de editar nunca leva o status.
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
