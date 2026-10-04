<script setup lang="ts">
import { computed, ref } from 'vue'
import GlassPanel from '@/components/ui/GlassPanel.vue'
import { parseApiError } from '@/services/apiErrors'
import type { User } from '@/services/auth'
import { activateUser, deactivateUser, resetUserPassword } from '@/services/users'

const props = defineProps<{
  user: User
  /** A conta de quem está logado: a API recusa desativá-la, e redefinir a derrubaria. */
  isSelf: boolean
}>()

const emit = defineEmits<{ updated: [user: User] }>()

type Action = 'deactivate' | 'activate' | 'reset'

const SUCCESS: Record<Action, string> = {
  deactivate: 'Usuário desativado.',
  activate: 'Usuário reativado.',
  reset: 'Senha redefinida para a padrão.',
}

/** A ação esperando o "Confirmar"; só uma por vez. */
const confirming = ref<Action | null>(null)
const busy = ref(false)
const message = ref<{ kind: 'success' | 'error'; text: string } | null>(null)

const firstName = computed(() => props.user.name.trim().split(/\s+/)[0])

const question = computed(() => {
  switch (confirming.value) {
    case 'deactivate':
      return `Desativar ${firstName.value}? O acesso é cortado na hora.`
    case 'activate':
      return `Reativar ${firstName.value}?`
    case 'reset':
      return `Redefinir a senha de ${firstName.value}? Ela volta à padrão e a sessão aberta é encerrada.`
    default:
      return ''
  }
})

function ask(action: Action): void {
  message.value = null
  confirming.value = action
}

async function confirm(): Promise<void> {
  const action = confirming.value
  if (!action) return

  busy.value = true
  try {
    let updated: User
    if (action === 'deactivate') updated = await deactivateUser(props.user.id)
    else if (action === 'activate') updated = await activateUser(props.user.id)
    else {
      // 204 sem corpo: o que muda no usuário é só a senha provisória.
      await resetUserPassword(props.user.id)
      updated = { ...props.user, must_change_password: true }
    }
    emit('updated', updated)
    message.value = { kind: 'success', text: SUCCESS[action] }
  } catch (error) {
    // Sem campos na tela: o 422 do `is_active` vira a mensagem geral.
    message.value = { kind: 'error', text: parseApiError(error).message ?? '' }
  } finally {
    busy.value = false
    confirming.value = null
  }
}

const ACTION_BUTTON =
  'bg-surface-item hover:bg-surface-item-hover inline-flex items-center rounded-full px-3.5 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-200'
const CONFIRM_BUTTON =
  'inline-flex items-center rounded-full bg-red-600 px-3.5 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60'
</script>

<template>
  <GlassPanel title="Acesso">
    <div class="flex flex-col gap-4">
      <p
        v-if="message"
        :role="message.kind === 'error' ? 'alert' : 'status'"
        class="rounded-2xl px-3.5 py-2 text-sm"
        :class="
          message.kind === 'error'
            ? 'bg-red-500/10 text-red-700 dark:text-red-300'
            : 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
        "
      >
        {{ message.text }}
      </p>

      <dl class="flex flex-col divide-y divide-slate-900/5 dark:divide-white/10">
        <div class="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
          <div>
            <dt class="text-xs font-medium text-slate-500 dark:text-slate-400">Situação</dt>
            <dd class="text-sm text-slate-900 dark:text-white">
              {{ user.is_active ? 'Ativo' : 'Desativado' }}
            </dd>
          </div>
          <template v-if="!isSelf">
            <div v-if="confirming === 'deactivate' || confirming === 'activate'" class="flex flex-wrap items-center gap-2">
              <span class="text-sm text-slate-600 dark:text-slate-300">{{ question }}</span>
              <button type="button" :class="CONFIRM_BUTTON" :disabled="busy" @click="confirm">
                {{ busy ? 'Aguarde…' : 'Confirmar' }}
              </button>
              <button type="button" :class="ACTION_BUTTON" :disabled="busy" @click="confirming = null">
                Cancelar
              </button>
            </div>
            <button
              v-else
              type="button"
              :class="ACTION_BUTTON"
              @click="ask(user.is_active ? 'deactivate' : 'activate')"
            >
              {{ user.is_active ? 'Desativar' : 'Reativar' }}
            </button>
          </template>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 py-3 last:pb-0">
          <div>
            <dt class="text-xs font-medium text-slate-500 dark:text-slate-400">Senha</dt>
            <dd class="text-sm text-slate-900 dark:text-white">
              {{ user.must_change_password ? 'Provisória — troca no próximo acesso' : 'Definida pelo usuário' }}
            </dd>
          </div>
          <template v-if="!isSelf">
            <div v-if="confirming === 'reset'" class="flex flex-wrap items-center gap-2">
              <span class="text-sm text-slate-600 dark:text-slate-300">{{ question }}</span>
              <button type="button" :class="CONFIRM_BUTTON" :disabled="busy" @click="confirm">
                {{ busy ? 'Aguarde…' : 'Confirmar' }}
              </button>
              <button type="button" :class="ACTION_BUTTON" :disabled="busy" @click="confirming = null">
                Cancelar
              </button>
            </div>
            <button v-else type="button" :class="ACTION_BUTTON" @click="ask('reset')">
              Redefinir senha
            </button>
          </template>
        </div>
      </dl>

      <p v-if="isSelf" class="text-sm text-slate-600 dark:text-slate-300">
        Esta é a sua conta: ela não pode ser desativada nem ter a senha redefinida por aqui.
      </p>
    </div>
  </GlassPanel>
</template>
