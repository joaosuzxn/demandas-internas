import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DemandTimeline from '../DemandTimeline.vue'
import type { DemandMovement } from '@/services/demands'

function movement(overrides: Partial<DemandMovement> = {}): DemandMovement {
  return {
    id: 1,
    type: 'created',
    actor: { id: 1, name: 'Maria Souza' },
    created_at: '2026-10-03T12:00:00+00:00',
    ...overrides,
  }
}

describe('DemandTimeline', () => {
  it('mostra cada movimentação na ordem, com rótulo, autor e data', () => {
    const wrapper = mount(DemandTimeline, {
      props: {
        history: [
          movement(),
          movement({ id: 2, type: 'started', actor: { id: 9, name: 'Admin' } }),
          movement({ id: 3, type: 'finished', actor: { id: 9, name: 'Admin' } }),
        ],
      },
    })

    const items = wrapper.findAll('li')
    expect(items.map((item) => item.get('[data-movement-type]').text())).toEqual([
      'Criada',
      'Iniciada',
      'Finalizada',
    ])
    expect(items[1]!.text()).toContain('Admin')
    expect(items[0]!.text()).toContain('03/10/2026')
  })

  it('dá nome a todos os tipos', () => {
    const types = ['created', 'edited', 'started', 'finished', 'reopened'] as const
    const wrapper = mount(DemandTimeline, {
      props: { history: types.map((type, index) => movement({ id: index + 1, type })) },
    })

    expect(wrapper.findAll('[data-movement-type]').map((label) => label.text())).toEqual([
      'Criada',
      'Editada',
      'Iniciada',
      'Finalizada',
      'Reaberta',
    ])
  })

  it('sem movimentação, diz que não há registro', () => {
    const wrapper = mount(DemandTimeline, { props: { history: [] } })

    expect(wrapper.text()).toContain('Nenhuma movimentação registrada.')
    expect(wrapper.find('ol').exists()).toBe(false)
  })

  it('a seção se chama Movimentação', () => {
    const wrapper = mount(DemandTimeline, { props: { history: [] } })

    expect(wrapper.get('h2').text()).toBe('Movimentação')
  })
})
