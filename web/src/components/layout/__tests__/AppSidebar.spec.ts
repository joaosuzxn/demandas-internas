import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import AppSidebar from '../AppSidebar.vue'

const Stub = defineComponent({ render: () => null })

async function mountSidebar(activeRouteName: string | null = 'demands', isDark = false) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/dashboard', name: 'dashboard', component: Stub },
      { path: '/solicitacoes', name: 'demands', component: Stub },
    ],
  })
  await router.push('/solicitacoes')

  return mount(AppSidebar, {
    props: { activeRouteName, isDark },
    global: { plugins: [router] },
  })
}

describe('AppSidebar', () => {
  it('lista Solicitações e Dashboard, e marca a tela aberta', async () => {
    const wrapper = await mountSidebar('demands')

    const links = wrapper.findAll('nav a')
    expect(links.map((link) => link.text())).toEqual(['Solicitações', 'Dashboard'])
    expect(links[0]!.attributes('aria-current')).toBe('page')
    expect(links[1]!.attributes('aria-current')).toBeUndefined()
  })

  it('não marca item nenhum quando a tela aberta não está no menu', async () => {
    const wrapper = await mountSidebar(null)

    const links = wrapper.findAll('nav a')
    expect(links.every((link) => link.attributes('aria-current') === undefined)).toBe(true)
  })

  it('põe o botão de tema logo acima de Sair, no lugar de Meu perfil', async () => {
    const wrapper = await mountSidebar()

    // O botão de fechar do mobile não tem texto: fica de fora da conta.
    const labels = wrapper
      .findAll('button')
      .map((button) => button.text())
      .filter(Boolean)
    expect(labels).toEqual(['Modo escuro', 'Sair'])
    expect(wrapper.text()).not.toContain('Meu perfil')
  })

  it('no escuro, o botão oferece o modo claro; o clique emite toggle-theme', async () => {
    const wrapper = await mountSidebar('demands', true)

    const toggle = wrapper.findAll('button').find((button) => button.text() === 'Modo claro')!
    expect(toggle.attributes('aria-pressed')).toBe('true')
    await toggle.trigger('click')
    expect(wrapper.emitted('toggle-theme')).toHaveLength(1)
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
