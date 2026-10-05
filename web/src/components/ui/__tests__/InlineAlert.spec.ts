import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import InlineAlert from '../InlineAlert.vue'

describe('InlineAlert', () => {
  it('o erro é anunciado na hora (alert), em vermelho', () => {
    const wrapper = mount(InlineAlert, {
      props: { kind: 'error' },
      slots: { default: 'Deu errado.' },
    })

    expect(wrapper.attributes('role')).toBe('alert')
    expect(wrapper.classes()).toContain('bg-red-500/10')
    expect(wrapper.text()).toBe('Deu errado.')
  })

  it('o sucesso é anunciado sem interromper (status), em verde', () => {
    const wrapper = mount(InlineAlert, { props: { kind: 'success' }, slots: { default: 'Salvo.' } })

    expect(wrapper.attributes('role')).toBe('status')
    expect(wrapper.classes()).toContain('bg-emerald-500/10')
  })

  it('sem dismissible, não há botão de fechar', () => {
    const wrapper = mount(InlineAlert, { props: { kind: 'success' }, slots: { default: 'Salvo.' } })

    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('com dismissible, o X emite dismiss', async () => {
    const wrapper = mount(InlineAlert, {
      props: { kind: 'success', dismissible: true },
      slots: { default: 'Salvo.' },
    })

    await wrapper.get('[aria-label="Fechar aviso"]').trigger('click')

    expect(wrapper.emitted('dismiss')).toHaveLength(1)
  })

  it('repassa atributos de quem usa (ex.: data-*)', () => {
    const wrapper = mount(InlineAlert, {
      props: { kind: 'error' },
      attrs: { 'data-form-error': '' },
      slots: { default: 'x' },
    })

    expect(wrapper.attributes()).toHaveProperty('data-form-error')
  })
})
