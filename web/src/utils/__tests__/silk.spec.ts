import { describe, expect, it } from 'vitest'

import { silkOpacities, silkPaths, silkPoses, type SilkRibbon, type SilkWave } from '../silk'

/** Onda lisa: sem harmônico nenhum, a borda é uma reta na altura `y`. */
function flat(y: number): SilkWave {
  return { y, harmonics: [] }
}

/** Fita de bordas retas — com ela a conta da travessia fica visível a olho nu. */
const straight: SilkRibbon = {
  from: flat(0),
  to: flat(100),
  span: [0, 300],
  lines: 3,
  segments: 2,
}

/**
 * Fita ondulada, com as duas bordas de formas diferentes — mas só um pouco: frequência e
 * fase muito distantes fazem as bordas se encontrarem no meio do caminho, e aí as linhas
 * pinçam num feixe. É o limite que o `to` do tipo documenta.
 */
const wavy: SilkRibbon = {
  from: { y: 200, harmonics: [{ amplitude: 80, frequency: 0.9, phase: 0.1 }] },
  to: { y: 400, harmonics: [{ amplitude: 96, frequency: 0.92, phase: 0.07 }] },
  span: [0, 1440],
  lines: 16,
}

/** Todos os números de um `d`, na ordem em que aparecem. */
function coords(path: string): number[] {
  return (path.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
}

/**
 * A altura dos pontos por onde a curva passa de fato — o `M` e o fim de cada cúbica. Os
 * pontos de controle ficam de fora: eles puxam a curva, mas ela não passa por eles.
 */
function knots(path: string): number[] {
  return coords(path)
    .filter((_, index) => index % 2 === 1)
    .filter((_, index) => index % 3 === 0)
}

/** As alturas de todas as linhas, agrupadas por ponto da travessia. */
function columns(paths: string[]): number[][] {
  const rows = paths.map(knots)

  return (rows[0] ?? []).map((_, index) => rows.map((row) => row[index] ?? Number.NaN))
}

/** A diferença de um valor para o anterior, par a par. */
function steps(values: number[]): number[] {
  return values.reduce<number[]>((diffs, value, index) => {
    const previous = values[index - 1]

    return previous === undefined ? diffs : [...diffs, value - previous]
  }, [])
}

describe('silkPaths', () => {
  it('desenha uma linha para cada `lines`', () => {
    expect(silkPaths({ ...straight, lines: 12 })).toHaveLength(12)
  })

  it('borda reta vira linha reta, de ponta a ponta da fita', () => {
    expect(silkPaths(straight)).toEqual([
      'M 0 0 C 50 0, 100 0, 150 0 C 200 0, 250 0, 300 0',
      'M 0 50 C 50 50, 100 50, 150 50 C 200 50, 250 50, 300 50',
      'M 0 100 C 50 100, 100 100, 150 100 C 200 100, 250 100, 300 100',
    ])
  })

  it('as linhas ficam à mesma distância umas das outras — nenhum feixe se junta', () => {
    const gaps = columns(silkPaths({ ...straight, lines: 11 })).flatMap(steps)

    expect(new Set(gaps)).toEqual(new Set([10]))
  })

  it('num mesmo ponto da largura, todos os vãos da fita são iguais', () => {
    // Esta é a garantia que a fita inteira depende: mesmo com as bordas de formas
    // diferentes, nenhuma linha do meio passeia e nenhum feixe se junta. Só vale porque a
    // travessia mistura a ALTURA das bordas — misturar os harmônicos quebra isto.
    const tolerance = columns(silkPaths(wavy)).map((column) => {
      const gaps = steps(column)

      return Math.max(...gaps) - Math.min(...gaps)
    })

    // A diferença que sobra é só o arredondamento de uma casa do `d`.
    expect(Math.max(...tolerance)).toBeLessThanOrEqual(0.2)
  })

  it('a espessura da fita respira ao longo da largura, sem nunca se fechar', () => {
    const gaps = columns(silkPaths(wavy)).flatMap(steps)

    // Nenhuma linha encosta na vizinha nem passa por cima dela…
    expect(Math.min(...gaps)).toBeGreaterThan(0)
    // …e o vão mais largo não chega ao dobro do mais estreito.
    expect(Math.max(...gaps) / Math.min(...gaps)).toBeLessThan(2)
  })

  it('as linhas não são a mesma curva deslocada — a forma muda na travessia', () => {
    const distances = columns(silkPaths(wavy)).map(
      (column) => (column[column.length - 1] ?? 0) - (column[0] ?? 0),
    )

    expect(new Set(distances.map(Math.round)).size).toBeGreaterThan(1)
  })

  it('a ondulação é a soma dos harmônicos, e frequência quebrada não repete o desenho', () => {
    const [line] = silkPaths({
      ...wavy,
      lines: 1,
      from: {
        y: 0,
        harmonics: [
          { amplitude: 100, frequency: 1, phase: 0 },
          { amplitude: 30, frequency: 2.7, phase: 0.4 },
        ],
      },
    })
    const heights = knots(line ?? '')

    // Uma onda só voltaria à mesma altura na metade do caminho; com o segundo harmônico, não.
    expect(heights[0]).not.toBe(heights[heights.length / 2])
  })

  it('a curva sai na tangente da onda: na crista, o controle fica no nível do ponto', () => {
    // Fase 0.25 põe a crista em `u` 0 — ali a onda está plana, e o controle acompanha.
    const [line] = silkPaths({
      ...straight,
      lines: 1,
      from: { y: 0, harmonics: [{ amplitude: 100, frequency: 1, phase: 0.25 }] },
    })

    expect(line).toMatch(/^M 0 100 C 50 100,/)
  })

  it('fita de uma linha só fica na borda de cima', () => {
    expect(silkPaths({ ...straight, lines: 1 })).toEqual([
      'M 0 0 C 50 0, 100 0, 150 0 C 200 0, 250 0, 300 0',
    ])
  })
})

/**
 * Fita animada: dois harmônicos correndo em velocidades diferentes — e em sentidos
 * diferentes —, que é o que faz a onda mudar de forma em vez de passear inteira.
 * O ciclo fecha em 20s (períodos de 10s e 4s).
 */
const pulsing: SilkRibbon = {
  from: {
    y: 200,
    harmonics: [
      { amplitude: 80, frequency: 1, phase: 0, speed: 0.1 },
      { amplitude: 30, frequency: 3, phase: 0.2, speed: -0.25 },
    ],
  },
  to: {
    y: 400,
    harmonics: [
      { amplitude: 96, frequency: 1, phase: 0, speed: 0.1 },
      { amplitude: 24, frequency: 3, phase: 0.2, speed: -0.25 },
    ],
  },
  span: [0, 1440],
  lines: 12,
}

/** A distância da crista ao vale da primeira linha — a "altura" do desenho naquele instante. */
function spread(ribbon: SilkRibbon, seconds: number): number {
  const heights = knots(silkPaths(ribbon, seconds)[0] ?? '')

  return Math.max(...heights) - Math.min(...heights)
}

describe('silkPaths ao longo do tempo', () => {
  it('sem `speed`, o instante não muda nada — a fita parada continua parada', () => {
    expect(silkPaths(wavy, 7.5)).toEqual(silkPaths(wavy, 0))
  })

  it('com `speed`, a onda de um instante não é a do outro', () => {
    expect(silkPaths(pulsing, 1.2)).not.toEqual(silkPaths(pulsing, 0))
  })

  it('a volta completa devolve o mesmo desenho: a onda cicla, não deriva para longe', () => {
    expect(silkPaths(pulsing, 20)).toEqual(silkPaths(pulsing, 0))
  })

  it('velocidades diferentes mudam a FORMA da onda, não passeiam com ela', () => {
    // Onda só transladada guardaria sempre a mesma distância entre a crista e o vale.
    expect(spread(pulsing, 1.7)).not.toBeCloseTo(spread(pulsing, 0), 1)
  })

  it('o espaçamento uniforme continua valendo em qualquer instante', () => {
    const tolerance = columns(silkPaths(pulsing, 3.4)).map((column) => {
      const gaps = steps(column)

      return Math.max(...gaps) - Math.min(...gaps)
    })

    expect(Math.max(...tolerance)).toBeLessThanOrEqual(0.2)
  })
})

describe('silkPoses', () => {
  /** Ciclo de 20s com todo harmônico dando exatamente uma volta — um para cada lado. */
  const cycling: SilkRibbon = {
    ...pulsing,
    cycle: 20,
    from: {
      ...pulsing.from,
      harmonics: pulsing.from.harmonics.map((h, i) => ({ ...h, speed: i === 0 ? 0.05 : -0.05 })),
    },
    to: {
      ...pulsing.to,
      harmonics: pulsing.to.harmonics.map((h, i) => ({ ...h, speed: i === 0 ? 0.05 : -0.05 })),
    },
  }

  it('devolve as poses de cada linha da fita', () => {
    expect(silkPoses(cycling, 12)).toHaveLength(cycling.lines)
  })

  it('dá uma pose a mais que o pedido, para a volta cair de novo no começo', () => {
    expect(silkPoses(cycling, 12)[0]).toHaveLength(13)
  })

  it('a última pose é igual à primeira: o laço fecha sem tranco', () => {
    const poses = silkPoses(cycling, 12)

    expect(poses.every((line) => line[0] === line[line.length - 1])).toBe(true)
  })

  it('harmônico que não fecha uma volta no ciclo estraga o laço', () => {
    // A regra que o desenho das fitas tem de respeitar: `speed` é sempre ±1/`cycle`.
    // Com meia volta, a última pose cai no meio do caminho e a animação daria um salto.
    const skewed = {
      ...cycling,
      from: {
        ...cycling.from,
        harmonics: cycling.from.harmonics.map((h) => ({ ...h, speed: 0.025 })),
      },
    }
    const [skewedLine = []] = silkPoses(skewed, 12)

    expect(skewedLine[0]).not.toBe(skewedLine[skewedLine.length - 1])
  })

  it('fita parada repete a mesma pose — nada a animar', () => {
    const poses = silkPoses({ ...wavy, cycle: 20 }, 12)

    expect(new Set(poses[0])).toHaveLength(1)
  })
})

describe('silkOpacities', () => {
  it('dá uma opacidade para cada linha', () => {
    expect(silkOpacities({ ...straight, lines: 12 })).toHaveLength(12)
  })

  it('a primeira linha é opaca e a última chega no `fade`', () => {
    const opacities = silkOpacities({ ...straight, lines: 12, fade: 0.2 })

    expect(opacities[0]).toBe(1)
    expect(opacities[opacities.length - 1]).toBe(0.2)
  })

  it('a opacidade só cai — é o desvanecimento de cima para baixo', () => {
    const drops = steps(silkOpacities({ ...straight, lines: 24 }))

    // Nenhuma linha reacende no meio do caminho…
    expect(drops.every((drop) => drop <= 0)).toBe(true)
    // …e a queda é de verdade, não uma fita de opacidade constante.
    expect(Math.min(...drops)).toBeLessThan(0)
  })

  it('segura o traço nítido no começo e desmancha no fim, em vez de cair reto', () => {
    const opacities = silkOpacities({ ...straight, lines: 3, fade: 0.12 })

    // A linha do meio ainda está bem acima da média entre as pontas (0.56).
    expect(opacities[1]).toBe(0.71)
  })

  it('fita de uma linha só não tem para onde desvanecer', () => {
    expect(silkOpacities({ ...straight, lines: 1 })).toEqual([1])
  })
})
