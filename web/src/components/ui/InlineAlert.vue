<script setup lang="ts">
import AppIcon from '@/components/icons/AppIcon.vue'

// Faixa de aviso dentro da tela (erro de formulário, resultado de uma ação, aviso de chegada). O erro é anunciado
// na hora (`alert`); o sucesso, sem interromper (`status`). Com `dismissible`, o X emite `dismiss`.
withDefaults(defineProps<{ kind: 'success' | 'error'; dismissible?: boolean }>(), {
  dismissible: false,
})

const emit = defineEmits<{ dismiss: [] }>()

const TONE = {
  success: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
  error: 'bg-red-500/10 text-red-700 dark:text-red-300',
} as const
</script>

<template>
  <div
    v-if="dismissible"
    :role="kind === 'error' ? 'alert' : 'status'"
    class="flex items-center justify-between gap-3 rounded-2xl px-3.5 py-2 text-sm"
    :class="TONE[kind]"
  >
    <slot />
    <button
      type="button"
      aria-label="Fechar aviso"
      class="rounded-full p-1"
      :class="kind === 'error' ? 'hover:bg-red-500/10' : 'hover:bg-emerald-500/10'"
      @click="emit('dismiss')"
    >
      <AppIcon name="x" class="size-4" />
    </button>
  </div>
  <p
    v-else
    :role="kind === 'error' ? 'alert' : 'status'"
    class="rounded-2xl px-3.5 py-2 text-sm"
    :class="TONE[kind]"
  >
    <slot />
  </p>
</template>
