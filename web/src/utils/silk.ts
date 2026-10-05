/**
 * Geometria das fitas do fundo do app.
 *
 * Uma fita é a travessia entre duas **ondas**: a de cima e a de baixo. Onda aqui não é uma
 * curva desenhada à mão, é a soma de alguns harmônicos (amplitude, frequência e fase) — e
 * como as frequências não são múltiplas umas das outras, o desenho nunca se repete ao longo
 * da largura. É daí que vem o ar orgânico.
 *
 * As linhas atravessam em **passo constante**: o espaçamento não adensa, então nenhum feixe
 * se junta e lê como uma linha grossa e dura. O que muda de uma linha para a outra é a
 * forma — amplitude, frequência e fase vão se transformando da onda de cima para a de baixo,
 * e por isso as linhas não são a mesma curva deslocada.
 */

/** Um harmônico da onda: o quanto sobe, quantas voltas dá na largura e onde começa. */
export interface SilkHarmonic {
  /** Altura do desvio, no mesmo sistema do `viewBox`. */
  amplitude: number
  /** Quantas ondas completas cabem na largura da fita. Fracionária de propósito. */
  frequency: number
  /** Deslocamento do começo, em voltas (0.25 = um quarto de onda). */
  phase: number
  /**
   * Voltas por segundo que este harmônico anda. Ausente ou `0` deixa a onda parada.
   *
   * Velocidades **diferentes** entre os harmônicos é o que faz a fita ondular no lugar:
   * cada um avança a mesma fase por segundo, mas quem tem frequência alta percorre menos
   * espaço nesse tanto de fase. Com isso a soma muda de forma. Velocidade igual em todos
   * seria a onda inteira passeando de lado, que é outra coisa.
   */
  speed?: number
}

/** Uma borda da fita: a altura de repouso e os harmônicos que a ondulam. */
export interface SilkWave {
  y: number
  harmonics: readonly SilkHarmonic[]
}

export interface SilkRibbon {
  /** Borda de cima, de onde as linhas saem nítidas. */
  from: SilkWave
  /**
   * Borda de baixo, onde elas se desmancham. Tem os mesmos harmônicos da de cima, com
   * outros valores — é a diferença entre os dois que faz a forma mudar na travessia.
   * Diferença grande demais e as bordas se encontram: aí volta o adensamento.
   */
  to: SilkWave
  /** De onde até onde a fita corre no eixo x. */
  span: readonly [from: number, to: number]
  /** Quantas linhas atravessam de uma borda à outra. */
  lines: number
  /**
   * Segundos para a onda voltar ao ponto de partida.
   *
   * Só vale para a fita animada, e amarra o `speed` dos harmônicos: **cada um tem de dar
   * exatamente uma volta (para um lado ou para o outro) neste tempo**, ou seja `speed` é
   * sempre `±1 / cycle`. Fora disso a última pose não cai em cima da primeira e a animação
   * dá um tranco ao virar o laço.
   */
  cycle?: number
  /** Opacidade da última linha (ver `silkOpacities`). */
  fade?: number
  /** Em quantos pedaços a curva é aproximada. Frequência alta pede mais pedaços. */
  segments?: number
}

const TAU = 2 * Math.PI

/** Com tangente certa, seis pedaços por onda já descrevem a curva sem achatar a crista. */
const SEGMENTS = 20

/**
 * O que diferencia o desvanecimento de uma rampa reta: acima de 1, a fita segura o traço
 * nítido no começo e só desmancha perto do fim — que é como a referência se comporta.
 */
const FADE_CURVE = 1.6

/**
 * Duas casas já seriam ruído num `d` de SVG; uma basta para a curva ficar lisa.
 *
 * Contas em vez de `toFixed`: esta função roda ~20 mil vezes por quadro da ondulação, e
 * `toFixed` monta uma string só para o `Number` desmontar de volta.
 */
function round(value: number): number {
  return Math.round(value * 10) / 10
}

function lerp(from: number, to: number, ratio: number): number {
  return from + (to - from) * ratio
}

function point(x: number, y: number): string {
  return `${round(x)} ${round(y)}`
}

/** Onde o harmônico está, em voltas, no ponto `u` e no instante `seconds`. */
function turns({ frequency, phase, speed = 0 }: SilkHarmonic, u: number, seconds: number): number {
  return frequency * u + phase + speed * seconds
}

/** Altura da onda em `u` — 0 no começo da fita, 1 no fim. */
function heightAt(wave: SilkWave, u: number, seconds: number): number {
  return wave.harmonics.reduce(
    (y, harmonic) => y + harmonic.amplitude * Math.sin(TAU * turns(harmonic, u, seconds)),
    wave.y,
  )
}

