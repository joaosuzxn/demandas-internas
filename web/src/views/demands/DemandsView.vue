<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DemandsBoard from '@/components/demands/DemandsBoard.vue'
import AppIcon from '@/components/icons/AppIcon.vue'
import BaseField, { type FieldOption } from '@/components/ui/BaseField.vue'
import CollapseTransition from '@/components/ui/CollapseTransition.vue'
import PillLink from '@/components/ui/PillLink.vue'
import {
  SEARCH_MAX,
  isDate,
  parseBoardQuery,
  rememberBoardQuery,
  toBoardQuery,
} from '@/composables/demandsBoardQuery'
import {
  DEMAND_CATEGORY_LABELS,
  listDemands,
  searchDemands,
  type DemandBoard,
  type DemandBoardColumn,
  type DemandCategory,
  type DemandFilters,
  type DemandPage,
  type DemandStatus,
} from '@/services/demands'

// Pausa na digitação antes de consultar a API: uma busca por tecla seria uma requisição a mais por letra.
const SEARCH_DELAY_MS = 300

const CATEGORY_OPTIONS: FieldOption[] = Object.entries(DEMAND_CATEGORY_LABELS).map(
  ([value, label]) => ({ value, label }),
)

const route = useRoute()
const router = useRouter()

// Os filtros do quadro (item 0027). O status não entra: as colunas já separam por situação.
// A fonte da verdade é a query da URL: os campos nascem dela, mexer neles a regrava, e é ela que o quadro consulta.
const initial = parseBoardQuery(route.query)
const term = ref(initial.search ?? '')
const category = ref<DemandCategory | ''>(initial.category ?? '')
/** Período pela data de criação, `AAAA-MM-DD` como o campo de data entrega; vazio = sem aquela ponta. */
const createdFrom = ref(initial.created_from ?? '')
const createdTo = ref(initial.created_to ?? '')

// Categoria e período ficam num painel recolhido, aberto pelo botão "Filtros" (molde do SystemsFilters do Órbita);
// a busca fica à vista. Recolhido, o botão diz quantos filtros do painel estão em vigor: nada fica escondido sem aviso.
const filtersOpen = ref(false)
const filtersPanelId = useId()
const panelFilterCount = computed(
  () => [category.value, createdFrom.value, createdTo.value].filter((value) => value !== '').length,
)

// O campo de data aceita ano com mais de quatro dígitos; a URL e a API só aceitam `AAAA-MM-DD` que existe.
const INVALID_DATE = 'Informe uma data válida.'

function dateError(value: string): string | undefined {
  return value && !isDate(value) ? INVALID_DATE : undefined
}

const fromError = computed(() => dateError(createdFrom.value))

// As datas em `AAAA-MM-DD` se comparam como texto.
const toError = computed(
  () =>
    dateError(createdTo.value) ??
    (createdFrom.value && createdTo.value && createdTo.value < createdFrom.value
      ? 'Use uma data igual ou depois da do De.'
      : undefined),
)

const filtering = computed(
  () =>
    term.value.trim() !== '' ||
    category.value !== '' ||
    createdFrom.value !== '' ||
    createdTo.value !== '',
)

// Só o que está preenchido vai para a URL (e dela para a API).
function currentFilters(): DemandFilters {
  const filters: DemandFilters = {}
  const search = term.value.trim()
  if (search) filters.search = search
  if (category.value) filters.category = category.value
  if (createdFrom.value) filters.created_from = createdFrom.value
  if (createdTo.value) filters.created_to = createdTo.value
  return filters
}

// As situações na ordem do quadro; cada coluna tem a sua consulta e o seu total.
const STATUSES: readonly DemandStatus[] = ['pending', 'in_progress', 'finished']

function emptyColumn(): DemandBoardColumn {
  return { items: [], total: 0, page: 1, lastPage: 1, loadingMore: false, loadMoreError: null }
}

function emptyBoard(): DemandBoard {
  return { pending: emptyColumn(), in_progress: emptyColumn(), finished: emptyColumn() }
}

const board = ref<DemandBoard>(emptyBoard())
const loading = ref(false)
const error = ref<string | null>(null)

// Só a resposta da consulta mais recente conta: uma busca antiga que chega depois não pode sobrescrever,
// nem uma página da rolagem pedida antes da busca nova.
let latestRequest = 0
// Os filtros da carga em vigor: a rolagem pede as páginas seguintes com eles.
let activeFilters: DemandFilters = {}
let searchTimer: ReturnType<typeof setTimeout> | undefined

// Sem filtro, a listagem; com qualquer filtro, a busca (item 0027). A rolagem segue a rota da carga em vigor.
function fetchPage(status: DemandStatus, filters: DemandFilters, page?: number): Promise<DemandPage> {
  const paging = page === undefined ? {} : { page }
  return Object.keys(filters).length === 0
    ? listDemands({ status, ...paging })
    : searchDemands({ status, ...filters, ...paging })
}

function toColumn(page: DemandPage): DemandBoardColumn {
  return {
    ...emptyColumn(),
    items: page.data,
    total: page.meta.total,
    page: page.meta.current_page,
    lastPage: page.meta.last_page,
  }
}

