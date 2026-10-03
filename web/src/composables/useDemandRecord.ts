import { computed, ref, watch, type Ref } from 'vue'
import { isAxiosError } from 'axios'
import { getDemand, type Demand } from '@/services/demands'
import { useAuthStore } from '@/stores/auth'

// Uma demanda lida pelo id da rota: a tela da demanda e a de editar usam a mesma carga e os mesmos estados.
export function useDemandRecord(id: Ref<number>) {
  const auth = useAuthStore()

  const demand = ref<Demand | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const notFound = ref(false)

  // Só a resposta da consulta mais recente conta: ir de uma demanda para outra não mostra a anterior.
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
      else error.value = 'Não foi possível carregar a demanda.'
    } finally {
      if (request === latestRequest) loading.value = false
    }
  }

  watch(id, () => void load(), { immediate: true })

  // Espelha a DemandPolicy (solicitante ou admin); a API continua sendo a regra e recusa o resto.
  const canManage = computed(() => {
    const user = auth.user
    if (!user || !demand.value) return false
    return user.role === 'admin' || demand.value.requester.id === user.id
  })

  return { demand, loading, error, notFound, canManage, load }
}
