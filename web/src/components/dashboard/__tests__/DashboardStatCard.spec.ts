import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DashboardStatCard from '../DashboardStatCard.vue'

describe('DashboardStatCard', () => {
  it('mostra o rótulo, o número em pt-BR e o ícone', () => {
    const wrapper = mount(DashboardStatCard, {
      props: { label: 'Total', value: 1234, icon: 'clipboard-list' },
    })

    expect(wrapper.get('h3').text()).toBe('Total')
    expect(wrapper.text()).toContain('1.234')
    expect(wrapper.find('svg').exists()).toBe(true)
  })
})
