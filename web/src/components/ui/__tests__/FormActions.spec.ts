import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import FormActions from '../FormActions.vue'

const Stub = defineComponent({ render: () => null })

async function mountActions(busy: boolean) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Stub },
      { path: '/lista', name: 'list', component: Stub },
    ],
  })
  await router.push('/')
  return mount(FormActions, {
    props: { cancelTo: { name: 'list' }, submitLabel: 'Salvar', busyLabel: 'Salvando…', busy },
    global: { plugins: [router] },
  })
}

describe('FormActions', () => {
  it('Cancelar leva ao destino e o envio mostra o rótulo', async () => {
    const wrapper = await mountActions(false)

    expect(wrapper.get('a').attributes('href')).toBe('/lista')
    expect(wrapper.get('button[type="submit"]').text()).toBe('Salvar')
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('enviando, o botão trava e diz o que está fazendo', async () => {
    const wrapper = await mountActions(true)

    expect(wrapper.get('button[type="submit"]').text()).toBe('Salvando…')
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
  })
})
