<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/icons/AppIcon.vue'
import InfiniteSentinel from '@/components/ui/InfiniteSentinel.vue'
import {
  DEMAND_CATEGORY_LABELS,
  DEMAND_STATUS_LABELS,
  type Demand,
  type DemandBoard,
  type DemandBoardColumn,
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
  /** A rolagem da coluna chegou ao fim (ou a pessoa pediu de novo depois de um erro). */
  'load-more': [status: DemandStatus]
}>()

// Há página seguinte e nada impede de pedi-la agora: nem uma a caminho, nem um erro esperando o "Tentar de novo".
function canLoadMore(column: DemandBoardColumn): boolean {
  return column.page < column.lastPage && !column.loadingMore && column.loadMoreError === null
}

// Uma coluna por situação, na ordem em que a demanda anda.
const COLUMNS: readonly { status: DemandStatus; label: string; icon: IconName }[] = [
  { status: 'pending', label: DEMAND_STATUS_LABELS.pending, icon: 'clock' },
  { status: 'in_progress', label: DEMAND_STATUS_LABELS.in_progress, icon: 'circle-play' },
  { status: 'finished', label: DEMAND_STATUS_LABELS.finished, icon: 'circle-check' },
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
      v-else-if="COLUMNS.every((column) => board[column.status].total === 0)"
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

        <!-- Cada coluna rola por conta própria: a lista longa não estica a página. O contorno
             (`px-1`/`pb-1`) impede o corte da sombra dos cartões. -->
        <ul
          v-if="board[column.status].items.length > 0"
          :aria-label="column.label"
          tabindex="0"
          class="scrollbar-soft max-h-[60svh] -mx-1 flex flex-col gap-2.5 overflow-y-auto px-1 pb-1"
        >
          <li
            v-for="demand in board[column.status].items"
            :key="demand.id"
            :data-demand="demand.id"
          >
            <!-- O cartão inteiro abre a tela da demanda, onde ficam as ações. -->
            <RouterLink
              :to="{ name: 'demand', params: { id: demand.id } }"
              class="bg-surface-item hover:bg-surface-item-hover flex flex-col gap-2 rounded-2xl p-3.5 shadow-sm shadow-slate-900/5 transition"
            >
              <p class="text-sm font-semibold wrap-break-word text-slate-900">{{ demand.title }}</p>
              <p class="text-xs text-slate-600">
                {{ categoryLabel(demand) }} · {{ demand.requester.name }}
              </p>
              <p class="text-xs text-slate-500">Criada em {{ formatDate(demand.created_at) }}</p>
            </RouterLink>
          </li>

          <!-- Rolagem infinita: o sentinela no fim da lista pede a página seguinte. A chave muda a cada
               página e refaz o observador, para avisar de novo se o fim continuar à vista. -->
          <InfiniteSentinel
            v-if="canLoadMore(board[column.status])"
            :key="board[column.status].page"
            @visible="emit('load-more', column.status)"
          />
          <li
            v-if="board[column.status].loadingMore"
            role="status"
            class="px-1 py-2 text-center text-xs text-slate-500"
          >
            Carregando mais…
          </li>
          <li
            v-if="board[column.status].loadMoreError"
            role="alert"
            class="flex flex-wrap items-center justify-between gap-2 px-1 py-2"
          >
            <span class="text-xs text-red-600">{{ board[column.status].loadMoreError }}</span>
            <button
              type="button"
              class="bg-surface-item hover:bg-surface-item-hover rounded-full px-3 py-1 text-xs font-medium text-slate-700 shadow-sm shadow-slate-900/5"
              @click="emit('load-more', column.status)"
            >
              Tentar de novo
            </button>
          </li>
        </ul>

        <p v-else class="px-1 py-3 text-xs text-slate-500">Nenhuma demanda aqui.</p>
      </section>
    </div>
  </section>
</template>
