import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import AppBackdrop from '../AppBackdrop.vue'
import { SILK_POSES } from '@/composables/useSilkPoses'

function reducedMotion(reduce: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    addEventListener: vi.fn<() => void>(),
    removeEventListener: vi.fn<() => void>(),
  }))
}

/** Segura a tarefa ociosa para o teste decidir quando as poses são geradas. */
function fakeIdle() {
  let pending: (() => void) | undefined

  vi.stubGlobal('requestIdleCallback', (callback: () => void) => {
    pending = callback

    return 1
  })
  vi.stubGlobal('cancelIdleCallback', () => {
    pending = undefined
  })

  return {
    run(): void {
      const callback = pending
      pending = undefined
      callback?.()
    },
  }
}

/** Quantas fitas do fundo têm animação pendurada. */
function animated(wrapper: ReturnType<typeof mount>): number {
  return wrapper.findAll('g').filter((group) => group.find('animate').exists()).length
}

describe('AppBackdrop', () => {
  beforeEach(() => reducedMotion(false))
  afterEach(() => vi.unstubAllGlobals())

  it('abre sem animação nenhuma: a primeira pintura não espera pelas poses', () => {
    fakeIdle()
    const wrapper = mount(AppBackdrop)

    expect(wrapper.findAll('g').length).toBeGreaterThan(0)
    expect(animated(wrapper)).toBe(0)
  })

  it('passada a tarefa ociosa, só as três fitas que ondulam ganham `<animate>`', async () => {
    const idle = fakeIdle()
    const wrapper = mount(AppBackdrop)

    idle.run()
    await wrapper.vm.$nextTick()

    expect(animated(wrapper)).toBe(3)
    // As outras duas seguem paradas — é o que segura o custo de memória.
    expect(wrapper.findAll('g')).toHaveLength(5)
  })

  it('cada linha animada recebe as poses do ciclo, com a volta fechada', async () => {
    const idle = fakeIdle()
    const wrapper = mount(AppBackdrop)

    idle.run()
    await wrapper.vm.$nextTick()

    const values = wrapper.find('animate').attributes('values')?.split(';') ?? []

    expect(values).toHaveLength(SILK_POSES + 1)
    expect(values[0]).toBe(values[values.length - 1])
  })

  it('o `<animate>` repete para sempre, no ciclo declarado da fita', async () => {
    const idle = fakeIdle()
    const wrapper = mount(AppBackdrop)

    idle.run()
    await wrapper.vm.$nextTick()

    const animate = wrapper.find('animate')

    expect(animate.attributes('repeatCount') ?? animate.attributes('repeatcount')).toBe(
      'indefinite',
    )
    expect(animate.attributes('dur')).toMatch(/^\d+s$/)
  })

  it('com `prefers-reduced-motion`, o fundo fica parado e sem `<animate>`', async () => {
    reducedMotion(true)
    const idle = fakeIdle()
    const wrapper = mount(AppBackdrop)

    idle.run()
    await wrapper.vm.$nextTick()

    expect(animated(wrapper)).toBe(0)
  })
})
