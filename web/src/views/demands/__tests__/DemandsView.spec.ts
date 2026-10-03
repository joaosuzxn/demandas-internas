import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import DemandsView from '../DemandsView.vue'
import * as demandsService from '@/services/demands'
import type { Demand, DemandPage } from '@/services/demands'

vi.mock('@/services/demands', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/demands')>()),
  listDemands: vi.fn<(params?: demandsService.ListDemandsParams) => Promise<DemandPage>>(),
}))

function makeDemand(overrides: Partial<Demand> = {}): Demand {
  return {
    id: 1,
    title: 'Trocar impressora',
    description: 'A do setor 2 não imprime.',
    category: 'it',
    status: 'open',
    requester: { id: 1, name: 'Maria Souza' },
    created_at: '2026-10-01T12:00:00+00:00',
    updated_at: '2026-10-01T12:00:00+00:00',
    ...overrides,
  }
}

function page(data: Demand[], total = data.length): DemandPage {
  return { data, meta: { total } }
}

const Stub = defineComponent({ render: () => null })

// Os cartões são links para a tela da demanda: o quadro precisa de um router com a rota `demand`.
function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/demandas/nova', name: 'demand-new', component: Stub },
      { path: '/demandas/:id', name: 'demand', component: Stub },
    ],
  })
  return mount(DemandsView, { global: { plugins: [router] } })
}

describe('DemandsView', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    vi.mocked(demandsService.listDemands).mockReset()
    vi.mocked(demandsService.listDemands).mockImplementation(async (params = {}) => {
      if (params.status === 'closed')
        return page([makeDemand({ id: 2, title: 'Contrato de limpeza', status: 'closed' })])
      return page([makeDemand({ title: 'Trocar impressora' })])
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('carrega as abertas e as finalizadas ao abrir e mostra cada uma na sua coluna', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(demandsService.listDemands).toHaveBeenCalledWith({ status: 'open' })
    expect(demandsService.listDemands).toHaveBeenCalledWith({ status: 'closed' })
    expect(wrapper.get('[data-column="open"]').text()).toContain('Trocar impressora')
    expect(wrapper.get('[data-column="closed"]').text()).toContain('Contrato de limpeza')
  })

  it('refaz a busca pelo título, sem espaços nas pontas, depois de uma pausa na digitação', async () => {
    const wrapper = mountView()
    await flushPromises()
    vi.mocked(demandsService.listDemands).mockClear()

    await wrapper.get('input[type="search"]').setValue('  impressora ')
    vi.advanceTimersByTime(300)
    await flushPromises()

    expect(demandsService.listDemands).toHaveBeenCalledWith({
      status: 'open',
      search: 'impressora',
    })
    expect(demandsService.listDemands).toHaveBeenCalledWith({
      status: 'closed',
      search: 'impressora',
    })
  })

  it('mostra o erro quando a API não responde', async () => {
    vi.mocked(demandsService.listDemands).mockRejectedValue(new Error('rede'))

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Não foi possível carregar')
  })

  it('leva à tela de criar demanda pela pílula do cabeçalho', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.get('a[aria-label="Criar demanda"]').attributes('href')).toBe('/demandas/nova')
  })
})
