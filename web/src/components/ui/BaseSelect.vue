<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import AppIcon from '@/components/icons/AppIcon.vue'
import type { FieldOption } from '@/components/ui/BaseField.vue'

/**
 * O select do app, trazido do Órbita (item 0021). A lista aberta do `<select>` nativo é pintada pelo
 * sistema e não aceita estilo; esta é um cartão flutuante, com itens altos e seta que gira.
 * Diferente do Órbita: sem o `selectLayer` (aqui não há diálogo com select). Modo escuro desde o item 0032.
 *
 * Acessibilidade no padrão "select-only combobox" do WAI-ARIA: o foco fica no gatilho, e a
 * opção ativa é anunciada por `aria-activedescendant`.
 */
defineOptions({ inheritAttrs: false })

const props = defineProps<{
  /** Id do gatilho — é para ele que o `<label for>` aponta. */
  id: string
  options: FieldOption[]
  /** Primeira opção, de valor vazio, e o texto cinza do gatilho quando nada foi escolhido. */
  placeholderOption?: string
  disabled?: boolean
  required?: boolean
  invalid?: boolean
  describedby?: string
}>()

const model = defineModel<string>({ default: '' })

const listId = computed(() => `${props.id}-listbox`)

/** O marcador também se escolhe: volta o campo ao vazio. */
const choices = computed<FieldOption[]>(() =>
  props.placeholderOption
    ? [{ value: '', label: props.placeholderOption }, ...props.options]
    : props.options,
)

const selected = computed(() =>
  model.value === '' ? undefined : props.options.find((option) => option.value === model.value),
)

const open = ref(false)
/** Índice da opção ativa (a que o teclado percorre) — só vale com a lista aberta. */
const active = ref(-1)

const trigger = useTemplateRef<HTMLButtonElement>('trigger')
const panel = useTemplateRef<HTMLUListElement>('panel')

function optionId(index: number): string {
  return `${props.id}-option-${index}`
}

/**
 * Posição fixa, medida do gatilho: um painel com `overflow` cortaria a lista. A altura máxima encolhe ao espaço que sobra — no celular, com o teclado aberto, a lista
 * não sai da tela.
 */
const position = ref<Record<string, string>>({})

/** Distância entre o gatilho e a lista, e da lista à borda da tela. */
const GAP = 8
/** Teto da lista, em rem — o mesmo do `max-h-72` do Tailwind. */
const MAX_HEIGHT_REM = 18

/**
 * Onde fica a origem do `fixed` da lista. Na página é a tela (0, 0); dentro de um vidro
 * (`backdrop-filter`), ele vira o bloco de referência do `fixed`. A diferença entre onde a lista foi
 * pedida e onde ela apareceu é essa origem.
 */
function origin(): { x: number; y: number } {
  const element = panel.value
  const { left, top } = position.value
  if (!element || left === undefined || top === undefined) return { x: 0, y: 0 }

  const rect = element.getBoundingClientRect()

  return { x: rect.left - parseFloat(left), y: rect.top - parseFloat(top) }
}

/** Abaixo do gatilho; acima, se embaixo não couber a lista e em cima houver mais espaço. */
function place(): void {
  const rect = trigger.value?.getBoundingClientRect()
  if (!rect) return

  const below = window.innerHeight - rect.bottom - GAP * 2
  const above = rect.top - GAP * 2
  const natural = panel.value?.scrollHeight ?? 0
  const upward = below < natural && above > below
  const room = Math.max(upward ? above : below, 0)

  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  const height = Math.min(natural, MAX_HEIGHT_REM * rem, room)
  const top = upward ? rect.top - GAP - height : rect.bottom + GAP
  const { x, y } = origin()

  position.value = {
    left: `${rect.left - x}px`,
    top: `${top - y}px`,
    width: `${rect.width}px`,
    maxHeight: `min(${MAX_HEIGHT_REM}rem, ${room}px)`,
  }
}

async function show(): Promise<void> {
  if (props.disabled || open.value) return

  const index = choices.value.findIndex((option) => option.value === model.value)
  active.value = index >= 0 ? index : 0
  open.value = true

  place()
  await nextTick()
  // Com a lista medida (e a origem do `fixed` conhecida), decide de novo onde ela cabe.
  place()
  revealActive()
}

function hide(): void {
  open.value = false
  active.value = -1
}

function choose(index: number): void {
  const option = choices.value[index]
  if (option) model.value = option.value
  hide()
  trigger.value?.focus()
}

function move(index: number): void {
  const last = choices.value.length - 1
  active.value = Math.min(Math.max(index, 0), last)
  revealActive()
}

/** A opção ativa fica à vista quando a lista rola. */
function revealActive(): void {
  void nextTick(() => {
    panel.value
      ?.querySelector<HTMLElement>(`#${optionId(active.value)}`)
      ?.scrollIntoView?.({ block: 'nearest' })
  })
}

/** Sem acento e em minúsculas: "a" encontra "Área". */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/** O que foi digitado em sequência — "sk" vai a "Skype", como no select nativo. */
let typed = ''
let typedTimer: ReturnType<typeof setTimeout> | undefined

/**
 * A letra digitada leva à opção que começa com o que já foi digitado. A primeira letra procura
 * a partir da próxima opção (repetir "p" percorre as que começam com "p"); as seguintes
 * refinam a partir da atual.
 */
