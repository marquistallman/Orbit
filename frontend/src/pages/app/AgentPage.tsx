import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { getTools, runAgent } from '../../api/agent'
import DashCard from '../../components/ui/DashCard'

type ChatRole = 'user' | 'assistant'

type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  createdAt: string
  toolUsed?: string | null
}

const CHAT_STORAGE_KEY = 'orbit-agent-chat-history'
const CHAT_WIDTH_STORAGE_KEY = 'orbit-agent-chat-width'
const CHAT_HEIGHT_STORAGE_KEY = 'orbit-agent-chat-height'
const MAX_CONTEXT_MESSAGES = 12

const CHAT_WIDTH_MIN = 32
const CHAT_WIDTH_MAX = 58
const CHAT_HEIGHT_MIN = 300
const CHAT_HEIGHT_DEFAULT = 520

const MESSAGE_TIME_FORMAT = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
})

function buildConversationPrompt(history: ChatMessage[], currentPrompt: string): string {
  const recentHistory = history.slice(-MAX_CONTEXT_MESSAGES)
  if (recentHistory.length === 0) return currentPrompt

  const transcript = recentHistory
    .map((message) => {
      const speaker = message.role === 'user' ? 'Usuario' : 'Asistente'
      return `${speaker}: ${message.content}`
    })
    .join('\n')

  return [
    'Contexto de la conversacion previa:',
    transcript,
    '',
    `Nuevo mensaje del usuario: ${currentPrompt}`,
    'Responde manteniendo la continuidad de la conversacion y teniendo en cuenta el contexto anterior.',
  ].join('\n')
}

function safeParseHistory(raw: string | null): ChatMessage[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item) => item && typeof item === 'object' && typeof item.content === 'string' && typeof item.role === 'string' && typeof item.createdAt === 'string')
  } catch {
    return []
  }
}

function formatMessageTime(isoDate: string): string {
  const timestamp = new Date(isoDate)
  if (Number.isNaN(timestamp.getTime())) return ''
  return MESSAGE_TIME_FORMAT.format(timestamp)
}

function readPersistedNumber(key: string, fallback: number, min: number, max: number): number {
  if (typeof window === 'undefined') return fallback

  const raw = window.localStorage.getItem(key)
  if (!raw) return fallback

  const value = Number(raw)
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const inlinePattern = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^\)]+\))/g
  const nodes: ReactNode[] = []
  let cursor = 0

  for (const match of text.matchAll(inlinePattern)) {
    const token = match[0]
    const index = match.index ?? 0

    if (index > cursor) {
      nodes.push(text.slice(cursor, index))
    }

    if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code key={`${index}-code`} style={{
          padding: '1px 4px',
          borderRadius: 4,
          background: 'rgba(198,161,91,0.12)',
          color: '#F2D9A0',
          fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
        }}>
          {token.slice(1, -1)}
        </code>,
      )
    } else if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(<strong key={`${index}-strong`}>{token.slice(2, -2)}</strong>)
    } else {
      const linkMatch = /^\[([^\]]+)\]\(([^\)]+)\)$/.exec(token)
      if (linkMatch) {
        nodes.push(
          <a
            key={`${index}-link`}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
            style={{ color: '#8EC4D6', textDecoration: 'underline' }}
          >
            {linkMatch[1]}
          </a>,
        )
      } else {
        nodes.push(token)
      }
    }

    cursor = index + token.length
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor))
  }

  return nodes
}

