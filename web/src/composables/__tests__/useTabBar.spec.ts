import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'

import { useTabBar } from '../useTabBar'

const KEYS = ['sectors', 'people'] as const

/**
 * jsdom não calcula layout: sem fingir as medidas, toda aba mediria zero e a pílula
 * não teria o que seguir. Os números são fictícios — só precisam diferir entre as abas.
 */
const MEASURES: Record<string, { left: number; top: number; width: number; height: number }> = {
  sectors: { left: 0, top: 0, width: 130, height: 40 },
  people: { left: 138, top: 4, width: 122, height: 40 },
}

function measureTabs(): void {
  for (const [property, key] of [
    ['offsetLeft', 'left'],
    ['offsetTop', 'top'],
    ['offsetWidth', 'width'],
    ['offsetHeight', 'height'],
  ] as const) {
    Object.defineProperty(HTMLElement.prototype, property, {
      configurable: true,
      get(this: HTMLElement) {
        return MEASURES[this.textContent?.trim() ?? '']?.[key] ?? 0
      },
    })
  }
}

function stopMeasuring(): void {
  for (const property of ['offsetLeft', 'offsetTop', 'offsetWidth', 'offsetHeight']) {
    Reflect.deleteProperty(HTMLElement.prototype, property)
  }
}

const Host = defineComponent({
  setup() {
    return { keys: KEYS, ...useTabBar('sectors') }
  },
  template: `
    <nav ref="nav" role="tablist">
      <span data-pill :style="{ left: pill.left + 'px', top: pill.top + 'px', width: pill.width + 'px', height: pill.height + 'px' }"></span>
      <button
        v-for="key in keys"
        :key="key"
        role="tab"
        :aria-selected="active === key"
        @click="select(key)"
      >{{ key }}</button>
    </nav>
  `,
})

function mountHost() {
  return mount(Host)
}

type Host = ReturnType<typeof mountHost>

async function openTab(wrapper: Host, key: string): Promise<void> {
  const tab = wrapper.findAll('[role="tab"]').find((candidate) => candidate.text() === key)
  await tab?.trigger('click')
}

describe('useTabBar', () => {
  // Sai do protótipo mesmo se o teste que mediu as abas falhar no meio.
  afterEach(stopMeasuring)

  it('começa na aba pedida', () => {
    expect(mountHost().vm.active).toBe('sectors')
  })

  it('o clique abre a aba', async () => {
    const wrapper = mountHost()

    await openTab(wrapper, 'people')

    expect(wrapper.vm.active).toBe('people')
  })

  // Só o que a barra usa sai do composable (o deslize entre abas do Órbita não tem uso aqui).
  it('devolve só a aba aberta, a pílula, o settled e o select', () => {
    let returned: object = {}
    mount(
      defineComponent({
        setup() {
          returned = useTabBar('sectors')
          return () => null
        },
      }),
    )

    expect(Object.keys(returned).sort()).toEqual(['active', 'pill', 'select', 'settled'])
  })

  it('a pílula assume a posição e o tamanho da aba aberta', async () => {
    measureTabs()
    const wrapper = mountHost()
    await wrapper.vm.$nextTick()

    const pill = () => wrapper.get('[data-pill]').attributes('style')
    expect(pill()).toContain('left: 0px')
    expect(pill()).toContain('width: 130px')

    await openTab(wrapper, 'people')

    expect(pill()).toContain('left: 138px')
    expect(pill()).toContain('top: 4px')
    expect(pill()).toContain('width: 122px')
  })

  it('a pílula só ganha transição depois da primeira medida', async () => {
    const wrapper = mountHost()

    expect(wrapper.vm.settled).toBe(false)

    await flushPromises()

    expect(wrapper.vm.settled).toBe(true)
  })
})

/** A mesma barra, mas com botões de filtro (`aria-pressed`) em vez de abas. */
const FilterHost = defineComponent({
  setup() {
    return { keys: KEYS, ...useTabBar('sectors') }
  },
  template: `
    <div ref="nav" role="group">
      <span data-pill :style="{ left: pill.left + 'px', width: pill.width + 'px' }"></span>
      <button
        v-for="key in keys"
        :key="key"
        :aria-pressed="active === key"
        @click="select(key)"
      >{{ key }}</button>
    </div>
  `,
})

describe('useTabBar — barra de botões de filtro', () => {
  afterEach(stopMeasuring)

  it('a pílula também segue o botão marcado com aria-pressed', async () => {
    measureTabs()
    const wrapper = mount(FilterHost)
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-pill]').attributes('style')).toContain('width: 130px')

    const alvo = wrapper.findAll('button').find((button) => button.text() === 'people')
    await alvo?.trigger('click')

    expect(wrapper.get('[data-pill]').attributes('style')).toContain('left: 138px')
  })
})
