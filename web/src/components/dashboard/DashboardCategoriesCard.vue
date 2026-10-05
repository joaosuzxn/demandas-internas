<script setup lang="ts">
import { computed } from 'vue'
import GlassPanel from '@/components/ui/GlassPanel.vue'
import type { DashboardCategoryTotal } from '@/services/dashboard'
import { DEMAND_CATEGORY_LABELS, type DemandCategory } from '@/services/demands'
import { toPercentage } from '@/utils/dashboard'

// "Por categoria" (item 0030), no molde do "Por diretoria" do Órbita: clicar numa categoria filtra o painel por ela.
const props = defineProps<{
  categories: DashboardCategoryTotal[]
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{ select: [category: DemandCategory]; retry: [] }>()

/** A maior categoria define a barra cheia. */
const highest = computed(() =>
  props.categories.reduce((max, entry) => Math.max(max, entry.total), 0),
)
</script>

<template>
  <GlassPanel
    title="Por categoria"
    :loading="loading"
    :error="error"
    :empty="highest === 0"
    empty-message="Nenhuma solicitação no período."
    @retry="emit('retry')"
  >
    <ul class="flex flex-col gap-2.5">
      <li v-for="entry in categories" :key="entry.category">
        <button
          type="button"
          class="bg-surface-item hover:bg-surface-item-hover flex w-full flex-col gap-2 rounded-2xl p-3.5 text-left transition"
          :aria-label="`Ver apenas ${DEMAND_CATEGORY_LABELS[entry.category]}`"
          @click="emit('select', entry.category)"
        >
          <div class="flex min-w-0 items-baseline justify-between gap-3">
            <span class="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {{ DEMAND_CATEGORY_LABELS[entry.category] }}
            </span>
            <span class="shrink-0 text-sm font-semibold text-slate-900 tabular-nums dark:text-white">
              {{ entry.total }}
            </span>
          </div>
          <!-- A barra repete, em tamanho, o número ao lado: é decoração. -->
          <span
            class="block h-1.5 w-full overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10"
            aria-hidden="true"
          >
            <span
              data-bar
              class="bg-sidebar-active block h-full rounded-full transition-all duration-400 ease-out motion-reduce:transition-none dark:bg-white"
              :style="{ width: `${toPercentage(entry.total, highest)}%` }"
            ></span>
          </span>
        </button>
      </li>
    </ul>
  </GlassPanel>
</template>
