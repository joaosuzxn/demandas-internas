<script setup lang="ts">
import AppIcon from '@/components/icons/AppIcon.vue'
import {
  DEMAND_CATEGORY_LABELS,
  type Demand,
  type DemandBoard,
  type DemandStatus,
} from '@/services/demands'
import type { IconName } from '@/components/icons/icons'

defineProps<{
  /** As demandas já repartidas por situação — uma coluna para cada. */
  board: DemandBoard
  loading?: boolean
  error?: string | null
  /** Há busca em vigor: o vazio passa a ser o da busca, que é outra situação. */
  searching?: boolean
}>()

const emit = defineEmits<{
  retry: []
}>()

// Uma coluna por situação, na ordem em que a demanda anda: primeiro a fazer, depois finalizada.
const COLUMNS: readonly { status: DemandStatus; label: string; icon: IconName }[] = [
  { status: 'open', label: 'A fazer', icon: 'clock' },
  { status: 'closed', label: 'Finalizado', icon: 'circle-check' },
]

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function categoryLabel(demand: Demand): string {
  return DEMAND_CATEGORY_LABELS[demand.category]
}
</script>

<template>
  <section
    aria-label="Quadro de demandas por situação"
    class="bg-surface-panel flex flex-col gap-4 rounded-3xl border border-white/60 p-5 shadow-xl shadow-slate-900/10 backdrop-blur-lg sm:p-6"
  >
    <div v-if="loading" role="status" class="flex flex-col gap-3">
      <span class="sr-only">Carregando demandas…</span>
      <div class="h-4 w-40 animate-pulse rounded-full bg-slate-900/5" aria-hidden="true"></div>
      <div class="h-24 animate-pulse rounded-2xl bg-slate-900/5" aria-hidden="true"></div>
    </div>

    <div v-else-if="error" role="alert" class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-red-600">{{ error }}</p>
      <button
        type="button"
        class="bg-surface-item hover:bg-surface-item-hover rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm shadow-slate-900/5"
        @click="emit('retry')"
      >
        Tentar de novo
      </button>
    </div>

    <p
      v-else-if="board.open.total + board.closed.total === 0"
      class="py-6 text-center text-sm text-slate-500"
    >
      {{ searching ? 'Nenhuma demanda corresponde à busca.' : 'Nenhuma demanda registrada ainda.' }}
    </p>

    <!-- As situações ficam à vista ao mesmo tempo, como num quadro: a leitura é a comparação
         entre elas. Em tela estreita o quadro rola de lado, e só ele: a página não rola. -->
    <div v-else class="flex items-start gap-3 overflow-x-auto pb-1">
      <section
        v-for="column in COLUMNS"
        :key="column.status"
        :data-column="column.status"
        class="bg-surface-sunken flex min-w-72 flex-1 flex-col gap-2.5 rounded-2xl p-3"
      >
        <header class="flex items-center gap-2">
          <AppIcon :name="column.icon" class="size-4 shrink-0 text-slate-500" />
          <h3 class="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
            {{ column.label }}
          </h3>

          <!-- A contagem é do total da API, não do que chegou a esta página. -->
          <span
            class="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-slate-900/10 px-1.5 text-xs font-semibold text-slate-600 tabular-nums"
          >
            {{ board[column.status].total }}
          </span>
        </header>

        <ul v-if="board[column.status].items.length > 0" class="flex flex-col gap-2.5">
          <li
            v-for="demand in board[column.status].items"
            :key="demand.id"
            :data-demand="demand.id"
          >
            <article
              class="bg-surface-item flex flex-col gap-2 rounded-2xl p-3.5 shadow-sm shadow-slate-900/5"
            >
              <p class="text-sm font-semibold wrap-break-word text-slate-900">{{ demand.title }}</p>
              <p class="text-xs text-slate-600">
                {{ categoryLabel(demand) }} · {{ demand.requester.name }}
              </p>
              <p class="text-xs text-slate-500">Criada em {{ formatDate(demand.created_at) }}</p>
            </article>
          </li>
        </ul>

        <p v-else class="px-1 py-3 text-xs text-slate-500">Nenhuma demanda aqui.</p>

        <p
          v-if="board[column.status].total > board[column.status].items.length"
          class="px-1 text-xs text-slate-500"
        >
          Mostrando {{ board[column.status].items.length }} de {{ board[column.status].total }}
        </p>
      </section>
    </div>
  </section>
</template>
