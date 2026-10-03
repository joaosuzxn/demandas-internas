import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { h, ref } from 'vue'

import BaseSelect from '../BaseSelect.vue'

enableAutoUnmount(afterEach)

const OPTIONS = [
  { value: 'principle', label: 'Principle' },
  { value: 'sketch', label: 'Sketch' },
  { value: 'photoshop', label: 'Photoshop' },
]

function mountSelect(props: Record<string, unknown> = {}, initial = '') {
  const model = ref(initial)
  const wrapper = mount(BaseSelect, {
    props: {
      id: 'campo-ficticio',
      options: OPTIONS,
      modelValue: model.value,
      'onUpdate:modelValue': (value: string) => {
        model.value = value
        void wrapper.setProps({ modelValue: value })
      },
      ...props,
    },
    // A lista vai para o body pelo Teleport; com o stub ela fica dentro do wrapper e dá para achá-la.
    // (O Órbita faz isso para todos os testes no setup; aqui só este arquivo precisa.)
    global: { stubs: { teleport: true } },
    attachTo: document.body,
  })

  return { wrapper, model, trigger: wrapper.get('[role="combobox"]') }
}

function options(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('[role="option"]')
}

describe('BaseSelect', () => {
  it('o slot troca o conteúdo do gatilho e recebe a opção escolhida e o marcador', () => {
    const render = (initial: string) =>
      mount(BaseSelect, {
        props: {
          id: 'campo-ficticio',
          options: OPTIONS,
          placeholderOption: 'Add tools',
          modelValue: initial,
        },
        slots: {
          default: ({
            selected,
            placeholder,
          }: {
            selected?: { label: string }
            placeholder: string
          }) => h('span', { 'data-custom': '' }, `Ferramenta: ${selected?.label ?? placeholder}`),
        },
      }).get('[role="combobox"]')

    const escolhido = render('sketch')
    expect(escolhido.get('[data-custom]').text()).toBe('Ferramenta: Sketch')
    expect(escolhido.find('[data-select-placeholder]').exists()).toBe(false)
    // A seta continua: é ela que diz que o gatilho abre uma lista.
    expect(escolhido.find('svg').exists()).toBe(true)

    expect(render('').get('[data-custom]').text()).toBe('Ferramenta: Add tools')
  })

  it('fechado, mostra a opção escolhida no gatilho e nenhuma lista', () => {
    const { wrapper, trigger } = mountSelect({}, 'sketch')

    expect(trigger.text()).toContain('Sketch')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(trigger.attributes('data-value')).toBe('sketch')
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
  })

  it('vazio, mostra o marcador em cinza', () => {
    const { trigger } = mountSelect({ placeholderOption: 'Add tools' })

    expect(trigger.get('[data-select-placeholder]').text()).toBe('Add tools')
  })

  it('clicar abre a lista, e clicar numa opção escolhe e fecha', async () => {
    const { wrapper, model, trigger } = mountSelect()

    await trigger.trigger('click')
    expect(trigger.attributes('aria-expanded')).toBe('true')
    expect(options(wrapper).map((option) => option.text())).toEqual([
      'Principle',
      'Sketch',
      'Photoshop',
    ])

    await options(wrapper)[2]!.trigger('click')

    expect(model.value).toBe('photoshop')
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
  })

  it('o marcador é a primeira opção, de valor vazio — dá para voltar a ele', async () => {
    const { wrapper, model, trigger } = mountSelect(
      { placeholderOption: 'Caixa de entrada do setor' },
      'sketch',
    )

    await trigger.trigger('click')
    const first = options(wrapper)[0]!
    expect(first.text()).toBe('Caixa de entrada do setor')

    await first.trigger('click')
    expect(model.value).toBe('')
  })

  it('a opção escolhida vem marcada com aria-selected', async () => {
    const { wrapper, trigger } = mountSelect({}, 'sketch')

    await trigger.trigger('click')

    expect(options(wrapper).map((option) => option.attributes('aria-selected'))).toEqual([
      'false',
      'true',
      'false',
    ])
  })

  it('teclado: seta abre, setas andam, Enter escolhe', async () => {
    const { wrapper, model, trigger } = mountSelect({}, 'principle')

    await trigger.trigger('keydown', { key: 'ArrowDown' })
    expect(trigger.attributes('aria-expanded')).toBe('true')
    // Abre na opção escolhida.
    expect(trigger.attributes('aria-activedescendant')).toBe(options(wrapper)[0]!.attributes('id'))

    await trigger.trigger('keydown', { key: 'ArrowDown' })
    await trigger.trigger('keydown', { key: 'ArrowDown' })
    expect(trigger.attributes('aria-activedescendant')).toBe(options(wrapper)[2]!.attributes('id'))

    await trigger.trigger('keydown', { key: 'Enter' })
    expect(model.value).toBe('photoshop')
    expect(trigger.attributes('aria-expanded')).toBe('false')
  })

  it('teclado: Home e End vão às pontas', async () => {
    const { wrapper, trigger } = mountSelect({}, 'sketch')

    await trigger.trigger('keydown', { key: 'Enter' })
    await trigger.trigger('keydown', { key: 'End' })
    expect(trigger.attributes('aria-activedescendant')).toBe(options(wrapper)[2]!.attributes('id'))

    await trigger.trigger('keydown', { key: 'Home' })
    expect(trigger.attributes('aria-activedescendant')).toBe(options(wrapper)[0]!.attributes('id'))
  })

  it('Esc fecha sem mudar o valor', async () => {
    const { model, trigger } = mountSelect({}, 'sketch')

    await trigger.trigger('keydown', { key: 'ArrowDown' })
    await trigger.trigger('keydown', { key: 'ArrowDown' })
    await trigger.trigger('keydown', { key: 'Escape' })

    expect(model.value).toBe('sketch')
    expect(trigger.attributes('aria-expanded')).toBe('false')
  })

  it('letra digitada pula para a opção que começa com ela', async () => {
    const { wrapper, trigger } = mountSelect({}, 'principle')

    await trigger.trigger('keydown', { key: 'ArrowDown' })
    await trigger.trigger('keydown', { key: 'p' })

    // Já está em Principle: a próxima com "p" é Photoshop.
    expect(trigger.attributes('aria-activedescendant')).toBe(options(wrapper)[2]!.attributes('id'))
  })

  it('clique fora fecha', async () => {
    const { trigger } = mountSelect()

    await trigger.trigger('click')
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    await trigger.trigger('focus')

    expect(trigger.attributes('aria-expanded')).toBe('false')
  })

  it('desabilitado não abre', async () => {
    const { wrapper, trigger } = mountSelect({ disabled: true })

    await trigger.trigger('click')

    expect(trigger.attributes('disabled')).toBeDefined()
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
  })

  it('liga o gatilho à lista e repassa o estado de erro', async () => {
    const { wrapper, trigger } = mountSelect({ invalid: true, describedby: 'campo-erro' })

    expect(trigger.attributes('id')).toBe('campo-ficticio')
    expect(trigger.attributes('aria-invalid')).toBe('true')
    expect(trigger.attributes('aria-describedby')).toBe('campo-erro')

    await trigger.trigger('click')
    expect(trigger.attributes('aria-controls')).toBe(
      wrapper.get('[role="listbox"]').attributes('id'),
    )
  })

  // #51: com respiro vertical na lista, o destaque da primeira e da última opção parava antes da borda.
  it('a lista não tem respiro vertical: o destaque das pontas encosta na borda arredondada', async () => {
    const { wrapper, trigger } = mountSelect()

    await trigger.trigger('click')
    const list = wrapper.get('[role="listbox"]')

    expect(list.classes().filter((name) => /^(p|py|pt|pb)-/.test(name))).toEqual([])
    // É o recorte da lista que arredonda o destaque junto com a borda.
    expect(list.classes()).toEqual(expect.arrayContaining(['rounded-2xl', 'overflow-y-auto']))
  })

  it('typeahead acumula as letras digitadas em sequência', async () => {
    const { wrapper, trigger } = mountSelect({
      options: [
        { value: 'sistema', label: 'Sistema' },
        { value: 'sketch', label: 'Sketch' },
        { value: 'skype', label: 'Skype' },
      ],
    })

    await trigger.trigger('keydown', { key: 'ArrowDown' })
    await trigger.trigger('keydown', { key: 's' })
    await trigger.trigger('keydown', { key: 'k' })
    await trigger.trigger('keydown', { key: 'y' })

    expect(trigger.attributes('aria-activedescendant')).toBe(options(wrapper)[2]!.attributes('id'))
  })

  it('opções trocadas com a lista aberta não deixam a ativa apontando para o vazio', async () => {
    const { wrapper, trigger } = mountSelect({}, 'photoshop')

    await trigger.trigger('click')
    await wrapper.setProps({ options: [{ value: 'framer', label: 'Framer' }] })

    expect(trigger.attributes('aria-activedescendant')).toBe(options(wrapper)[0]!.attributes('id'))
  })

  // Revisão do #49: desmontar com a lista aberta deixava ouvintes presos no document e no window.
  it('desmontar com a lista aberta tira os ouvintes de fora', async () => {
    const { wrapper, trigger } = mountSelect()
    await trigger.trigger('click')
    const removed = vi.spyOn(document, 'removeEventListener')

    wrapper.unmount()

    expect(removed).toHaveBeenCalledWith('pointerdown', expect.any(Function), true)
    removed.mockRestore()
  })
})

// Teste trazido do Órbita; os casos de diálogo ficaram de fora (aqui não há diálogo com select).
describe('BaseSelect de verdade no DOM (sem o stub do Teleport)', () => {
  it('fora de modal, a lista vai para o body', async () => {
    const wrapper = mount(BaseSelect, {
      props: { id: 'campo-solto', options: OPTIONS },
      global: { stubs: { teleport: false } },
      attachTo: document.body,
    })

    await wrapper.get('[role="combobox"]').trigger('click')

    expect(document.querySelector('#campo-solto-listbox')?.parentElement).toBe(document.body)
  })
})
