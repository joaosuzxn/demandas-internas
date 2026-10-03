<script setup lang="ts">
import { useId } from 'vue'

defineProps<{
  /** O título em caixa-alta do bloco; é ele que nomeia a seção para o leitor de tela. */
  title: string
}>()

const titleId = useId()
</script>

<template>
  <!-- Bloco da tela da demanda, como no Órbita: título, filete e o conteúdo embaixo, no vidro dos painéis. -->
  <section
    :aria-labelledby="titleId"
    class="bg-surface-panel flex flex-col gap-2.5 rounded-3xl border border-white/60 p-3.5 shadow-xl shadow-slate-900/10 backdrop-blur-lg"
  >
    <div class="flex items-center gap-3">
      <h2 :id="titleId" class="text-xs font-semibold text-slate-500 uppercase">{{ title }}</h2>
      <span class="h-px flex-1 bg-slate-900/10" aria-hidden="true"></span>
    </div>

    <slot />
  </section>
</template>