/** Inclinação em `u`, por unidade de `u`: é ela que dá as tangentes da curva. */
function slopeAt(wave: SilkWave, u: number, seconds: number): number {
  return wave.harmonics.reduce(
    (slope, harmonic) =>
      slope +
      harmonic.amplitude * TAU * harmonic.frequency * Math.cos(TAU * turns(harmonic, u, seconds)),
    0,
  )
}

/** Uma das linhas da fita, pronta para ser percorrida: altura e inclinação em cada `u`. */
interface SilkLine {
  height: (u: number) => number
  slope: (u: number) => number
}

/**
 * A linha que está em `ratio` da travessia (0 = borda de cima, 1 = de baixo) é a média
 * ponderada das **alturas** das duas bordas, ponto a ponto.
 *
 * Misturar os harmônicos em vez das alturas seria o caminho óbvio — e é errado: a altura não
 * varia de forma linear com a frequência e a fase, então as linhas do meio saem passeando e
 * o vão entre vizinhas ora abre, ora fecha num feixe duro. Misturando altura, o vão num
 * mesmo x é sempre a espessura da fita dividida pelo número de vãos: igual para todas as
 * linhas. A fita ainda respira, porque a espessura muda ao longo da largura — mas devagar,
 * e sem repetir.
 */
function lineAt({ from, to }: SilkRibbon, ratio: number, seconds: number): SilkLine {
  return {
    height: (u) => lerp(heightAt(from, u, seconds), heightAt(to, u, seconds), ratio),
    slope: (u) => lerp(slopeAt(from, u, seconds), slopeAt(to, u, seconds), ratio),
  }
}

/**
 * A cadeia de cúbicas que acompanha a linha de `u` `from` até `u` `to`. Os pontos de controle
 * saem na tangente, a um terço do passo (Hermite): é o que deixa poucos pedaços descreverem
 * a curva sem cortar as cristas. Percorrer de trás para frente também funciona — o passo
 * entra negativo na conta e os controles trocam de lado sozinhos.
 */
function chain(line: SilkLine, ribbon: SilkRibbon, from: number, to: number): string {
  const [left, right] = ribbon.span
  const segments = ribbon.segments ?? SEGMENTS
  const step = (to - from) / segments
  const x = (u: number): number => lerp(left, right, u)

  return Array.from({ length: segments }, (_, index) => {
    const a = from + step * index
    const b = a + step

    return [
      `C ${point(x(a + step / 3), line.height(a) + (line.slope(a) * step) / 3)}`,
      point(x(b - step / 3), line.height(b) - (line.slope(b) * step) / 3),
      point(x(b), line.height(b)),
    ].join(', ')
  }).join(' ')
}

/**
 * Devolve o `d` de cada linha da fita, da borda de cima até a de baixo, no instante
 * `seconds`. Sem harmônico com `speed`, o instante não muda nada.
 */
export function silkPaths(ribbon: SilkRibbon, seconds = 0): string[] {
  const { lines, span } = ribbon

  return Array.from({ length: lines }, (_, index) => {
    const line = lineAt(ribbon, lines === 1 ? 0 : index / (lines - 1), seconds)

    return `M ${point(span[0], line.height(0))} ${chain(line, ribbon, 0, 1)}`
  })
}

/**
 * As poses de cada linha ao longo de um ciclo: o desenho da fita congelado em `count`
 * instantes, mais a repetição do primeiro no fim para a volta fechar.
 *
 * É o que troca conta por memória. Em vez de refazer os caminhos a cada quadro, o navegador
 * recebe as poses prontas e interpola entre elas sozinho. Poses de menos e a interpolação
 * corta as cristas — medi 13,9px de desvio com 8 poses contra 6,3px com 12, numa fita de
 * ~190px de amplitude. O espaçamento entre linhas não sofre: o desvio é uma deformação do
 * conjunto, não de uma linha contra a vizinha.
 */
export function silkPoses(ribbon: SilkRibbon, count: number): string[][] {
  const { cycle = 0, lines } = ribbon
  const frames = Array.from({ length: count + 1 }, (_, index) =>
    silkPaths(ribbon, (index * cycle) / count),
  )

  return Array.from({ length: lines }, (_, line) => frames.map((frame) => frame[line] ?? ''))
}

/** Opacidade de cada linha, da borda de cima (nítida) até a de baixo (desmanchada). */
export function silkOpacities(ribbon: SilkRibbon): number[] {
  const { lines, fade = 0.12 } = ribbon

  return Array.from({ length: lines }, (_, index) => {
    const progress = lines === 1 ? 0 : index / (lines - 1)

    return Number(lerp(1, fade, progress ** FADE_CURVE).toFixed(2))
  })
}
