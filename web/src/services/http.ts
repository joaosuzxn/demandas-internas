import axios from 'axios'

declare module 'axios' {
  export interface AxiosRequestConfig {
    // 401 desta requisição não leva ao login (o me inicial e o logout).
    skipAuthRedirect?: boolean
    // Marca a repetição depois de um 419, para o interceptor não entrar em laço.
    csrfRetried?: boolean
  }
}

// Único cliente HTTP da SPA. Mesma origem da API (ADR 0001): cookie de sessão + XSRF do Sanctum.
export const http = axios.create({
  baseURL: '/api',
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: 'application/json' },
})

// Os envelopes de resposta da API: um recurso vem em `data`; uma lista paginada, em `data` com o `meta` do Laravel.
export type Resource<T> = { data: T }
export type Paginated<T> = { data: T[]; meta: { total: number; current_page: number; last_page: number } }

export function csrfCookie() {
  return http.get('/sanctum/csrf-cookie', { baseURL: '/' })
}
