import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import * as service from '@/services/dashboard'
import type {
  DashboardCategoryTotal,
  DashboardFilters,
  DashboardSummary,
  DashboardTrend,
} from '@/services/dashboard'
import { httpError } from '@/services/__tests__/fixtures'
import { useDashboardStore } from '../dashboard'

vi.mock('@/services/dashboard', () => ({
  getDashboardSummary: vi.fn<(filters: DashboardFilters) => Promise<DashboardSummary>>(),
  getDashboardCategories: vi.fn<(filters: DashboardFilters) => Promise<DashboardCategoryTotal[]>>(),
  getDashboardTrend: vi.fn<(filters: DashboardFilters) => Promise<DashboardTrend>>(),
}))

const SUMMARY: DashboardSummary = { total: 3, pending: 1, in_progress: 1, finished: 1 }
const CATEGORIES: DashboardCategoryTotal[] = [{ category: 'it', total: 3 }]
const TREND: DashboardTrend = { granularity: 'day', points: [] }

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => (resolve = done))
  return { promise, resolve }
}

describe('store do dashboard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(service.getDashboardSummary).mockReset().mockResolvedValue(SUMMARY)
    vi.mocked(service.getDashboardCategories).mockReset().mockResolvedValue(CATEGORIES)
    vi.mocked(service.getDashboardTrend).mockReset().mockResolvedValue(TREND)
  })

  it('lê as três partes em paralelo com os mesmos filtros', async () => {
    const store = useDashboardStore()
    const filters = { category: 'it' } as const

    const loading = store.load(filters)
    expect(store.summary.loading).toBe(true)
    expect(store.categories.loading).toBe(true)
    expect(store.trend.loading).toBe(true)
    await loading

    expect(service.getDashboardSummary).toHaveBeenCalledWith(filters)
    expect(service.getDashboardCategories).toHaveBeenCalledWith(filters)
    expect(service.getDashboardTrend).toHaveBeenCalledWith(filters)
    expect(store.summary).toEqual({ data: SUMMARY, loading: false, error: null })
    expect(store.categories.data).toEqual(CATEGORIES)
    expect(store.trend.data).toEqual(TREND)
  })

  it('o erro de uma parte não afeta as outras, e o retry refaz só ela', async () => {
    vi.mocked(service.getDashboardTrend).mockRejectedValueOnce(httpError(500))
    const store = useDashboardStore()

    await store.load({ category: 'hr' })
    expect(store.trend.error).toBeTruthy()
    expect(store.summary.data).toEqual(SUMMARY)

    await store.loadTrend()
    expect(store.trend).toEqual({ data: TREND, loading: false, error: null })
    expect(service.getDashboardTrend).toHaveBeenLastCalledWith({ category: 'hr' })
    expect(service.getDashboardSummary).toHaveBeenCalledTimes(1)
  })

  it('descarta a resposta de um filtro antigo que chega depois', async () => {
    const slow = deferred<DashboardSummary>()
    vi.mocked(service.getDashboardSummary).mockReturnValueOnce(slow.promise)
    const store = useDashboardStore()

    const first = store.load({ category: 'it' })
    const newer = { total: 9, pending: 9, in_progress: 0, finished: 0 }
    vi.mocked(service.getDashboardSummary).mockResolvedValueOnce(newer)
    await store.load({ category: 'hr' })
    slow.resolve(SUMMARY)
    await first

    expect(store.summary.data).toEqual(newer)
    expect(store.summary.loading).toBe(false)
  })
  // Personalizado incompleto (item 0030, revisão): nada de números de outro recorte na tela.
  it('clear apaga os dados e descarta a leitura que ainda estava a caminho', async () => {
    const slow = deferred<DashboardSummary>()
    vi.mocked(service.getDashboardSummary).mockReturnValueOnce(slow.promise)
    const store = useDashboardStore()

    const loading = store.load({})
    store.clear()
    slow.resolve(SUMMARY)
    await loading

    expect(store.summary).toEqual({ data: null, loading: false, error: null })
    expect(store.categories).toEqual({ data: null, loading: false, error: null })
    expect(store.trend).toEqual({ data: null, loading: false, error: null })
  })
})
