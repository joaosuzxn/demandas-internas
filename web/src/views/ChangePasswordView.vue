<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthLayout from '@/components/AuthLayout.vue'
import GlassButton from '@/components/GlassButton.vue'
import GlassCard from '@/components/GlassCard.vue'
import GlassInput from '@/components/GlassInput.vue'
import { parseApiError } from '@/services/apiErrors'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const form = reactive({ current_password: '', password: '', password_confirmation: '' })
const fieldErrors = ref<Record<string, string>>({})
const generalError = ref<string | null>(null)
const submitting = ref(false)

async function submit() {
  if (submitting.value) return

  submitting.value = true
  fieldErrors.value = {}
  generalError.value = null

  try {
    await auth.changePassword({ ...form })
  } catch (error) {
    // As regras da senha ficam na API: a tela só mostra o que ela responde.
    const parsed = parseApiError(error, ['current_password', 'password'])
    fieldErrors.value = parsed.fieldErrors
    generalError.value = parsed.message
    return
  } finally {
    submitting.value = false
  }

  await router.replace({ name: 'home' })
}

async function signOut() {
  await auth.logout()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <AuthLayout>
    <GlassCard>
      <h1 class="text-center text-2xl font-bold text-white">Trocar senha</h1>
      <p class="mt-2 text-center text-sm text-white/80">
        Por segurança, troque a senha padrão antes de continuar.
      </p>

      <form class="mt-6 space-y-4" @submit.prevent="submit">
        <GlassInput
          v-model="form.current_password"
          label="Senha atual"
          type="password"
          name="current_password"
          autocomplete="current-password"
          required
          autofocus
          :error="fieldErrors.current_password"
        />
        <GlassInput
          v-model="form.password"
          label="Nova senha"
          type="password"
          name="password"
          autocomplete="new-password"
          required
          hint="Mínimo de 8 caracteres, com letra maiúscula, minúscula, número e símbolo."
          :error="fieldErrors.password"
        />
        <GlassInput
          v-model="form.password_confirmation"
          label="Confirmar nova senha"
          type="password"
          name="password_confirmation"
          autocomplete="new-password"
          required
        />

        <p
          v-if="generalError"
          role="alert"
          data-testid="general-error"
          class="text-center text-sm text-red-200"
        >
          {{ generalError }}
        </p>

        <GlassButton type="submit" :loading="submitting">
          {{ submitting ? 'Salvando…' : 'Salvar' }}
        </GlassButton>
      </form>

      <button
        type="button"
        data-testid="logout"
        class="mx-auto mt-5 block text-sm text-white/80 underline-offset-4 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        @click="signOut"
      >
        Sair
      </button>
    </GlassCard>
  </AuthLayout>
</template>
