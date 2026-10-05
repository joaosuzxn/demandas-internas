import { describe, it, expect } from 'vitest'
import {
  buildSeriesPath,
  describePeriod,
  formatAxisLabel,
  formatIsoDay,
  formatPointLabel,
  parseDashboardQuery,
  pickAxisTicks,
  resolvePresetPeriod,
  toDashboardQuery,
  toPercentage,
  validateCustomPeriod,
} from '../dashboard'

const TODAY = new Date(2026, 9, 4) // 04/10/2026, hora local

describe('utils do dashboard', () => {
  it('resolve os intervalos prontos terminando hoje', () => {
    expect(resolvePresetPeriod('week', TODAY)).toEqual({ start: '2026-09-28', end: '2026-10-04' })
    expect(resolvePresetPeriod('month', TODAY)).toEqual({ start: '2026-09-04', end: '2026-10-04' })
    expect(resolvePresetPeriod('quarter', TODAY)).toEqual({ start: '2026-07-04', end: '2026-10-04' })
    expect(resolvePresetPeriod('year', TODAY)).toEqual({ start: '2025-10-04', end: '2026-10-04' })
    // 31/03 menos um mês encosta no último dia de fevereiro.
    expect(resolvePresetPeriod('month', new Date(2026, 2, 31)).start).toBe('2026-02-28')
  })

  it('valida o período personalizado', () => {
    expect(validateCustomPeriod('', '2026-10-01', TODAY)).toBe('Informe as duas datas do período.')
    expect(validateCustomPeriod('2026-10-03', '2026-10-01', TODAY)).toBe(
      'A data final não pode ser anterior à inicial.',
    )
    expect(validateCustomPeriod('2026-10-01', '2026-10-05', TODAY)).toBe(
      'A data final não pode ser posterior a hoje.',
    )
    // Digitar o ano passa por 0002, 0020, 0202: antes de 2000 não vale (a API recusa igual).
    expect(validateCustomPeriod('0002-10-01', '2026-10-01', TODAY)).toBe(
      'Use datas a partir de 01/01/2000.',
    )
    expect(validateCustomPeriod('2026-09-01', '0202-10-01', TODAY)).toBe(
      'Use datas a partir de 01/01/2000.',
    )
    expect(validateCustomPeriod('2026-10-01', '2026-10-04', TODAY)).toBeNull()
  })

  it('descreve o período', () => {
    expect(formatIsoDay('2026-10-04')).toBe('04/10/2026')
    expect(describePeriod(null)).toBe('Desde o início')
    expect(describePeriod({ start: '2026-10-01', end: '2026-10-04' })).toBe('01/10/2026 – 04/10/2026')
  })

  it('lê a URL e cai no padrão com valores inválidos', () => {
    expect(parseDashboardQuery({})).toEqual({ range: 'all', category: '', customStart: '', customEnd: '' })
    expect(parseDashboardQuery({ range: 'xyz', category: 'abc', created_from: '2026-02-31' })).toEqual({
      range: 'all',
      category: '',
      customStart: '',
      customEnd: '',
    })
    expect(parseDashboardQuery({ range: 'month', category: 'hr', created_from: '2026-10-01' })).toEqual({
      range: 'month',
      category: 'hr',
      customStart: '',
      customEnd: '',
    })
    expect(
      parseDashboardQuery({ range: 'custom', created_from: '2026-10-01', created_to: '2026-10-03' }),
    ).toEqual({ range: 'custom', category: '', customStart: '2026-10-01', customEnd: '2026-10-03' })
  })

  it('escreve na URL só o que importa', () => {
    expect(toDashboardQuery({ range: 'all', category: '', customStart: '', customEnd: '' })).toEqual({})
    expect(
      toDashboardQuery({ range: 'month', category: 'hr', customStart: '2026-10-01', customEnd: '' }),
    ).toEqual({ range: 'month', category: 'hr' })
    expect(
      toDashboardQuery({ range: 'custom', category: '', customStart: '2026-10-01', customEnd: '' }),
    ).toEqual({ range: 'custom', created_from: '2026-10-01' })
  })

  it('formata as datas do gráfico por dia e por mês', () => {
    expect(formatAxisLabel('2026-10-04', 'day')).toBe('04/10')
    expect(formatAxisLabel('2026-10-01', 'month')).toBe('out/26')
    expect(formatPointLabel('2026-10-04', 'day')).toBe('04/10/2026')
    expect(formatPointLabel('2026-10-01', 'month')).toBe('outubro de 2026')
  })

  it('desenha a série e escolhe os rótulos do eixo', () => {
    expect(buildSeriesPath([], { width: 100, height: 50 }).line).toBe('')
    const path = buildSeriesPath([0, 10], { width: 100, height: 50, domain: { min: 0, max: 10 } })
    expect(path.line).toBe('M 0,50 L 100,0')
    expect(path.area).toBe('M 0,50 L 100,0 L 100,50 L 0,50 Z')
    expect(pickAxisTicks(3, 5)).toEqual([0, 1, 2])
    expect(pickAxisTicks(10, 5)).toEqual([0, 2, 5, 7, 9])
    expect(toPercentage(5, 10)).toBe(50)
    expect(toPercentage(5, 0)).toBe(0)
  })
})
