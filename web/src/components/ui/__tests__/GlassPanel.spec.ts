import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GlassPanel from '../GlassPanel.vue'

function mountPanel(props: Record<string, unknown> = {}) {
  return mount(GlassPanel, {
    props: { title: 'Por categoria', ...props },
    slots: { default: '<p>conteúdo</p>' },
  })
}

describe('GlassPanel', () => {
  it('sem estados, mostra título e conteúdo como antes', () => {
    const wrapper = mountPanel()
    expect(wrapper.get('h2').text()).toBe('Por categoria')
    expect(wrapper.text()).toContain('conteúdo')
  })

  it('carregando: esqueleto com aviso para leitor de tela, sem conteúdo nem contagem', () => {
    const wrapper = mountPanel({ loading: true, count: 5 })
    expect(wrapper.get('[role="status"]').text()).toContain('Carregando por categoria…')
    expect(wrapper.text()).not.toContain('conteúdo')
    expect(wrapper.text()).not.toContain('5')
  })

  it('erro: mensagem e Tentar de novo emite retry', async () => {
    const wrapper = mountPanel({ error: 'Falhou.' })
    expect(wrapper.get('[role="alert"]').text()).toContain('Falhou.')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('vazio: mensagem no lugar do conteúdo', () => {
    const wrapper = mountPanel({ empty: true, emptyMessage: 'Nenhuma demanda no período.' })
    expect(wrapper.text()).toContain('Nenhuma demanda no período.')
    expect(wrapper.text()).not.toContain('conteúdo')
  })

  it('mostra a contagem ao lado do título', () => {
    expect(mountPanel({ count: 5 }).text()).toContain('5')
  })
})
