<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import AppIcon from '@/components/icons/AppIcon.vue'
import type { IconName } from '@/components/icons/icons'

defineProps<{
  to: RouteLocationRaw
  /** O rótulo visível no desktop e o que o leitor de tela anuncia sempre. */
  label: string
  icon: IconName
}>()
</script>

<template>
  <!-- A ação principal que leva a outra página, como no Órbita: a pílula na cor do item ativo da sidebar. -->
  <RouterLink
    :to="to"
    :aria-label="label"
    class="bg-sidebar-active hover:bg-sidebar-active/90 inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-medium text-white shadow-sm shadow-slate-950/20 transition sm:px-3 dark:bg-white dark:hover:bg-white/90 dark:text-slate-950"
  >
    <AppIcon :name="icon" class="size-4 shrink-0" />
    <!-- No celular fica só o ícone: com o rótulo, o título ao lado era cortado. -->
    <span class="hidden sm:inline">{{ label }}</span>
  </RouterLink>
</template>
