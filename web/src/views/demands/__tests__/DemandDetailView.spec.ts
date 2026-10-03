import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import DemandDetailView from '../DemandDetailView.vue'
import * as demandsService from '@/services/demands'
import type { Demand } from '@/services/demands'
import type { Role } from '@/services/auth'
import { httpError, makeUser, networkError } from '@/services/__tests__/fixtures'
import { useAuthStore } from '@/stores/auth'
import { NOTICE_TIMEOUT_MS } from '@/composables/useArrivalNotice'

vi.mock('@/services/demands', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/demands')>()),
  getDemand: vi.fn<(id: number) => Promise<Demand>>(),
  closeDemand: vi.fn<(id: number) => Promise<Demand>>(),
  reopenDemand: vi.fn<(id: number) => Promise<Demand>>(),
  deleteDemand: vi.fn<(id: number) => Promise<void>>(),
}))

const Stub = defineComponent({ render: () => null })

function makeDemand(overrides: Partial<Demand> = {}): Demand {
  return {
    id: 12,
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

// Quem entra é a usuária 1, dona das demandas com requester.id 1.
async function mountView(role: Role = 'employee', notice?: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/demandas', name: 'demands', component: Stub },
      { path: '/demandas/:id', name: 'demand', component: DemandDetailView },
      { path: '/demandas/:id/editar', name: 'demand-edit', component: Stub },
    ],
  })
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().user = makeUser({ id: 1, role })

  await router.push(notice ? { path: '/demandas/12', state: { notice } } : '/demandas/12')
  const wrapper = mount(DemandDetailView, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return { router, wrapper }
}

function button(wrapper: Awaited<ReturnType<typeof mountView>>['wrapper'], label: string) {
  return wrapper.findAll('button').find((candidate) => candidate.text() === label)
}

