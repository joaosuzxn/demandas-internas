import { describe, it, expect, vi, afterEach } from 'vitest'
import type { AxiosResponse } from 'axios'
import { http } from '../http'
import { getDashboardCategories, getDashboardSummary, getDashboardTrend } from '../dashboard'

function ok<T>(data: T): AxiosResponse<T> {
  return { status: 200, data } as AxiosResponse<T>
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('dashboard service', () => {
  const filters = { category: 'hr', created_from: '2026-10-01', created_to: '2026-10-04' } as const

  it('lê as três rotas com os filtros na query e devolve o que vem em data', async () => {
    const summary = { total: 3, pending: 1, in_progress: 1, finished: 1 }
    const categories = [{ category: 'hr', total: 3 }]
    const trend = { granularity: 'day', points: [{ date: '2026-10-01', created: 1, finished: 0 }] }
    const get = vi
      .spyOn(http, 'get')
      .mockResolvedValueOnce(ok({ data: summary }))
      .mockResolvedValueOnce(ok({ data: categories }))
      .mockResolvedValueOnce(ok({ data: trend }))

    expect(await getDashboardSummary(filters)).toEqual(summary)
    expect(get).toHaveBeenLastCalledWith('/dashboard/summary', { params: filters })
    expect(await getDashboardCategories(filters)).toEqual(categories)
    expect(get).toHaveBeenLastCalledWith('/dashboard/categories', { params: filters })
    expect(await getDashboardTrend(filters)).toEqual(trend)
    expect(get).toHaveBeenLastCalledWith('/dashboard/trend', { params: filters })
  })
})