async function load(filters: DemandFilters): Promise<void> {
  const request = ++latestRequest
  activeFilters = filters

  loading.value = true
  error.value = null

  try {
    const pages = await Promise.all(
      STATUSES.map((status) => fetchPage(status, filters)),
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

// A página seguinte de uma coluna, acrescentada ao fim. Uma por vez por coluna.
async function loadMore(status: DemandStatus): Promise<void> {
  const column = board.value[status]
  if (column.loadingMore || column.page >= column.lastPage) return

  const request = latestRequest
  column.loadingMore = true
  column.loadMoreError = null

  try {
    const next = await fetchPage(status, activeFilters, column.page + 1)
    if (request !== latestRequest) return

    // Demanda criada enquanto se rola empurra as páginas: a que já está na coluna não entra de novo.
    const known = new Set(column.items.map((demand) => demand.id))
    column.items.push(...next.data.filter((demand) => !known.has(demand.id)))
    column.total = next.meta.total
    column.page = next.meta.current_page
    column.lastPage = next.meta.last_page
  } catch {
    if (request !== latestRequest) return
    column.loadMoreError = 'Não foi possível carregar mais.'
  } finally {
    if (request === latestRequest) column.loadingMore = false
  }
}

// Grava os filtros na URL; quem consulta é o watch da rota. `replace`, não `push`: uma entrada no histórico por
// letra digitada faria o voltar do navegador desfazer a busca letra a letra. Query igual à atual não navega.
function commit(): void {
  searchTimer = undefined
  // Os campos já batem com a URL (ex.: acabaram de ser copiados dela): nada a gravar. Sem isso, uma URL com lixo
  // seria regravada limpa, e a navegação a mais consultaria de novo.
  const next = toBoardQuery(currentFilters())
  if (JSON.stringify(next) === JSON.stringify(toBoardQuery(parseBoardQuery(route.query)))) return
  void router.replace({ name: 'demands', query: toBoardQuery(currentFilters()) })
}

// Filtro com erro não vai para a URL: o aviso fica no campo e o quadro mostra a última consulta válida.
function reload(delay: number): void {
  clearTimeout(searchTimer)
  searchTimer = undefined
  if (fromError.value || toError.value) return
  if (delay === 0) commit()
  else searchTimer = setTimeout(commit, delay)
}

// Texto e datas esperam a pausa: no campo de data, cada dígito do ano já é uma data (0002, 0020…).
// A categoria e o "Limpar filtros" (tudo vazio) consultam na hora. Mudanças no mesmo tick chegam juntas: uma consulta só.
watch([term, category, createdFrom, createdTo], (next, previous) => {
  const categoryChanged = next[1] !== previous[1]
  reload(categoryChanged || !filtering.value ? 0 : SEARCH_DELAY_MS)
})

function clearFilters(): void {
  term.value = ''
  category.value = ''
  createdFrom.value = ''
  createdTo.value = ''
}

// A query mudou: por um filtro (`commit`), pelo voltar/avançar do navegador ou por um link. Os campos acompanham
// (sem mexer no que já bate, para não tirar o espaço que se acabou de digitar) e o quadro recarrega.
watch(
  () => route.query,
  (query) => {
    if (route.name !== 'demands') return
    const filters = parseBoardQuery(query)

    // Com gravação agendada, a pessoa ainda está digitando: a URL que chega é de uma letra atrás.
    if (searchTimer === undefined && term.value.trim() !== (filters.search ?? '')) {
      term.value = filters.search ?? ''
    }
    category.value = filters.category ?? ''
    createdFrom.value = filters.created_from ?? ''
    createdTo.value = filters.created_to ?? ''

    rememberBoardQuery(filters)
    void load(filters)
  },
)

onMounted(() => {
  rememberBoardQuery(initial)
  void load(initial)
})
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

    <!-- Sem `gap` aqui: o espaço até o painel mora dentro dele (`pt-3`) e anima junto. -->
    <section role="search" aria-label="Filtros das demandas" class="flex flex-col">
      <div class="flex flex-wrap items-center gap-3">
        <label for="demand-search" class="sr-only">Buscar demanda por título</label>
        <input
          id="demand-search"
          v-model="term"
          type="search"
          :maxlength="SEARCH_MAX"
          placeholder="Buscar por título…"
          class="bg-surface-field min-w-60 flex-1 rounded-2xl border border-white/60 px-4 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-900/5 placeholder:text-slate-400 focus-visible:outline-2"
        />

        <button
          type="button"
          class="bg-surface-item hover:bg-surface-item-hover inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm shadow-slate-900/5 transition"
          :aria-expanded="filtersOpen"
          :aria-controls="filtersPanelId"
          @click="filtersOpen = !filtersOpen"
        >
          <AppIcon name="sliders-horizontal" class="size-4" />
          {{ panelFilterCount > 0 ? `Filtros · ${panelFilterCount}` : 'Filtros' }}
          <AppIcon
            name="chevron-down"
            class="size-4 transition-transform duration-200 motion-reduce:transition-none"
            :class="{ 'rotate-180': filtersOpen }"
          />
        </button>

        <button
          v-if="filtering"
          type="button"
          class="text-brand-700 text-sm font-medium hover:underline"
          @click="clearFilters"
        >
          Limpar filtros
        </button>
      </div>

      <!-- Abre e recolhe suave. O `v-show` fica no filho: recolhido, sai de cena (fora do Tab e do leitor de tela).
           O erro do período fica sob o Até, por isso a linha alinha pelo topo. -->
      <CollapseTransition>
        <div v-show="filtersOpen" :id="filtersPanelId">
          <div class="grid items-start gap-3 pt-3 sm:grid-cols-3">
            <BaseField
              :model-value="category"
              label="Categoria"
              control="select"
              :options="CATEGORY_OPTIONS"
              placeholder-option="Todas as categorias"
              @update:model-value="category = $event as DemandCategory | ''"
            />
            <BaseField v-model="createdFrom" label="De" type="date" :error="fromError" />
            <BaseField v-model="createdTo" label="Até" type="date" :error="toError" />
          </div>
        </div>
      </CollapseTransition>
    </section>

    <DemandsBoard
      :board="board"
      :loading="loading"
      :error="error"
      :filtering="filtering"
      @retry="load(activeFilters)"
      @load-more="loadMore"
    />
  </div>
</template>
