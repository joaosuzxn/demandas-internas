<script setup lang="ts">
import { computed, onMounted, reactive, ref, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import BaseInput from '@/components/ui/BaseInput.vue'
import PasswordInput from '@/components/ui/PasswordInput.vue'
import { useFormErrors } from '@/composables/useFormErrors'
import { parseApiError } from '@/services/apiErrors'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const form = reactive({ current_password: '', password: '', password_confirmation: '' })
const { fieldErrors, generalError, shake, reset, fail, requireFilled, clear } = useFormErrors()
const submitting = ref(false)
// Quem acabou de entrar já digitou a senha atual no login: a tela a reaproveita e não pede de novo.
// Só pede quando não a tem (página recarregada, sessão lembrada) ou quando a API a recusa.
const askCurrentPassword = computed(() => auth.loginPassword === null)
// Lido uma vez: ao sair, a sessão some antes de o card trocar de conteúdo e o campo não pode esvaziar.
const username = auth.user?.username ?? ''
// O "Salvar nova senha" só libera com todos os campos visíveis digitados (como no card do Órbita).
const canSubmit = computed(
  () =>
    (!askCurrentPassword.value || form.current_password !== '') &&
    form.password !== '' &&
    form.password_confirmation !== '' &&
    !submitting.value,
)

async function submit() {
  if (submitting.value) return

  const payload = { ...form, current_password: auth.loginPassword ?? form.current_password }

  reset()
  if (!requireFilled(payload)) return

  submitting.value = true

  try {
    await auth.changePassword(payload)
  } catch (error) {
    // As regras da senha ficam na API: a tela só mostra o que ela responde.
    const parsed = parseApiError(error, ['current_password', 'password', 'password_confirmation'])
    if (parsed.fieldErrors.current_password) {
      // A senha reaproveitada do login foi recusada: sai da memória e o campo passa a aparecer.
      auth.forgetLoginPassword()
    }
    fail(parsed.fieldErrors, parsed.message)
    submitting.value = false
    return
  }

  // `submitting` segue true de propósito: o botão fica desabilitado até a navegação terminar.
  await router.replace({ name: 'home' })
}

// Desistiu da troca: a sessão é encerrada e o card volta ao login.
async function signOut() {
  if (submitting.value) return

  submitting.value = true
  await auth.logout()
  await router.replace({ name: 'login' })
}

// Foco no título ao entrar, para o leitor de tela anunciar a troca de conteúdo.
const heading = useTemplateRef<HTMLElement>('heading')
onMounted(() => heading.value?.focus())
</script>

<template>
  <div>
    <h1
      ref="heading"
      tabindex="-1"
      class="to-brand-300 mx-auto w-fit bg-linear-to-r from-white from-60% bg-clip-text text-center text-3xl font-light text-balance text-transparent focus-visible:outline-none sm:text-4xl"
    >
      Crie sua nova senha
    </h1>

    <p class="mt-4 text-center text-sm font-light text-balance text-white/70">
      Você entrou com a senha padrão. Para continuar, crie uma senha com no mínimo 8 caracteres, com
      letras maiúsculas, minúsculas, números e símbolos.
    </p>

    <form class="mt-8 flex flex-col gap-5" novalidate @submit.prevent="submit">
      <!-- Só para mostrar de qual conta é a senha (e para o gerenciador de senhas saber). -->
      <BaseInput
        :model-value="username"
        label="Usuário"
        type="text"
        name="username"
        autocomplete="username"
        disabled
      />

      <PasswordInput
        v-if="askCurrentPassword"
        v-model="form.current_password"
        label="Senha atual"
        name="current_password"
        placeholder="Digite a senha atual"
        autocomplete="current-password"
        :error="fieldErrors.current_password"
        :shake-key="shake"
        @update:model-value="clear('current_password')"
      />

      <PasswordInput
        v-model="form.password"
        label="Nova senha"
        name="password"
        placeholder="Digite a nova senha"
        autocomplete="new-password"
        :error="fieldErrors.password"
        :shake-key="shake"
        @update:model-value="clear('password')"
      />

      <PasswordInput
        v-model="form.password_confirmation"
        label="Confirmar nova senha"
        name="password_confirmation"
        placeholder="Repita a nova senha"
        autocomplete="new-password"
        :error="fieldErrors.password_confirmation"
        :shake-key="shake"
        @update:model-value="clear('password_confirmation')"
      />

      <p
        v-if="generalError"
        :key="shake"
        role="alert"
        data-testid="general-error"
        class="animate-shake rounded-2xl border border-red-400/60 bg-red-500/10 px-4 py-3 text-center text-sm font-light text-red-200 motion-reduce:animate-none"
      >
        {{ generalError }}
      </p>

      <button
        type="submit"
        :disabled="!canSubmit"
        class="text-dusk-900 mt-3 w-full rounded-full bg-white px-6 py-3.5 text-base font-semibold transition hover:bg-white/85 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ submitting ? 'Salvando…' : 'Salvar nova senha' }}
      </button>

      <button
        type="button"
        :disabled="submitting"
        data-testid="logout"
        class="mx-auto text-sm font-light text-white/70 underline-offset-4 transition hover:text-white hover:underline"
        @click="signOut"
      >
        Sair
      </button>
    </form>
  </div>
</template>
