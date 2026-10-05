<script setup lang="ts">
import { useId } from 'vue'
import AppIcon from '@/components/icons/AppIcon.vue'

// Painel com título, no vidro das telas internas: o `GlassPanel` do Órbita. Os estados (carregando, erro, vazio)
// são opcionais (item 0030); sem eles, só título e conteúdo.
withDefaults(
  defineProps<{
    title: string
    /** Quantidade ao lado do título; some enquanto carrega ou com erro. */
    count?: number
    loading?: boolean
    error?: string | null
    /** Carregou sem nada para mostrar. */
    empty?: boolean
    emptyMessage?: string
  }>(),
  { emptyMessage: 'Nada por aqui.' },
)

const emit = defineEmits<{ retry: [] }>()

const titleId = useId()
</script>

<template>
  <section
    :aria-labelledby="titleId"
    class="bg-surface-panel flex flex-col gap-5 rounded-3xl border border-white/60 p-5 shadow-xl shadow-slate-900/10 backdrop-blur-lg sm:p-6 dark:border-white/10 dark:shadow-black/40"
  >
    <div class="flex min-w-0 items-center gap-3">
      <h2 :id="titleId" class="text-base font-semibold text-slate-900 dark:text-white">{{ title }}</h2>
      <!-- Fora do `h2`: quem nomeia a seção é o título, e o número mudaria esse nome a cada leitura. -->
      <span
        v-if="count !== undefined && !loading && !error"
        class="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-slate-900/10 px-1.5 text-xs font-semibold text-slate-600 tabular-nums dark:bg-white/10 dark:text-slate-300"
      >
        {{ count }}
      </span>
    </div>

    <div v-if="loading" role="status">
      <span class="sr-only">Carregando {{ title.toLowerCase() }}…</span>
      <div class="flex flex-col gap-2.5" aria-hidden="true">
        <div v-for="row in 3" :key="row" class="bg-surface-item h-12 animate-pulse rounded-2xl"></div>
      </div>
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
        <AppIcon name="rotate-ccw" class="size-4" />
        Tentar de novo
      </button>
    </div>

    <div
      v-else-if="empty"
      class="flex flex-col items-center justify-center gap-3 px-4 py-8 text-center"
    >
      <span
        class="bg-surface-item flex size-11 items-center justify-center rounded-2xl text-slate-400"
      >
        <AppIcon name="clipboard-list" class="size-5" />
      </span>
      <p class="text-sm text-slate-600 dark:text-slate-300">{{ emptyMessage }}</p>
    </div>

    <slot v-else />
  </section>
</template>
