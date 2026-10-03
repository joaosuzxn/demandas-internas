import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import NewDemandView from '../NewDemandView.vue'
import * as demandsService from '@/services/demands'
import type { Demand, DemandPayload } from '@/services/demands'
import { rememberBoardQuery } from '@/composables/demandsBoardQuery'

vi.mock('@/services/demands', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/demands')>()),
  createDemand: vi.fn<(payload: DemandPayload) => Promise<Demand>>(),
}))

const Stub = defineComponent({ render: () => null })

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/demandas', name: 'demands', component: Stub },
      { path: '/demandas/nova', name: 'demand-new', component: NewDemandView },
      { path: '/demandas/:id', name: 'demand', component: Stub },
    ],
  })
  await router.push('/demandas/nova')
  const wrapper = mount(NewDemandView, {
    global: { plugins: [router], stubs: { teleport: true } },
  })
  return { router, wrapper }
}

describe('NewDemandView', () => {
  beforeEach(() => sessionStorage.clear())

  it('o voltar e o cancelar levam ao quadro com os filtros da última visita', async () => {
    rememberBoardQuery({ created_from: '2026-10-01' })
    const { wrapper } = await mountView()

    const board = '/demandas?created_from=2026-10-01'
    expect(wrapper.get('a[aria-label="Voltar para Demandas"]').attributes('href')).toBe(board)
    expect(wrapper.findAll('a').some((link) => link.text() === 'Cancelar' && link.attributes('href') === board)).toBe(true)
  })

  it('mostra o título, o voltar ao quadro e o formulário vazio', async () => {
    const { wrapper } = await mountView()

    expect(wrapper.get('h1').text()).toBe('Nova demanda')
    expect(wrapper.get('a[aria-label="Voltar para Demandas"]').attributes('href')).toBe('/demandas')
    expect(wrapper.get('button[type="submit"]').text()).toContain('Criar demanda')
  })

  it('criada, abre a tela da demanda com o aviso no estado da navegação', async () => {
    vi.mocked(demandsService.createDemand).mockResolvedValue({
      id: 12,
      title: 'Trocar impressora',
      description: 'Não imprime.',
      category: 'it',
      status: 'pending',
      requester: { id: 1, name: 'Maria Souza' },
      created_at: null,
      updated_at: null,
    })
    const { router, wrapper } = await mountView()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('demand')
    expect(router.currentRoute.value.params.id).toBe('12')
    expect(router.options.history.state.notice).toBe('Demanda criada.')
  })
})
