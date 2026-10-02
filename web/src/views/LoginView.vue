<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthLayout from '@/components/AuthLayout.vue'
import GlassButton from '@/components/GlassButton.vue'
import GlassCard from '@/components/GlassCard.vue'
import GlassInput from '@/components/GlassInput.vue'
import { safeRedirect } from '@/router/redirect'
import { parseApiError } from '@/services/apiErrors'
import type { User } from '@/services/auth'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const form = reactive({ login: '', password: '', remember: false })
const fieldErrors = ref<Record<string, string>>({})
const generalError = ref<string | null>(null)
const submitting = ref(false)

async function submit() {
  if (submitting.value) return

  submitting.value = true
  fieldErrors.value = {}
  generalError.value = null

  let user: User
  try {
    user = await auth.login({ ...form })
  } catch (error) {
    const parsed = parseApiError(error, ['login', 'password'])
    fieldErrors.value = parsed.fieldErrors
    generalError.value = parsed.message
    form.password = ''
    return
  } finally {
    submitting.value = false
  }

  // Com a senha padrão pendente, a troca vem antes de qualquer outro destino.
  await router.replace(
    user.must_change_password ? { name: 'change-password' } : safeRedirect(route.query.redirect),
  )
}
</script>

<template>
  <AuthLayout>
    <GlassCard>
      <h1 class="text-center text-2xl font-bold text-white">Entrar</h1>

      <form class="mt-6 space-y-4" @submit.prevent="submit">
        <GlassInput
          v-model="form.login"
          label="Usuário ou e-mail"
          type="text"
          name="login"
          autocomplete="username"
          autocapitalize="none"
          spellcheck="false"
          required
          autofocus
          :error="fieldErrors.login"
        />
        <GlassInput
          v-model="form.password"
          label="Senha"
          type="password"
          name="password"
          autocomplete="current-password"
          required
          :error="fieldErrors.password"
        />

        <label class="flex w-fit items-center gap-2 text-sm text-white">
          <input
            v-model="form.remember"
            type="checkbox"
            name="remember"
            class="size-4 accent-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          />
          Lembrar-me
        </label>

        <p
          v-if="generalError"
          role="alert"
          data-testid="general-error"
          class="text-center text-sm text-red-200"
        >
          {{ generalError }}
        </p>

        <GlassButton type="submit" :loading="submitting">
          {{ submitting ? 'Entrando…' : 'Entrar' }}
        </GlassButton>
      </form>
    </GlassCard>
  </AuthLayout>
</template>
