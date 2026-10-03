import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import DemandForm from '../DemandForm.vue'
import * as demandsService from '@/services/demands'
import type { Demand, DemandPayload } from '@/services/demands'
import { httpError, networkError } from '@/services/__tests__/fixtures'

vi.mock('@/services/demands', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/demands')>()),
  createDemand: vi.fn<(payload: DemandPayload) => Promise<Demand>>(),
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

function mountForm(props: Partial<InstanceType<typeof DemandForm>['$props']> = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/demandas', name: 'demands', component: Stub }],
  })
  return mount(DemandForm, {
    props: { cancelTo: { name: 'demands' }, submitLabel: 'Criar demanda', ...props },
    // A lista do select vai para o body pelo Teleport; com o stub ela fica no wrapper.
    global: { plugins: [router], stubs: { teleport: true } },
    attachTo: document.body,
  })
}

async function chooseCategory(wrapper: ReturnType<typeof mountForm>, label: string) {
  await wrapper.get('[role="combobox"]').trigger('click')
  const option = wrapper.findAll('[role="option"]').find((candidate) => candidate.text() === label)
  await option!.trigger('click')
}

function submitButton(wrapper: ReturnType<typeof mountForm>) {
  return wrapper.get('button[type="submit"]')
}

describe('DemandForm', () => {
  beforeEach(() => {
    vi.mocked(demandsService.createDemand).mockReset()
    vi.mocked(demandsService.updateDemand).mockReset()
  })

  it('cria com o que foi digitado e escolhido e avisa quem usa', async () => {
    vi.mocked(demandsService.createDemand).mockResolvedValue(makeDemand())
    const wrapper = mountForm()

    expect(wrapper.get('[role="combobox"]').text()).toContain('Selecione a categoria')

    await wrapper.get('input').setValue('Trocar impressora')
    await wrapper.get('textarea').setValue('A do setor 2 não imprime.')
    await chooseCategory(wrapper, 'Infraestrutura')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(demandsService.createDemand).toHaveBeenCalledWith({
      title: 'Trocar impressora',
      description: 'A do setor 2 não imprime.',
      category: 'infrastructure',
    })
    expect(wrapper.emitted('saved')).toEqual([[makeDemand()]])
  })

  it('na edição, abre preenchido e salva na demanda certa', async () => {
    vi.mocked(demandsService.updateDemand).mockResolvedValue(makeDemand({ title: 'Novo título' }))
    const wrapper = mountForm({ editing: makeDemand(), submitLabel: 'Salvar alterações' })

    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('Trocar impressora')
    expect(wrapper.get('[role="combobox"]').text()).toContain('TI')
    expect(submitButton(wrapper).text()).toContain('Salvar alterações')

    await wrapper.get('input').setValue('Novo título')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(demandsService.updateDemand).toHaveBeenCalledWith(12, {
      title: 'Novo título',
      description: 'A do setor 2 não imprime.',
      category: 'it',
    })
    expect(wrapper.emitted('saved')).toEqual([[makeDemand({ title: 'Novo título' })]])
  })

  it('mostra o 422 da API embaixo de cada campo e limpa o erro do campo ao editá-lo', async () => {
    vi.mocked(demandsService.createDemand).mockRejectedValue(
      httpError(422, {
        errors: {
          title: ['O campo título é obrigatório.'],
          category: ['O campo categoria é obrigatório.'],
        },
      }),
    )
    const wrapper = mountForm()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('O campo título é obrigatório.')
    expect(wrapper.text()).toContain('O campo categoria é obrigatório.')
    expect(wrapper.emitted('saved')).toBeUndefined()

    await wrapper.get('input').setValue('T')

    expect(wrapper.text()).not.toContain('O campo título é obrigatório.')
    expect(wrapper.text()).toContain('O campo categoria é obrigatório.')
  })

  it('mostra a mensagem geral quando a API não responde', async () => {
    vi.mocked(demandsService.createDemand).mockRejectedValue(networkError())
    const wrapper = mountForm()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-form-error]').text()).toContain(
      'Não foi possível falar com o servidor.',
    )
  })

  it('trava o botão enquanto envia', async () => {
    vi.mocked(demandsService.createDemand).mockReturnValue(new Promise(() => {}))
    const wrapper = mountForm()

    await wrapper.get('form').trigger('submit')

    expect(submitButton(wrapper).attributes('disabled')).toBeDefined()
    expect(submitButton(wrapper).text()).toContain('Enviando…')
  })

  it('Cancelar leva para onde quem usa mandou', () => {
    const wrapper = mountForm()

    expect(wrapper.get('a').text()).toBe('Cancelar')
    expect(wrapper.get('a').attributes('href')).toBe('/demandas')
  })
})
