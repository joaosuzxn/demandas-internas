import { describe, it, expect, vi, afterEach } from 'vitest'
import type { AxiosResponse } from 'axios'
import { http } from '../http'
import {
  closeDemand,
  createDemand,
  deleteDemand,
  getDemand,
  reopenDemand,
  startDemand,
  updateDemand,
  type Demand,
} from '../demands'

function makeDemand(overrides: Partial<Demand> = {}): Demand {
  return {
    id: 12,
    title: 'Trocar impressora',
    description: 'A do setor 2 não imprime.',
    category: 'it',
    status: 'pending',
    requester: { id: 1, name: 'Maria Souza' },
    created_at: '2026-10-01T12:00:00+00:00',
    updated_at: '2026-10-01T12:00:00+00:00',
    ...overrides,
  }
}

function ok<T>(data: T): AxiosResponse<T> {
  return { status: 200, data } as AxiosResponse<T>
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('demands service', () => {
  it('busca uma demanda pelo id e devolve o que vem em data', async () => {
    const get = vi.spyOn(http, 'get').mockResolvedValue(ok({ data: makeDemand() }))

    expect(await getDemand(12)).toEqual(makeDemand())
    expect(get).toHaveBeenCalledWith('/demands/12')
  })

  it('inicia, finaliza e reabre pelas ações próprias da API', async () => {
    const post = vi
      .spyOn(http, 'post')
      .mockResolvedValueOnce(ok({ data: makeDemand({ status: 'in_progress' }) }))
      .mockResolvedValueOnce(ok({ data: makeDemand({ status: 'finished' }) }))
      .mockResolvedValueOnce(ok({ data: makeDemand({ status: 'pending' }) }))

    expect((await startDemand(12)).status).toBe('in_progress')
    expect((await closeDemand(12)).status).toBe('finished')
    expect((await reopenDemand(12)).status).toBe('pending')
    expect(post).toHaveBeenNthCalledWith(1, '/demands/12/start')
    expect(post).toHaveBeenNthCalledWith(2, '/demands/12/close')
    expect(post).toHaveBeenNthCalledWith(3, '/demands/12/reopen')
  })

  it('exclui pelo DELETE da demanda', async () => {
    const del = vi.spyOn(http, 'delete').mockResolvedValue({ status: 204 } as AxiosResponse)

    await deleteDemand(12)

    expect(del).toHaveBeenCalledWith('/demands/12')
  })

  it('cria com POST e edita com PUT, mandando só título, descrição e categoria', async () => {
    const payload = {
      title: 'Trocar impressora',
      description: 'Não imprime.',
      category: 'it' as const,
    }
    const post = vi.spyOn(http, 'post').mockResolvedValue(ok({ data: makeDemand() }))
    const put = vi.spyOn(http, 'put').mockResolvedValue(ok({ data: makeDemand() }))

    expect(await createDemand(payload)).toEqual(makeDemand())
    expect(await updateDemand(12, payload)).toEqual(makeDemand())
    expect(post).toHaveBeenCalledWith('/demands', payload)
    expect(put).toHaveBeenCalledWith('/demands/12', payload)
  })
})
