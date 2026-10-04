import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import DashboardView from '../DashboardView.vue'
import * as service from '@/services/dashboard'
import type {
  DashboardCategoryTotal,
  DashboardFilters,
  DashboardSummary,
  DashboardTrend,
} from '@/services/dashboard'
import { httpError } from '@/services/__tests__/fixtures'

vi.mock('@/services/dashboard', () => ({
  getDashboardSummary: vi.fn<(filters: DashboardFilters) => Promise<DashboardSummary>>(),
  getDashboardCategories: vi.fn<(filters: DashboardFilters) => Promise<DashboardCategoryTotal[]>>(),
  getDashboardTrend: vi.fn<(filters: DashboardFilters) => Promise<DashboardTrend>>(),
}))

const SUMMARY: DashboardSummary = { total: 10, pending: 4, in_progress: 3, finished: 3 }
const CATEGORIES: DashboardCategoryTotal[] = [
  { category: 'it', total: 6 },
  { category: 'hr', total: 4 },
  { category: 'purchasing', total: 0 },
  { category: 'finance', total: 0 },
  { category: 'infrastructure', total: 0 },
]
const TREND: DashboardTrend = {
  granularity: 'day',
  points: [{ date: '2026-10-04', created: 10, finished: 3 }],
}

const App = defineComponent({ render: () => h(RouterView) })

async function mountAt(path = '/dashboard') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/dashboard', name: 'dashboard', component: DashboardView }],
  })
  await router.push(path)
  const wrapper = mount(App, { global: { plugins: [router], stubs: { teleport: true } } })
  return { wrapper, router }
}

describe('DashboardView', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
    vi.setSystemTime(new Date(2026, 9, 4, 12))
    setActivePinia(createPinia())
    vi.mocked(service.getDashboardSummary).mockReset().mockResolvedValue(SUMMARY)
    vi.mocked(service.getDashboardCategories).mockReset().mockResolvedValue(CATEGORIES)
    vi.mocked(service.getDashboardTrend).mockReset().mockResolvedValue(TREND)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('mostra o esqueleto e depois os quatro números, em Tudo', async () => {
    // A resposta fica presa até o esqueleto ser conferido: o `await` da montagem já resolveria a promessa.
    let resolveSummary!: (summary: DashboardSummary) => void
    vi.mocked(service.getDashboardSummary).mockReturnValueOnce(
      new Promise((resolve) => (resolveSummary = resolve)),
    )
    const { wrapper } = await mountAt()
    expect(wrapper.find('[role="status"]').exists()).toBe(true)

    resolveSummary(SUMMARY)
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Dashboard')
    const cards = wrapper.findAll('h3').map((title) => title.text())
    expect(cards).toEqual(['Total', 'Pendentes', 'Em atendimento', 'Concluídas'])
    expect(wrapper.text()).toContain('10')
    expect(service.getDashboardSummary).toHaveBeenCalledWith({})
  })

  it('o erro de um card não derruba os outros', async () => {
    vi.mocked(service.getDashboardTrend).mockRejectedValue(httpError(500))
    const { wrapper } = await mountAt()
    await flushPromises()

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Por categoria')
    expect(wrapper.findAll('h3')).toHaveLength(4)
  })

  it('clicar numa categoria filtra o painel, e o card de categorias some', async () => {
    const { wrapper, router } = await mountAt()
    await flushPromises()

    await wrapper.get('button[aria-label="Ver apenas RH"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ category: 'hr' })
    expect(service.getDashboardSummary).toHaveBeenLastCalledWith({ category: 'hr' })
    expect(wrapper.text()).not.toContain('Por categoria')
  })

  it('personalizado incompleto não lê nada; completo, lê', async () => {
    const { wrapper } = await mountAt('/dashboard?range=custom&created_from=2026-10-01')
    await flushPromises()
    expect(service.getDashboardSummary).not.toHaveBeenCalled()

    const end = wrapper.findAll('input[type="date"]')[1]!
    await end.setValue('2026-10-02')
    vi.advanceTimersByTime(300)
    await flushPromises()
    expect(service.getDashboardSummary).toHaveBeenCalledWith({
      created_from: '2026-10-01',
      created_to: '2026-10-02',
    })
  })
  // Revisão do item 0030: ao passar para o personalizado sem datas, os números de "1 mês" não ficam na tela.
  it('personalizado sem as duas datas mostra o aviso no lugar dos números', async () => {
    const { wrapper } = await mountAt('/dashboard?range=month')
    await flushPromises()
    expect(wrapper.findAll('h3')).toHaveLength(4)

    const custom = wrapper
      .findAll('button[aria-pressed]')
      .find((button) => button.text() === 'Personalizado')!
    await custom.trigger('click')
    await flushPromises()

    expect(wrapper.findAll('h3')).toHaveLength(0)
    expect(wrapper.text()).not.toContain('Por categoria')
    expect(wrapper.text()).toContain('Escolha as duas datas para ver os números.')
  })
})
