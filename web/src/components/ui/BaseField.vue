<script setup lang="ts">
import { useId } from 'vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'

export interface FieldOption {
  value: string
  label: string
}

// Campo do Órbita (item 0021), sem máscaras e sem modo escuro: rótulo, controle, dica e erro.
withDefaults(
  defineProps<{
    /** Rótulo exibido acima do campo. */
    label: string
    /** Controle desenhado: campo de uma linha, área de texto ou seletor. */
    control?: 'input' | 'textarea' | 'select'
    type?: 'text' | 'email' | 'date' | 'tel' | 'password'
    /** Opções do seletor, quando `control` é `select`. */
    options?: FieldOption[]
    /** Primeira opção do seletor, sem valor (ex.: "Selecione a diretoria"). */
    placeholderOption?: string
    placeholder?: string
    /** Explicação curta abaixo do campo (ex.: formato esperado). */
    hint?: string
    /** Mensagem de erro do backend; deixa a borda vermelha e substitui a dica. */
    error?: string
    required?: boolean
    disabled?: boolean
    rows?: number
    autocomplete?: string
    /** Teto de caracteres, o mesmo do backend. */
    maxlength?: number
  }>(),
  { control: 'input', type: 'text', rows: 3 },
)

const model = defineModel<string>({ default: '' })

// Liga <label>, controle e mensagens sem exigir um id manual em cada uso.
const fieldId = useId()
const errorId = `${fieldId}-error`
const hintId = `${fieldId}-hint`

/** Mesma pintura nos três controles: o vidro claro do app, legível nos dois temas. */
const CONTROL_CLASS =
  'w-full rounded-2xl border bg-surface-field px-4 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-900/5 transition placeholder:text-slate-400 focus:bg-white/80 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:text-white dark:shadow-black/20 dark:placeholder:text-slate-500 dark:focus:bg-white/10'
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="fieldId" class="text-xs font-medium text-slate-600 dark:text-slate-300">
      {{ label }}
      <span v-if="required" class="text-red-600 dark:text-red-300" aria-hidden="true">*</span>
    </label>

    <textarea
      v-if="control === 'textarea'"
      :id="fieldId"
      v-model="model"
      :rows="rows"
      :maxlength="maxlength"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error ? errorId : hint ? hintId : undefined"
      :class="[
        CONTROL_CLASS,
        'resize-y',
        error ? 'border-red-400 dark:border-red-400/70' : 'focus:border-brand-400 border-white/60 hover:border-white/80 dark:border-white/10 dark:hover:border-white/20',
      ]"
    ></textarea>

    <!-- O select é próprio (#49): a lista do nativo não aceita o visual do app. -->
    <BaseSelect
      v-else-if="control === 'select'"
      :id="fieldId"
      v-model="model"
      :options="options ?? []"
      :placeholder-option="placeholderOption"
      :disabled="disabled"
      :required="required"
      :invalid="!!error"
      :describedby="error ? errorId : hint ? hintId : undefined"
      :class="[
        CONTROL_CLASS,
        error ? 'border-red-400 dark:border-red-400/70' : 'focus:border-brand-400 border-white/60 hover:border-white/80 dark:border-white/10 dark:hover:border-white/20',
      ]"
    />

    <input
      v-else
      :id="fieldId"
      v-model="model"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :autocomplete="autocomplete"
      :maxlength="maxlength"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error ? errorId : hint ? hintId : undefined"
      :class="[
        CONTROL_CLASS,
        error ? 'border-red-400 dark:border-red-400/70' : 'focus:border-brand-400 border-white/60 hover:border-white/80 dark:border-white/10 dark:hover:border-white/20',
      ]"
    />

    <p v-if="error" :id="errorId" role="alert" class="text-xs text-red-600 dark:text-red-300">
      {{ error }}
    </p>
    <p v-else-if="hint" :id="hintId" class="text-xs text-slate-500 dark:text-slate-400">
      {{ hint }}
    </p>
  </div>
</template>
