<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/icons/AppIcon.vue'
import { SIDEBAR_ITEMS } from './sidebarItems'

defineProps<{
  /** Nome da rota aberta; o item dela ganha o destaque. */
  activeRouteName: string | null
}>()

const emit = defineEmits<{
  /** Um item foi clicado; a navegação em si fica com o link. */
  navigate: []
  logout: []
  /** Fechar o drawer (só existe no mobile). */
  close: []
}>()

const ITEM =
  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors'
const ITEM_IDLE = 'text-slate-700 hover:bg-white/30 hover:text-slate-950'
const ITEM_ACTIVE = 'bg-sidebar-active text-white shadow-md shadow-slate-950/20'
</script>

<template>
  <!-- Glassmorphism: translúcida + desfoque do que está atrás, com borda clara de "vidro". -->
  <aside
    class="bg-surface-panel flex flex-col rounded-3xl border border-white/60 px-4 py-6 shadow-xl shadow-slate-900/10 backdrop-blur-lg backdrop-saturate-150"
    aria-label="Barra lateral"
  >
    <div class="flex items-center justify-between gap-2 px-2">
      <span class="text-base font-semibold text-slate-900">Demandas Internas</span>

      <button
        type="button"
        class="rounded-lg p-1.5 text-slate-500 hover:bg-white/60 hover:text-slate-950 lg:hidden"
        aria-label="Fechar menu"
        @click="emit('close')"
      >
        <AppIcon name="x" class="size-5" />
      </button>
    </div>

    <nav class="mt-10 flex-1 overflow-y-auto" aria-label="Menu principal">
      <ul class="flex flex-col gap-1">
        <li v-for="item in SIDEBAR_ITEMS" :key="item.routeName">
          <RouterLink
            :to="{ name: item.routeName }"
            :class="[ITEM, item.routeName === activeRouteName ? ITEM_ACTIVE : ITEM_IDLE]"
            :aria-current="item.routeName === activeRouteName ? 'page' : undefined"
            @click="emit('navigate')"
          >
            <AppIcon :name="item.icon" class="size-5 shrink-0" />
            {{ item.label }}
          </RouterLink>
        </li>
      </ul>
    </nav>

    <div class="mt-6 flex flex-col gap-1 border-t border-slate-900/5 pt-4">
      <!-- Meu perfil ainda não tem tela: o botão já fica no lugar, como o de Configurações do Órbita. -->
      <button type="button" :class="[ITEM, ITEM_IDLE]">
        <AppIcon name="user" class="size-5 shrink-0" />
        Meu perfil
      </button>

      <button type="button" :class="[ITEM, ITEM_IDLE]" @click="emit('logout')">
        <AppIcon name="log-out" class="size-5 shrink-0" />
        Sair
      </button>
    </div>
  </aside>
</template>
