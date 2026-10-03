import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import DemandsBoard from '../DemandsBoard.vue'
import type { Demand, DemandBoard } from '@/services/demands'

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
    pending: { items: pending, total: totals.pending ?? pending.length },
    in_progress: { items: inProgress, total: totals.in_progress ?? inProgress.length },
    finished: { items: finished, total: totals.finished ?? finished.length },
  }
}

const Stub = defineComponent({ render: () => null })

// O cartão é link para a tela da demanda: o quadro precisa de um router com a rota `demand`.
function mountBoard(props: Partial<InstanceType<typeof DemandsBoard>['$props']> = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/demandas/:id', name: 'demand', component: Stub }],
  })
  return mount(DemandsBoard, {
    props: { board: makeBoard(), ...props },
    global: { plugins: [router] },
  })
}

describe('DemandsBoard', () => {
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
    expect(wrapper.get('[data-column="finished"]').text()).toContain('Finalizado')
    expect(wrapper.get('[data-column="finished"]').text()).toContain('3')
  })

  it('põe cada demanda na coluna do seu status', () => {
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
  it('com demandas só em andamento, mostra o quadro e não o vazio', () => {
    const wrapper = mountBoard({ board: makeBoard([], [makeDemand({ status: 'in_progress' })]) })

    expect(wrapper.text()).not.toContain('Nenhuma demanda registrada ainda.')
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

  it('leva à tela da demanda ao clicar no cartão', () => {
    const wrapper = mountBoard({ board: makeBoard([makeDemand({ id: 12 })]) })

    expect(wrapper.get('[data-demand="12"] a').attributes('href')).toBe('/demandas/12')
  })

  it('avisa quando a coluna mostra só parte do total', () => {
    const wrapper = mountBoard({ board: makeBoard([makeDemand()], [], [], { pending: 45 }) })

    expect(wrapper.get('[data-column="pending"]').text()).toContain('Mostrando 1 de 45')
  })

  it('diz que não há demandas quando o quadro inteiro está vazio', () => {
    const wrapper = mountBoard()

    expect(wrapper.text()).toContain('Nenhuma demanda registrada ainda.')
  })

  it('diz que a busca não achou nada quando há busca em vigor', () => {
    const wrapper = mountBoard({ searching: true })

    expect(wrapper.text()).toContain('Nenhuma demanda corresponde à busca.')
  })

  it('mostra o estado de carregamento sem as colunas', () => {
    const wrapper = mountBoard({ loading: true })

    expect(wrapper.get('[role="status"]').text()).toContain('Carregando')
  })

  it('mostra o erro com botão para tentar de novo', async () => {
    const wrapper = mountBoard({ error: 'Não foi possível carregar as demandas.' })

    expect(wrapper.get('[role="alert"]').text()).toContain('Não foi possível carregar')

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
})
