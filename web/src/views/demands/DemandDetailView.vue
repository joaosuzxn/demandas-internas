<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DemandActions from '@/components/demands/DemandActions.vue'
import DemandFacts from '@/components/demands/DemandFacts.vue'
import DemandRecordState from '@/components/demands/DemandRecordState.vue'
import DemandSection from '@/components/demands/DemandSection.vue'
import DemandTimeline from '@/components/demands/DemandTimeline.vue'
import BackLink from '@/components/ui/BackLink.vue'
import InlineAlert from '@/components/ui/InlineAlert.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import { useArrivalNotice } from '@/composables/useArrivalNotice'
import { useDemandRecord } from '@/composables/useDemandRecord'
import { demandsBoardRoute } from '@/composables/demandsBoardQuery'

const route = useRoute()
const router = useRouter()

const id = computed(() => Number(route.params.id))
const { demand, loading, error, notFound, canEdit, load, refresh } = useDemandRecord(id)
// "Solicitação criada." / "Solicitação atualizada.", de quem chega do formulário.
const notice = useArrivalNotice()
// O quadro com os filtros da última visita (lidos ao abrir a tela).
const boardRoute = demandsBoardRoute()

/** O número abre o título (`#12 - Título`); enquanto o dado não chega, fica o rótulo genérico. */
const title = computed(() =>
  demand.value ? `#${demand.value.id} - ${demand.value.title}` : 'Solicitação',
)

function onDeleted(): void {
  void router.push(demandsBoardRoute())
}
</script>

<template>
  <div class="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">
    <PageHeader :title="title">
      <template #media>
        <BackLink :to="boardRoute" label="Solicitações" />
      </template>
    </PageHeader>

    <InlineAlert
      v-if="notice"
      kind="success"
      dismissible
      data-arrival-notice
      @dismiss="notice = null"
    >
      {{ notice }}
    </InlineAlert>

    <DemandRecordState :loading="loading" :error="error" :not-found="notFound" @retry="load">
      <!-- Como no Órbita: no celular, uma coluna, com o painel virando `contents` para os filhos se
           ordenarem junto com a descrição. Do `lg` para cima, duas colunas, com o painel preso no topo. -->
      <div v-if="demand" class="flex flex-col gap-3 lg:grid lg:grid-cols-3 lg:items-start lg:gap-5">
        <div
          data-demand-panel
          class="contents lg:sticky lg:top-8 lg:col-start-3 lg:row-start-1 lg:flex lg:flex-col lg:gap-3"
        >
          <DemandFacts class="order-1" :demand="demand" />

          <!-- No celular, a barra de ações fica presa no rodapé da tela; no painel, é mais um bloco. -->
          <!-- Atender é de todos (ADR 0003); Editar e Excluir só aparecem para quem pode editar. -->
          <DemandActions
            class="lg:bg-surface-panel sticky bottom-0 z-10 order-3 -mx-4 border-t border-white/60 bg-white/70 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:rounded-3xl lg:border lg:p-3.5 lg:shadow-xl lg:shadow-slate-900/10 dark:border-white/10 dark:bg-white/10"
            :demand="demand"
            :can-edit="canEdit"
            @updated="demand = $event"
            @deleted="onDeleted"
            @stale="refresh"
          />
        </div>

        <div class="order-2 flex flex-col gap-3 lg:col-span-2 lg:col-start-1 lg:row-start-1">
          <DemandSection title="Descrição" data-demand-description>
            <div
              class="bg-surface-item rounded-2xl px-3.5 py-3 shadow-sm shadow-slate-900/5 dark:shadow-black/20"
            >
              <p
                class="text-sm wrap-break-word whitespace-pre-line text-slate-700 dark:text-slate-200"
              >
                {{ demand.description }}
              </p>
            </div>
          </DemandSection>

          <DemandTimeline data-demand-timeline :history="demand.history ?? []" />
        </div>
      </div>
    </DemandRecordState>
  </div>
</template>
