<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import GlassCard from './GlassCard.vue'
import background from '@/assets/bg.jpg'

// As rotas `login` e `change-password` usam esta mesma tela: o card fica montado e só troca o
// conteúdo, com a animação de tamanho.
const route = useRoute()
const step = computed(() => (route.name === 'change-password' ? 'change-password' : 'login'))
</script>

<template>
  <main
    class="bg-dusk-900 relative flex min-h-svh items-center justify-center overflow-hidden px-4 py-10"
  >
    <!-- Fundo decorativo: `alt` vazio para o leitor de tela ignorar. Trocar a foto é substituir
         `src/assets/bg.jpg`. -->
    <img
      :src="background"
      alt=""
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 size-full object-cover"
    />

    <GlassCard :step="step" />
  </main>
</template>
