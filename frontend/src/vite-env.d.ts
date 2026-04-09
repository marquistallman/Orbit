/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_IA_URL?: string
  readonly VITE_GMAIL_URL?: string
  readonly VITE_DOC_URL?: string
  readonly VITE_EXCEL_URL?: string
  readonly VITE_CODE_URL?: string
  readonly VITE_MINI_MAPS_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.css' {
  const content: Record<string, string>
  export default content
}
