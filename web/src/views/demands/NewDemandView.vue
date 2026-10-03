<script setup lang="ts">
import { useRouter } from 'vue-router'
import DemandForm from '@/components/demands/DemandForm.vue'
import BackLink from '@/components/ui/BackLink.vue'
import GlassPanel from '@/components/ui/GlassPanel.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import type { Demand } from '@/services/demands'

const router = useRouter()

/** Criada: abre a tela da demanda, como no Órbita. O aviso vai no estado da navegação, para o F5 não repeti-lo. */
function onSaved(demand: Demand): void {
  void router.push({
    name: 'demand',
    params: { id: demand.id },
    state: { notice: 'Demanda criada.' },
  })
}
</script>

<template>
  <div class="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">
    <PageHeader title="Nova demanda" subtitle="O que precisa ser feito e por qual área.">
      <template #media>
        <BackLink :to="{ name: 'demands' }" label="Demandas" />
      </template>
    </PageHeader>

    <GlassPanel title="Dados da demanda">
      <DemandForm :cancel-to="{ name: 'demands' }" submit-label="Criar demanda" @saved="onSaved" />
    </GlassPanel>
  </div>
</template>
