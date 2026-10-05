<script setup lang="ts">
import { useId } from 'vue'
import { silkOpacities, silkPaths, type SilkRibbon, type SilkWave } from '@/utils/silk'
import { useSilkPoses } from '@/composables/useSilkPoses'

/**
 * Fundo do app: manchas de óleo na água, desenhadas em SVG e **sem nenhum desfoque** — o
 * borrado é só o do vidro dos cards por cima. Cada fita atravessa de uma curva a outra com
 * ondulação (ver `utils/silk`), então as linhas mudam de forma, se adensam e se cruzam. As
 * fitas se sobrepõem de propósito: com a mistura (`mix-blend`), o cruzamento de duas cores
 * cria uma terceira, que é de onde vem a variação de cor da referência.
 *
 * Dentro de cada fita a linha vai perdendo opacidade da borda de cima para a de baixo: a
 * fita sai nítida de um lado e se desmancha no ar do outro, como na imagem de referência.
 * O traço é fino e o passo entre as linhas, constante — feixe adensado lê como uma linha
 * grossa e dura, que é justamente o que a fita não pode parecer.
 *
 * A cor sai dos tokens do tema por `currentColor` nos `<stop>`, para claro e escuro mudarem
 * sozinhos, sem JS e sem arquivo de imagem.
 *
 * Três das cinco fitas ondulam, e a ondulação é **pré-compilada**: as poses saem prontas
 * (ver `useSilkPoses`) e quem interpola entre elas é o próprio SVG, sem uma linha de JS por
 * quadro.
 */
interface Silk extends SilkRibbon {
  key: string
  /** Cores da fita, do começo ao fim do gradiente (tokens `silk-*` do tema). */
  stops: string[]
  /** Direção do gradiente: `x1 y1 x2 y2`, em fração da caixa da fita. */
  gradient: [number, number, number, number]
  /** Espessura da linha — fita fina e fita grossa não podem ter o mesmo traço. */
  width: number
}

const RIBBONS: Silk[] = [
  // A fita principal cruza o miolo da tela: é ela que passa por trás dos cards.
  {
    key: 'a',
    from: {
      y: 380,
      harmonics: [
        { amplitude: 130, frequency: 0.9, phase: 0.08 },
        { amplitude: 44, frequency: 2.1, phase: 0.33 },
        { amplitude: 16, frequency: 3.4, phase: 0.71 },
      ],
    },
    to: {
      y: 524,
      harmonics: [
        { amplitude: 142, frequency: 0.9, phase: 0.08 },
        { amplitude: 39, frequency: 2.14, phase: 0.35 },
        { amplitude: 18, frequency: 3.46, phase: 0.75 },
      ],
    },
    span: [-200, 1640],
    lines: 48,
    gradient: [0, 0, 1, 0.35],
    width: 0.55,
    stops: ['text-silk-blue', 'text-silk-amber', 'text-silk-violet', 'text-silk-sky'],
  },
  // Fita alta, mais estreita e de onda mais curta.
  {
    key: 'b',
    from: {
      y: 120,
      harmonics: [
        { amplitude: 86, frequency: 1.25, phase: 0.55 },
        { amplitude: 32, frequency: 2.6, phase: 0.18 },
        { amplitude: 13, frequency: 3.6, phase: 0.44 },
      ],
    },
    to: {
      y: 231,
      harmonics: [
        { amplitude: 94, frequency: 1.25, phase: 0.55 },
        { amplitude: 28, frequency: 2.64, phase: 0.2 },
        { amplitude: 15, frequency: 3.66, phase: 0.48 },
      ],
    },
    span: [-200, 1640],
    lines: 40,
    gradient: [0, 0.2, 1, 0],
    width: 0.5,
    stops: ['text-silk-violet', 'text-silk-sky', 'text-silk-indigo'],
  },
  // Rodapé: fecha a composição embaixo, com a onda mais longa de todas.
  {
    key: 'c',
    from: {
      y: 700,
      harmonics: [
        { amplitude: 96, frequency: 0.75, phase: 0.22 },
        { amplitude: 38, frequency: 1.9, phase: 0.62 },
        { amplitude: 15, frequency: 3.2, phase: 0.05 },
      ],
    },
    to: {
      y: 820,
      harmonics: [
        { amplitude: 106, frequency: 0.75, phase: 0.22 },
        { amplitude: 34, frequency: 1.94, phase: 0.64 },
        { amplitude: 17, frequency: 3.26, phase: 0.09 },
      ],
    },
    span: [-200, 1640],
    lines: 36,
    gradient: [0, 0, 0.9, 0.5],
    width: 0.55,
    stops: ['text-silk-sky', 'text-silk-indigo', 'text-silk-amber', 'text-silk-plum'],
  },
  // Diagonal fina que corta as outras: meia onda só, de amplitude grande, vira travessia.
  {
    key: 'd',
    from: {
      y: 300,
      harmonics: [
        { amplitude: 300, frequency: 0.42, phase: 0.78 },
        { amplitude: 40, frequency: 1.8, phase: 0.3 },
        { amplitude: 14, frequency: 3.5, phase: 0.6 },
      ],
    },
    to: {
      y: 402,
      harmonics: [
        { amplitude: 310, frequency: 0.42, phase: 0.78 },
        { amplitude: 36, frequency: 1.84, phase: 0.32 },
        { amplitude: 16, frequency: 3.56, phase: 0.64 },
      ],
    },
    span: [-200, 1640],
    lines: 30,
    gradient: [0.1, 0, 1, 0.6],
    width: 0.45,
    stops: ['text-silk-plum', 'text-silk-blue', 'text-silk-violet'],
  },
  // Acento curto à esquerda, que morre antes da borda direita.
  {
    key: 'e',
    from: {
      y: 460,
      harmonics: [
        { amplitude: 72, frequency: 1.1, phase: 0.35 },
        { amplitude: 30, frequency: 2.4, phase: 0.8 },
        { amplitude: 12, frequency: 3.8, phase: 0.15 },
      ],
    },
    to: {
      y: 559,
      harmonics: [
        { amplitude: 79, frequency: 1.1, phase: 0.35 },
        { amplitude: 26, frequency: 2.44, phase: 0.82 },
        { amplitude: 14, frequency: 3.86, phase: 0.19 },
      ],
    },
    span: [-200, 1180],
    lines: 26,
    gradient: [0, 0, 1, 0.2],
    width: 0.5,
    stops: ['text-silk-indigo', 'text-silk-plum', 'text-silk-blue'],
  },
]

