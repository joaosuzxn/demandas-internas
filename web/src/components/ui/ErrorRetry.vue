<script setup lang="ts">
import AppIcon from '@/components/icons/AppIcon.vue'

// Falha ao carregar um bloco (painel, solicitação): a mensagem e o "Tentar de novo", que emite `retry`.
defineProps<{ message: string }>()

const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <div
    role="alert"
    class="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-300/60 bg-red-500/5 px-4 py-8 text-center dark:border-red-400/70"
  >
    <p class="text-sm text-red-700 dark:text-red-300">{{ message }}</p>
    <button
      type="button"
      class="bg-surface-item hover:bg-surface-item-hover inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition dark:text-slate-200"
      @click="emit('retry')"
    >
      <AppIcon name="rotate-ccw" class="size-4" />
      Tentar de novo
    </button>
  </div>
</template>
