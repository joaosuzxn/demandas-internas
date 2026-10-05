/*
 * Contas puras do dashboard (item 0030), trazidas do Órbita: o recorte de tempo, a URL e a geometria do
 * gráfico. Nada aqui sabe de Vue nem de API.
 */
import { EARLIEST_DAY, isDate } from '@/utils/dates'
import { single } from '@/utils/query'
import type { DashboardGranularity } from '@/services/dashboard'
import { DEMAND_CATEGORY_LABELS, type DemandCategory } from '@/services/demands'

/** Intervalos do filtro. `all` não manda datas (o total geral); `custom` abre as duas datas. */
export const DASHBOARD_RANGES = ['all', 'week', 'month', 'quarter', 'year', 'custom'] as const

export type DashboardRange = (typeof DASHBOARD_RANGES)[number]

/** Intervalos prontos: os que se resolvem sozinhos a partir de hoje. */
export type DashboardPresetRange = Exclude<DashboardRange, 'all' | 'custom'>

/** Rótulos em português — ponto único, nunca repetidos por tela. */
export const DASHBOARD_RANGE_LABELS: Record<DashboardRange, string> = {
  all: 'Tudo',
  week: '1 semana',
  month: '1 mês',
  quarter: '3 meses',
  year: '1 ano',
  custom: 'Personalizado',
}

/** Recorte de tempo; as duas pontas em `YYYY-MM-DD`. */
export type DashboardPeriod = { start: string; end: string }

/** O que a URL do dashboard guarda (`/dashboard?range=custom&category=hr&created_from=…`). */
export type DashboardQueryState = {
  range: DashboardRange
  category: DemandCategory | ''
  customStart: string
  customEnd: string
}

/** Quanto cada intervalo pronto recua: 1 semana é hoje e os 6 dias anteriores. */
const PRESET_OFFSET: Record<DashboardPresetRange, { months?: number; days?: number }> = {
  week: { days: 6 },
  month: { months: 1 },
  quarter: { months: 3 },
  year: { months: 12 },
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

const MONTH_NAMES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

/** Data local em `YYYY-MM-DD`. */
export function toIsoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}

/** `YYYY-MM-DD` vira `Date` na meia-noite local; nulo quando o texto não é uma data. */
function parseIsoDay(day: string): Date | null {
  const [year, month, date] = day.split('-').map(Number)
  if (!year || !month || !date) return null

  const parsed = new Date(year, month - 1, date)

  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Recua meses de calendário encostando o dia no último do mês de destino: 31/03 menos um
 * mês é 28/02, não 03/03, que é para onde o `setMonth` do JavaScript escorregaria.
 */
function shiftMonths(date: Date, months: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(date.getDate(), lastDay))

  return target
}

/** Período de um intervalo pronto: termina hoje e começa o tanto que o intervalo recua. */
export function resolvePresetPeriod(
  range: DashboardPresetRange,
  today: Date = new Date(),
): DashboardPeriod {
  const offset = PRESET_OFFSET[range]
  const start = offset.months
    ? shiftMonths(today, -offset.months)
    : new Date(today.getFullYear(), today.getMonth(), today.getDate() - (offset.days ?? 0))

  return { start: toIsoDay(start), end: toIsoDay(today) }
}

/**
 * Confere o período digitado à mão e devolve a mensagem a exibir, ou `null` quando está de pé.
 * Validação de conveniência: quem recusa de verdade é a API.
 */
export function validateCustomPeriod(
  start: string,
  end: string,
  today: Date = new Date(),
): string | null {
  const from = parseIsoDay(start)
  const to = parseIsoDay(end)

  if (!from || !to) return 'Informe as duas datas do período.'
  // Comparação como texto: o `Date` do JavaScript leria o ano 0002 como 1902.
  if (start < EARLIEST_DAY || end < EARLIEST_DAY) return 'Use datas a partir de 01/01/2000.'
  if (to < from) return 'A data final não pode ser anterior à inicial.'
  if (toIsoDay(to) > toIsoDay(today)) return 'A data final não pode ser posterior a hoje.'

  return null
}

/** `2026-10-04` → `04/10/2026`. */
export function formatIsoDay(day: string): string {
  const [year, month, date] = day.split('-')
  return `${date}/${month}/${year}`
}

/** O período como a tela o anuncia; sem período ("Tudo"), desde o início. */
export function describePeriod(period: DashboardPeriod | null): string {
  return period ? `${formatIsoDay(period.start)} – ${formatIsoDay(period.end)}` : 'Desde o início'
}

