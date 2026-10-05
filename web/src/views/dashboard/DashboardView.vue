<script setup lang="ts">
import { computed, watch } from 'vue'
import DashboardCategoriesCard from '@/components/dashboard/DashboardCategoriesCard.vue'
import DashboardFilters from '@/components/dashboard/DashboardFilters.vue'
import DashboardStatCard from '@/components/dashboard/DashboardStatCard.vue'
import DashboardTrendCard from '@/components/dashboard/DashboardTrendCard.vue'
import type { IconName } from '@/components/icons/icons'
import PageHeader from '@/components/ui/PageHeader.vue'
import { useDashboardFilters } from '@/composables/useDashboardFilters'
import type { DashboardSummary } from '@/services/dashboard'
import { DEMAND_STATUS_TOTAL_LABELS } from '@/services/demands'
import { useDashboardStore } from '@/stores/dashboard'

// Dashboard (item 0030), no molde da DashboardView do Órbita, sem o bloco de permissão: todo logado vê.
const store = useDashboardStore()
const { range, category, customStart, customEnd, customError, filters, periodLabel, scopeKey } =
  useDashboardFilters()

// Só lê com um recorte de pé: personalizado incompleto não bate na API, e os números do recorte anterior saem.
watch(
  filters,
  (next) => {
    if (next) void store.load(next)
    else store.clear()
  },
  { immediate: true },
)

/** Os quatro números, na ordem das colunas do quadro e com os mesmos termos, no plural. */
const STATS: { key: keyof DashboardSummary; label: string; icon: IconName }[] = [
  { key: 'total', label: 'Total', icon: 'clipboard-list' },
  { key: 'pending', label: DEMAND_STATUS_TOTAL_LABELS.pending, icon: 'clock' },
  { key: 'in_progress', label: DEMAND_STATUS_TOTAL_LABELS.in_progress, icon: 'circle-play' },
  { key: 'finished', label: DEMAND_STATUS_TOTAL_LABELS.finished, icon: 'circle-check' },
]

/** O comparativo entre categorias só faz sentido quando nenhuma está em foco. */
const showCategories = computed(() => category.value === '')
</script>

<template>
  <div class="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">
    <PageHeader title="Dashboard" subtitle="Como estão as solicitações no período escolhido." />

    <DashboardFilters
      v-model:range="range"
      v-model:category="category"
      v-model:custom-start="customStart"
      v-model:custom-end="customEnd"
      :period-label="periodLabel"
      :custom-error="customError"
    />

    <p
      v-if="!filters"
      class="bg-surface-item rounded-3xl px-4 py-8 text-center text-sm text-slate-600 dark:text-slate-300"
    >
      Escolha as duas datas para ver os números.
    </p>

    <!-- Trocar o recorte remonta o conteúdo: a entrada suave diz que os números são outros. -->
    <div
      v-else
      :key="scopeKey"
      class="animate-fade-in flex flex-col gap-5 motion-reduce:animate-none"
    >
      <section aria-labelledby="dashboard-stats-title">
        <h2 id="dashboard-stats-title" class="sr-only">Números do período: {{ periodLabel }}</h2>

        <div
          v-if="store.summary.loading"
          role="status"
          class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4"
        >
          <span class="sr-only">Carregando os números do painel…</span>
          <div
            v-for="row in 4"
            :key="row"
            class="bg-surface-item h-28 animate-pulse rounded-3xl"
            aria-hidden="true"
          ></div>
        </div>

        <div
          v-else-if="store.summary.error"
          role="alert"
          class="bg-surface-item flex flex-col items-center gap-3 rounded-3xl px-4 py-8 text-center"
        >
          <p class="text-sm text-red-700 dark:text-red-300">{{ store.summary.error }}</p>
          <button
            type="button"
            class="bg-surface-item hover:bg-surface-item-hover inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition dark:text-slate-200"
            @click="store.loadSummary()"
          >
            Tentar de novo
          </button>
        </div>

        <div
          v-else-if="store.summary.data"
          class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4"
        >
          <DashboardStatCard
            v-for="stat in STATS"
            :key="stat.key"
            :label="stat.label"
            :value="store.summary.data[stat.key]"
            :icon="stat.icon"
          />
        </div>
      </section>

      <div class="grid grid-cols-1 items-start gap-5 xl:grid-cols-3">
        <DashboardTrendCard
          :trend="store.trend.data"
          :loading="store.trend.loading"
          :error="store.trend.error"
          :class="showCategories ? 'xl:col-span-2' : 'xl:col-span-3'"
          @retry="store.loadTrend()"
        />

        <DashboardCategoriesCard
          v-if="showCategories"
          :categories="store.categories.data ?? []"
          :loading="store.categories.loading"
          :error="store.categories.error"
          @select="category = $event"
          @retry="store.loadCategories()"
        />
      </div>
    </div>
  </div>
</template>
