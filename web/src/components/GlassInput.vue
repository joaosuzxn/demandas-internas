<script setup lang="ts">
import { computed, onMounted, useId, useTemplateRef } from 'vue'

// type, name, autocomplete, required etc. vão direto para o <input>.
defineOptions({ inheritAttrs: false })

const props = defineProps<{
  label: string
  error?: string | null
  hint?: string
  autofocus?: boolean
}>()

const model = defineModel<string>({ required: true })

const id = useId()
// A chave do ref é diferente do nome da variável de propósito (evita o conflito do useTemplateRef).
const input = useTemplateRef<HTMLInputElement>('field')

const describedBy = computed(() => {
  if (props.error) return `${id}-error`
  if (props.hint) return `${id}-hint`
  return undefined
})

onMounted(() => {
  if (props.autofocus) {
    input.value?.focus()
  }
})
</script>

<template>
  <div>
    <label :for="id" class="sr-only">{{ label }}</label>
    <input
      :id="id"
      ref="field"
      v-model="model"
      v-bind="$attrs"
      :placeholder="label"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedBy"
      class="block w-full rounded-full border bg-transparent px-5 py-2.5 text-sm text-white outline-none transition placeholder:text-white/80 focus-visible:border-white focus-visible:ring-2 focus-visible:ring-white/50"
      :class="error ? 'border-red-300' : 'border-white/40'"
    />
    <p v-if="error" :id="`${id}-error`" role="alert" class="mt-1.5 px-5 text-xs text-red-200">
      {{ error }}
    </p>
    <p v-else-if="hint" :id="`${id}-hint`" data-testid="hint" class="mt-1.5 px-5 text-xs text-white/70">
      {{ hint }}
    </p>
  </div>
</template>

<style scoped>
/* O preenchimento automático do navegador pinta o campo de claro e quebraria o vidro. */
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus {
  -webkit-text-fill-color: #fff;
  caret-color: #fff;
  transition: background-color 9999s ease-out 0s;
}
</style>