function jumpTo(letter: string): void {
  clearTimeout(typedTimer)
  typed += normalize(letter)
  typedTimer = setTimeout(() => (typed = ''), 500)

  const total = choices.value.length
  const first = typed.length === 1 ? 1 : 0
  for (let step = first; step < total + first; step++) {
    const index = (active.value + step) % total
    if (normalize(choices.value[index]!.label).startsWith(typed)) {
      move(index)
      return
    }
  }
}

async function onKeydown(event: KeyboardEvent): Promise<void> {
  if (props.disabled) return

  if (!open.value) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      await show()
    } else if (event.key.length === 1 && /\S/.test(event.key)) {
      await show()
      jumpTo(event.key)
    }
    return
  }

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      move(active.value + 1)
      break
    case 'ArrowUp':
      event.preventDefault()
      move(active.value - 1)
      break
    case 'Home':
      event.preventDefault()
      move(0)
      break
    case 'End':
      event.preventDefault()
      move(choices.value.length - 1)
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      choose(active.value)
      break
    case 'Escape':
      event.preventDefault()
      hide()
      break
    case 'Tab':
      hide()
      break
    default:
      if (event.key.length === 1 && /\S/.test(event.key)) jumpTo(event.key)
  }
}

function toggle(): void {
  if (open.value) hide()
  else void show()
}

/** A lista acompanha o gatilho quando a página rola — a rolagem da própria lista não conta. */
function onScroll(event: Event): void {
  if (panel.value?.contains(event.target as Node)) return
  place()
}

/** Clique fora do gatilho e da lista fecha, sem escolher. */
function onPointerDown(event: Event): void {
  const target = event.target as Node | null
  if (trigger.value?.contains(target) || panel.value?.contains(target)) return
  hide()
}

/** Os ouvintes de fora só existem com a lista aberta. */
function listen(on: boolean): void {
  const method = on ? 'addEventListener' : 'removeEventListener'
  document[method]('pointerdown', onPointerDown, true)
  window[method]('scroll', onScroll, true)
  window[method]('resize', place)
}

watch(open, listen)

/**
 * Opções trocadas com a lista aberta: a ativa volta à escolhida, ou à primeira — nunca a um índice
 * que não existe mais.
 */
watch(choices, (next) => {
  if (!open.value) return

  const index = next.findIndex((option) => option.value === model.value)
  active.value = index >= 0 ? index : 0
})

// Desmontar com a lista aberta: o `watch` já não roda, então os ouvintes saem aqui, na hora.
onBeforeUnmount(() => {
  if (open.value) listen(false)
  clearTimeout(typedTimer)
})

const CHOICE_CLASS = 'cursor-pointer px-4 py-3 text-sm transition-colors'
</script>

<template>
  <button
    :id="id"
    ref="trigger"
    type="button"
    role="combobox"
    aria-haspopup="listbox"
    :aria-expanded="open ? 'true' : 'false'"
    :aria-controls="listId"
    :aria-activedescendant="open && active >= 0 ? optionId(active) : undefined"
    :aria-required="required ? 'true' : undefined"
    :aria-invalid="invalid ? 'true' : undefined"
    :aria-describedby="describedby"
    :data-value="model"
    :disabled="disabled"
    v-bind="$attrs"
    class="flex items-center justify-between gap-2 text-left"
    @click="toggle"
    @keydown="onKeydown"
  >
    <!-- Quem desenha o gatilho de outro jeito usa o slot. -->
    <slot :selected="selected" :placeholder="placeholderOption ?? ''">
      <span v-if="selected" class="truncate">{{ selected.label }}</span>
      <span v-else data-select-placeholder class="truncate text-slate-400 dark:text-slate-500">
        {{ placeholderOption ?? '' }}
      </span>
    </slot>
    <AppIcon
      name="chevron-down"
      class="text-silk-indigo dark:text-dusk-300 size-4 shrink-0 transition-transform duration-200"
      :class="{ 'rotate-180': open }"
    />
  </button>

  <Teleport to="body">
    <ul
      v-if="open"
      :id="listId"
      ref="panel"
      role="listbox"
      tabindex="-1"
      :style="position"
      class="shadow-dusk-500/25 fixed z-60 overflow-y-auto rounded-2xl border border-white/70 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-ink-950/95 dark:shadow-black/40"
    >
      <!-- `mousedown.prevent`: o foco não sai do gatilho, que é quem fala com o leitor de tela. -->
      <li
        v-for="(option, index) in choices"
        :id="optionId(index)"
        :key="option.value"
        role="option"
        :aria-selected="option.value === model ? 'true' : 'false'"
        :data-value="option.value"
        :class="[
          CHOICE_CLASS,
          option.value === model && 'font-medium',
          index === active
            ? 'bg-dusk-50 text-slate-900 dark:bg-white/10 dark:text-white'
            : option.value === model
              ? 'text-dusk-700 dark:text-dusk-300'
              : option.value === ''
                ? 'text-slate-500 dark:text-slate-400'
                : 'text-slate-700 dark:text-slate-200',
        ]"
        @mousedown.prevent
        @mousemove="active = index"
        @click="choose(index)"
      >
        {{ option.label }}
      </li>
    </ul>
  </Teleport>
</template>