/**
 * Quais fitas ondulam, em quantos segundos fecham a volta e para que lado cada harmônico
 * corre. Só as três que de fato aparecem: as duas mais fracas (a diagonal fina e o acento
 * curto) ficam quietas por baixo delas, e guardar pose para elas seria memória à toa.
 *
 * Ciclos que não são múltiplos uns dos outros, para as três nunca voltarem juntas ao começo.
 * Sentidos opostos entre harmônicos é o que faz a fita **mudar de forma** em vez de passear
 * de lado.
 */
const DRIFTS: Record<string, { cycle: number; ways: readonly number[] }> = {
  a: { cycle: 140, ways: [1, -1, 1] },
  b: { cycle: 115, ways: [-1, 1, -1] },
  c: { cycle: 170, ways: [1, -1, 1] },
}

/**
 * Põe a fita para andar. O `speed` sai do sentido dividido pelo ciclo, e por isso fecha
 * uma volta exata — que é o que a animação pré-compilada exige (ver `cycle` em `utils/silk`).
 * Escrever o `speed` à mão convidava a errar essa conta.
 */
function drifting(ribbon: Silk): Silk {
  const drift = DRIFTS[ribbon.key]

  if (!drift) return ribbon

  const move = (wave: SilkWave): SilkWave => ({
    ...wave,
    harmonics: wave.harmonics.map((harmonic, index) => ({
      ...harmonic,
      speed: (drift.ways[index] ?? 0) / drift.cycle,
    })),
  })

  return { ...ribbon, cycle: drift.cycle, from: move(ribbon.from), to: move(ribbon.to) }
}

// Nada aqui depende do tempo: o desenho parado e a opacidade por linha saem uma vez só, na
// carga do módulo. O que se mexe são as poses, que chegam depois.
const SILKS = RIBBONS.map(drifting).map((ribbon) => ({
  ...ribbon,
  paths: silkPaths(ribbon),
  opacities: silkOpacities(ribbon),
}))

const poses = useSilkPoses(SILKS)

/** Cores entre 15% e 85% do gradiente: as pontas ficam para o desvanecimento. */
function stopOffset(index: number, total: number): number {
  return total === 1 ? 0.5 : 0.15 + (0.7 * index) / (total - 1)
}

/** Prefixo dos `id` dos gradientes — dois fundos na mesma página não podem colidir. */
const uid = useId()
</script>

<template>
  <!-- Decoração pura: fora da ordem de leitura e fora do alcance do mouse. -->
  <div
    class="from-haze-200 via-haze-100 to-dusk-200 dark:from-ink-950 dark:via-ink-950 dark:to-dusk-950 pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-linear-to-br"
    aria-hidden="true"
  >
    <!--
      `slice` cobre a tela inteira cortando o excesso: no celular sobra altura e falta
      largura, e as manchas continuam atravessando de ponta a ponta.
    -->
    <svg
      class="absolute inset-0 size-full opacity-40 dark:opacity-50"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      <defs>
        <!-- As pontas do gradiente são transparentes: a fita nasce e morre no ar, sem
             cortar reta na borda da tela. -->
        <linearGradient
          v-for="silk in SILKS"
          :id="`${uid}-${silk.key}`"
          :key="silk.key"
          :x1="silk.gradient[0]"
          :y1="silk.gradient[1]"
          :x2="silk.gradient[2]"
          :y2="silk.gradient[3]"
        >
          <stop offset="0" :class="silk.stops[0]" stop-color="currentColor" stop-opacity="0" />
          <stop
            v-for="(tone, index) in silk.stops"
            :key="tone"
            :offset="stopOffset(index, silk.stops.length)"
            :class="tone"
            stop-color="currentColor"
          />
          <stop offset="1" :class="silk.stops[silk.stops.length - 1]" stop-color="currentColor" stop-opacity="0" />
        </linearGradient>
      </defs>

      <!--
        No claro a mancha escurece o que está embaixo (`multiply`); no escuro ela acende
        (`screen`). Nos dois casos, onde duas fitas se cruzam nasce uma cor que nenhuma
        delas tem sozinha.
      -->
      <g
        v-for="silk in SILKS"
        :key="silk.key"
        class="mix-blend-multiply dark:mix-blend-screen"
        :stroke="`url(#${uid}-${silk.key})`"
        :stroke-width="silk.width"
        stroke-linecap="round"
      >
        <!-- O `<animate>` só existe quando há poses: sem elas (movimento reduzido, ou
             antes de a tarefa ociosa rodar) a fita fica no desenho parado. -->
        <path
          v-for="(d, index) in silk.paths"
          :key="index"
          :d="d"
          :stroke-opacity="silk.opacities[index]"
        >
          <animate
            v-if="poses[silk.key]"
            attributeName="d"
            :values="poses[silk.key]?.[index]"
            :dur="`${silk.cycle}s`"
            repeatCount="indefinite"
          />
        </path>
      </g>
    </svg>
  </div>
</template>
