/// <reference types="vite/client" />

// Variáveis públicas do .env da raiz (ADR 0002); o compose exige todas.
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
