<script setup lang="ts">
import { useId } from 'vue'
import AppIcon from '@/components/icons/AppIcon.vue'
import ErrorRetry from '@/components/ui/ErrorRetry.vue'

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
  <section :aria-labelledby="titleId" class="glass-panel flex flex-col gap-5 p-5 sm:p-6">
    <div class="flex min-w-0 items-center gap-3">
      <h2 :id="titleId" class="text-base font-semibold text-slate-900 dark:text-white">
        {{ title }}
      </h2>
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
        <div
          v-for="row in 3"
          :key="row"
          class="bg-surface-item h-12 animate-pulse rounded-2xl"
        ></div>
      </div>
    </div>

    <ErrorRetry v-else-if="error" :message="error" @retry="emit('retry')" />

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
