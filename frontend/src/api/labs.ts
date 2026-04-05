const IA_URL = import.meta.env.VITE_IA_URL || 'http://localhost:12002'
const MINI_MAPS_URL = import.meta.env.VITE_MINI_MAPS_URL || 'http://localhost:12007'

interface AgentActionResponse<T = unknown> {
  tool: string
  result: T
}

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

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

export interface CodeRunResult {
  language: string
  exit_code: number
  stdout: string
  stderr: string
  timed_out: boolean
}

export interface MiniMapLegend {
  marker: string
  name: string
  x: number
  y: number
}

export interface MiniMapResult {
  title: string
  grid_size: string
  point_count: number
  map_lines: string[]
  legend: MiniMapLegend[]
  interactive_map_file?: string
  interactive_map_path?: string
}

export const getMiniMapFileUrl = (fileName: string): string =>
  `${MINI_MAPS_URL}/files/${encodeURIComponent(fileName)}`

export const runCode = (payload: { code: string; language: 'python' | 'sql' | 'javascript'; stdin?: string }) =>
  runTool<CodeRunResult>('code_run', payload)

export const generateMiniMap = (payload: { title: string; points: Array<{ name: string; x: number; y: number }> }) =>
  runTool<MiniMapResult>('mini_maps', payload)
