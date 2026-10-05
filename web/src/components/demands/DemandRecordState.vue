<script setup lang="ts">
import ErrorRetry from '@/components/ui/ErrorRetry.vue'

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
    class="glass-panel flex flex-col items-center gap-2 px-4 py-10 text-center"
  >
    <p class="text-sm font-semibold text-slate-900 dark:text-white">Solicitação não encontrada</p>
    <p class="text-sm text-slate-600 dark:text-slate-300">
      Ela pode ter sido excluída. Volte ao quadro para ver as demais.
    </p>
  </div>

  <ErrorRetry v-else-if="error" :message="error" @retry="emit('retry')" />

  <slot v-else />
</template>
