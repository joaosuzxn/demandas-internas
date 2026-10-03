import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import EditDemandView from '../EditDemandView.vue'
import * as demandsService from '@/services/demands'
import type { Demand, DemandPayload } from '@/services/demands'
import type { Role } from '@/services/auth'
import { httpError, makeUser, networkError } from '@/services/__tests__/fixtures'
import { useAuthStore } from '@/stores/auth'

vi.mock('@/services/demands', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/demands')>()),
  getDemand: vi.fn<(id: number) => Promise<Demand>>(),
  updateDemand: vi.fn<(id: number, payload: DemandPayload) => Promise<Demand>>(),
}))

const Stub = defineComponent({ render: () => null })

function makeDemand(overrides: Partial<Demand> = {}): Demand {
  return {
    id: 12,
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

// Quem entra é a usuária 1, dona das demandas com requester.id 1.
async function mountView(role: Role = 'employee') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/demandas', name: 'demands', component: Stub },
      { path: '/demandas/:id', name: 'demand', component: Stub },
      { path: '/demandas/:id/editar', name: 'demand-edit', component: EditDemandView },
    ],
  })
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().user = makeUser({ id: 1, role })

  await router.push('/demandas/12/editar')
  const wrapper = mount(EditDemandView, {
    global: { plugins: [pinia, router], stubs: { teleport: true } },
  })
  await flushPromises()
  return { router, wrapper }
}

describe('EditDemandView', () => {
  beforeEach(() => {
    vi.mocked(demandsService.getDemand).mockReset().mockResolvedValue(makeDemand())
    vi.mocked(demandsService.updateDemand).mockReset()
  })

  it('carrega a demanda e abre o formulário preenchido, com o voltar para ela', async () => {
    const { wrapper } = await mountView()

    expect(demandsService.getDemand).toHaveBeenCalledWith(12)
    expect(wrapper.get('h1').text()).toBe('Editar demanda')
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('Trocar impressora')
    expect(wrapper.get('a[aria-label="Voltar para a demanda"]').attributes('href')).toBe(
      '/demandas/12',
    )
    expect(
      wrapper
        .findAll('a')
        .find((link) => link.text() === 'Cancelar')!
        .attributes('href'),
    ).toBe('/demandas/12')
  })

  it('salva e volta à demanda com o aviso no estado da navegação', async () => {
    vi.mocked(demandsService.updateDemand).mockResolvedValue(makeDemand())
    const { router, wrapper } = await mountView()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(demandsService.updateDemand).toHaveBeenCalledWith(12, expect.any(Object))
    expect(router.currentRoute.value.name).toBe('demand')
    expect(router.options.history.state.notice).toBe('Demanda atualizada.')
  })

  it('admin edita a demanda de outra pessoa', async () => {
    vi.mocked(demandsService.getDemand).mockResolvedValue(
      makeDemand({ requester: { id: 9, name: 'Joana' } }),
    )

    const { wrapper } = await mountView('admin')

    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('quem não é o solicitante nem admin vê o motivo, sem formulário', async () => {
    vi.mocked(demandsService.getDemand).mockResolvedValue(
      makeDemand({ requester: { id: 9, name: 'Joana' } }),
    )

    const { wrapper } = await mountView('employee')

    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.text()).toContain('Só quem pediu a demanda ou o administrador pode editá-la.')
    expect(
      wrapper
        .findAll('a')
        .find((link) => link.text() === 'Voltar à demanda')!
        .attributes('href'),
    ).toBe('/demandas/12')
  })

  it.each(['in_progress', 'finished'] as const)(
    'demanda %s não abre o formulário',
    async (status) => {
      vi.mocked(demandsService.getDemand).mockResolvedValue(makeDemand({ status }))

      const { wrapper } = await mountView()

      expect(wrapper.find('form').exists()).toBe(false)
      expect(wrapper.text()).toContain('Só demanda pendente pode ser editada.')
    },
  )

  it('avisa quando a demanda não existe (404)', async () => {
    vi.mocked(demandsService.getDemand).mockRejectedValue(httpError(404))

    const { wrapper } = await mountView()

    expect(wrapper.text()).toContain('Demanda não encontrada')
  })

  it('mostra o erro e tenta de novo quando a API não responde', async () => {
    vi.mocked(demandsService.getDemand).mockRejectedValueOnce(networkError())

    const { wrapper } = await mountView()
    expect(wrapper.get('[role="alert"]').text()).toContain('Não foi possível carregar a demanda.')

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Tentar de novo')!
      .trigger('click')
    await flushPromises()

    expect(wrapper.find('form').exists()).toBe(true)
  })
})
