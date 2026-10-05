import { describe, it, expect } from 'vitest'
import { formatCpf, maskCpf, onlyDigits } from '../cpf'

describe('cpf', () => {
  it('guarda só os dígitos', () => {
    expect(onlyDigits('123.456.789-09')).toBe('12345678909')
  })

  it('mascara aos poucos enquanto se digita e para em 11 dígitos', () => {
    expect(maskCpf('')).toBe('')
    expect(maskCpf('123')).toBe('123')
    expect(maskCpf('1234')).toBe('123.4')
    expect(maskCpf('1234567')).toBe('123.456.7')
    expect(maskCpf('1234567890')).toBe('123.456.789-0')
    expect(maskCpf('123456789091234')).toBe('123.456.789-09')
    expect(maskCpf('12a3.4')).toBe('123.4')
  })

  it('formata o CPF completo e deixa o incompleto como veio', () => {
    expect(formatCpf('12345678909')).toBe('123.456.789-09')
    expect(formatCpf('1234')).toBe('1234')
  })
})
