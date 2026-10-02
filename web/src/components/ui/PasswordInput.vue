<script setup lang="ts">
import { ref } from 'vue'
import BaseInput from './BaseInput.vue'

defineProps<{
  label: string
  name?: string
  placeholder?: string
  autocomplete?: string
  error?: string
  invalid?: boolean
  shakeKey?: number
  autofocus?: boolean
}>()

const model = defineModel<string>({ default: '' })

const isVisible = ref(false)
</script>

<template>
  <!-- Campo de senha com o botão de mostrar/ocultar. -->
  <BaseInput
    v-model="model"
    :label="label"
    :type="isVisible ? 'text' : 'password'"
    :name="name"
    :placeholder="placeholder"
    :autocomplete="autocomplete"
    :error="error"
    :invalid="invalid"
    :shake-key="shakeKey"
    :autofocus="autofocus"
  >
    <template #trailing>
      <button
        type="button"
        class="rounded-full p-2.5 text-white/50 transition hover:text-white"
        :aria-label="isVisible ? 'Ocultar senha' : 'Mostrar senha'"
        :aria-pressed="isVisible"
        @click="isVisible = !isVisible"
      >
        <svg
          class="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
          <circle cx="12" cy="12" r="3" />
          <path v-if="isVisible" d="m4 20 16-16" />
        </svg>
      </button>
    </template>
  </BaseInput>
</template>
