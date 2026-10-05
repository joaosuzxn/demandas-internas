<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/icons/AppIcon.vue'
import type { IconName } from '@/components/icons/icons'
import { parseApiError } from '@/services/apiErrors'
import {
  closeDemand,
  deleteDemand,
  reopenDemand,
  startDemand,
  type Demand,
} from '@/services/demands'

const props = defineProps<{
  demand: Demand
  /** Quem pediu ou o admin: mostra Editar e Excluir. Iniciar, finalizar e reabrir são de todos (ADR 0003). */
  canEdit: boolean
}>()

const emit = defineEmits<{
  /** A situação mudou: a tela passa a mostrar a solicitação que a API devolveu. */
  updated: [demand: Demand]
  /** A solicitação foi excluída: quem ouve sai da tela. */
  deleted: []
}>()

/** Pedido de exclusão aberto: a confirmação toma o lugar dos botões. */
const confirming = ref(false)
const running = ref<'status' | 'delete' | null>(null)
const success = ref<string | null>(null)
const error = ref<string | null>(null)

// Outra solicitação na mesma tela não herda o aviso nem a confirmação da anterior.
watch(
  () => props.demand.id,
  () => {
    confirming.value = false
    success.value = null
    error.value = null
  },
)

type StatusAction = {
  label: string
  icon: IconName
  success: string
  run: (id: number) => Promise<Demand>
}

// Iniciar, finalizar e reabrir partem no clique: a API não pede motivo para nenhum deles.
// Cada situação tem uma só ação de avanço (spec do item 0022).
const STATUS_ACTIONS: Record<Demand['status'], StatusAction> = {
  pending: {
    label: 'Iniciar',
    icon: 'circle-play',
    success: 'Solicitação iniciada.',
    run: startDemand,
  },
  in_progress: {
    label: 'Finalizar',
    icon: 'circle-check',
    success: 'Solicitação finalizada.',
    run: closeDemand,
  },
  finished: {
    label: 'Reabrir',
    icon: 'rotate-ccw',
    success: 'Solicitação reaberta.',
    run: reopenDemand,
  },
}

async function changeStatus(): Promise<void> {
  const action = STATUS_ACTIONS[props.demand.status]
  running.value = 'status'
  success.value = null
  error.value = null

  try {
    const updated = await action.run(props.demand.id)
    success.value = action.success
    emit('updated', updated)
  } catch (failure) {
    // O 422 de situação já alterada vem no campo `status`: a mensagem dele explica o que houve.
    error.value = parseApiError(failure).message
  } finally {
    running.value = null
  }
}

function askDelete(): void {
  success.value = null
  error.value = null
  confirming.value = true
}

async function confirmDelete(): Promise<void> {
  running.value = 'delete'
  error.value = null

  try {
    await deleteDemand(props.demand.id)
    emit('deleted')
  } catch (failure) {
    error.value = parseApiError(failure).message
    confirming.value = false
  } finally {
    running.value = null
  }
}

const BUTTON =
  'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium shadow-sm shadow-slate-900/5 transition disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-black/20'
const PRIMARY = 'bg-sidebar-active text-white hover:opacity-90 dark:bg-white dark:text-slate-950'
const SECONDARY = 'bg-surface-item hover:bg-surface-item-hover text-slate-700 dark:text-slate-200'
const DANGER = 'bg-red-600 text-white hover:bg-red-700'
// Excluir na linha de botões: discreto, o vermelho forte fica para a confirmação.
const DANGER_SOFT = 'bg-surface-item hover:bg-surface-item-hover text-red-700 dark:text-red-300'
</script>

<template>
  <section aria-label="Ações da solicitação" class="flex flex-col gap-3">
    <p
      v-if="success"
      role="status"
      class="rounded-2xl bg-emerald-500/10 px-3.5 py-2 text-sm text-emerald-800 dark:text-emerald-300"
    >
      {{ success }}
    </p>
    <p v-if="error" role="alert" class="rounded-2xl bg-red-500/10 px-3.5 py-2 text-sm text-red-700 dark:text-red-300">
      {{ error }}
    </p>

    <!-- A confirmação toma o lugar dos botões, como no Órbita: um ato por vez. -->
    <div v-if="confirming" class="flex flex-col gap-3">
      <p class="text-sm text-slate-700 dark:text-slate-200">
        <span class="font-semibold text-slate-900 dark:text-white">Excluir esta solicitação?</span>
        Ela some do quadro para todos.
      </p>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          :class="[BUTTON, DANGER]"
          :disabled="running !== null"
          @click="confirmDelete"
        >
          <AppIcon name="trash" class="size-4" />
          {{ running === 'delete' ? 'Excluindo…' : 'Excluir' }}
        </button>
        <button
          type="button"
          :class="[BUTTON, SECONDARY]"
          :disabled="running !== null"
          @click="confirming = false"
        >
          Voltar
        </button>
      </div>
    </div>

    <div v-else class="flex flex-wrap gap-2">
      <button
        type="button"
        :class="[BUTTON, PRIMARY]"
        :disabled="running !== null"
        @click="changeStatus"
      >
        <AppIcon :name="STATUS_ACTIONS[demand.status].icon" class="size-4" />
        {{ STATUS_ACTIONS[demand.status].label }}
      </button>
      <!-- Editar leva à tela do formulário; só na pendente, porque a API não edita as outras. -->
      <RouterLink
        v-if="canEdit && demand.status === 'pending'"
        :to="{ name: 'demand-edit', params: { id: demand.id } }"
        :class="[BUTTON, SECONDARY]"
      >
        <AppIcon name="pencil" class="size-4" />
        Editar
      </RouterLink>
      <button
        v-if="canEdit"
        type="button"
        :class="[BUTTON, DANGER_SOFT]"
        :disabled="running !== null"
        @click="askDelete"
      >
        <AppIcon name="trash" class="size-4" />
        Excluir
      </button>
    </div>
  </section>
</template>
