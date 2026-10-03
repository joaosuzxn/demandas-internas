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
  /** Só no detalhe e nas respostas das ações; a listagem não traz. */
  history?: DemandMovement[]
}

export type DemandMovementType = 'created' | 'edited' | 'started' | 'finished' | 'reopened'

// Uma movimentação do histórico (item 0026), do mais antigo ao mais recente.
export type DemandMovement = {
  id: number
  type: DemandMovementType
  actor: { id: number; name: string }
  created_at: string | null
}

export const DEMAND_MOVEMENT_LABELS: Record<DemandMovementType, string> = {
  created: 'Criada',
  edited: 'Editada',
  started: 'Iniciada',
  finished: 'Finalizada',
  reopened: 'Reaberta',
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

// Listagem (`GET /api/demands`): situação, "só as minhas" e página.
export type ListDemandsParams = {
  status?: DemandStatus
  mine?: boolean
  page?: number
}

// Filtros do quadro (item 0027), da busca: título, categoria e período pela data de criação (`AAAA-MM-DD`, dias
// inteiros no horário de Brasília; cada ponta vale sozinha).
export type DemandFilters = {
  search?: string
  category?: DemandCategory
  created_from?: string
  created_to?: string
}

// Busca (`GET /api/demands/search`): os filtros, mais a situação e a página (o quadro pede uma coluna por vez).
export type SearchDemandsParams = DemandFilters & {
  status?: DemandStatus
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

export async function searchDemands(params: SearchDemandsParams): Promise<DemandPage> {
  const { data } = await http.get<DemandPage>('/demands/search', { params })
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
