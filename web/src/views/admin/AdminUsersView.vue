<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/icons/AppIcon.vue'
import GlassPanel from '@/components/ui/GlassPanel.vue'
import InlineAlert from '@/components/ui/InlineAlert.vue'
import PagePagination from '@/components/ui/PagePagination.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import PillLink from '@/components/ui/PillLink.vue'
import { rememberAdminUsersQuery } from '@/composables/adminUsersQuery'
import { useArrivalNotice } from '@/composables/useArrivalNotice'
import { parseApiError } from '@/services/apiErrors'
import type { User } from '@/services/auth'
import { listUsers } from '@/services/users'
import { formatCpf } from '@/utils/cpf'
import { SEARCH_MAX, TYPING_PAUSE_MS } from '@/utils/query'

const route = useRoute()
const router = useRouter()
// "Usuário cadastrado." / "Usuário atualizado.", de quem chega do formulário.
const notice = useArrivalNotice()

// A URL é a fonte da verdade (`?busca=&pagina=`): voltar da edição e o F5 mantêm a mesma lista.
function queryText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

const search = computed(() => queryText(route.query.busca).trim())
// Página inválida na URL (texto, zero, negativa, fração) vale a 1, em vez de virar 422 na API.
const page = computed(() => {
  const value = Number(queryText(route.query.pagina))
  return Number.isInteger(value) && value >= 1 ? value : 1
})

function queryFor(searchText: string, pageNumber: number): Record<string, string> {
  const query: Record<string, string> = {}
  if (searchText) query.busca = searchText
  if (pageNumber > 1) query.pagina = String(pageNumber)
  return query
}

const users = ref<User[]>([])
const total = ref(0)
const lastPage = ref(1)
const loading = ref(true)
const error = ref<string | null>(null)
// Só a resposta do pedido mais recente vale: uma busca antiga que chega por último é descartada.
let requestId = 0

async function load(): Promise<void> {
  const current = ++requestId
  loading.value = true
  error.value = null

  try {
    const result = await listUsers({ search: search.value || undefined, page: page.value })
    if (current !== requestId) return

    // Página além da última (link antigo, lista que encolheu): vai para a última que existe.
    if (result.items.length === 0 && page.value > result.lastPage && page.value > 1) {
      // O pedido deste redirect não vale mais: o `finally` não pode desligar o carregando antes da nova URL.
      requestId++
      void router.replace({ query: queryFor(search.value, result.lastPage) })
      return
    }

    users.value = result.items
    total.value = result.total
    lastPage.value = result.lastPage
  } catch (caught) {
    if (current !== requestId) return
    error.value = parseApiError(caught).message
  } finally {
    if (current === requestId) loading.value = false
  }
}

// A lista que está na tela fica lembrada: o "voltar" da edição e do cadastro reabre a mesma busca e página.
watch(
  [search, page],
  () => {
    rememberAdminUsersQuery(queryFor(search.value, page.value))
    void load()
  },
  { immediate: true },
)

// Busca: o campo acompanha a digitação; a URL só muda depois da pausa (ou no Enter).
const term = ref(search.value)
let searchTimer: ReturnType<typeof setTimeout> | undefined

function applySearch(): void {
  clearTimeout(searchTimer)
  searchTimer = undefined
  const next = term.value.trim()
  if (next === search.value) return
  // `replace`: cada pausa na digitação não vira uma entrada no histórico do navegador.
  void router.replace({ query: queryFor(next, 1) })
}

watch(term, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(applySearch, TYPING_PAUSE_MS)
})

// A URL mudou por fora (voltar do navegador): o campo segue, se ninguém está digitando.
watch(search, (value) => {
  if (searchTimer === undefined && value !== term.value.trim()) term.value = value
})

onBeforeUnmount(() => clearTimeout(searchTimer))

function changePage(next: number): void {
  void router.push({ query: queryFor(search.value, next) })
  window.scrollTo({ top: 0 })
}

const emptyMessage = computed(() =>
  search.value ? 'Nenhum usuário encontrado para esta busca.' : 'Nenhum usuário cadastrado.',
)

const BADGE = 'rounded-full px-2 py-0.5 text-xs font-medium'
</script>

<template>
  <div class="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">
    <PageHeader title="Administração" subtitle="Usuários que acessam o sistema.">
      <template #actions>
        <PillLink :to="{ name: 'admin-user-new' }" label="Novo usuário" icon="plus" />
      </template>
    </PageHeader>

    <InlineAlert
      v-if="notice"
      kind="success"
      dismissible
      data-arrival-notice
      @dismiss="notice = null"
    >
      {{ notice }}
    </InlineAlert>

    <section role="search" aria-label="Busca de usuários">
      <label for="user-search" class="sr-only">Buscar usuário</label>
      <input
        id="user-search"
        v-model="term"
        type="search"
        :maxlength="SEARCH_MAX"
        placeholder="Buscar por nome, usuário, e-mail ou CPF"
        class="bg-surface-field w-full rounded-2xl border border-white/60 px-4 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-900/5 placeholder:text-slate-400 focus-visible:outline-2 dark:border-white/10 dark:text-white dark:shadow-black/20 dark:placeholder:text-slate-500"
        @keydown.enter.prevent="applySearch"
      />
    </section>

    <GlassPanel
      title="Usuários"
      :count="total"
      :loading="loading"
      :error="error"
      :empty="users.length === 0"
      :empty-message="emptyMessage"
      @retry="load"
    >
      <div class="flex flex-col gap-3">
        <ul class="flex flex-col gap-2.5">
          <li v-for="user in users" :key="user.id">
            <RouterLink
              :to="{ name: 'admin-user-edit', params: { id: user.id } }"
              class="bg-surface-item hover:bg-surface-item-hover flex items-center justify-between gap-3 rounded-2xl p-3.5 transition"
            >
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {{ user.name }}
                  </span>
                  <span
                    v-if="user.role === 'admin'"
                    :class="[BADGE, 'bg-brand-500/15 text-brand-700 dark:text-brand-300']"
                  >
                    Administrador
                  </span>
                  <span
                    v-if="!user.is_active"
                    :class="[
                      BADGE,
                      'bg-slate-900/10 text-slate-600 dark:bg-white/10 dark:text-slate-300',
                    ]"
                  >
                    Desativado
                  </span>
                  <span
                    v-if="user.must_change_password"
                    :class="[BADGE, 'bg-amber-500/15 text-amber-700 dark:text-amber-300']"
                  >
                    Senha provisória
                  </span>
                </div>
                <p class="truncate text-xs text-slate-600 dark:text-slate-400">
                  @{{ user.username }} · {{ user.email }} · {{ formatCpf(user.cpf) }}
                </p>
              </div>

              <span
                class="hidden shrink-0 items-center gap-1.5 text-xs font-medium text-slate-600 sm:inline-flex dark:text-slate-300"
                aria-hidden="true"
              >
                <AppIcon name="pencil" class="size-4" />
                Editar
              </span>
            </RouterLink>
          </li>
        </ul>

        <PagePagination
          :page="page"
          :last-page="lastPage"
          :loading="loading"
          label="dos usuários"
          @change="changePage"
        />
      </div>
    </GlassPanel>
  </div>
</template>
