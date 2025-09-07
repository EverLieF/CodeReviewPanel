/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  // добавьте другие env переменные здесь
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}



