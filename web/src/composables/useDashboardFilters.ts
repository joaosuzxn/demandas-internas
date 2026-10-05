import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { DashboardFilters } from '@/services/dashboard'
import type { DemandCategory } from '@/services/demands'
import {
  describePeriod,
  parseDashboardQuery,
  resolvePresetPeriod,
  toDashboardQuery,
  validateCustomPeriod,
  type DashboardPeriod,
  type DashboardQueryState,
  type DashboardRange,
} from '@/utils/dashboard'
import { TYPING_PAUSE_MS } from '@/utils/query'

// Filtros do dashboard (item 0030). A URL é a fonte da verdade, como no quadro (item 0027): o recorte se
// compartilha, sobrevive ao F5 e o voltar do navegador o desfaz.
export function useDashboardFilters() {
  const route = useRoute()
  const router = useRouter()

  const initial = parseDashboardQuery(route.query)
  const range = ref<DashboardRange>(initial.range)
  const category = ref<DemandCategory | ''>(initial.category)
  // O que está nos campos e o que vale: o campo de data muda a cada dígito do ano (0002, 0020, 0202…), então as
  // datas só valem depois de uma pausa na digitação, como no quadro.
  const customStart = ref(initial.customStart)
  const customEnd = ref(initial.customEnd)
  const appliedStart = ref(initial.customStart)
  const appliedEnd = ref(initial.customEnd)

  let typingTimer: ReturnType<typeof setTimeout> | undefined
  watch([customStart, customEnd], ([start, end]) => {
    clearTimeout(typingTimer)
    if (start === appliedStart.value && end === appliedEnd.value) return
    typingTimer = setTimeout(() => {
      appliedStart.value = start
      appliedEnd.value = end
    }, TYPING_PAUSE_MS)
  })
  onBeforeUnmount(() => clearTimeout(typingTimer))

  const state = computed<DashboardQueryState>(() => ({
    range: range.value,
    category: category.value,
    customStart: appliedStart.value,
    customEnd: appliedEnd.value,
  }))

  const customError = computed(() =>
    range.value === 'custom' ? validateCustomPeriod(appliedStart.value, appliedEnd.value) : null,
  )

  /** O período em vigor; null em "Tudo" e no personalizado que ainda não está de pé. */
  const period = computed<DashboardPeriod | null>(() => {
    if (range.value === 'all') return null
    if (range.value === 'custom') {
      return customError.value ? null : { start: appliedStart.value, end: appliedEnd.value }
    }
    return resolvePresetPeriod(range.value)
  })

  /** O que vai para a API; null = nada a ler (personalizado incompleto ou inválido). */
  const filters = computed<DashboardFilters | null>(() => {
    if (customError.value) return null
    const result: DashboardFilters = {}
    if (category.value) result.category = category.value
    if (period.value) {
      result.created_from = period.value.start
      result.created_to = period.value.end
    }
    return result
  })

  const periodLabel = computed(() =>
    customError.value ? 'Escolha as duas datas.' : describePeriod(period.value),
  )

  /** Muda a cada recorte novo: a tela remonta o conteúdo com a entrada suave. */
  const scopeKey = computed(() => JSON.stringify(filters.value))

  // Filtro → URL. replace: cada clique no filtro não vira uma entrada nova no histórico.
  watch(state, (next) => {
    const query = toDashboardQuery(next)
    const current = toDashboardQuery(parseDashboardQuery(route.query))
    if (JSON.stringify(query) !== JSON.stringify(current)) {
      void router.replace({ name: 'dashboard', query })
    }
  })

  // URL → filtro (voltar do navegador, link colado).
  watch(
    () => route.query,
    (query) => {
      const next = parseDashboardQuery(query)
      range.value = next.range
      category.value = next.category
      // Vindo da URL não há digitação: vale na hora.
      clearTimeout(typingTimer)
      customStart.value = appliedStart.value = next.customStart
      customEnd.value = appliedEnd.value = next.customEnd
    },
  )

  return { range, category, customStart, customEnd, customError, filters, periodLabel, scopeKey }
}