/** Valor inválido na URL é ignorado em silêncio: a tela abre como se ele não existisse. */
export function parseDashboardQuery(query: Record<string, unknown>): DashboardQueryState {
  const range = single(query.range) ?? ''
  const category = single(query.category) ?? ''
  const validRange = (DASHBOARD_RANGES as readonly string[]).includes(range)
    ? (range as DashboardRange)
    : 'all'
  const custom = validRange === 'custom'
  const from = single(query.created_from) ?? ''
  const to = single(query.created_to) ?? ''

  return {
    range: validRange,
    category: Object.prototype.hasOwnProperty.call(DEMAND_CATEGORY_LABELS, category)
      ? (category as DemandCategory)
      : '',
    customStart: custom && isDate(from) ? from : '',
    customEnd: custom && isDate(to) ? to : '',
  }
}

/** A query da URL: só o que foge do padrão; as datas, só no personalizado. */
export function toDashboardQuery(state: DashboardQueryState): Record<string, string> {
  const query: Record<string, string> = {}
  if (state.range !== 'all') query.range = state.range
  if (state.category) query.category = state.category
  if (state.range === 'custom') {
    if (state.customStart) query.created_from = state.customStart
    if (state.customEnd) query.created_to = state.customEnd
  }
  return query
}

/** Rótulo do eixo: `dd/mm` por dia, `mmm/aa` por mês. */
export function formatAxisLabel(date: string, granularity: DashboardGranularity): string {
  const [year, month, day] = date.split('-')
  return granularity === 'day' ? `${day}/${month}` : `${MONTHS[Number(month) - 1]}/${year?.slice(2)}`
}

/** O ponto por extenso, para o leitor de tela. */
export function formatPointLabel(date: string, granularity: DashboardGranularity): string {
  const [year, month] = date.split('-')
  return granularity === 'day' ? formatIsoDay(date) : `${MONTH_NAMES[Number(month) - 1]} de ${year}`
}

export interface SeriesPoint {
  x: number
  y: number
}

export interface SeriesPath {
  points: SeriesPoint[]
  /** Traço da série, para o `d` do `<path>`. */
  line: string
  /** O mesmo traço fechado no rodapé, para o preenchimento embaixo da linha. */
  area: string
}

export interface SeriesOptions {
  width: number
  height: number
  /** Folga em cima e embaixo, para o traço não ser cortado nos extremos. */
  padding?: number
  /** Escala comum, quando duas séries dividem o mesmo eixo e precisam ser comparáveis. */
  domain?: { min: number; max: number }
}

/**
 * Espalha a série pela largura do gráfico e inverte o eixo vertical (no SVG o zero é em
 * cima).
 *
 * Série achatada (todos os valores iguais, ou escala sem amplitude) vira uma reta no
 * meio: o divisor seria zero, e grudar a linha no topo ou no rodapé sugeriria um pico que
 * não existe.
 */
export function buildSeriesPath(values: number[], options: SeriesOptions): SeriesPath {
  if (values.length === 0) return { points: [], line: '', area: '' }

  const { width, height, padding = 0, domain } = options
  const highest = domain ? domain.max : Math.max(...values)
  const lowest = domain ? domain.min : Math.min(...values)
  const span = highest - lowest
  const usable = height - padding * 2

  const points = values.map((value, index) => ({
    x: values.length === 1 ? width / 2 : (index / (values.length - 1)) * width,
    y: padding + (span === 0 ? usable / 2 : (1 - (value - lowest) / span) * usable),
  }))

  const line = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x},${point.y}`)
    .join(' ')

  const first = points[0] as SeriesPoint
  const last = points[points.length - 1] as SeriesPoint

  return { points, line, area: `${line} L ${last.x},${height} L ${first.x},${height} Z` }
}

/**
 * Índices dos pontos que ganham rótulo no eixo. Espalhados por igual e sempre fechando no
 * último: sem isso a série terminaria sem dizer em que data parou.
 */
export function pickAxisTicks(total: number, count: number): number[] {
  if (total <= 0) return []
  if (total <= count) return Array.from({ length: total }, (_, index) => index)

  const step = (total - 1) / (count - 1)

  return Array.from({ length: count }, (_, index) => Math.round(index * step))
}

/** Fatia do valor sobre o maior da lista, em porcentagem inteira, para a largura da barra. */
export function toPercentage(value: number, max: number): number {
  if (max <= 0) return 0

  return Math.round((value / max) * 100)
}
