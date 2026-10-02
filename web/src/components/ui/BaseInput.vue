<script setup lang="ts">
import { computed, onMounted, ref, useId, useTemplateRef, watch } from 'vue'

const props = defineProps<{
  /** Rótulo exibido acima do campo. */
  label: string
  type?: 'text' | 'email' | 'password'
  name?: string
  placeholder?: string
  autocomplete?: string
  /** Mensagem de erro exibida na linha do rótulo; deixa a borda vermelha. */
  error?: string
  /** Borda vermelha sem mensagem própria (a mensagem está em outro campo). */
  invalid?: boolean
  /** Cada mudança deste valor chacoalha o campo, se ele estiver com erro. */
  shakeKey?: number
  /** Campo só de leitura (ex.: o usuário de quem está trocando a senha). */
  disabled?: boolean
  /** Recebe o foco ao aparecer. */
  autofocus?: boolean
}>()

const model = defineModel<string>({ default: '' })

// Liga <label> e <input> sem exigir um id manual em cada uso.
const inputId = useId()
const errorId = `${inputId}-error`

const isInvalid = computed(() => Boolean(props.error) || props.invalid === true)

// A classe sai no fim da animação para que o próximo erro chacoalhe de novo.
const isShaking = ref(false)

watch(
  () => props.shakeKey,
  () => {
    if (isInvalid.value) isShaking.value = true
  },
)

const field = useTemplateRef<HTMLInputElement>('field')

onMounted(() => {
  if (props.autofocus) field.value?.focus()
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <!-- Erro na mesma linha do rótulo, à direita. O rótulo nunca quebra nem encolhe; a mensagem
         longa (as da API costumam ser) quebra em mais linhas em vez de ser cortada. -->
    <div class="flex items-baseline justify-between gap-3">
      <label
        :for="inputId"
        class="shrink-0 text-xs font-light tracking-wide whitespace-nowrap text-white/60"
      >
        {{ label }}
      </label>

      <p
        v-if="error"
        :id="errorId"
        class="min-w-0 text-right text-xs font-light text-balance text-red-300"
        role="alert"
      >
        {{ error }}
      </p>
    </div>

    <div
      class="relative"
      :class="{ 'animate-shake motion-reduce:animate-none': isShaking }"
      @animationend="isShaking = false"
    >
      <input
        :id="inputId"
        ref="field"
        v-model="model"
        :type="type ?? 'text'"
        :name="name"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :disabled="disabled"
        :aria-invalid="isInvalid ? 'true' : undefined"
        :aria-describedby="error ? errorId : undefined"
        class="w-full rounded-full border bg-white/5 py-3.5 pl-6 text-base font-light text-white transition placeholder:text-white/40 focus:bg-white/10 focus-visible:outline-none disabled:cursor-not-allowed disabled:text-white/60"
        :class="[
          $slots.trailing ? 'pr-14' : 'pr-6',
          isInvalid
            ? 'border-red-400 focus:border-red-400'
            : 'focus:border-brand-300/70 border-white/20 enabled:hover:border-white/35',
        ]"
      />

      <!-- Ação opcional dentro do campo (ex.: mostrar/ocultar senha). -->
      <div v-if="$slots.trailing" class="absolute inset-y-0 right-2 flex items-center">
        <slot name="trailing" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* O preenchimento automático do navegador pinta o campo de claro e quebraria o vidro. */
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus {
  -webkit-text-fill-color: #fff;
  caret-color: #fff;
  transition: background-color 9999s ease-out 0s;
}
</style>
