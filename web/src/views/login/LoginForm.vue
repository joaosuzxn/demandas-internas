<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseInput from '@/components/ui/BaseInput.vue'
import PasswordInput from '@/components/ui/PasswordInput.vue'
import { useFormErrors } from '@/composables/useFormErrors'
import { safeRedirect } from '@/router/redirect'
import { parseApiError } from '@/services/apiErrors'
import type { User } from '@/services/auth'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const form = reactive({ login: '', password: '', remember: false })
const { fieldErrors, generalError, shake, reset, fail, requireFilled, clear } = useFormErrors()
const submitting = ref(false)
// O "Entrar" só libera com usuário e senha digitados (como no card do Órbita).
const canSubmit = computed(
  () => form.login.trim() !== '' && form.password !== '' && !submitting.value,
)

async function submit() {
  if (submitting.value) return

  reset()
  // Rede de segurança: com o botão desabilitado, um envio com campo vazio não deveria chegar aqui.
  // A API apara o login: só espaços é campo vazio. A senha não é aparada.
  if (!requireFilled({ login: form.login.trim(), password: form.password })) return

  submitting.value = true

  let user: User
  try {
    user = await auth.login({ ...form })
  } catch (error) {
    const parsed = parseApiError(error, ['login', 'password'])
    // A API devolve o erro de credencial no campo login sem dizer qual dos dois está errado:
    // os dois campos ficam vermelhos e a mensagem aparece uma vez, no campo da senha.
    const { login: credentials, ...others } = parsed.fieldErrors
    fail(credentials ? { ...others, credentials } : others, parsed.message)
    form.password = ''
    submitting.value = false
    return
  }

  // `submitting` segue true de propósito: o botão fica desabilitado até a navegação terminar.
  // Com a senha padrão pendente, a troca vem antes de qualquer outro destino.
  await router.replace(
    user.must_change_password ? { name: 'change-password' } : safeRedirect(route.query.redirect),
  )
}
</script>

<template>
  <div>
    <h1
      class="to-brand-300 mx-auto w-fit bg-linear-to-r from-white from-60% bg-clip-text text-center text-3xl font-light text-balance text-transparent sm:text-4xl"
    >
      Bem-vindo ao DI
    </h1>

    <!-- `novalidate`: a validação é nossa, sem o balão nativo do navegador. -->
    <form class="mt-9 flex flex-col gap-5" novalidate @submit.prevent="submit">
      <BaseInput
        v-model="form.login"
        label="Usuário ou e-mail"
        type="text"
        name="login"
        placeholder="Digite seu usuário ou e-mail"
        autocomplete="username"
        :error="fieldErrors.login"
        :invalid="Boolean(fieldErrors.credentials)"
        :shake-key="shake"
        class="gap-0"
        @update:model-value="clear('login', 'credentials')"
      />

      <PasswordInput
        v-model="form.password"
        label="Senha"
        name="password"
        placeholder="Digite sua senha"
        autocomplete="current-password"
        :error="fieldErrors.password ?? fieldErrors.credentials"
        :shake-key="shake"
        @update:model-value="clear('password', 'credentials')"
      />

      <div class="flex items-center">
        <label class="flex cursor-pointer items-center gap-2.5 text-sm font-light text-white/80">
          <input
            v-model="form.remember"
            type="checkbox"
            name="remember"
            class="accent-brand-500 size-4.5 rounded-sm"
          />
          Lembrar-me
        </label>
      </div>

      <!-- Erro que não é de um campo (ex.: falha de conexão). A `key` refaz a chacoalhada. -->
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
        {{ submitting ? 'Entrando…' : 'Entrar' }}
      </button>
    </form>
  </div>
</template>
