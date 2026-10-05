<script setup lang="ts">
import { computed, watch } from 'vue'
import BaseField from '@/components/ui/BaseField.vue'
import { useTabBar } from '@/composables/useTabBar'
import { DEMAND_CATEGORY_OPTIONS, type DemandCategory } from '@/services/demands'
import { DASHBOARD_RANGES, DASHBOARD_RANGE_LABELS, type DashboardRange } from '@/utils/dashboard'

// Filtros do dashboard (item 0030), no molde do Órbita: categoria no lugar da diretoria, intervalo com a pílula
// animada e, no personalizado, as duas datas.
const props = defineProps<{
  /** Recorte em vigor, por extenso. */
  periodLabel: string
  /** Erro do período personalizado (validação de conveniência). */
  customError: string | null
}>()

const range = defineModel<DashboardRange>('range', { required: true })
const category = defineModel<DemandCategory | ''>('category', { required: true })
const customStart = defineModel<string>('customStart', { required: true })
const customEnd = defineModel<string>('customEnd', { required: true })

/** O `BaseField` fala `string`; aqui só chegam valores da lista de categorias (ou vazio). */
const categoryText = computed({
  get: () => category.value,
  set: (value: string) => (category.value = value as DemandCategory | ''),
})

/**
 * A pílula que segue o intervalo escolhido é a mesma barra do Órbita. Aqui os botões são filtro, não aba:
 * o estado mora no `aria-pressed`, e a pílula é decoração.
 */
const { active, pill, settled, select } = useTabBar(range.value)

watch(active, (value) => (range.value = value))
watch(range, (value) => select(value))

/**
 * O erro vai para o campo que o causou: campo vazio cobra a si mesmo e a comparação entre as datas pertence à
 * data final. A cobrança só começa depois que uma das pontas foi escolhida.
 */
const started = computed(() => Boolean(customStart.value || customEnd.value))

const startError = computed(() =>
  props.customError && started.value && !customStart.value ? 'Informe a data inicial.' : undefined,
)

const endError = computed(() => {
  if (!props.customError || !started.value) return undefined
  if (!customEnd.value) return 'Informe a data final.'
  return customStart.value ? props.customError : undefined
})
</script>

<template>
  <div
    class="bg-surface-panel flex flex-col gap-4 rounded-3xl border border-white/60 p-5 shadow-xl shadow-slate-900/10 backdrop-blur-lg sm:p-6 dark:border-white/10 dark:shadow-black/40"
  >
    <h2 class="sr-only">Filtros do painel</h2>

    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <BaseField
        v-model="categoryText"
        control="select"
        label="Categoria"
        placeholder-option="Todas as categorias"
        :options="DEMAND_CATEGORY_OPTIONS"
        class="w-full lg:max-w-xs"
      />

      <div class="flex flex-col gap-1.5">
        <span id="dashboard-range-label" class="text-xs font-medium text-slate-600 dark:text-slate-300">
          Intervalo
        </span>

        <div
          ref="nav"
          class="relative flex flex-wrap gap-2"
          role="group"
          aria-labelledby="dashboard-range-label"
        >
          <!-- Decoração: quem diz qual intervalo está escolhido é o `aria-pressed` do botão. -->
          <span
            v-show="settled"
            class="bg-sidebar-active pointer-events-none absolute rounded-full shadow-sm shadow-slate-950/20 transition-all duration-400 ease-out motion-reduce:transition-none dark:bg-white"
            :style="{
              left: `${pill.left}px`,
              top: `${pill.top}px`,
              width: `${pill.width}px`,
              height: `${pill.height}px`,
            }"
            aria-hidden="true"
          ></span>

          <button
            v-for="option in DASHBOARD_RANGES"
            :key="option"
            type="button"
            :aria-pressed="range === option"
            class="relative inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition duration-400"
            :class="
              range === option
                ? 'text-white dark:text-slate-950'
                : 'bg-surface-item hover:bg-surface-item-hover text-slate-700 dark:text-slate-200'
            "
            @click="select(option)"
          >
            {{ DASHBOARD_RANGE_LABELS[option] }}
          </button>
        </div>
      </div>
    </div>

    <!-- As duas datas só existem no intervalo personalizado: fora dele seriam campos mortos. -->
    <div v-if="range === 'custom'" class="grid grid-cols-1 gap-4 sm:max-w-md sm:grid-cols-2">
      <BaseField v-model="customStart" type="date" label="De" :error="startError" />
      <BaseField v-model="customEnd" type="date" label="Até" :error="endError" />
    </div>

    <p class="text-xs text-slate-500 dark:text-slate-400">
      <span class="font-medium text-slate-600 dark:text-slate-300">Período:</span>
      {{ periodLabel }}
    </p>
  </div>
</template>
