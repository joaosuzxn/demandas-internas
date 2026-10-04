<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { isAxiosError } from 'axios'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import UserAccessPanel from '@/components/admin/UserAccessPanel.vue'
import UserForm from '@/components/admin/UserForm.vue'
import BackLink from '@/components/ui/BackLink.vue'
import GlassPanel from '@/components/ui/GlassPanel.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import { adminUsersRoute } from '@/composables/adminUsersQuery'
import { parseApiError } from '@/services/apiErrors'
import type { User } from '@/services/auth'
import { getUser } from '@/services/users'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const id = computed(() => Number(route.params.id))
const user = ref<User | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const notFound = ref(false)

async function load(): Promise<void> {
  // Só a resposta do usuário que ainda é o da tela vale: trocar o id no meio do pedido descarta o antigo.
  const requested = id.value
  loading.value = true
  error.value = null
  notFound.value = false

  try {
    const loaded = await getUser(requested)
    if (requested !== id.value) return
    user.value = loaded
  } catch (caught) {
    if (requested !== id.value) return
    user.value = null
    if (isAxiosError(caught) && caught.response?.status === 404) notFound.value = true
    else error.value = parseApiError(caught).message
  } finally {
    if (requested === id.value) loading.value = false
  }
}

watch(id, load, { immediate: true })

const isSelf = computed(() => user.value !== null && auth.user?.id === user.value.id)

/** O painel de acesso devolveu o usuário: só vale se ainda é o da tela. */
function onAccessUpdated(updated: User): void {
  if (updated.id === id.value) user.value = updated
}

/** Salvou: volta à lista com o aviso no estado da navegação. */
function onSaved(): void {
  void router.push({ ...adminUsersRoute(), state: { notice: 'Usuário atualizado.' } })
}
</script>

<template>
  <div class="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">
    <PageHeader title="Editar usuário" subtitle="A alteração vale a partir do próximo acesso.">
      <template #media>
        <BackLink :to="adminUsersRoute()" label="a administração" />
      </template>
    </PageHeader>

    <!-- O 404 não usa o `error` do painel, que sempre oferece "Tentar de novo". -->
    <GlassPanel title="Dados do usuário" :loading="loading" :error="error" @retry="load">
      <div v-if="notFound" class="flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-300">
        <p>Usuário não encontrado.</p>
        <RouterLink
          :to="adminUsersRoute()"
          class="text-brand-600 self-start rounded-md px-1 font-semibold dark:text-brand-300"
        >
          Voltar à administração
        </RouterLink>
      </div>

      <!-- A chave refaz o formulário quando o id troca sem a view remontar. -->
      <UserForm
        v-else-if="user"
        :key="user.id"
        :editing="user"
        :cancel-to="adminUsersRoute()"
        submit-label="Salvar alterações"
        @saved="onSaved"
      />
    </GlassPanel>

    <UserAccessPanel
      v-if="user"
      :key="user.id"
      :user="user"
      :is-self="isSelf"
      @updated="onAccessUpdated"
    />
  </div>
</template>
