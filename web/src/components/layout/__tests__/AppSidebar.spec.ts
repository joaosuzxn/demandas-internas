import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import AppSidebar from '../AppSidebar.vue'

const Stub = defineComponent({ render: () => null })

async function mountSidebar(
  activeRouteName: string | null = 'demands',
  isDark = false,
  isAdmin = false,
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/dashboard', name: 'dashboard', component: Stub },
      { path: '/solicitacoes', name: 'demands', component: Stub },
      { path: '/admin', name: 'admin', component: Stub },
    ],
  })
  await router.push('/solicitacoes')

  return mount(AppSidebar, {
    props: { activeRouteName, isDark, isAdmin },
    global: { plugins: [router] },
  })
}

describe('AppSidebar', () => {
  it('mostra a logo "Solicitações internas" no lugar do nome antigo', async () => {
    const wrapper = await mountSidebar()

    const logo = wrapper.find('[data-testid="app-logo"]')
    expect(logo.exists()).toBe(true)
    expect(logo.find('svg').attributes('aria-hidden')).toBe('true')
    expect(logo.text().replace(/\s+/g, ' ')).toBe('Solicitações internas')
    expect(wrapper.text()).not.toContain('Demandas Internas')
  })

  it('lista Solicitações e Dashboard, e marca a tela aberta', async () => {
    const wrapper = await mountSidebar('demands')

    const links = wrapper.findAll('nav a')
    expect(links.map((link) => link.text())).toEqual(['Solicitações', 'Dashboard'])
    expect(links[0]!.attributes('aria-current')).toBe('page')
    expect(links[1]!.attributes('aria-current')).toBeUndefined()
  })

  it('mostra Administração só para o administrador', async () => {
    const employee = await mountSidebar('demands', false, false)
    expect(employee.findAll('nav a').map((link) => link.text())).toEqual(['Solicitações', 'Dashboard'])

    const admin = await mountSidebar('admin', false, true)
    const links = admin.findAll('nav a')
    expect(links.map((link) => link.text())).toEqual(['Solicitações', 'Dashboard', 'Administração'])
    expect(links[2]!.attributes('aria-current')).toBe('page')
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
    // O nome acessível é o texto visível (WCAG 2.5.3): quem fala "Modo claro" no comando de voz acha o botão.
    // Sem aria-pressed: o rótulo já diz a ação, e "Modo claro, pressionado" contradiria o tema em vigor.
    expect(toggle.attributes('aria-label')).toBeUndefined()
    expect(toggle.attributes('aria-pressed')).toBeUndefined()
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
