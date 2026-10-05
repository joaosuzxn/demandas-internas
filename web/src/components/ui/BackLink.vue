<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import AppIcon from '@/components/icons/AppIcon.vue'

defineProps<{
  to: RouteLocationRaw
  /** Para onde o link volta — sem texto visível, é o que o leitor de tela anuncia. */
  label: string
}>()
</script>

<template>
  <!-- Voltar só com o chevron, à esquerda do título (slot `media` do PageHeader), como no Órbita. -->
  <RouterLink
    :to="to"
    :aria-label="`Voltar para ${label}`"
    :title="`Voltar para ${label}`"
    class="text-sidebar-active bg-surface-item hover:bg-surface-item-hover flex size-10 shrink-0 items-center justify-center rounded-2xl shadow-sm shadow-slate-900/5 transition dark:text-white dark:shadow-black/20"
  >
    <AppIcon name="chevron-left" class="size-5" />
  </RouterLink>
</template>
