import { describe, it, expect, vi, afterEach } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import DemandActions from '../DemandActions.vue'
import * as demandsService from '@/services/demands'
import type { Demand } from '@/services/demands'
import { httpError } from '@/services/__tests__/fixtures'

vi.mock('@/services/demands', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/demands')>()),
  deleteDemand: vi.fn<(id: number) => Promise<void>>(),
}))

const Stub = defineComponent({ render: () => null })

const demand: Demand = {
  id: 12,
  title: 'Trocar impressora',
  description: 'A do setor 2 não imprime.',
  category: 'it',
  status: 'pending',
  requester: { id: 1, name: 'Maria Souza' },
  created_at: '2026-10-01T12:00:00+00:00',
  updated_at: '2026-10-01T12:00:00+00:00',
}

let wrapper: VueWrapper | null = null

// Presa ao documento: o foco só existe em elemento que está na página.
async function mountActions() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Stub },
      { path: '/solicitacoes/:id/editar', name: 'demand-edit', component: Stub },
    ],
  })
  await router.push('/')
  wrapper = mount(DemandActions, {
    props: { demand, canEdit: true },
    global: { plugins: [router] },
    attachTo: document.body,
  })
  return wrapper
}

function button(label: string) {
  return wrapper!.findAll('button').find((candidate) => candidate.text() === label)!
}

describe('DemandActions', () => {
  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
  })

  it('ao pedir a exclusão, o foco vai para o Excluir da confirmação', async () => {
    await mountActions()

    await button('Excluir').trigger('click')
    await flushPromises()

    expect(document.activeElement?.textContent?.trim()).toBe('Excluir')
    expect(wrapper!.text()).toContain('Excluir esta solicitação?')
  })

  it('ao voltar da confirmação, o foco volta para o Excluir da linha de botões', async () => {
    await mountActions()
    await button('Excluir').trigger('click')
    await flushPromises()

    await button('Voltar').trigger('click')
    await flushPromises()

    expect(wrapper!.text()).not.toContain('Excluir esta solicitação?')
    expect(document.activeElement).toBe(button('Excluir').element)
  })

  it('a exclusão recusada fecha a confirmação com o foco no Excluir da linha', async () => {
    vi.mocked(demandsService.deleteDemand).mockRejectedValue(httpError(500))
    await mountActions()
    await button('Excluir').trigger('click')
    await flushPromises()

    await button('Excluir').trigger('click')
    await flushPromises()

    expect(document.activeElement).toBe(button('Excluir').element)
  })

  it('trocar de solicitação com a confirmação aberta fecha a confirmação sem mexer no foco', async () => {
    await mountActions()
    await button('Excluir').trigger('click')
    await flushPromises()
    const outside = document.createElement('input')
    document.body.appendChild(outside)
    outside.focus()

    await wrapper!.setProps({ demand: { ...demand, id: 13 } })
    await flushPromises()

    expect(wrapper!.text()).not.toContain('Excluir esta solicitação?')
    expect(document.activeElement).toBe(outside)
    outside.remove()
  })
})

