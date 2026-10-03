<script setup lang="ts">
import { computed } from 'vue'
import DemandSection from '@/components/demands/DemandSection.vue'
import {
  DEMAND_CATEGORY_LABELS,
  DEMAND_STATUS_LABELS,
  type Demand,
  type DemandStatus,
} from '@/services/demands'

const props = defineProps<{ demand: Demand }>()

const STATUS_TONES: Record<DemandStatus, string> = {
  pending: 'bg-amber-500/15 text-amber-800',
  in_progress: 'bg-brand-500/15 text-brand-800',
  finished: 'bg-emerald-500/15 text-emerald-800',
}

function formatDateTime(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

type Fact = { label: string; value: string }

const facts = computed<Fact[]>(() => {
  const current = props.demand
  const createdAt = formatDateTime(current.created_at)
  const updatedAt = formatDateTime(current.updated_at)

  const all: { label: string; value: string | null }[] = [
    { label: 'Categoria', value: DEMAND_CATEGORY_LABELS[current.category] },
    { label: 'Solicitante', value: current.requester.name },
    { label: 'Criada em', value: createdAt },
    // Igual à criação (na precisão que a tela mostra) é repetir a linha de cima.
    { label: 'Atualizada em', value: updatedAt !== createdAt ? updatedAt : null },
  ]

  // Campo sem valor não entra: linha com travessão só ocupa espaço.
  return all.filter((fact): fact is Fact => fact.value !== null)
})

const TILE =
  'bg-surface-item flex min-w-0 flex-col rounded-2xl px-3.5 py-2.5 shadow-sm shadow-slate-900/5'
</script>

<template>
  <DemandSection title="Informações" data-demand-facts>
    <dl class="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
      <!-- A situação abre a ficha: é o que se procura primeiro. -->
      <div :class="TILE" class="sm:col-span-2 lg:col-span-1">
        <dt class="text-xs text-slate-500">Situação</dt>
        <dd>
          <span
            data-demand-status
            class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap"
            :class="STATUS_TONES[demand.status]"
          >
            {{ DEMAND_STATUS_LABELS[demand.status] }}
          </span>
        </dd>
      </div>

      <div v-for="fact in facts" :key="fact.label" :class="TILE">
        <dt class="text-xs text-slate-500">{{ fact.label }}</dt>
        <dd class="text-sm wrap-break-word text-slate-900">{{ fact.value }}</dd>
      </div>
    </dl>
  </DemandSection>
</template>
