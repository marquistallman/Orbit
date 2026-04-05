const IA_URL = import.meta.env.VITE_IA_URL || 'http://localhost:12002'
export const DOC_SERVICE_URL = import.meta.env.VITE_DOC_URL || 'http://localhost:12004'
export const EXCEL_SERVICE_URL = import.meta.env.VITE_EXCEL_URL || 'http://localhost:12005'

interface AgentActionResponse<T = unknown> {
  tool: string
  result: T
}

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export type DocumentFormat = 'docx' | 'pdf' | 'both'

export interface CreateDocumentPayload {
  title: string
  content: string
  format: DocumentFormat
}

export interface CreateExcelPayload {
  title: string
  sheets: Array<{
    name: string
    rows: Array<Array<string | number | boolean | null>>
  }>
}

export interface DocumentToolResult {
  message?: string
  files?: string[]
  file_names?: string[]
  file_path?: string
  format?: string
  error?: string
}

export interface ExcelToolResult {
  message?: string
  file_path?: string
  file_name?: string
  sheet_count?: number
  sheets?: string[]
  error?: string
}

export const getDocDownloadUrl = (fileName: string): string =>
  `${DOC_SERVICE_URL}/files/${encodeURIComponent(fileName)}`

export const getExcelDownloadUrl = (fileName: string): string =>
  `${EXCEL_SERVICE_URL}/files/${encodeURIComponent(fileName)}`

async function runTool<T>(tool: string, payload: unknown): Promise<T> {
  const res = await fetch(`${IA_URL}/agent/action`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ tool, payload }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Error ejecutando ${tool} (${res.status}): ${body || res.statusText}`)
  }

  const data = (await res.json()) as AgentActionResponse<T>
  return data.result
}

export const createWordOrPdf = async (payload: CreateDocumentPayload): Promise<DocumentToolResult> => {
  return runTool<DocumentToolResult>('document_edit', payload)
}

export const createExcelWorkbook = async (payload: CreateExcelPayload): Promise<ExcelToolResult> => {
  return runTool<ExcelToolResult>('excel_edit', payload)
}
