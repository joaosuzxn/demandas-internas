import { computed, ref, watch, type Ref } from 'vue'
import { isAxiosError } from 'axios'
import { getDemand, type Demand } from '@/services/demands'
import { useAuthStore } from '@/stores/auth'

// Uma solicitação lida pelo id da rota: a tela da solicitação e a de editar usam a mesma carga e os mesmos estados.
export function useDemandRecord(id: Ref<number>) {
  const auth = useAuthStore()

  const demand = ref<Demand | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const notFound = ref(false)

  // Só a resposta da consulta mais recente conta: ir de uma solicitação para outra não mostra a anterior.
  let latestRequest = 0

  async function load(): Promise<void> {
    const request = ++latestRequest
    loading.value = true
    error.value = null
    notFound.value = false
    demand.value = null

    try {
      const loaded = await getDemand(id.value)
      if (request !== latestRequest) return
      demand.value = loaded
    } catch (failure) {
      if (request !== latestRequest) return
      // Excluída ou inexistente: a API responde 404 e não adianta tentar de novo.
      if (isAxiosError(failure) && failure.response?.status === 404) notFound.value = true
      else error.value = 'Não foi possível carregar a solicitação.'
    } finally {
      if (request === latestRequest) loading.value = false
    }
  }

  // Releitura sem o esqueleto: a tela fica de pé (com o aviso de erro) e só troca os dados.
  // Serve quando uma ação foi recusada porque outra pessoa mudou ou excluiu a solicitação.
  async function refresh(): Promise<void> {
    const request = ++latestRequest

    try {
      const loaded = await getDemand(id.value)
      if (request !== latestRequest) return
      demand.value = loaded
    } catch (failure) {
      if (request !== latestRequest) return
      if (isAxiosError(failure) && failure.response?.status === 404) {
        demand.value = null
        notFound.value = true
      }
      // Outra falha: fica a cópia que já está na tela.
    }
  }

  watch(id, () => void load(), { immediate: true })

  // Editar e excluir: espelha a DemandPolicy (solicitante ou admin); a API continua sendo a regra e recusa o resto.
  // Iniciar, finalizar e reabrir são de todos (ADR 0003) e não dependem disto.
  const canEdit = computed(() => {
    const user = auth.user
    if (!user || !demand.value) return false
    return user.role === 'admin' || demand.value.requester.id === user.id
  })

  return { demand, loading, error, notFound, canEdit, load, refresh }
}
