<script setup lang="ts">
defineProps<{
  type?: 'button' | 'submit'
  loading?: boolean
}>()
</script>

<template>
  <button
    :type="type ?? 'button'"
    :disabled="loading"
    class="block w-full rounded-full bg-white px-5 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-70"
  >
    <slot />
  </button>
</template>
