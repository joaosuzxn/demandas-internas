<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <!-- Cabeçalho das telas internas, trazido do Órbita: o `h1` da página mora aqui (um por view). -->
  <header
    class="bg-surface-panel rounded-3xl border border-white/60 p-5 shadow-xl shadow-slate-900/10 backdrop-blur-lg sm:p-6"
  >
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex min-w-0 items-center gap-3">
        <!-- À esquerda do título: só navegação (ex.: BackLink). -->
        <slot name="media" />

        <div class="min-w-0">
          <h1 class="text-lg font-semibold wrap-break-word text-slate-900 sm:text-xl">
            {{ title }}
          </h1>
          <p v-if="subtitle" class="text-sm text-slate-600">{{ subtitle }}</p>
        </div>
      </div>

      <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>
