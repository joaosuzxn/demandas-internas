<script setup lang="ts">
import { useId } from 'vue'

defineProps<{ title: string }>()

const titleId = useId()
</script>

<template>
  <!-- Painel com título, no vidro das telas internas: o `GlassPanel` do Órbita, só com título e conteúdo. -->
  <section
    :aria-labelledby="titleId"
    class="bg-surface-panel flex flex-col gap-5 rounded-3xl border border-white/60 p-5 shadow-xl shadow-slate-900/10 backdrop-blur-lg sm:p-6"
  >
    <h2 :id="titleId" class="text-base font-semibold text-slate-900">{{ title }}</h2>
    <slot />
  </section>
</template>
