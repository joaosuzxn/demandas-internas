<script setup lang="ts">
import { reactive, ref } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import BaseField from '@/components/ui/BaseField.vue'
import FormActions from '@/components/ui/FormActions.vue'
import InlineAlert from '@/components/ui/InlineAlert.vue'
import { useFormErrors } from '@/composables/useFormErrors'
import { parseApiError } from '@/services/apiErrors'
import {
  DEMAND_CATEGORY_OPTIONS,
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

// Nasce com a solicitação que se edita, ou vazio. A categoria não vem escolhida: escolher é parte do pedido.
const fields = reactive<DemandPayload>({
  title: props.editing?.title ?? '',
  description: props.editing?.description ?? '',
  category: props.editing?.category ?? '',
})

const { fieldErrors, generalError: formError, reset, fail, clear } = useFormErrors()
/** Enviando, ou já salvo e esperando a tela sair: nos dois casos o botão não aceita clique. */
const busy = ref(false)

function update(field: Field, value: string): void {
  ;(fields as Record<Field, string>)[field] = value
  // Quem mexe no campo está corrigindo: o erro dele sai, os outros ficam.
  clear(field)
}

// A conferência de campo vazio é da API (422), como no Órbita: a tela só mostra o que ela diz.
async function onSubmit(): Promise<void> {
  busy.value = true
  reset()

  try {
    const payload = { ...fields }
    const saved = props.editing
      ? await updateDemand(props.editing.id, payload)
      : await createDemand(payload)
    emit('saved', saved)
  } catch (error) {
    const parsed = parseApiError(error, FIELDS)
    fail(parsed.fieldErrors, parsed.message)
    busy.value = false
  }
}
</script>

<template>
  <form novalidate class="flex flex-col gap-5" @submit.prevent="onSubmit">
    <InlineAlert v-if="formError" kind="error" data-form-error>{{ formError }}</InlineAlert>

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
      :options="DEMAND_CATEGORY_OPTIONS"
      placeholder-option="Selecione a categoria"
      hint="A área que vai atender o pedido."
      :error="fieldErrors.category"
      @update:model-value="update('category', $event)"
    />

    <FormActions
      :cancel-to="cancelTo"
      :submit-label="submitLabel"
      busy-label="Enviando…"
      :busy="busy"
    />
  </form>
</template>
