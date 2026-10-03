<script setup lang="ts">
import { ICONS, type IconName } from './icons'

defineProps<{ name: IconName }>()
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <component
      :is="tag"
      v-for="([tag, attributes], index) in ICONS[name]"
      :key="index"
      v-bind="attributes"
    />
  </svg>
</template>
