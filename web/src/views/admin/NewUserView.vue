<script setup lang="ts">
import { useRouter } from 'vue-router'
import UserForm from '@/components/admin/UserForm.vue'
import BackLink from '@/components/ui/BackLink.vue'
import GlassPanel from '@/components/ui/GlassPanel.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import { adminUsersRoute } from '@/composables/adminUsersQuery'

const router = useRouter()

/** Cadastrou: volta à lista com o aviso no estado da navegação, para o F5 não repeti-lo. */
function onSaved(): void {
  void router.push({ ...adminUsersRoute(), state: { notice: 'Usuário cadastrado.' } })
}
</script>

<template>
  <div class="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">
    <PageHeader title="Novo usuário" subtitle="Quem for cadastrado entra como colaborador.">
      <template #media>
        <BackLink :to="adminUsersRoute()" label="a administração" />
      </template>
    </PageHeader>

    <GlassPanel title="Dados do usuário">
      <UserForm :cancel-to="adminUsersRoute()" submit-label="Cadastrar usuário" @saved="onSaved" />
    </GlassPanel>
  </div>
</template>
