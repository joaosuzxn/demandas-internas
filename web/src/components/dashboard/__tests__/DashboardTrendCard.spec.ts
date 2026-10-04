import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DashboardTrendCard from '../DashboardTrendCard.vue'
import type { DashboardTrend } from '@/services/dashboard'

const DAILY: DashboardTrend = {
  granularity: 'day',
  points: [
    { date: '2026-10-01', created: 2, finished: 0 },
    { date: '2026-10-02', created: 1, finished: 3 },
  ],
}

describe('DashboardTrendCard', () => {
  it('mostra a legenda com os totais e o eixo por dia', () => {
    const wrapper = mount(DashboardTrendCard, { props: { trend: DAILY } })

    expect(wrapper.get('h2').text()).toBe('Evolução das solicitações')
    expect(wrapper.text()).toContain('Criadas')
    expect(wrapper.text()).toContain('Concluídas')
    expect(wrapper.text()).toContain('01/10')
    expect(wrapper.get('svg[role="img"]').attributes('aria-label')).toBe(
      'Evolução das solicitações: 3 criadas e 3 concluídas no período.',
    )
    expect(wrapper.get('ul.sr-only').text()).toContain('02/10/2026: 1 criadas, 3 concluídas.')
  })

  it('por mês, o eixo e a lista falam do mês', () => {
    const monthly: DashboardTrend = {
      granularity: 'month',
      points: [
        { date: '2026-09-01', created: 1, finished: 0 },
        { date: '2026-10-01', created: 0, finished: 1 },
      ],
    }
    const wrapper = mount(DashboardTrendCard, { props: { trend: monthly } })

    expect(wrapper.text()).toContain('out/26')
    expect(wrapper.get('ul.sr-only').text()).toContain('outubro de 2026')
  })

  it('sem pontos ou só zeros, mostra o vazio', () => {
    const zeros: DashboardTrend = {
      granularity: 'day',
      points: [{ date: '2026-10-01', created: 0, finished: 0 }],
    }

    expect(mount(DashboardTrendCard, { props: { trend: zeros } }).text()).toContain(
      'Sem solicitações no período escolhido.',
    )
    expect(
      mount(DashboardTrendCard, { props: { trend: { granularity: 'day', points: [] } } }).text(),
    ).toContain('Sem solicitações no período escolhido.')
  })

  it('erro repassa o retry', async () => {
    const wrapper = mount(DashboardTrendCard, { props: { trend: null, error: 'Falhou.' } })
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
})
