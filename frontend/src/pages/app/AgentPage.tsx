import { useMemo, useState } from 'react'
import { getTools, runAgent, type AgentRunResponse } from '../../api/agent'
import DashCard from '../../components/ui/DashCard'

export default function AgentPage() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AgentRunResponse | null>(null)
  const [tools, setTools] = useState<Array<{ name: string; description: string }>>([])
  const [loadingTools, setLoadingTools] = useState(false)

  const canRun = prompt.trim().length > 0 && !loading

  const toolBadgeColor = useMemo(() => {
    if (!result?.tool_used) return '#8C6A3E'
    if (result.tool_used.includes('email')) return '#c47070'
    if (result.tool_used.includes('finance')) return '#6a9ab0'
    return '#C6A15B'
  }, [result?.tool_used])

  const handleRun = async () => {
    if (!canRun) return
    setLoading(true)
    setError(null)
    try {
      const response = await runAgent(prompt.trim())
      setResult(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado ejecutando el agente')
    } finally {
      setLoading(false)
    }
  }

  const handleLoadTools = async () => {
    setLoadingTools(true)
    setError(null)
    try {
      const response = await getTools()
      const list = Object.entries(response.tools).map(([name, value]) => ({
        name,
        description: value.description,
      }))
      setTools(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando herramientas')
    } finally {
      setLoadingTools(false)
    }
  }

  return (
    <div
      style={{
        padding: '20px 24px',
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        gap: 14,
        background: '#1a1a1a',
        minHeight: 'calc(100vh - 56px)',
      }}
    >
      <DashCard style={{ padding: '16px 18px' }} speed={0.00035}>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 16, color: '#EDE6D6', fontWeight: 600, marginBottom: 4 }}>
            Agent
          </div>
          <div style={{ fontSize: 11, color: '#8C6A3E' }}>
            Ejecuta tareas en IA-service con selección automática de herramientas.
          </div>
        </div>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ejemplo: write a professional email about project status"
          style={{
            width: '100%',
            minHeight: 130,
            resize: 'vertical',
            borderRadius: 8,
            border: '1px solid rgba(198,161,91,0.25)',
            background: 'rgba(20,20,20,0.7)',
            color: '#EDE6D6',
            padding: '10px 12px',
            fontFamily: 'Questrial, sans-serif',
            fontSize: 13,
            outline: 'none',
          }}
        />

        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button
            onClick={handleRun}
            disabled={!canRun}
            style={{
              fontSize: 12,
              padding: '7px 14px',
              borderRadius: 6,
              cursor: canRun ? 'pointer' : 'not-allowed',
              border: '1px solid rgba(198,161,91,0.45)',
              background: canRun ? 'rgba(198,161,91,0.08)' : 'transparent',
              color: '#C6A15B',
            }}
          >
            {loading ? 'Ejecutando...' : 'Run task'}
          </button>

          <button
            onClick={handleLoadTools}
            disabled={loadingTools}
            style={{
              fontSize: 12,
              padding: '7px 14px',
              borderRadius: 6,
              cursor: loadingTools ? 'not-allowed' : 'pointer',
              border: '1px solid rgba(106,154,176,0.45)',
              background: 'rgba(46,64,87,0.2)',
              color: '#6a9ab0',
            }}
          >
            {loadingTools ? 'Cargando...' : 'Load tools'}
          </button>
        </div>

        {error && (
          <div
            style={{
              marginTop: 12,
              fontSize: 11,
              color: '#f08f8f',
              border: '1px solid rgba(240,143,143,0.3)',
              background: 'rgba(160,60,60,0.15)',
              borderRadius: 6,
              padding: '8px 10px',
            }}
          >
            {error}
          </div>
        )}

        {tools.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, color: '#8C6A3E', marginBottom: 6, textTransform: 'uppercase' }}>
              Available tools
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {tools.map((tool) => (
                <div
                  key={tool.name}
                  style={{
                    fontSize: 11,
                    color: '#EDE6D6',
                    border: '1px solid rgba(198,161,91,0.15)',
                    background: 'rgba(198,161,91,0.05)',
                    borderRadius: 6,
                    padding: '7px 9px',
                  }}
                >
                  <strong style={{ color: '#C6A15B' }}>{tool.name}</strong>
                  <div style={{ color: '#8C6A3E', marginTop: 2 }}>{tool.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DashCard>

      <DashCard style={{ padding: '16px 18px' }} speed={0.00035}>
        <div style={{ fontSize: 10, color: '#8C6A3E', marginBottom: 8, textTransform: 'uppercase' }}>
          Last execution
        </div>

        {!result ? (
          <div style={{ fontSize: 12, color: '#8C6A3E' }}>No hay resultados todavía.</div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span
                style={{
                  fontSize: 10,
                  border: `1px solid ${toolBadgeColor}66`,
                  color: toolBadgeColor,
                  borderRadius: 999,
                  padding: '2px 8px',
                }}
              >
                {result.tool_used || 'llm_only'}
              </span>
              <span style={{ fontSize: 10, color: '#8C6A3E' }}>{result.task_id}</span>
            </div>

            <div
              style={{
                fontSize: 13,
                color: '#EDE6D6',
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                maxHeight: 420,
                overflow: 'auto',
                border: '1px solid rgba(198,161,91,0.12)',
                borderRadius: 8,
                padding: '10px 12px',
                background: 'rgba(20,20,20,0.7)',
              }}
            >
              {result.response || result.error || 'Sin contenido'}
            </div>
          </>
        )}
      </DashCard>
    </div>
  )
}
