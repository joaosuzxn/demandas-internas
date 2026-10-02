<template>
  <div
    class="auth-background relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10"
  >
    <div class="relative z-10 w-full max-w-sm">
      <slot />
    </div>
  </div>
</template>

<style scoped>
/* Fundo: a foto src/assets/bg.jpg. Para trocar a foto, substitua esse arquivo (ou mude esta linha). */
.auth-background {
  background: #000 url('@/assets/bg.jpg') center / cover no-repeat;
}
</style>
