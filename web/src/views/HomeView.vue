<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { isAxiosError } from 'axios'
import { getHealth } from '@/services/health'
import { useAuthStore } from '@/stores/auth'

type Estado = 'carregando' | 'ok' | 'banco-indisponivel' | 'api-indisponivel'

const titulo = import.meta.env.VITE_APP_TITLE ?? 'Demandas Internas'
const estado = ref<Estado>('carregando')
const auth = useAuthStore()
const router = useRouter()

onMounted(async () => {
  try {
    await getHealth()
    estado.value = 'ok'
  } catch (erro) {
    estado.value =
      isAxiosError(erro) && erro.response?.status === 503 ? 'banco-indisponivel' : 'api-indisponivel'
  }
})

async function signOut() {
  await auth.logout()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <main class="mx-auto max-w-xl p-8">
    <h1 class="text-2xl font-semibold">{{ titulo }}</h1>

    <p v-if="estado === 'carregando'" data-testid="estado" class="mt-4 text-gray-500">
      Verificando a API…
    </p>
    <ul v-else-if="estado === 'ok'" data-testid="estado" class="mt-4 space-y-1 text-green-700">
      <li>API ok</li>
      <li>Banco ok</li>
    </ul>
    <p v-else-if="estado === 'banco-indisponivel'" data-testid="estado" role="alert" class="mt-4 text-red-700">
      Banco indisponível
    </p>
    <p v-else data-testid="estado" role="alert" class="mt-4 text-red-700">
      Não foi possível falar com a API
    </p>

    <button
      type="button"
      data-testid="logout"
      class="mt-6 rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100"
      @click="signOut"
    >
      Sair
    </button>
  </main>
</template>
