import { defineStore } from 'pinia'
import { reactive } from 'vue'
import { parseApiError } from '@/services/apiErrors'
import {
  getDashboardCategories,
  getDashboardSummary,
  getDashboardTrend,
  type DashboardCategoryTotal,
  type DashboardFilters,
  type DashboardSummary,
  type DashboardTrend,
} from '@/services/dashboard'

// Uma parte do painel (item 0030): cada card carrega e falha sozinho.
export type DashboardSection<T> = { data: T | null; loading: boolean; error: string | null }

type SectionKey = 'summary' | 'categories' | 'trend'

function section<T>(): DashboardSection<T> {
  return reactive({ data: null, loading: false, error: null }) as DashboardSection<T>
}

export const useDashboardStore = defineStore('dashboard', () => {
  const summary = section<DashboardSummary>()
  const categories = section<DashboardCategoryTotal[]>()
  const trend = section<DashboardTrend>()

  let filters: DashboardFilters = {}
  // Cada leitura leva um número: resposta de um pedido que já foi substituído por outro é descartada.
  const latest: Record<SectionKey, number> = { summary: 0, categories: 0, trend: 0 }

  async function read<T>(
    key: SectionKey,
    target: DashboardSection<T>,
    fetcher: (filters: DashboardFilters) => Promise<T>,
  ): Promise<void> {
    const request = ++latest[key]
    target.loading = true
    target.error = null

    try {
      const data = await fetcher(filters)
      if (request === latest[key]) target.data = data
    } catch (error) {
      if (request === latest[key]) {
        target.error = parseApiError(error).message ?? 'Algo deu errado. Tente novamente.'
      }
    } finally {
      if (request === latest[key]) target.loading = false
    }
  }

  const loadSummary = () => read('summary', summary, getDashboardSummary)
  const loadCategories = () => read('categories', categories, getDashboardCategories)
  const loadTrend = () => read('trend', trend, getDashboardTrend)

  async function load(next: DashboardFilters): Promise<void> {
    filters = { ...next }
    await Promise.all([loadSummary(), loadCategories(), loadTrend()])
  }

  /** Sem recorte para mostrar (personalizado incompleto): apaga os dados e descarta as leituras a caminho. */
  function clear(): void {
    for (const [key, target] of [
      ['summary', summary],
      ['categories', categories],
      ['trend', trend],
    ] as const) {
      latest[key]++
      target.data = null
      target.loading = false
      target.error = null
    }
  }

  return { summary, categories, trend, load, clear, loadSummary, loadCategories, loadTrend }
})
