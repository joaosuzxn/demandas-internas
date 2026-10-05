<script setup lang="ts">
import { reactive, ref } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import AppIcon from '@/components/icons/AppIcon.vue'
import BaseField, { type FieldOption } from '@/components/ui/BaseField.vue'
import { parseApiError } from '@/services/apiErrors'
import {
  DEMAND_CATEGORY_LABELS,
  createDemand,
  updateDemand,
  type Demand,
  type DemandPayload,
} from '@/services/demands'

const props = defineProps<{
  /** Solicitação a editar; sem ela, o formulário cria uma nova. */
  editing?: Demand | null
  /** Para onde o "Cancelar" leva: o quadro na criação, a solicitação na edição. */
  cancelTo: RouteLocationRaw
  submitLabel: string
}>()

const emit = defineEmits<{
  /** Criada ou salva: quem ouve navega para a tela da solicitação. */
  saved: [demand: Demand]
}>()

type Field = keyof DemandPayload

const FIELDS: readonly Field[] = ['title', 'description', 'category']

const CATEGORY_OPTIONS: FieldOption[] = Object.entries(DEMAND_CATEGORY_LABELS).map(
  ([value, label]) => ({ value, label }),
)

// Nasce com a solicitação que se edita, ou vazio. A categoria não vem escolhida: escolher é parte do pedido.
const fields = reactive<DemandPayload>({
  title: props.editing?.title ?? '',
  description: props.editing?.description ?? '',
  category: props.editing?.category ?? '',
})

const fieldErrors = ref<Partial<Record<Field, string>>>({})
const formError = ref<string | null>(null)
/** Enviando, ou já salvo e esperando a tela sair: nos dois casos o botão não aceita clique. */
const busy = ref(false)

function update(field: Field, value: string): void {
  ;(fields as Record<Field, string>)[field] = value
  // Quem mexe no campo está corrigindo: o erro dele sai, os outros ficam.
  if (fieldErrors.value[field]) {
    const rest = { ...fieldErrors.value }
    delete rest[field]
    fieldErrors.value = rest
  }
}

// A conferência de campo vazio é da API (422), como no Órbita: a tela só mostra o que ela diz.
async function onSubmit(): Promise<void> {
  busy.value = true
  fieldErrors.value = {}
  formError.value = null

  try {
    const payload = { ...fields }
    const saved = props.editing
      ? await updateDemand(props.editing.id, payload)
      : await createDemand(payload)
    emit('saved', saved)
  } catch (error) {
    const parsed = parseApiError(error, FIELDS)
    fieldErrors.value = parsed.fieldErrors
    formError.value = parsed.message
    busy.value = false
  }
}
</script>

<template>
  <form novalidate class="flex flex-col gap-5" @submit.prevent="onSubmit">
    <p
      v-if="formError"
      data-form-error
      role="alert"
      class="rounded-2xl bg-red-500/10 px-3.5 py-2 text-sm text-red-700 dark:text-red-300"
    >
      {{ formError }}
    </p>

    <BaseField
      :model-value="fields.title"
      label="Título"
      required
      :maxlength="150"
      placeholder="Ex.: Trocar a impressora da sala 2"
      :error="fieldErrors.title"
      @update:model-value="update('title', $event)"
    />

    <BaseField
      :model-value="fields.description"
      label="Descrição"
      control="textarea"
      required
      :rows="5"
      :maxlength="5000"
      placeholder="O que precisa ser feito, onde e por quê."
      :error="fieldErrors.description"
      @update:model-value="update('description', $event)"
    />

    <BaseField
      :model-value="fields.category"
      label="Categoria"
      control="select"
      required
      :options="CATEGORY_OPTIONS"
      placeholder-option="Selecione a categoria"
      hint="A área que vai atender o pedido."
      :error="fieldErrors.category"
      @update:model-value="update('category', $event)"
    />

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
        {{ busy ? 'Enviando…' : submitLabel }}
      </button>
    </div>
  </form>
</template>
