<script setup lang="ts">
import DemandSection from '@/components/demands/DemandSection.vue'
import { DEMAND_MOVEMENT_LABELS, type DemandMovement } from '@/services/demands'
import { formatDateTime } from '@/utils/dates'

defineProps<{
  /** `Demand.history`, do mais antigo ao mais recente. */
  history: DemandMovement[]
}>()
</script>

<template>
  <!-- A linha do tempo do Órbita (DemandTimeline), sem trajeto nem nota: aqui só tipo, quem e quando. -->
  <DemandSection title="Movimentação">
    <ol v-if="history.length > 0" class="flex flex-col">
      <li v-for="(event, index) in history" :key="event.id" class="flex gap-3 pb-3.5">
        <!-- A trilha: o fio que chega da bolinha de cima, a bolinha e o fio que sai para a próxima. -->
        <div class="flex flex-col items-center" aria-hidden="true">
          <span class="h-2.5 w-px shrink-0" :class="index > 0 ? 'bg-slate-900/15 dark:bg-white/10' : ''"></span>
          <span class="size-2 shrink-0 rounded-full bg-slate-400"></span>
          <span
            v-if="index < history.length - 1"
            class="-mb-3.5 w-px flex-1 bg-slate-900/15 dark:bg-white/10"
          ></span>
        </div>

        <div
          class="bg-surface-item flex min-w-0 flex-1 flex-col gap-0.5 rounded-2xl px-3.5 py-2.5 shadow-sm shadow-slate-900/5 dark:shadow-black/20"
        >
          <p data-movement-type class="text-sm font-medium text-slate-900 dark:text-white">
            {{ DEMAND_MOVEMENT_LABELS[event.type] }}
          </p>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            {{ event.actor.name }}
            <template v-if="formatDateTime(event.created_at)">
              · {{ formatDateTime(event.created_at) }}
            </template>
          </p>
        </div>
      </li>
    </ol>

    <div
      v-else
      class="bg-surface-item rounded-2xl px-3.5 py-3 text-sm text-slate-600 shadow-sm shadow-slate-900/5 dark:text-slate-300 dark:shadow-black/20"
    >
      Nenhuma movimentação registrada.
    </div>
  </DemandSection>
</template>
