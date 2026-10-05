<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/icons/AppIcon.vue'
import type { IconName } from '@/components/icons/icons'

// Card de um número do dashboard (item 0030), no molde do Órbita.
const props = defineProps<{ label: string; value: number; icon: IconName }>()

const formatted = computed(() => new Intl.NumberFormat('pt-BR').format(props.value))
</script>

<template>
  <div
    class="bg-surface-panel flex flex-col gap-3 rounded-3xl border border-white/60 p-5 shadow-xl shadow-slate-900/10 backdrop-blur-lg dark:border-white/10 dark:shadow-black/40"
  >
    <div class="flex items-start justify-between gap-3">
      <h3 class="min-w-0 text-xs font-medium text-slate-600 dark:text-slate-300">{{ label }}</h3>
      <span
        class="text-sidebar-active bg-surface-item flex size-9 shrink-0 items-center justify-center rounded-2xl shadow-sm shadow-slate-900/5 dark:text-white dark:shadow-black/20"
      >
        <AppIcon :name="icon" class="size-4.5" />
      </span>
    </div>
    <p class="text-3xl font-semibold text-slate-900 tabular-nums dark:text-white">{{ formatted }}</p>
  </div>
</template>
