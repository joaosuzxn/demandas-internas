<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import DemandsBoard from '@/components/demands/DemandsBoard.vue'
import PillLink from '@/components/ui/PillLink.vue'
import {
  listDemands,
  type DemandBoard,
  type DemandBoardColumn,
  type DemandPage,
  type DemandStatus,
} from '@/services/demands'

// Pausa na digitação antes de consultar a API: uma busca por tecla seria uma requisição a mais por letra.
const SEARCH_DELAY_MS = 300

const term = ref('')
// As situações na ordem do quadro; cada coluna tem a sua consulta e o seu total.
const STATUSES: readonly DemandStatus[] = ['pending', 'in_progress', 'finished']

function emptyBoard(): DemandBoard {
  return {
    pending: { items: [], total: 0 },
    in_progress: { items: [], total: 0 },
    finished: { items: [], total: 0 },
  }
}

const board = ref<DemandBoard>(emptyBoard())
const loading = ref(false)
const error = ref<string | null>(null)
const searching = computed(() => term.value.trim() !== '')

// Só a resposta da consulta mais recente conta: uma busca antiga que chega depois não pode sobrescrever.
let latestRequest = 0
let searchTimer: ReturnType<typeof setTimeout> | undefined

function toColumn(page: DemandPage): DemandBoardColumn {
  return { items: page.data, total: page.meta.total }
}

function paramsFor(status: DemandStatus, search: string | undefined) {
  return search ? { status, search } : { status }
}

async function load(): Promise<void> {
  const request = ++latestRequest
  const search = term.value.trim() || undefined

  loading.value = true
  error.value = null

  try {
    const pages = await Promise.all(
      STATUSES.map((status) => listDemands(paramsFor(status, search))),
    )

    if (request !== latestRequest) return
    const next = emptyBoard()
    STATUSES.forEach((status, index) => (next[status] = toColumn(pages[index]!)))
    board.value = next
  } catch {
    if (request !== latestRequest) return
    error.value = 'Não foi possível carregar as demandas.'
  } finally {
    if (request === latestRequest) loading.value = false
  }
}

watch(term, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => void load(), SEARCH_DELAY_MS)
})

onMounted(() => void load())
onBeforeUnmount(() => clearTimeout(searchTimer))
</script>

<template>
  <div class="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">
    <header class="flex items-center justify-between gap-3">
      <div class="flex min-w-0 flex-col gap-1">
        <h1 class="text-2xl font-semibold text-slate-900">Demandas</h1>
        <p class="text-sm text-slate-600">O que foi pedido, por situação.</p>
      </div>
      <PillLink :to="{ name: 'demand-new' }" label="Criar demanda" icon="plus" />
    </header>

    <label for="demand-search" class="sr-only">Buscar demanda por título</label>
    <input
      id="demand-search"
      v-model="term"
      type="search"
      placeholder="Buscar por título…"
      class="bg-surface-field w-full rounded-2xl border border-white/60 px-4 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-900/5 placeholder:text-slate-400 focus-visible:outline-2"
    />

    <DemandsBoard
      :board="board"
      :loading="loading"
      :error="error"
      :searching="searching"
      @retry="load"
    />
  </div>
</template>
