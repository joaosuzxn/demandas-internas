import axios from 'axios'

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
