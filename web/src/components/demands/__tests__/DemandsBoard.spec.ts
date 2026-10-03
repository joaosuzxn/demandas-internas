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
    status: 'open',
    requester: { id: 1, name: 'Maria Souza' },
    created_at: '2026-10-01T12:00:00+00:00',
    updated_at: '2026-10-01T12:00:00+00:00',
    ...overrides,
  }
}

function makeBoard(
  open: Demand[] = [],
  closed: Demand[] = [],
  totals: { open?: number; closed?: number } = {},
): DemandBoard {
  return {
    open: { items: open, total: totals.open ?? open.length },
    closed: { items: closed, total: totals.closed ?? closed.length },
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
  it('mostra as colunas a fazer e finalizado com a contagem total', () => {
    const wrapper = mountBoard({ board: makeBoard([], [], { open: 25, closed: 3 }) })

    expect(wrapper.get('[data-column="open"]').text()).toContain('A fazer')
    expect(wrapper.get('[data-column="open"]').text()).toContain('25')
    expect(wrapper.get('[data-column="closed"]').text()).toContain('Finalizado')
    expect(wrapper.get('[data-column="closed"]').text()).toContain('3')
  })

  it('põe cada demanda na coluna do seu status', () => {
    const wrapper = mountBoard({
      board: makeBoard(
        [makeDemand({ id: 1, title: 'Trocar impressora' })],
        [makeDemand({ id: 2, title: 'Contrato de limpeza', status: 'closed' })],
      ),
    })

    expect(wrapper.get('[data-column="open"]').text()).toContain('Trocar impressora')
    expect(wrapper.get('[data-column="open"]').text()).not.toContain('Contrato de limpeza')
    expect(wrapper.get('[data-column="closed"]').text()).toContain('Contrato de limpeza')
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
    const wrapper = mountBoard({ board: makeBoard([makeDemand()], [], { open: 45 }) })

    expect(wrapper.get('[data-column="open"]').text()).toContain('Mostrando 1 de 45')
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
