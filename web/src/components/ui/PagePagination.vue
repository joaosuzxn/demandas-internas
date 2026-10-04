<script setup lang="ts">
import AppIcon from '@/components/icons/AppIcon.vue'

// Paginação do Órbita (`PagePagination`), com os botões no estilo local: aqui não há `BaseButton`.
const props = defineProps<{
  page: number
  lastPage: number
  /** Busca em andamento: os dois botões travam para não empilhar requisição. */
  loading?: boolean
  /** Nome da coleção, para o rótulo acessível ("Paginação dos usuários"). */
  label: string
}>()

const emit = defineEmits<{ change: [page: number] }>()

const BUTTON =
  'bg-surface-item hover:bg-surface-item-hover inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200'

function go(page: number): void {
  if (page < 1 || page > props.lastPage) return

  emit('change', page)
}
</script>

<template>
  <!-- Coleção de uma página só não precisa de navegação. -->
  <nav
    v-if="lastPage > 1"
    class="flex items-center justify-between gap-3 pt-2"
    :aria-label="`Paginação ${label}`"
  >
    <button type="button" :class="BUTTON" :disabled="page <= 1 || loading" @click="go(page - 1)">
      <AppIcon name="chevron-left" class="size-4" />
      Anterior
    </button>

    <span class="text-xs text-slate-600 tabular-nums dark:text-slate-400">
      Página {{ page }} de {{ lastPage }}
    </span>

    <button
      type="button"
      :class="BUTTON"
      :disabled="page >= lastPage || loading"
      @click="go(page + 1)"
    >
      Próxima
      <AppIcon name="chevron-right" class="size-4" />
    </button>
  </nav>
</template>
