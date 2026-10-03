import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import DemandsView from '../DemandsView.vue'
import * as demandsService from '@/services/demands'
import type { Demand, DemandPage } from '@/services/demands'
import { installIntersectionObserver } from '@/components/ui/__tests__/intersectionObserver'

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
    status: 'pending',
    requester: { id: 1, name: 'Maria Souza' },
    created_at: '2026-10-01T12:00:00+00:00',
    updated_at: '2026-10-01T12:00:00+00:00',
    ...overrides,
  }
}

function page(data: Demand[], total = data.length, currentPage = 1, lastPage = 1): DemandPage {
  return { data, meta: { total, current_page: currentPage, last_page: lastPage } }
}

// Demandas pendentes a partir de um id. As páginas aqui são do mock (20): a SPA não supõe tamanho,
// só segue current_page e last_page (a API pagina de 10 em 10).
function pendingRange(from: number, count = 20): Demand[] {
  return Array.from({ length: count }, (_, index) =>
    makeDemand({ id: from + index, title: `Pendente ${from + index}` }),
  )
}

// Pendentes em 3 páginas (20 + 20 + 5); as outras colunas, vazias.
function paginatedPending(params: demandsService.ListDemandsParams = {}): DemandPage {
  if (params.status !== 'pending') return page([])
  const current = params.page ?? 1
  if (current === 1) return page(pendingRange(1), 45, 1, 3)
  if (current === 2) return page(pendingRange(21), 45, 2, 3)
  return page(pendingRange(41, 5), 45, 3, 3)
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
      if (params.status === 'finished')
        return page([makeDemand({ id: 2, title: 'Contrato de limpeza', status: 'finished' })])
      if (params.status === 'in_progress')
        return page([makeDemand({ id: 3, title: 'Pintar sala', status: 'in_progress' })])
      return page([makeDemand({ title: 'Trocar impressora' })])
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('carrega as três situações ao abrir e mostra cada uma na sua coluna', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(demandsService.listDemands).toHaveBeenCalledWith({ status: 'pending' })
    expect(demandsService.listDemands).toHaveBeenCalledWith({ status: 'in_progress' })
    expect(demandsService.listDemands).toHaveBeenCalledWith({ status: 'finished' })
    expect(wrapper.get('[data-column="pending"]').text()).toContain('Trocar impressora')
    expect(wrapper.get('[data-column="in_progress"]').text()).toContain('Pintar sala')
    expect(wrapper.get('[data-column="finished"]').text()).toContain('Contrato de limpeza')
  })

  it('refaz a busca pelo título, sem espaços nas pontas, depois de uma pausa na digitação', async () => {
    const wrapper = mountView()
    await flushPromises()
    vi.mocked(demandsService.listDemands).mockClear()

    await wrapper.get('input[type="search"]').setValue('  impressora ')
    vi.advanceTimersByTime(300)
    await flushPromises()

    expect(demandsService.listDemands).toHaveBeenCalledWith({
      status: 'pending',
      search: 'impressora',
    })
    expect(demandsService.listDemands).toHaveBeenCalledWith({
      status: 'in_progress',
      search: 'impressora',
    })
    expect(demandsService.listDemands).toHaveBeenCalledWith({
      status: 'finished',
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

  describe('rolagem infinita', () => {
    function pendingCards(wrapper: ReturnType<typeof mountView>) {
      return wrapper.get('[data-column="pending"]').findAll('[data-demand]')
    }

    it('ao chegar no fim da coluna, busca a página seguinte e acrescenta', async () => {
      const io = installIntersectionObserver()
      vi.mocked(demandsService.listDemands).mockImplementation(async (params) =>
        paginatedPending(params),
      )

      const wrapper = mountView()
      await flushPromises()
      expect(pendingCards(wrapper)).toHaveLength(20)

      io.reveal()
      await flushPromises()

      expect(demandsService.listDemands).toHaveBeenCalledWith({ status: 'pending', page: 2 })
      expect(pendingCards(wrapper)).toHaveLength(40)
      expect(pendingCards(wrapper)[20]!.text()).toContain('Pendente 21')
    })

    it('para na última página', async () => {
      const io = installIntersectionObserver()
      vi.mocked(demandsService.listDemands).mockImplementation(async (params) =>
        paginatedPending(params),
      )

      const wrapper = mountView()
      await flushPromises()
      for (let round = 0; round < 3; round++) {
        io.reveal()
        await flushPromises()
      }

      expect(pendingCards(wrapper)).toHaveLength(45)
      const pages = vi
        .mocked(demandsService.listDemands)
        .mock.calls.map(([params]) => params?.page)
        .filter((value) => value !== undefined)
      expect(pages).toEqual([2, 3])
    })

    it('não pede a mesma coluna duas vezes enquanto a página chega', async () => {
      const io = installIntersectionObserver()
      vi.mocked(demandsService.listDemands).mockImplementation(async (params) =>
        paginatedPending(params),
      )
      const wrapper = mountView()
      await flushPromises()

      let release: (value: DemandPage) => void = () => {}
      vi.mocked(demandsService.listDemands).mockImplementation(
        () => new Promise<DemandPage>((resolve) => (release = resolve)),
      )
      io.reveal()
      io.reveal()
      await flushPromises()

      expect(demandsService.listDemands).toHaveBeenCalledTimes(4)
      expect(wrapper.get('[data-column="pending"]').text()).toContain('Carregando mais…')

      release(page(pendingRange(21), 45, 2, 3))
      await flushPromises()
      expect(pendingCards(wrapper)).toHaveLength(40)
    })

    it('ignora demanda que já está na coluna (as páginas andam quando alguém cria uma)', async () => {
      const io = installIntersectionObserver()
      vi.mocked(demandsService.listDemands).mockImplementation(async (params) => {
        if (params?.status !== 'pending') return page([])
        // A página 2 começa repetindo a última da página 1.
        return params.page === 2
          ? page(pendingRange(20, 20), 46, 2, 3)
          : page(pendingRange(1), 46, 1, 3)
      })

      const wrapper = mountView()
      await flushPromises()
      io.reveal()
      await flushPromises()

      const ids = pendingCards(wrapper).map((card) => card.attributes('data-demand'))
      expect(ids).toHaveLength(39)
      expect(new Set(ids).size).toBe(39)
    })

    it('no erro, mantém o que já apareceu e tenta de novo pelo botão', async () => {
      const io = installIntersectionObserver()
      vi.mocked(demandsService.listDemands).mockImplementation(async (params) =>
        paginatedPending(params),
      )
      const wrapper = mountView()
      await flushPromises()

      vi.mocked(demandsService.listDemands).mockRejectedValueOnce(new Error('rede'))
      io.reveal()
      await flushPromises()

      const pending = wrapper.get('[data-column="pending"]')
      expect(pending.text()).toContain('Não foi possível carregar mais.')
      expect(pendingCards(wrapper)).toHaveLength(20)

      await pending
        .findAll('button')
        .find((button) => button.text() === 'Tentar de novo')!
        .trigger('click')
      await flushPromises()

      expect(pendingCards(wrapper)).toHaveLength(40)
      expect(wrapper.get('[data-column="pending"]').text()).not.toContain(
        'Não foi possível carregar mais.',
      )
    })

    it('a busca recomeça da primeira página, e a rolagem segue com o termo', async () => {
      const io = installIntersectionObserver()
      vi.mocked(demandsService.listDemands).mockImplementation(async (params) =>
        paginatedPending(params),
      )
      const wrapper = mountView()
      await flushPromises()
      io.reveal()
      await flushPromises()
      expect(pendingCards(wrapper)).toHaveLength(40)

      await wrapper.get('input[type="search"]').setValue('pendente')
      vi.advanceTimersByTime(300)
      await flushPromises()

      expect(pendingCards(wrapper)).toHaveLength(20)

      vi.mocked(demandsService.listDemands).mockClear()
      io.reveal()
      await flushPromises()

      expect(demandsService.listDemands).toHaveBeenCalledWith({
        status: 'pending',
        search: 'pendente',
        page: 2,
      })
    })

    it('página que chega depois de uma busca nova é descartada', async () => {
      const io = installIntersectionObserver()
      vi.mocked(demandsService.listDemands).mockImplementation(async (params) =>
        paginatedPending(params),
      )
      const wrapper = mountView()
      await flushPromises()

      let release: (value: DemandPage) => void = () => {}
      vi.mocked(demandsService.listDemands).mockImplementationOnce(
        () => new Promise<DemandPage>((resolve) => (release = resolve)),
      )
      io.reveal()
      await flushPromises()

      await wrapper.get('input[type="search"]').setValue('pendente')
      vi.advanceTimersByTime(300)
      await flushPromises()

      release(page(pendingRange(21), 45, 2, 3))
      await flushPromises()

      expect(pendingCards(wrapper)).toHaveLength(20)
    })
  })
})
