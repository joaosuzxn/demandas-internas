import { describe, it, expect, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import GlassInput from '../GlassInput.vue'

let wrapper: VueWrapper | undefined

function mountInput(props: Record<string, unknown> = {}, attrs: Record<string, unknown> = {}) {
  wrapper = mount(GlassInput, {
    props: { label: 'Senha', modelValue: '', ...props },
    attrs,
    attachTo: document.body,
  })
  return wrapper
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})

describe('GlassInput', () => {
  it('emite o valor digitado', async () => {
    const input = mountInput()

    await input.get('input').setValue('abc')

    expect(input.emitted('update:modelValue')?.[0]).toEqual(['abc'])
  })

  it('mostra o valor recebido', () => {
    const input = mountInput({ modelValue: 'maria' })

    expect((input.get('input').element as HTMLInputElement).value).toBe('maria')
  })

  it('usa o rótulo como placeholder e como label ligado ao campo', () => {
    const input = mountInput({ label: 'Usuário ou e-mail' })
    const field = input.get('input')

    expect(field.attributes('placeholder')).toBe('Usuário ou e-mail')
    expect(input.get('label').text()).toBe('Usuário ou e-mail')
    expect(input.get('label').attributes('for')).toBe(field.attributes('id'))
  })

  it('repassa os atributos para o input, não para o contêiner', () => {
    const input = mountInput(
      {},
      { type: 'password', name: 'password', autocomplete: 'current-password', required: '' },
    )
    const field = input.get('input')

    expect(field.attributes('type')).toBe('password')
    expect(field.attributes('name')).toBe('password')
    expect(field.attributes('autocomplete')).toBe('current-password')
    expect(field.attributes('required')).toBeDefined()
    expect(input.attributes('name')).toBeUndefined()
  })

  it('mostra o erro ligado ao campo', () => {
    const input = mountInput({ error: 'Credenciais inválidas.' })
    const field = input.get('input')
    const alert = input.get('[role="alert"]')

    expect(alert.text()).toBe('Credenciais inválidas.')
    expect(field.attributes('aria-invalid')).toBe('true')
    expect(field.attributes('aria-describedby')).toBe(alert.attributes('id'))
  })

  it('não marca o campo como inválido sem erro', () => {
    const input = mountInput()

    expect(input.find('[role="alert"]').exists()).toBe(false)
    expect(input.get('input').attributes('aria-invalid')).toBeUndefined()
    expect(input.get('input').attributes('aria-describedby')).toBeUndefined()
  })

  it('mostra a dica ligada ao campo e a troca pelo erro quando há erro', async () => {
    const input = mountInput({ hint: 'Mínimo de 8 caracteres.' })
    const hint = input.get('[data-testid="hint"]')

    expect(hint.text()).toBe('Mínimo de 8 caracteres.')
    expect(input.get('input').attributes('aria-describedby')).toBe(hint.attributes('id'))

    await input.setProps({ error: 'Senha fraca.' })

    expect(input.find('[data-testid="hint"]').exists()).toBe(false)
    expect(input.get('[role="alert"]').text()).toBe('Senha fraca.')
  })

  it('recebe o foco inicial quando pedido', () => {
    const input = mountInput({ autofocus: true })

    expect(document.activeElement).toBe(input.get('input').element)
  })
})