describe('DemandDetailView', () => {
  beforeEach(() => {
    vi.mocked(demandsService.getDemand).mockReset().mockResolvedValue(makeDemand())
    vi.mocked(demandsService.closeDemand).mockReset()
    vi.mocked(demandsService.reopenDemand).mockReset()
    vi.mocked(demandsService.deleteDemand).mockReset()
  })

  it('carrega a demanda do endereço e mostra título, descrição e informações', async () => {
    const { wrapper } = await mountView()

    expect(demandsService.getDemand).toHaveBeenCalledWith(12)
    expect(wrapper.get('h1').text()).toBe('#12 - Trocar impressora')
    expect(wrapper.get('[data-demand-description]').text()).toContain('A do setor 2 não imprime.')
    const facts = wrapper.get('[data-demand-facts]').text()
    expect(facts).toContain('A fazer')
    expect(facts).toContain('TI')
    expect(facts).toContain('Maria Souza')
    expect(wrapper.get('a[aria-label="Voltar para Demandas"]').attributes('href')).toBe('/demandas')
  })

  it('avisa quando a demanda não existe (404)', async () => {
    vi.mocked(demandsService.getDemand).mockRejectedValue(httpError(404))

    const { wrapper } = await mountView()

    expect(wrapper.text()).toContain('Demanda não encontrada')
    expect(button(wrapper, 'Tentar de novo')).toBeUndefined()
  })

  it('mostra o erro e tenta de novo quando a API não responde', async () => {
    vi.mocked(demandsService.getDemand).mockRejectedValueOnce(networkError())

    const { wrapper } = await mountView()
    expect(wrapper.get('[role="alert"]').text()).toContain('Não foi possível carregar a demanda.')

    await button(wrapper, 'Tentar de novo')!.trigger('click')
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('#12 - Trocar impressora')
  })

  it('não mostra ações a quem não é o solicitante nem admin', async () => {
    vi.mocked(demandsService.getDemand).mockResolvedValue(
      makeDemand({ requester: { id: 9, name: 'Joana' } }),
    )

    const { wrapper } = await mountView('employee')

    expect(wrapper.find('[aria-label="Ações da demanda"]').exists()).toBe(false)
  })

  it('admin vê as ações na demanda de outra pessoa', async () => {
    vi.mocked(demandsService.getDemand).mockResolvedValue(
      makeDemand({ requester: { id: 9, name: 'Joana' } }),
    )

    const { wrapper } = await mountView('admin')

    expect(button(wrapper, 'Finalizar')).toBeDefined()
    expect(button(wrapper, 'Excluir')).toBeDefined()
  })

  it('finaliza a aberta no clique e passa a mostrar a demanda finalizada', async () => {
    vi.mocked(demandsService.closeDemand).mockResolvedValue(makeDemand({ status: 'closed' }))

    const { wrapper } = await mountView()
    expect(button(wrapper, 'Reabrir')).toBeUndefined()

    await button(wrapper, 'Finalizar')!.trigger('click')
    await flushPromises()

    expect(demandsService.closeDemand).toHaveBeenCalledWith(12)
    expect(wrapper.text()).toContain('Demanda finalizada.')
    expect(wrapper.get('[data-demand-facts]').text()).toContain('Finalizado')
    expect(button(wrapper, 'Reabrir')).toBeDefined()
  })

  it('reabre a finalizada no clique', async () => {
    vi.mocked(demandsService.getDemand).mockResolvedValue(makeDemand({ status: 'closed' }))
    vi.mocked(demandsService.reopenDemand).mockResolvedValue(makeDemand({ status: 'open' }))

    const { wrapper } = await mountView()
    await button(wrapper, 'Reabrir')!.trigger('click')
    await flushPromises()

    expect(demandsService.reopenDemand).toHaveBeenCalledWith(12)
    expect(wrapper.text()).toContain('Demanda reaberta.')
    expect(button(wrapper, 'Finalizar')).toBeDefined()
  })

  it('mostra a mensagem da API quando a ação é recusada', async () => {
    vi.mocked(demandsService.closeDemand).mockRejectedValue(
      httpError(422, { errors: { status: ['A solicitação já está fechada.'] } }),
    )

    const { wrapper } = await mountView()
    await button(wrapper, 'Finalizar')!.trigger('click')
    await flushPromises()

    expect(wrapper.get('[aria-label="Ações da demanda"]').text()).toContain(
      'A solicitação já está fechada.',
    )
  })

  it('exclui a finalizada só depois de confirmar e volta ao quadro', async () => {
    vi.mocked(demandsService.getDemand).mockResolvedValue(makeDemand({ status: 'closed' }))
    vi.mocked(demandsService.deleteDemand).mockResolvedValue()

    const { router, wrapper } = await mountView()
    await button(wrapper, 'Excluir')!.trigger('click')

    expect(demandsService.deleteDemand).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Excluir esta demanda?')

    await button(wrapper, 'Excluir')!.trigger('click')
    await flushPromises()

    expect(demandsService.deleteDemand).toHaveBeenCalledWith(12)
    expect(router.currentRoute.value.name).toBe('demands')
  })

  it('desiste da exclusão pelo Voltar', async () => {
    const { wrapper } = await mountView()
    await button(wrapper, 'Excluir')!.trigger('click')
    await button(wrapper, 'Voltar')!.trigger('click')

    expect(wrapper.text()).not.toContain('Excluir esta demanda?')
    expect(button(wrapper, 'Finalizar')).toBeDefined()
    expect(demandsService.deleteDemand).not.toHaveBeenCalled()
  })

  it('mostra Editar só na aberta, levando à tela de editar', async () => {
    const { wrapper } = await mountView()

    const edit = wrapper.findAll('a').find((link) => link.text() === 'Editar')
    expect(edit!.attributes('href')).toBe('/demandas/12/editar')
  })

  it('não mostra Editar na finalizada', async () => {
    vi.mocked(demandsService.getDemand).mockResolvedValue(makeDemand({ status: 'closed' }))

    const { wrapper } = await mountView()

    expect(wrapper.findAll('a').some((link) => link.text() === 'Editar')).toBe(false)
  })

  describe('aviso de quem chega do formulário', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('mostra o aviso uma vez e o apaga do estado da navegação', async () => {
      const { router, wrapper } = await mountView('employee', 'Demanda criada.')

      expect(wrapper.get('[data-arrival-notice]').text()).toContain('Demanda criada.')
      expect(router.options.history.state.notice).toBeNull()
    })

    it('o aviso se recolhe sozinho', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      const { wrapper } = await mountView('employee', 'Demanda atualizada.')

      vi.advanceTimersByTime(NOTICE_TIMEOUT_MS)
      await flushPromises()

      expect(wrapper.find('[data-arrival-notice]').exists()).toBe(false)
    })

    it('sem aviso no estado, não mostra nada', async () => {
      const { wrapper } = await mountView()

      expect(wrapper.find('[data-arrival-notice]').exists()).toBe(false)
    })
  })
})
