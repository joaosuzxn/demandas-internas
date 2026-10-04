import {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import type { User } from '../auth'

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    name: 'Maria Souza',
    username: 'maria.souza',
    cpf: '12345678909',
    email: 'maria@example.com',
    role: 'employee',
    is_active: true,
    must_change_password: false,
    created_at: '2026-10-01T12:00:00+00:00',
    updated_at: '2026-10-01T12:00:00+00:00',
    ...overrides,
  }
}

// Erro do Axios com resposta HTTP, como o que a API devolve.
export function httpError(
  status: number,
  data: unknown = {},
  config: Partial<InternalAxiosRequestConfig> = {},
): AxiosError {
  const fullConfig = { headers: new AxiosHeaders(), ...config } as InternalAxiosRequestConfig
  const response = { status, statusText: '', data, headers: {}, config: fullConfig } as AxiosResponse
  return new AxiosError(`HTTP ${status}`, 'ERR_BAD_RESPONSE', fullConfig, undefined, response)
}

// Erro do Axios sem resposta: rede ou servidor fora.
export function networkError(): AxiosError {
  return new AxiosError('Network Error', 'ERR_NETWORK')
}
