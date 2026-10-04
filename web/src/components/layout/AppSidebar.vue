<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/icons/AppIcon.vue'
import { SIDEBAR_ITEMS } from './sidebarItems'

defineProps<{
  /** Nome da rota aberta; o item dela ganha o destaque. */
  activeRouteName: string | null
  /** Tema escuro em vigor: o botão de tema oferece o claro (item 0032). */
  isDark: boolean
}>()

const emit = defineEmits<{
  /** Um item foi clicado; a navegação em si fica com o link. */
  navigate: []
  logout: []
  'toggle-theme': []
  /** Fechar o drawer (só existe no mobile). */
  close: []
}>()

const ITEM =
  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors'
const ITEM_IDLE =
  'text-slate-700 hover:bg-white/30 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
const ITEM_ACTIVE =
  'bg-sidebar-active text-white shadow-md shadow-slate-950/20 dark:bg-white dark:text-slate-950'
</script>

<template>
  <!-- Glassmorphism: translúcida + desfoque do que está atrás, com borda clara de "vidro". -->
  <aside
    class="bg-surface-panel flex flex-col rounded-3xl border border-white/60 px-4 py-6 shadow-xl shadow-slate-900/10 backdrop-blur-lg backdrop-saturate-150 dark:border-white/10 dark:shadow-black/40"
    aria-label="Barra lateral"
  >
    <div class="flex items-center justify-between gap-2 px-2">
      <span class="text-base font-semibold text-slate-900 dark:text-white">Demandas Internas</span>

      <button
        type="button"
        class="rounded-lg p-1.5 text-slate-500 hover:bg-white/60 hover:text-slate-950 lg:hidden dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
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

    <div class="mt-6 flex flex-col gap-1 border-t border-slate-900/5 pt-4 dark:border-white/10">
      <!-- Tema da interface (item 0032): o rótulo diz para onde o clique leva, como no Órbita. -->
      <button
        type="button"
        :class="[ITEM, ITEM_IDLE]"
        :aria-pressed="isDark"
        @click="emit('toggle-theme')"
      >
        <AppIcon :name="isDark ? 'sun' : 'moon'" class="size-5 shrink-0" />
        {{ isDark ? 'Modo claro' : 'Modo escuro' }}
      </button>

      <button type="button" :class="[ITEM, ITEM_IDLE]" @click="emit('logout')">
        <AppIcon name="log-out" class="size-5 shrink-0" />
        Sair
      </button>
    </div>
  </aside>
</template>
