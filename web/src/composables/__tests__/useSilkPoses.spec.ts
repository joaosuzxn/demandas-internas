import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

import { SILK_POSES, useSilkPoses, type SilkScene } from '../useSilkPoses'
import type { SilkWave } from '@/utils/silk'

const wave = (y: number): SilkWave => ({
  y,
  harmonics: [{ amplitude: 40, frequency: 1, phase: 0, speed: 0.05 }],
})

/** Fita que anda: um harmônico dando uma volta no ciclo de 20s. */
const moving: SilkScene = {
  key: 'moving',
  from: wave(100),
  to: wave(220),
  span: [0, 600],
  lines: 4,
  cycle: 20,
}

/** Fita parada: sem `cycle`, não há o que animar. */
const still: SilkScene = {
  key: 'still',
  from: { y: 300, harmonics: [{ amplitude: 40, frequency: 1, phase: 0 }] },
  to: { y: 420, harmonics: [{ amplitude: 40, frequency: 1, phase: 0 }] },
  span: [0, 600],
  lines: 4,
}

function reducedMotion(reduce: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    addEventListener: vi.fn<() => void>(),
    removeEventListener: vi.fn<() => void>(),
  }))
}

/** Segura a tarefa ociosa para o teste decidir quando ela roda. */
function fakeIdle() {
  let pending: (() => void) | undefined
  let cancels = 0

  vi.stubGlobal('requestIdleCallback', (callback: () => void) => {
    pending = callback

    return 1
  })
  vi.stubGlobal('cancelIdleCallback', () => {
    pending = undefined
    cancels += 1
  })

  return {
    run(): void {
      const callback = pending
      pending = undefined
      callback?.()
    },
    get scheduled(): boolean {
      return pending !== undefined
    },
    get cancels(): number {
      return cancels
    },
  }
}

function withScope(ribbons: SilkScene[]) {
  const scope = effectScope()
  const poses = scope.run(() => useSilkPoses(ribbons))

  return { scope, poses: poses! }
}

describe('useSilkPoses', () => {
  beforeEach(() => reducedMotion(false))
  afterEach(() => vi.unstubAllGlobals())

  it('não gera nada no primeiro quadro: a tela não espera pelo fundo', () => {
    const idle = fakeIdle()
    const { poses } = withScope([moving])

    expect(idle.scheduled).toBe(true)
    expect(poses.value).toEqual({})
  })

  it('gera as poses de cada linha da fita que anda', () => {
    const idle = fakeIdle()
    const { poses } = withScope([moving, still])

    idle.run()

    expect(Object.keys(poses.value)).toEqual(['moving'])
    expect(poses.value.moving).toHaveLength(moving.lines)
  })

  it('cada linha vira uma lista de poses pronta para o SVG, com a volta fechada', () => {
    const idle = fakeIdle()
    const { poses } = withScope([moving])

    idle.run()
    const line = poses.value.moving?.[0]?.split(';') ?? []

    expect(line).toHaveLength(SILK_POSES + 1)
    expect(line[0]).toBe(line[line.length - 1])
  })

  it('com `prefers-reduced-motion`, não agenda nem gera', () => {
    reducedMotion(true)
    const idle = fakeIdle()
    const { poses } = withScope([moving])

    expect(idle.scheduled).toBe(false)
    expect(poses.value).toEqual({})
  })

  it('ao sair de cena antes de gerar, cancela a tarefa', () => {
    const idle = fakeIdle()
    const { scope } = withScope([moving])

    scope.stop()

    expect(idle.cancels).toBe(1)
  })
})
