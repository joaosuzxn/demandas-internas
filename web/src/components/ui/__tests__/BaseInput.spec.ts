import { describe, it, expect, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import BaseInput from '../BaseInput.vue'
import PasswordInput from '../PasswordInput.vue'

let wrapper: VueWrapper | undefined

function mountInput(props: Record<string, unknown> = {}) {
  wrapper = mount(BaseInput, {
    props: { label: 'Senha', modelValue: '', ...props },
    attachTo: document.body,
  })
  return wrapper
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})

describe('BaseInput', () => {
  it('emite o valor digitado', async () => {
    const input = mountInput()

    await input.get('input').setValue('abc')

    expect(input.emitted('update:modelValue')?.[0]).toEqual(['abc'])
  })

  it('mostra o valor recebido', () => {
    const input = mountInput({ modelValue: 'maria' })

    expect((input.get('input').element as HTMLInputElement).value).toBe('maria')
  })

  it('liga o rótulo ao campo e repassa nome, tipo, placeholder e autocomplete', () => {
    const input = mountInput({
      label: 'Usuário ou e-mail',
      name: 'login',
      type: 'text',
      placeholder: 'Digite seu usuário ou e-mail',
      autocomplete: 'username',
    })
    const field = input.get('input')

    expect(input.get('label').text()).toBe('Usuário ou e-mail')
    expect(input.get('label').attributes('for')).toBe(field.attributes('id'))
    expect(field.attributes('name')).toBe('login')
    expect(field.attributes('type')).toBe('text')
    expect(field.attributes('placeholder')).toBe('Digite seu usuário ou e-mail')
    expect(field.attributes('autocomplete')).toBe('username')
  })

  it('mostra o erro na linha do rótulo, ligado ao campo, com a borda vermelha', () => {
    const input = mountInput({ error: 'Preencha esse campo.' })
    const field = input.get('input')
    const alert = input.get('[role="alert"]')

    expect(alert.text()).toBe('Preencha esse campo.')
    expect(alert.element.parentElement).toBe(input.get('label').element.parentElement)
    expect(field.attributes('aria-invalid')).toBe('true')
    expect(field.attributes('aria-describedby')).toBe(alert.attributes('id'))
    expect(field.classes()).toContain('border-red-400')
  })

  it('com mensagem longa, o rótulo não quebra nem encolhe e a mensagem aparece inteira', () => {
    const message = 'O campo senha deve conter pelo menos um símbolo.'
    const input = mountInput({ label: 'Nova senha', error: message })
    const label = input.get('label')
    const alert = input.get('[role="alert"]')

    expect(label.classes()).toEqual(expect.arrayContaining(['shrink-0', 'whitespace-nowrap']))
    expect(alert.text()).toBe(message)
    // Sem reticências: a mensagem quebra em mais linhas em vez de ser cortada.
    expect(alert.classes()).not.toContain('truncate')
    expect(alert.classes()).toContain('min-w-0')
  })

  it('não marca o campo como inválido sem erro', () => {
    const input = mountInput()
    const field = input.get('input')

    expect(input.find('[role="alert"]').exists()).toBe(false)
    expect(field.attributes('aria-invalid')).toBeUndefined()
    expect(field.attributes('aria-describedby')).toBeUndefined()
    expect(field.classes()).not.toContain('border-red-400')
  })

  it('fica vermelho e inválido sem mensagem quando invalid', () => {
    const input = mountInput({ invalid: true })
    const field = input.get('input')

    expect(field.attributes('aria-invalid')).toBe('true')
    expect(field.classes()).toContain('border-red-400')
    expect(input.find('[role="alert"]').exists()).toBe(false)
    expect(field.attributes('aria-describedby')).toBeUndefined()
  })

  it('chacoalha a cada mudança de shakeKey enquanto há erro e para no fim da animação', async () => {
    const input = mountInput({ error: 'Preencha esse campo.', shakeKey: 0 })
    const shaker = input.get('input').element.parentElement as HTMLElement

    expect(shaker.classList.contains('animate-shake')).toBe(false)

    await input.setProps({ shakeKey: 1 })
    expect(shaker.classList.contains('animate-shake')).toBe(true)

    shaker.dispatchEvent(new Event('animationend'))
    await input.vm.$nextTick()
    expect(shaker.classList.contains('animate-shake')).toBe(false)

    await input.setProps({ shakeKey: 2 })
    expect(shaker.classList.contains('animate-shake')).toBe(true)
  })

  it('chacoalha quando o erro chega junto com a mudança de shakeKey', async () => {
    const input = mountInput({ shakeKey: 0 })

    await input.setProps({ invalid: true, shakeKey: 1 })

    expect(input.get('input').element.parentElement?.classList.contains('animate-shake')).toBe(true)
  })

  it('não chacoalha sem erro', async () => {
    const input = mountInput({ shakeKey: 0 })

    await input.setProps({ shakeKey: 1 })

    expect(input.get('input').element.parentElement?.classList.contains('animate-shake')).toBe(
      false,
    )
  })

  it('fica só para leitura quando disabled', () => {
    const input = mountInput({ modelValue: 'maria.souza', disabled: true })

    expect(input.get('input').attributes('disabled')).toBeDefined()
  })

  it('recebe o foco inicial quando pedido', () => {
    const input = mountInput({ autofocus: true })

    expect(document.activeElement).toBe(input.get('input').element)
  })
})

describe('PasswordInput', () => {
  function mountPassword(props: Record<string, unknown> = {}) {
    wrapper = mount(PasswordInput, {
      props: { label: 'Senha', modelValue: '', name: 'password', ...props },
      attachTo: document.body,
    })
    return wrapper
  }

  it('esconde a senha por padrão e alterna com o botão de mostrar', async () => {
    const input = mountPassword()
    const toggle = input.get('button')

    expect(input.get('input').attributes('type')).toBe('password')
    expect(toggle.attributes('type')).toBe('button')
    expect(toggle.attributes('aria-label')).toBe('Mostrar senha')
    expect(toggle.attributes('aria-pressed')).toBe('false')

    await toggle.trigger('click')

    expect(input.get('input').attributes('type')).toBe('text')
    expect(toggle.attributes('aria-label')).toBe('Ocultar senha')
    expect(toggle.attributes('aria-pressed')).toBe('true')

    await toggle.trigger('click')

    expect(input.get('input').attributes('type')).toBe('password')
  })

  it('emite o valor digitado e repassa nome, erro e chacoalhada ao campo', async () => {
    const input = mountPassword({ error: 'Preencha esse campo.', shakeKey: 0 })

    await input.get('input').setValue('segredo')
    await input.setProps({ shakeKey: 1 })

    expect(input.emitted('update:modelValue')?.[0]).toEqual(['segredo'])
    expect(input.get('input').attributes('name')).toBe('password')
    expect(input.get('[role="alert"]').text()).toBe('Preencha esse campo.')
    expect(input.get('input').element.parentElement?.classList.contains('animate-shake')).toBe(true)
  })
})
