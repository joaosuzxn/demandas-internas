<script setup lang="ts">
import { useRouter } from 'vue-router'
import DemandForm from '@/components/demands/DemandForm.vue'
import BackLink from '@/components/ui/BackLink.vue'
import GlassPanel from '@/components/ui/GlassPanel.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import { demandsBoardRoute } from '@/composables/demandsBoardQuery'
import type { Demand } from '@/services/demands'

const router = useRouter()
// O quadro com os filtros da última visita (lidos ao abrir a tela).
const boardRoute = demandsBoardRoute()

/** Criada: abre a tela da solicitação, como no Órbita. O aviso vai no estado da navegação, para o F5 não repeti-lo. */
function onSaved(demand: Demand): void {
  void router.push({
    name: 'demand',
    params: { id: demand.id },
    state: { notice: 'Solicitação criada.' },
  })
}
</script>

<template>
  <div class="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">
    <PageHeader title="Nova solicitação" subtitle="O que precisa ser feito e por qual área.">
      <template #media>
        <BackLink :to="boardRoute" label="Solicitações" />
      </template>
    </PageHeader>

    <GlassPanel title="Dados da solicitação">
      <DemandForm :cancel-to="boardRoute" submit-label="Criar solicitação" @saved="onSaved" />
    </GlassPanel>
  </div>
</template>
