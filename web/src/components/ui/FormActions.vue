<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import AppIcon from '@/components/icons/AppIcon.vue'

// Rodapé dos formulários: Cancelar (link) e o envio. No celular o envio fica em cima, ao alcance do polegar.
defineProps<{
  cancelTo: RouteLocationRaw
  submitLabel: string
  /** O rótulo enquanto envia ("Enviando…", "Salvando…"). */
  busyLabel: string
  busy: boolean
}>()
</script>

<template>
  <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
    <RouterLink
      :to="cancelTo"
      class="inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/10"
    >
      Cancelar
    </RouterLink>
    <button
      type="submit"
      :disabled="busy"
      class="bg-sidebar-active inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-slate-950/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950"
    >
      <AppIcon name="send" class="size-4" />
      {{ busy ? busyLabel : submitLabel }}
    </button>
  </div>
</template>
