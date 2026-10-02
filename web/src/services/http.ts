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

export function csrfCookie() {
  return http.get('/sanctum/csrf-cookie', { baseURL: '/' })
}
