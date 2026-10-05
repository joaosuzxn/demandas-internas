import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import DemandsBoard from '../DemandsBoard.vue'
import type { Demand, DemandBoard, DemandBoardColumn } from '@/services/demands'
import { installIntersectionObserver } from '@/components/ui/__tests__/intersectionObserver'

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

function makeBoard(
  pending: Demand[] = [],
  inProgress: Demand[] = [],
  finished: Demand[] = [],
  totals: Partial<Record<'pending' | 'in_progress' | 'finished', number>> = {},
): DemandBoard {
  return {
    pending: column(pending, totals.pending),
    in_progress: column(inProgress, totals.in_progress),
    finished: column(finished, totals.finished),
  }
}

// Coluna na primeira página; com total maior que os itens, há uma página seguinte.
function column(
  items: Demand[],
  total = items.length,
  overrides: Partial<DemandBoardColumn> = {},
): DemandBoardColumn {
  return {
    items,
    total,
    page: 1,
    lastPage: total > items.length ? 2 : 1,
    loadingMore: false,
    loadMoreError: null,
    ...overrides,
  }
}

const Stub = defineComponent({ render: () => null })

// O cartão é link para a tela da solicitação: o quadro precisa de um router com a rota `demand`.
function mountBoard(props: Partial<InstanceType<typeof DemandsBoard>['$props']> = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/solicitacoes/:id', name: 'demand', component: Stub }],
  })
  return mount(DemandsBoard, {
    props: { board: makeBoard(), ...props },
    global: { plugins: [router] },
  })
}

