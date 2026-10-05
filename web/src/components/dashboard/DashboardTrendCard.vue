<script setup lang="ts">
import { computed } from 'vue'
import GlassPanel from '@/components/ui/GlassPanel.vue'
import type { DashboardTrend } from '@/services/dashboard'
import { DEMAND_STATUS_TOTAL_LABELS } from '@/services/demands'
import { buildSeriesPath, formatAxisLabel, formatPointLabel, pickAxisTicks } from '@/utils/dashboard'

// "Evolução das solicitações" (item 0030), no molde do gráfico do Órbita: criadas (pela data de criação) e finalizadas
// (pela data de cada conclusão), por dia ou por mês conforme a API decidiu.
const props = defineProps<{
  trend: DashboardTrend | null
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{ retry: [] }>()

/** Coordenadas internas do desenho; a largura real vem do CSS, esticando o `viewBox`. */
const WIDTH = 600
const HEIGHT = 180
/** Folga em cima e embaixo: sem ela o traço seria cortado ao meio nos extremos. */
const PADDING = 6

/** Quantas datas cabem no eixo sem as legendas se encavalarem no celular. */
const MAX_TICKS = 5

const points = computed(() => props.trend?.points ?? [])
const granularity = computed(() => props.trend?.granularity ?? 'day')

const finished = computed(() => points.value.map((point) => point.finished))
const created = computed(() => points.value.map((point) => point.created))

const isEmpty = computed(() =>
  points.value.every((point) => point.created === 0 && point.finished === 0),
)

/**
 * As duas linhas dividem o mesmo eixo: sem uma escala comum cada uma seria normalizada
 * pelos próprios extremos e o gráfico mostraria a menor série por cima da maior.
 */
const domain = computed(() => {
  const values = [...finished.value, ...created.value]

  return { min: 0, max: values.length ? Math.max(...values) : 0 }
})

const options = computed(() => ({
  width: WIDTH,
  height: HEIGHT,
  padding: PADDING,
  domain: domain.value,
}))

const finishedPath = computed(() => buildSeriesPath(finished.value, options.value))
const createdPath = computed(() => buildSeriesPath(created.value, options.value))

/**
 * Datas que ganham rótulo no eixo, cada uma ancorada na fração exata em que o seu ponto caiu.
 * Os extremos encostam na borda em vez de centralizar: centrados, metade do rótulo sairia do gráfico.
 */
const ticks = computed(() => {
  const total = points.value.length

  return pickAxisTicks(total, MAX_TICKS).map((index) => {
    const ratio = total > 1 ? index / (total - 1) : 0.5

    return {
      index,
      label: formatAxisLabel(points.value[index]?.date ?? '', granularity.value),
      style:
        ratio === 0
          ? { left: '0' }
          : ratio === 1
            ? { right: '0' }
            : { left: `${ratio * 100}%`, transform: 'translateX(-50%)' },
    }
  })
})

const totals = computed(() => ({
  finished: finished.value.reduce((sum, value) => sum + value, 0),
  created: created.value.reduce((sum, value) => sum + value, 0),
}))

/** O gráfico é imagem: o resumo abaixo é o que o leitor de tela recebe no lugar dele. */
const chartLabel = computed(
  () =>
    `Evolução das solicitações: ${totals.value.created} criadas e ` +
    `${totals.value.finished} finalizadas no período.`,
)
</script>

<template>
  <GlassPanel
    title="Evolução das solicitações"
    :loading="loading"
    :error="error"
    :empty="isEmpty"
    empty-message="Sem solicitações no período escolhido."
    @retry="emit('retry')"
  >
    <div class="flex flex-col gap-4">
      <!-- Legenda por traço: a cor aqui é o que separa as duas séries. -->
      <ul class="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <li class="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <span class="bg-brand-500 h-0.5 w-5 rounded-full dark:bg-brand-400" aria-hidden="true"></span>
          {{ DEMAND_STATUS_TOTAL_LABELS.finished }}
          <span class="font-semibold text-slate-900 tabular-nums dark:text-white">{{ totals.finished }}</span>
        </li>
        <li class="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <span
            class="h-0.5 w-5 rounded-full border-t-2 border-dashed border-slate-400 dark:border-slate-500"
            aria-hidden="true"
          ></span>
          Criadas
          <span class="font-semibold text-slate-900 tabular-nums dark:text-white">{{ totals.created }}</span>
        </li>
      </ul>

      <div class="flex gap-3">
        <!-- Escala vertical em HTML: dentro do SVG esticado o texto sairia deformado. -->
        <div
          class="flex shrink-0 flex-col justify-between py-0.5 text-xs text-slate-500 tabular-nums dark:text-slate-400"
          aria-hidden="true"
        >
          <span>{{ domain.max }}</span>
          <span>{{ Math.round(domain.max / 2) }}</span>
          <span>0</span>
        </div>

        <div class="min-w-0 flex-1">
          <svg
            :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
            preserveAspectRatio="none"
            class="h-40 w-full sm:h-48 xl:h-72"
            role="img"
            :aria-label="chartLabel"
          >
            <!-- Linhas de apoio; `vector-effect` mantém a espessura apesar do esticamento. -->
            <line
              v-for="row in [0, 1, 2]"
              :key="row"
              x1="0"
              :x2="WIDTH"
              :y1="(row * HEIGHT) / 2"
              :y2="(row * HEIGHT) / 2"
              class="stroke-slate-900/10 dark:stroke-white/10"
              stroke-width="1"
              vector-effect="non-scaling-stroke"
            />

            <path :d="finishedPath.area" class="fill-brand-500/15 dark:fill-brand-400/15" />

            <path
              :d="createdPath.line"
              fill="none"
              stroke-dasharray="6 5"
              stroke-width="2"
              stroke-linecap="round"
              vector-effect="non-scaling-stroke"
              class="stroke-slate-400 dark:stroke-slate-500"
            />

            <path
              :d="finishedPath.line"
              fill="none"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              vector-effect="non-scaling-stroke"
              class="stroke-brand-500 dark:stroke-brand-400"
            />
          </svg>

          <div class="relative mt-2 h-4" aria-hidden="true">
            <span
              v-for="tick in ticks"
              :key="tick.index"
              class="absolute text-xs whitespace-nowrap text-slate-500 tabular-nums dark:text-slate-400"
              :style="tick.style"
            >
              {{ tick.label }}
            </span>
          </div>
        </div>
      </div>

      <!-- O desenho não se lê em voz alta: a série inteira vai em texto para quem precisa. -->
      <ul class="sr-only">
        <li v-for="point in points" :key="point.date">
          {{ formatPointLabel(point.date, granularity) }}: {{ point.created }} criadas,
          {{ point.finished }} finalizadas.
        </li>
      </ul>
    </div>
  </GlassPanel>
</template>
