import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import BaseField from '../BaseField.vue'

function mountField(props: Record<string, unknown> = {}) {
  return mount(BaseField, { props: { label: 'Campo', ...props } })
}

describe('BaseField', () => {
  it('liga o rótulo ao campo e marca o obrigatório', () => {
    const wrapper = mountField({ label: 'Título', required: true })

    const id = wrapper.get('input').attributes('id')
    expect(wrapper.get('label').attributes('for')).toBe(id)
    expect(wrapper.get('label').text()).toContain('Título')
    expect(wrapper.get('label').text()).toContain('*')
  })

  it('o valor passa como foi digitado', async () => {
    const wrapper = mountField()

    await wrapper.get('input').setValue('Beltrana de Tal')

    expect(wrapper.emitted('update:modelValue')?.slice(-1)[0]).toEqual(['Beltrana de Tal'])
  })

  it('repassa maxlength ao texto e à área de texto', () => {
    const text = mount(BaseField, { props: { label: 'Título', maxlength: 150 } })
    expect(text.get('input').attributes('maxlength')).toBe('150')

    const area = mount(BaseField, {
      props: { label: 'Descrição', control: 'textarea', maxlength: 5000 },
    })
    expect(area.get('textarea').attributes('maxlength')).toBe('5000')
  })

  it('o erro substitui a dica e marca o campo como inválido', () => {
    const wrapper = mountField({ hint: 'Até 150 caracteres.', error: 'O título é obrigatório.' })

    const input = wrapper.get('input')
    const error = wrapper.get('[role="alert"]')
    expect(error.text()).toBe('O título é obrigatório.')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('aria-describedby')).toBe(error.attributes('id'))
    expect(wrapper.text()).not.toContain('Até 150 caracteres.')
  })

  it('sem erro, mostra a dica ligada ao campo', () => {
    const wrapper = mountField({ hint: 'Até 150 caracteres.' })

    const hint = wrapper.get('p')
    expect(hint.text()).toBe('Até 150 caracteres.')
    expect(wrapper.get('input').attributes('aria-describedby')).toBe(hint.attributes('id'))
  })

  it('no modo select, desenha o BaseSelect com as opções e liga o rótulo ao gatilho', () => {
    const wrapper = mountField({
      label: 'Categoria',
      control: 'select',
      options: [{ value: 'it', label: 'TI' }],
      placeholderOption: 'Selecione a categoria',
    })

    const trigger = wrapper.get('[role="combobox"]')
    expect(wrapper.get('label').attributes('for')).toBe(trigger.attributes('id'))
    expect(trigger.text()).toContain('Selecione a categoria')
  })

  it('aplica a máscara de CPF ao digitar e limita o campo a 14 caracteres', async () => {
    const wrapper = mount(BaseField, { props: { label: 'CPF', mask: 'cpf', modelValue: '' } })
    const input = wrapper.get('input')

    await input.setValue('12345678909')

    expect(wrapper.emitted('update:modelValue')!.slice(-1)[0]).toEqual(['123.456.789-09'])
    expect((input.element as HTMLInputElement).value).toBe('123.456.789-09')
    expect(input.attributes('maxlength')).toBe('14')
    expect(input.attributes('inputmode')).toBe('numeric')
  })

  it('sem máscara, não reescreve o valor no campo ao digitar', async () => {
    const wrapper = mountField()
    const element = wrapper.get('input').element as HTMLInputElement
    const original = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!
    let writes = 0
    Object.defineProperty(element, 'value', {
      configurable: true,
      get: () => original.get!.call(element),
      set: (next: string) => {
        writes++
        original.set!.call(element, next)
      },
    })

    original.set!.call(element, 'texto digitado')
    await wrapper.get('input').trigger('input')

    expect(writes).toBe(0)
    expect(wrapper.emitted('update:modelValue')?.slice(-1)[0]).toEqual(['texto digitado'])
  })

  it('com máscara, só reescreve o campo quando o valor mudou', async () => {
    const wrapper = mountField({ mask: 'cpf' })
    const element = wrapper.get('input').element as HTMLInputElement
    const original = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!
    let writes = 0
    Object.defineProperty(element, 'value', {
      configurable: true,
      get: () => original.get!.call(element),
      set: (next: string) => {
        writes++
        original.set!.call(element, next)
      },
    })

    original.set!.call(element, '12345678909')
    await wrapper.get('input').trigger('input')
    expect(writes).toBe(1)
    expect(element.value).toBe('123.456.789-09')

    await wrapper.get('input').trigger('input')
    expect(writes).toBe(1)
  })

  it('sem máscara, não mexe no que foi digitado', async () => {
    const wrapper = mount(BaseField, { props: { label: 'Nome', modelValue: '' } })

    await wrapper.get('input').setValue('12345678909')

    expect(wrapper.emitted('update:modelValue')!.slice(-1)[0]).toEqual(['12345678909'])
  })
})
