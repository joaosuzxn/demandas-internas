<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/icons/AppIcon.vue'
import AppLogo from '@/components/layout/AppLogo.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const auth = useAuthStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()

const sidebarId = useId()
// O destaque vem da rota aberta, não do último clique: vale também para voltar no navegador.
// Tela fora do menu (a de uma solicitação) diz pelo `meta.sidebarItem` qual item segue destacado.
const activeRouteName = computed(
  () => route.meta.sidebarItem ?? (route.name ? String(route.name) : null),
)
/** Drawer do mobile; do `lg` para cima a sidebar fica sempre à vista. */
const isSidebarOpen = ref(false)

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') isSidebarOpen.value = false
}

async function logout(): Promise<void> {
  await auth.logout()
  await router.replace({ name: 'login' })
}

// O tema escuro só vale enquanto este layout (as telas com sidebar) está montado: o login fica sempre claro.
onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  ui.enterThemedScreen()
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  ui.leaveThemedScreen()
})
</script>

<template>
  <!-- `isolate`: mantém o conteúdo de vidro acima do fundo, sem o `body` engolir o efeito. -->
  <div class="bg-surface-page isolate min-h-svh text-slate-800 dark:text-slate-100">
    <!-- Barra do mobile: a sidebar fica guardada atrás do botão. -->
    <header
      class="sticky top-0 z-20 flex items-center gap-3 border-b border-white/60 bg-white/60 px-4 py-3 backdrop-blur-xl lg:hidden dark:border-white/5 dark:bg-ink-950/60"
    >
      <button
        type="button"
        class="rounded-lg p-1.5 text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/10"
        aria-label="Abrir menu"
        :aria-expanded="isSidebarOpen"
        :aria-controls="sidebarId"
        @click="isSidebarOpen = true"
      >
        <AppIcon name="menu" class="size-6" />
      </button>

      <AppLogo />
    </header>

    <!-- Fundo escurecido do drawer: clicar fora fecha. -->
    <div
      v-if="isSidebarOpen"
      class="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
      aria-hidden="true"
      @click="isSidebarOpen = false"
    ></div>

    <!-- Card flutuante. Fechado no mobile, fica invisível além de fora da tela: o Tab não cai nele. -->
    <AppSidebar
      :id="sidebarId"
      class="fixed inset-y-4 left-4 z-40 w-64 transition-all duration-300 motion-reduce:transition-none lg:visible lg:translate-x-0 lg:opacity-100"
      :class="isSidebarOpen ? 'translate-x-0' : 'invisible -translate-x-full opacity-0'"
      :active-route-name="activeRouteName"
      :is-dark="ui.isDark"
      :is-admin="auth.isAdmin"
      @toggle-theme="ui.toggleTheme"
      @navigate="isSidebarOpen = false"
      @logout="logout"
      @close="isSidebarOpen = false"
    />

    <!-- Recuo = largura do card + as duas margens de 1rem em volta dele. -->
    <main class="lg:pl-72">
      <RouterView />
    </main>
  </div>
</template>
