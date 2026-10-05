<script setup lang="ts">
import { reactive, ref } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import AppIcon from '@/components/icons/AppIcon.vue'
import BaseField from '@/components/ui/BaseField.vue'
import { parseApiError } from '@/services/apiErrors'
import type { User } from '@/services/auth'
import { createUser, updateUser, type UserPayload } from '@/services/users'
import { maskCpf } from '@/utils/cpf'

const props = defineProps<{
  /** Usuário a editar; sem ele, o formulário cadastra um novo. */
  editing?: User | null
  /** Para onde o "Cancelar" leva. */
  cancelTo: RouteLocationRaw
  submitLabel: string
}>()

const emit = defineEmits<{
  /** Cadastrado ou salvo: quem ouve navega de volta à lista. */
  saved: [user: User]
}>()

type Field = keyof UserPayload

const FIELDS: readonly Field[] = ['name', 'username', 'cpf', 'email']

// A API guarda o CPF só com dígitos; no campo ele aparece com a máscara.
const fields = reactive<UserPayload>({
  name: props.editing?.name ?? '',
  username: props.editing?.username ?? '',
  cpf: maskCpf(props.editing?.cpf ?? ''),
  email: props.editing?.email ?? '',
})

const fieldErrors = ref<Partial<Record<Field, string>>>({})
const formError = ref<string | null>(null)
/** Enviando, ou já salvo e esperando a tela sair: nos dois casos o botão não aceita clique. */
const busy = ref(false)

function update(field: Field, value: string): void {
  fields[field] = value
  // Quem mexe no campo está corrigindo: o erro dele sai, os outros ficam.
  if (fieldErrors.value[field]) {
    const rest = { ...fieldErrors.value }
    delete rest[field]
    fieldErrors.value = rest
  }
}

// A conferência dos campos é da API (422): a tela só mostra o que ela diz.
async function onSubmit(): Promise<void> {
  busy.value = true
  fieldErrors.value = {}
  formError.value = null

  try {
    const payload = { ...fields }
    const saved = props.editing
      ? await updateUser(props.editing.id, payload)
      : await createUser(payload)
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
      :model-value="fields.name"
      label="Nome"
      required
      :maxlength="255"
      autocomplete="off"
      placeholder="Nome completo"
      :error="fieldErrors.name"
      @update:model-value="update('name', $event)"
    />

    <div class="grid items-start gap-5 sm:grid-cols-2">
      <BaseField
        :model-value="fields.username"
        label="Usuário"
        required
        :maxlength="30"
        autocomplete="off"
        placeholder="maria.souza"
        hint="De 3 a 30 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado. É usado para entrar no sistema."
        :error="fieldErrors.username"
        @update:model-value="update('username', $event)"
      />

      <BaseField
        :model-value="fields.cpf"
        label="CPF"
        mask="cpf"
        required
        autocomplete="off"
        placeholder="000.000.000-00"
        :error="fieldErrors.cpf"
        @update:model-value="update('cpf', $event)"
      />
    </div>

    <BaseField
      :model-value="fields.email"
      label="E-mail"
      type="email"
      required
      :maxlength="255"
      autocomplete="off"
      placeholder="maria@example.com"
      :error="fieldErrors.email"
      @update:model-value="update('email', $event)"
    />

    <p v-if="!editing" class="text-sm text-slate-600 dark:text-slate-300">
      O usuário entra com a senha padrão e precisa trocá-la no primeiro acesso.
    </p>

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
        {{ busy ? 'Salvando…' : submitLabel }}
      </button>
    </div>
  </form>
</template>
