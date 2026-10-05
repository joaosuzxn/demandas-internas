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
const { demand, loading, error, notFound, canEdit, load } = useDemandRecord(id)

const demandRoute = computed(() => ({ name: 'demand', params: { id: id.value } }))

/**
 * Por que o formulário não abre: a API recusaria (403 para quem não é dono nem admin, 422 para a que
 * não está pendente). `null` quando pode editar.
 */
const blockedReason = computed(() => {
  if (!demand.value) return null
  if (!canEdit.value) return 'Só quem pediu a solicitação ou o administrador pode editá-la.'
  if (demand.value.status !== 'pending') return 'Só solicitação pendente pode ser editada.'
  return null
})

/** Salva: volta à solicitação com o aviso no estado da navegação, para o F5 não repeti-lo. */
function onSaved(): void {
  void router.push({ ...demandRoute.value, state: { notice: 'Solicitação atualizada.' } })
}
</script>

<template>
  <div class="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">
    <PageHeader
      title="Editar solicitação"
      subtitle="A alteração vale na hora, para todos que veem o quadro."
    >
      <template #media>
        <BackLink :to="demandRoute" label="a solicitação" />
      </template>
    </PageHeader>

    <DemandRecordState :loading="loading" :error="error" :not-found="notFound" @retry="load">
      <GlassPanel v-if="demand" title="Dados da solicitação">
        <div v-if="blockedReason" class="flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-300">
          <p>{{ blockedReason }}</p>
          <RouterLink
            :to="demandRoute"
            class="text-brand-600 self-start rounded-md px-1 font-semibold dark:text-brand-300"
          >
            Voltar à solicitação
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
