<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import DemandForm from '@/components/demands/DemandForm.vue'
import DemandRecordState from '@/components/demands/DemandRecordState.vue'
import BackLink from '@/components/ui/BackLink.vue'
import GlassPanel from '@/components/ui/GlassPanel.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import { useDemandRecord } from '@/composables/useDemandRecord'

const route = useRoute()
const router = useRouter()

const id = computed(() => Number(route.params.id))
const { demand, loading, error, notFound, canManage, load } = useDemandRecord(id)

const demandRoute = computed(() => ({ name: 'demand', params: { id: id.value } }))

/**
 * Por que o formulário não abre: a API recusaria (403 para quem não é dono nem admin, 422 para a que
 * não está pendente). `null` quando pode editar.
 */
const blockedReason = computed(() => {
  if (!demand.value) return null
  if (!canManage.value) return 'Só quem pediu a demanda ou o administrador pode editá-la.'
  if (demand.value.status !== 'pending') return 'Só demanda pendente pode ser editada.'
  return null
})

/** Salva: volta à demanda com o aviso no estado da navegação, para o F5 não repeti-lo. */
function onSaved(): void {
  void router.push({ ...demandRoute.value, state: { notice: 'Demanda atualizada.' } })
}
</script>

<template>
  <div class="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">
    <PageHeader
      title="Editar demanda"
      subtitle="A alteração vale na hora, para todos que veem o quadro."
    >
      <template #media>
        <BackLink :to="demandRoute" label="a demanda" />
      </template>
    </PageHeader>

    <DemandRecordState :loading="loading" :error="error" :not-found="notFound" @retry="load">
      <GlassPanel v-if="demand" title="Dados da demanda">
        <div v-if="blockedReason" class="flex flex-col gap-2 text-sm text-slate-600">
          <p>{{ blockedReason }}</p>
          <RouterLink
            :to="demandRoute"
            class="text-brand-600 self-start rounded-md px-1 font-semibold"
          >
            Voltar à demanda
          </RouterLink>
        </div>

        <!-- A chave refaz o formulário quando o id troca sem a view remontar. -->
        <DemandForm
          v-else
          :key="demand.id"
          :editing="demand"
          :cancel-to="demandRoute"
          submit-label="Salvar alterações"
          @saved="onSaved"
        />
      </GlassPanel>
    </DemandRecordState>
  </div>
</template>
