<script setup lang="ts">
import { useId } from 'vue'

// A logo aparece duas vezes na tela (sidebar e barra do mobile): o degradê precisa de id próprio.
const gradientId = `app-logo-gradient-${useId()}`
</script>

<template>
  <!-- Logo (item 0036): setas opostas = pedido que vai de um setor e volta atendido (o check). -->
  <span class="flex items-center gap-2.5" data-testid="app-logo">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      class="size-8 shrink-0 drop-shadow-sm"
      aria-hidden="true"
    >
      <defs>
        <linearGradient :id="gradientId" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="var(--color-silk-indigo)" />
          <stop offset="1" stop-color="var(--color-brand-500)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" :fill="`url(#${gradientId})`" />
      <g
        fill="none"
        stroke="white"
        stroke-width="2.4"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <!-- Ida: o pedido sai para o outro setor. -->
        <path d="M8.5 11h14M18.5 7l4 4-4 4" />
        <!-- Volta: o pedido retorna e termina atendido. -->
        <path d="M23.5 21.5H18.5" stroke-opacity="0.75" />
        <path d="M8 21.5l2.5 2.5 4.5-5" />
      </g>
    </svg>

    <span class="flex flex-col leading-tight">
      <span class="text-base font-semibold text-slate-900 dark:text-white">Solicitações</span>
      <span class="text-xs font-medium text-slate-500 dark:text-slate-400">&#32;internas</span>
    </span>
  </span>
</template>