function renderRichText(text: string): ReactNode {
  const segments = text.split(/```/)

  if (segments.length === 1) {
    return segments[0].split(/\n{2,}/).map((block, blockIndex) => {
      const lines = block.split('\n')
      const isBulletList = lines.every((line) => /^[-*]\s+/.test(line.trim()) || line.trim() === '') && lines.some((line) => /^[-*]\s+/.test(line.trim()))

      if (isBulletList) {
        return (
          <ul key={`list-${blockIndex}`} style={{ margin: '0 0 10px 18px', padding: 0 }}>
            {lines
              .filter((line) => /^[-*]\s+/.test(line.trim()))
              .map((line, itemIndex) => (
                <li key={`item-${blockIndex}-${itemIndex}`} style={{ marginBottom: 4 }}>
                  {renderInlineMarkdown(line.trim().replace(/^[-*]\s+/, ''))}
                </li>
              ))}
          </ul>
        )
      }

      return (
        <p key={`paragraph-${blockIndex}`} style={{ margin: blockIndex === segments.length - 1 ? 0 : '0 0 10px' }}>
          {lines.flatMap((line, lineIndex) => (lineIndex === 0 ? renderInlineMarkdown(line) : [<br key={`br-${blockIndex}-${lineIndex}`} />, ...renderInlineMarkdown(line)]))}
        </p>
      )
    })
  }

  return segments.map((segment, segmentIndex) => {
    if (segmentIndex % 2 === 1) {
      return (
        <pre
          key={`code-${segmentIndex}`}
          className="agent-scrollbar"
          style={{
            margin: '0 0 10px',
            padding: '10px 12px',
            borderRadius: 8,
            overflowX: 'auto',
            background: 'rgba(10,10,10,0.9)',
            border: '1px solid rgba(198,161,91,0.12)',
            color: '#EDE6D6',
          }}
        >
          <code>{segment}</code>
        </pre>
      )
    }

    return segment.split(/\n{2,}/).map((block, blockIndex) => {
      const lines = block.split('\n')
      const isBulletList = lines.every((line) => /^[-*]\s+/.test(line.trim()) || line.trim() === '') && lines.some((line) => /^[-*]\s+/.test(line.trim()))

      if (isBulletList) {
        return (
          <ul key={`segment-${segmentIndex}-list-${blockIndex}`} style={{ margin: '0 0 10px 18px', padding: 0 }}>
            {lines
              .filter((line) => /^[-*]\s+/.test(line.trim()))
              .map((line, itemIndex) => (
                <li key={`segment-${segmentIndex}-item-${blockIndex}-${itemIndex}`} style={{ marginBottom: 4 }}>
                  {renderInlineMarkdown(line.trim().replace(/^[-*]\s+/, ''))}
                </li>
              ))}
          </ul>
        )
      }

      return (
        <p key={`segment-${segmentIndex}-paragraph-${blockIndex}`} style={{ margin: blockIndex === segment.split(/\n{2,}/).length - 1 ? 0 : '0 0 10px' }}>
          {lines.flatMap((line, lineIndex) => (lineIndex === 0 ? renderInlineMarkdown(line) : [<br key={`br-${segmentIndex}-${blockIndex}-${lineIndex}`} />, ...renderInlineMarkdown(line)]))}
        </p>
      )
    })
  })
}

export default function AgentPage() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [tools, setTools] = useState<Array<{ name: string; description: string }>>([])
  const [loadingTools, setLoadingTools] = useState(false)
  const [chatColumnWidth, setChatColumnWidth] = useState(() => readPersistedNumber(CHAT_WIDTH_STORAGE_KEY, 42, CHAT_WIDTH_MIN, CHAT_WIDTH_MAX))
  const [chatPanelHeight, setChatPanelHeight] = useState(() => {
    const maxFromViewport = typeof window === 'undefined' ? 900 : Math.max(360, window.innerHeight - 220)
    return readPersistedNumber(CHAT_HEIGHT_STORAGE_KEY, CHAT_HEIGHT_DEFAULT, CHAT_HEIGHT_MIN, maxFromViewport)
  })
  const [isResizingWidth, setIsResizingWidth] = useState(false)
  const [isResizingHeight, setIsResizingHeight] = useState(false)
  const pageRef = useRef<HTMLDivElement | null>(null)
  const rightCardRef = useRef<HTMLDivElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const hasHydratedChat = useRef(false)

  const lastUserMessage = useMemo(() => {
    for (let index = chatHistory.length - 1; index >= 0; index -= 1) {
      const message = chatHistory[index]
      if (message.role === 'user') return message
    }
    return null
  }, [chatHistory])

  const isThinking = loading && chatHistory.some((message) => message.role === 'user')

  useEffect(() => {
    setChatHistory(safeParseHistory(localStorage.getItem(CHAT_STORAGE_KEY)))
  }, [])

  useEffect(() => {
    if (!hasHydratedChat.current) {
      hasHydratedChat.current = true
      return
    }

    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistory))
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [chatHistory])

  useEffect(() => {
    if (!isResizingWidth) return

    const onPointerMove = (event: PointerEvent) => {
      const page = pageRef.current
      if (!page) return

      const rect = page.getBoundingClientRect()
      const relativeX = event.clientX - rect.left
      const nextRight = ((rect.width - relativeX) / rect.width) * 100
      const clamped = Math.max(CHAT_WIDTH_MIN, Math.min(CHAT_WIDTH_MAX, nextRight))
      setChatColumnWidth(clamped)
    }

    const onPointerUp = () => setIsResizingWidth(false)

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [isResizingWidth])

  useEffect(() => {
    if (!isResizingHeight) return

    const onPointerMove = (event: PointerEvent) => {
      const card = rightCardRef.current
      if (!card) return

      const rect = card.getBoundingClientRect()
      const nextHeight = event.clientY - rect.top - 74
      const maxHeight = Math.max(360, window.innerHeight - 220)
      const clamped = Math.max(CHAT_HEIGHT_MIN, Math.min(maxHeight, nextHeight))
      setChatPanelHeight(clamped)
    }

    const onPointerUp = () => setIsResizingHeight(false)

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [isResizingHeight])

  useEffect(() => {
    localStorage.setItem(CHAT_WIDTH_STORAGE_KEY, String(chatColumnWidth))
  }, [chatColumnWidth])

  useEffect(() => {
    localStorage.setItem(CHAT_HEIGHT_STORAGE_KEY, String(chatPanelHeight))
  }, [chatPanelHeight])

  const canRun = prompt.trim().length > 0 && !loading

  const handleRun = async (promptOverride?: string) => {
    const userPrompt = (promptOverride ?? prompt).trim()
    if (userPrompt.length === 0 || loading) return

    setLoading(true)
    setError(null)
    try {
      const contextualPrompt = buildConversationPrompt(chatHistory, userPrompt)

      setChatHistory((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'user',
          content: userPrompt,
          createdAt: new Date().toISOString(),
        },
      ])

      const response = await runAgent(contextualPrompt)
      setChatHistory((current) => [
        ...current,
        {
          id: response.task_id,
          role: 'assistant',
          content: response.response || response.error || 'Sin contenido',
          createdAt: response.created_at || new Date().toISOString(),
          toolUsed: response.tool_used,
        },
      ])
      if (!promptOverride) {
        setPrompt('')
      }
    } catch (err) {
      setChatHistory((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: err instanceof Error ? err.message : 'Error inesperado ejecutando el agente',
          createdAt: new Date().toISOString(),
        },
      ])
      setError(err instanceof Error ? err.message : 'Error inesperado ejecutando el agente')
    } finally {
      setLoading(false)
    }
  }

  const handlePromptKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) return
    event.preventDefault()
    void handleRun()
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
    <div ref={pageRef} style={{
      padding: '20px 24px',
      display: 'grid',
      gridTemplateColumns: `${100 - chatColumnWidth}% 8px ${chatColumnWidth}%`,
      gap: 0,
      background: '#1a1a1a',
      minHeight: 'calc(100vh - 56px)',
      height: 'calc(100vh - 56px)',
      overflow: 'hidden',
    }}>
      <div className="agent-scrollbar" style={{ marginRight: 7, minHeight: 0, overflow: 'auto' }}>
      <DashCard style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', minHeight: 0 }} speed={0.00035}>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 16, color: '#EDE6D6', fontWeight: 600, marginBottom: 4 }}>Agent</div>
          <div style={{ fontSize: 11, color: '#8C6A3E' }}>
            Ejecuta tareas en IA-service con selección automática de herramientas.
          </div>
        </div>

        <textarea
          className="agent-scrollbar"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handlePromptKeyDown}
          placeholder="Escribe tu mensaje. Enter envía, Shift+Enter agrega una nueva línea."
          style={{
            width: '100%', minHeight: 130, resize: 'vertical',
            borderRadius: 8, border: '1px solid rgba(198,161,91,0.25)',
            background: 'rgba(20,20,20,0.7)', color: '#EDE6D6',
            padding: '10px 12px', fontFamily: 'Questrial, sans-serif',
            fontSize: 13, outline: 'none',
          }}
        />

        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button onClick={() => void handleRun()} disabled={!canRun} style={{
            fontSize: 12, padding: '7px 14px', borderRadius: 6,
            cursor: canRun ? 'pointer' : 'not-allowed',
            border: '1px solid rgba(198,161,91,0.45)',
            background: canRun ? 'rgba(198,161,91,0.08)' : 'transparent',
            color: '#C6A15B',
          }}>
            {loading ? 'Ejecutando...' : 'Run task'}
          </button>
          <button onClick={handleLoadTools} disabled={loadingTools} style={{
            fontSize: 12, padding: '7px 14px', borderRadius: 6,
            cursor: loadingTools ? 'not-allowed' : 'pointer',
            border: '1px solid rgba(106,154,176,0.45)',
            background: 'rgba(46,64,87,0.2)', color: '#6a9ab0',
          }}>
            {loadingTools ? 'Cargando...' : 'Load tools'}
          </button>
        </div>

        {error && (
          <div style={{
            marginTop: 12, fontSize: 11, color: '#f08f8f',
            border: '1px solid rgba(240,143,143,0.3)',
            background: 'rgba(160,60,60,0.15)',
            borderRadius: 6, padding: '8px 10px',
          }}>{error}</div>
        )}

        {tools.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, color: '#8C6A3E', marginBottom: 6, textTransform: 'uppercase' as const }}>
              Available tools
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {tools.map(tool => (
                <div key={tool.name} style={{
                  fontSize: 11, color: '#EDE6D6',
                  border: '1px solid rgba(198,161,91,0.15)',
                  background: 'rgba(198,161,91,0.05)',
                  borderRadius: 6, padding: '7px 9px',
                }}>
                  <strong style={{ color: '#C6A15B' }}>{tool.name}</strong>
                  <div style={{ color: '#8C6A3E', marginTop: 2 }}>{tool.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DashCard>
      </div>

      <div
        onPointerDown={() => setIsResizingWidth(true)}
        style={{
          cursor: 'col-resize',
          alignSelf: 'stretch',
          background: isResizingWidth ? 'rgba(198,161,91,0.35)' : 'rgba(198,161,91,0.16)',
          borderRadius: 999,
          margin: '6px 0',
        }}
        aria-label="Redimensionar ancho del chat"
      />

      <div ref={rightCardRef} style={{ marginLeft: 7, minHeight: 0, overflow: 'hidden' }}>
      <DashCard style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }} speed={0.00035}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: '#8C6A3E', textTransform: 'uppercase' as const }}>
            Conversacion
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                if (!lastUserMessage) return
                setPrompt(lastUserMessage.content)
                void handleRun(lastUserMessage.content)
              }}
              disabled={!lastUserMessage || loading}
              style={{
                fontSize: 11,
                padding: '5px 10px',
                borderRadius: 6,
                cursor: !lastUserMessage || loading ? 'not-allowed' : 'pointer',
                border: '1px solid rgba(106,154,176,0.22)',
                background: !lastUserMessage || loading ? 'rgba(106,154,176,0.04)' : 'rgba(106,154,176,0.1)',
                color: '#6a9ab0',
              }}
            >
              Reenviar último
            </button>
            <button
              type="button"
              onClick={() => {
                setChatHistory([])
                setError(null)
                localStorage.removeItem(CHAT_STORAGE_KEY)
              }}
              style={{
                fontSize: 11,
                padding: '5px 10px',
                borderRadius: 6,
                cursor: 'pointer',
                border: '1px solid rgba(198,161,91,0.22)',
                background: 'rgba(198,161,91,0.06)',
                color: '#C6A15B',
              }}
            >
              Limpiar chat
            </button>
          </div>
        </div>

        <div style={{
          border: '1px solid rgba(198,161,91,0.12)',
          borderRadius: 8,
          background: 'rgba(20,20,20,0.7)',
          padding: 10,
          height: chatPanelHeight,
          minHeight: 300,
          maxHeight: 'calc(100vh - 220px)',
          overflow: 'auto',
          display: 'grid',
          gap: 10,
        }} className="agent-scrollbar">
          {chatHistory.length === 0 ? (
            <div style={{ fontSize: 12, color: '#8C6A3E' }}>Aun no hay mensajes. Escribe un prompt para iniciar la conversacion.</div>
          ) : (
            chatHistory.map((message) => (
              <div
                key={message.id}
                style={{
                  display: 'grid',
                  justifyItems: message.role === 'user' ? 'end' : 'start',
                }}
              >
                <div
                  style={{
                    maxWidth: '92%',
                    borderRadius: 12,
                    padding: '10px 12px',
                    border: message.role === 'user'
                      ? '1px solid rgba(198,161,91,0.28)'
                      : '1px solid rgba(106,154,176,0.24)',
                    background: message.role === 'user'
                      ? 'rgba(198,161,91,0.08)'
                      : 'rgba(46,64,87,0.16)',
                    color: '#EDE6D6',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: message.role === 'user' ? '#C6A15B' : '#6a9ab0', textTransform: 'uppercase' as const }}>
                      {message.role === 'user' ? 'Tú' : 'Agente'}
                    </span>
                    <span style={{ fontSize: 10, color: '#8C6A3E' }}>{formatMessageTime(message.createdAt)}</span>
                    {message.toolUsed && message.role === 'assistant' && (
                      <span style={{ fontSize: 10, color: '#8C6A3E' }}>tool: {message.toolUsed}</span>
                    )}
                  </div>
                  {message.role === 'assistant' ? renderRichText(message.content) : message.content}
                </div>
              </div>
            ))
          )}
          {isThinking && (
            <div style={{ display: 'grid', justifyItems: 'start' }}>
              <div style={{
                maxWidth: '92%',
                borderRadius: 12,
                padding: '10px 12px',
                border: '1px solid rgba(106,154,176,0.24)',
                background: 'rgba(46,64,87,0.16)',
                color: '#EDE6D6',
                lineHeight: 1.6,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: '#6a9ab0', textTransform: 'uppercase' as const }}>Agente</span>
                  <span style={{ fontSize: 10, color: '#8C6A3E' }}>escribiendo...</span>
                </div>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center', minHeight: 18 }} aria-label="El agente está escribiendo">
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: '#6a9ab0', opacity: 0.45, animation: 'orbitPulse 1.1s infinite ease-in-out' }} />
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: '#6a9ab0', opacity: 0.65, animation: 'orbitPulse 1.1s infinite ease-in-out 0.15s' }} />
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: '#6a9ab0', opacity: 0.85, animation: 'orbitPulse 1.1s infinite ease-in-out 0.3s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div
          onPointerDown={() => setIsResizingHeight(true)}
          style={{
            marginTop: 8,
            alignSelf: 'center',
            width: 76,
            height: 8,
            borderRadius: 999,
            cursor: 'ns-resize',
            background: isResizingHeight ? 'rgba(198,161,91,0.45)' : 'rgba(198,161,91,0.22)',
          }}
          aria-label="Redimensionar alto del chat"
        />
      </DashCard>
      </div>
      <style>{`\n        .agent-scrollbar {\n          scrollbar-width: thin;\n          scrollbar-color: rgba(198,161,91,0.55) rgba(16,16,16,0.82);\n        }\n\n        .agent-scrollbar::-webkit-scrollbar {\n          width: 10px;\n          height: 10px;\n        }\n\n        .agent-scrollbar::-webkit-scrollbar-track {\n          background: rgba(16,16,16,0.82);\n          border-radius: 999px;\n          border: 1px solid rgba(198,161,91,0.14);\n        }\n\n        .agent-scrollbar::-webkit-scrollbar-thumb {\n          border-radius: 999px;\n          border: 2px solid rgba(16,16,16,0.82);\n          background: linear-gradient(180deg, rgba(198,161,91,0.86), rgba(140,106,62,0.9));\n        }\n\n        .agent-scrollbar::-webkit-scrollbar-thumb:hover {\n          background: linear-gradient(180deg, rgba(214,182,117,0.92), rgba(160,120,70,0.96));\n        }\n\n        @keyframes orbitPulse {\n          0%, 100% { transform: translateY(0); opacity: 0.35; }\n          50% { transform: translateY(-3px); opacity: 1; }\n        }\n      `}</style>
    </div>
  )
}
