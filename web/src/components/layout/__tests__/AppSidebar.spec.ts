import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import AppSidebar from '../AppSidebar.vue'

const Stub = defineComponent({ render: () => null })

async function mountSidebar(activeRouteName: string | null = 'demands') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/demandas', name: 'demands', component: Stub }],
  })
  await router.push('/demandas')

  return mount(AppSidebar, {
    props: { activeRouteName },
    global: { plugins: [router] },
  })
}

describe('AppSidebar', () => {
  it('lista Demandas como único item e marca a tela aberta', async () => {
    const wrapper = await mountSidebar('demands')

    const link = wrapper.get('nav a')
    expect(link.text()).toBe('Demandas')
    expect(link.attributes('aria-current')).toBe('page')
  })

  it('não marca item nenhum quando a tela aberta não está no menu', async () => {
    const wrapper = await mountSidebar(null)

    expect(wrapper.get('nav a').attributes('aria-current')).toBeUndefined()
  })

  it('põe Meu perfil logo acima de Sair, no fim da barra', async () => {
    const wrapper = await mountSidebar()

    // O botão de fechar do mobile não tem texto: fica de fora da conta.
    const labels = wrapper
      .findAll('button')
      .map((button) => button.text())
      .filter(Boolean)
    expect(labels).toEqual(['Meu perfil', 'Sair'])
  })

  it('emite logout ao clicar em Sair', async () => {
    const wrapper = await mountSidebar()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Sair')!
      .trigger('click')

    expect(wrapper.emitted('logout')).toHaveLength(1)
  })

  it('emite close ao clicar em fechar no mobile', async () => {
    const wrapper = await mountSidebar()

    await wrapper.get('[aria-label="Fechar menu"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