describe('DemandsBoard', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('mostra as colunas pendente, em andamento e finalizado com a contagem total', () => {
    const wrapper = mountBoard({
      board: makeBoard([], [], [], { pending: 25, in_progress: 4, finished: 3 }),
    })

    const columns = wrapper
      .findAll('[data-column]')
      .map((column) => column.attributes('data-column'))
    expect(columns).toEqual(['pending', 'in_progress', 'finished'])
    expect(wrapper.get('[data-column="pending"]').text()).toContain('Pendente')
    expect(wrapper.get('[data-column="pending"]').text()).toContain('25')
    expect(wrapper.get('[data-column="in_progress"]').text()).toContain('Em andamento')
    expect(wrapper.get('[data-column="in_progress"]').text()).toContain('4')
    expect(wrapper.get('[data-column="finished"]').text()).toContain('Finalizada')
    expect(wrapper.get('[data-column="finished"]').text()).toContain('3')
  })

  it('põe cada solicitação na coluna do seu status', () => {
    const wrapper = mountBoard({
      board: makeBoard(
        [makeDemand({ id: 1, title: 'Trocar impressora' })],
        [makeDemand({ id: 2, title: 'Pintar sala', status: 'in_progress' })],
        [makeDemand({ id: 3, title: 'Contrato de limpeza', status: 'finished' })],
      ),
    })

    expect(wrapper.get('[data-column="pending"]').text()).toContain('Trocar impressora')
    expect(wrapper.get('[data-column="in_progress"]').text()).toContain('Pintar sala')
    expect(wrapper.get('[data-column="finished"]').text()).toContain('Contrato de limpeza')
    expect(wrapper.get('[data-column="pending"]').text()).not.toContain('Pintar sala')
  })

  // Foco de revisão 4: o vazio do quadro soma as três colunas.
  it('com solicitações só em andamento, mostra o quadro e não o vazio', () => {
    const wrapper = mountBoard({ board: makeBoard([], [makeDemand({ status: 'in_progress' })]) })

    expect(wrapper.text()).not.toContain('Nenhuma solicitação registrada ainda.')
    expect(wrapper.get('[data-column="in_progress"]').text()).toContain('Trocar impressora')
  })

  it('mostra categoria em português e quem pediu no cartão', () => {
    const wrapper = mountBoard({
      board: makeBoard([
        makeDemand({ category: 'infrastructure', requester: { id: 4, name: 'João Lima' } }),
      ]),
    })

    expect(wrapper.text()).toContain('Infraestrutura')
    expect(wrapper.text()).toContain('João Lima')
  })

  // O número é o protocolo da solicitação, no mesmo formato do título da tela da solicitação.
  it('mostra o número antes do título no cartão', () => {
    const wrapper = mountBoard({
      board: makeBoard([makeDemand({ id: 12, title: 'Trocar impressora' })]),
    })

    expect(wrapper.get('[data-demand="12"] [data-demand-title]').text()).toBe(
      '#12 - Trocar impressora',
    )
  })

  it('leva à tela da solicitação ao clicar no cartão', () => {
    const wrapper = mountBoard({ board: makeBoard([makeDemand({ id: 12 })]) })

    expect(wrapper.get('[data-demand="12"] a').attributes('href')).toBe('/solicitacoes/12')
  })

  it('pede a página seguinte quando a rolagem da coluna chega ao fim', () => {
    const io = installIntersectionObserver()
    const wrapper = mountBoard({ board: makeBoard([makeDemand()], [], [], { pending: 45 }) })

    io.reveal()

    expect(wrapper.emitted('load-more')).toEqual([['pending']])
    // O aviso "Mostrando x de y" saiu: o total ao lado do nome da coluna já diz quantas existem.
    expect(wrapper.text()).not.toContain('Mostrando')
  })

  it('não vigia o fim da coluna que já está completa', () => {
    const io = installIntersectionObserver()
    mountBoard({ board: makeBoard([makeDemand()]) })

    expect(io.active()).toHaveLength(0)
  })

  it('mostra "Carregando mais…" e não pede de novo enquanto a página chega', () => {
    const io = installIntersectionObserver()
    const board = makeBoard()
    board.pending = column([makeDemand()], 45, { loadingMore: true })
    const wrapper = mountBoard({ board })

    io.reveal()

    expect(wrapper.get('[data-column="pending"]').text()).toContain('Carregando mais…')
    expect(wrapper.emitted('load-more')).toBeUndefined()
  })

  it('no erro ao carregar mais, mostra o aviso e tenta de novo pelo botão', async () => {
    const io = installIntersectionObserver()
    const board = makeBoard()
    board.pending = column([makeDemand()], 45, { loadMoreError: 'Não foi possível carregar mais.' })
    const wrapper = mountBoard({ board })

    io.reveal()
    expect(wrapper.emitted('load-more')).toBeUndefined()

    const pending = wrapper.get('[data-column="pending"]')
    expect(pending.text()).toContain('Não foi possível carregar mais.')
    // O que já apareceu continua na coluna.
    expect(pending.text()).toContain('Trocar impressora')

    await pending.get('button').trigger('click')

    expect(wrapper.emitted('load-more')).toEqual([['pending']])
  })

  it('vigia o fim de novo a cada página nova, mesmo se ele continuar à vista', async () => {
    const io = installIntersectionObserver()
    const board = makeBoard([makeDemand()], [], [], { pending: 45 })
    board.pending.lastPage = 3
    const wrapper = mountBoard({ board })

    io.reveal()
    await wrapper.setProps({
      board: {
        ...board,
        pending: { ...board.pending, page: 2, items: [makeDemand(), makeDemand({ id: 2 })] },
      },
    })
    io.reveal()

    expect(wrapper.emitted('load-more')).toEqual([['pending'], ['pending']])
  })

  it('diz que não há solicitações quando o quadro inteiro está vazio', () => {
    const wrapper = mountBoard()

    expect(wrapper.text()).toContain('Nenhuma solicitação registrada ainda.')
  })

  it('diz que os filtros não acharam nada quando há filtro em vigor', () => {
    const wrapper = mountBoard({ filtering: true })

    expect(wrapper.text()).toContain('Nenhuma solicitação corresponde aos filtros.')
  })

  it('mostra o estado de carregamento sem as colunas', () => {
    const wrapper = mountBoard({ loading: true })

    expect(wrapper.get('[role="status"]').text()).toContain('Carregando')
  })

  it('mostra o erro com botão para tentar de novo', async () => {
    const wrapper = mountBoard({ error: 'Não foi possível carregar as solicitações.' })

    expect(wrapper.get('[role="alert"]').text()).toContain('Não foi possível carregar')

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
})
