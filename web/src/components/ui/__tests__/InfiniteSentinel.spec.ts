import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import InfiniteSentinel from '../InfiniteSentinel.vue'
import { installIntersectionObserver } from './intersectionObserver'

afterEach(() => {
  vi.unstubAllGlobals()
})

// O sentinela fica no fim de uma lista que rola; a área observada é a própria lista.
function mountInList() {
  return mount({
    render: () => h('ul', { 'data-list': '' }, [h('li', 'item'), h(InfiniteSentinel)]),
  })
}

describe('InfiniteSentinel', () => {
  it('avisa quando aparece na área de rolagem da lista em volta', () => {
    const io = installIntersectionObserver()
    const wrapper = mountInList()

    expect(io.observers[0]!.options?.root).toBe(wrapper.get('[data-list]').element)

    io.reveal()

    expect(wrapper.findComponent(InfiniteSentinel).emitted('visible')).toHaveLength(1)
  })

  it('não avisa enquanto não aparece', () => {
    const io = installIntersectionObserver()
    const wrapper = mountInList()

    io.observers[0]!.callback(
      [
        {
          target: wrapper.get('li:last-child').element,
          isIntersecting: false,
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver,
    )

    expect(wrapper.findComponent(InfiniteSentinel).emitted('visible')).toBeUndefined()
  })

  it('para de observar ao sair da tela', () => {
    const io = installIntersectionObserver()
    const wrapper = mountInList()

    wrapper.unmount()

    expect(io.active()).toHaveLength(0)
  })
})
