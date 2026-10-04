import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DashboardCategoriesCard from '../DashboardCategoriesCard.vue'
import type { DashboardCategoryTotal } from '@/services/dashboard'

const CATEGORIES: DashboardCategoryTotal[] = [
  { category: 'it', total: 4 },
  { category: 'hr', total: 2 },
  { category: 'purchasing', total: 0 },
  { category: 'finance', total: 0 },
  { category: 'infrastructure', total: 0 },
]

describe('DashboardCategoriesCard', () => {
  it('lista as categorias com rótulo, total e barra proporcional à maior', () => {
    const wrapper = mount(DashboardCategoriesCard, { props: { categories: CATEGORIES } })

    const items = wrapper.findAll('li')
    expect(items).toHaveLength(5)
    expect(items[0]!.text()).toContain('TI')
    expect(items[0]!.text()).toContain('4')
    expect(items[1]!.get('[data-bar]').attributes('style')).toContain('width: 50%')
  })

  it('clicar numa categoria emite select com ela', async () => {
    const wrapper = mount(DashboardCategoriesCard, { props: { categories: CATEGORIES } })

    await wrapper.get('button[aria-label="Ver apenas RH"]').trigger('click')
    expect(wrapper.emitted('select')).toEqual([['hr']])
  })

  it('tudo zerado mostra o vazio', () => {
    const zeros = CATEGORIES.map((entry) => ({ ...entry, total: 0 }))
    const wrapper = mount(DashboardCategoriesCard, { props: { categories: zeros } })

    expect(wrapper.text()).toContain('Nenhuma solicitação no período.')
  })
})
