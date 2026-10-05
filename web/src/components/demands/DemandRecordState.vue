<script setup lang="ts">
defineProps<{
  loading: boolean
  error: string | null
  notFound: boolean
}>()

const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <!-- Os estados de uma solicitação lida pelo id (useDemandRecord): carregando, não encontrada, erro.
       Fora deles, o conteúdo da tela, pelo slot. -->
  <div v-if="loading" role="status" class="grid grid-cols-1 gap-3 lg:grid-cols-3">
    <span class="sr-only">Carregando a solicitação…</span>
    <div
      v-for="block in 3"
      :key="block"
      class="bg-surface-item h-32 animate-pulse rounded-2xl"
      aria-hidden="true"
    ></div>
  </div>

  <div
    v-else-if="notFound"
    class="bg-surface-panel flex flex-col items-center gap-2 rounded-3xl border border-white/60 px-4 py-10 text-center shadow-xl shadow-slate-900/10 dark:border-white/10 dark:shadow-black/40"
  >
    <p class="text-sm font-semibold text-slate-900 dark:text-white">Solicitação não encontrada</p>
    <p class="text-sm text-slate-600 dark:text-slate-300">
      Ela pode ter sido excluída. Volte ao quadro para ver as demais.
    </p>
  </div>

  <div
    v-else-if="error"
    role="alert"
    class="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-300/60 bg-red-500/5 px-4 py-8 text-center dark:border-red-400/70"
  >
    <p class="text-sm text-red-700 dark:text-red-300">{{ error }}</p>
    <button
      type="button"
      class="bg-surface-item hover:bg-surface-item-hover inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition dark:text-slate-200"
      @click="emit('retry')"
    >
      Tentar de novo
    </button>
  </div>

  <slot v-else />
</template>
