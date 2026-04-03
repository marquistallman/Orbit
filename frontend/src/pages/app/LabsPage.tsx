import { useEffect, useMemo, useRef, useState } from 'react'
import DashCard from '../../components/ui/DashCard'
import { runCode, type CodeRunResult } from '../../api/labs'
import { useAuthStore } from '../../store/authStore'

const MINI_MAPS_URL = import.meta.env.VITE_MINI_MAPS_URL || 'http://localhost:9005'

const textInputStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 8,
  border: '1px solid rgba(198,161,91,0.25)',
  background: 'rgba(20,20,20,0.7)',
  color: '#EDE6D6',
  padding: '10px 12px',
  fontFamily: 'Questrial, sans-serif',
  fontSize: 13,
  outline: 'none',
}

export default function LabsPage() {
  const user = useAuthStore((state) => state.user)
  const layoutRef = useRef<HTMLDivElement | null>(null)
  const mapShellRef = useRef<HTMLDivElement | null>(null)
  const [isResizing, setIsResizing] = useState(false)
  const [isResizingHeight, setIsResizingHeight] = useState(false)
  const [leftWidthPct, setLeftWidthPct] = useState(52)
  const [mapHeight, setMapHeight] = useState(520)
  const [isCompact, setIsCompact] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 1200 : false))
  const [code, setCode] = useState('print("Hola desde Orbit")')
  const [language, setLanguage] = useState<'python' | 'sql' | 'javascript'>('python')
  const [stdin, setStdin] = useState('')
  const [runningCode, setRunningCode] = useState(false)
  const [codeResult, setCodeResult] = useState<CodeRunResult | null>(null)

  const [error, setError] = useState<string | null>(null)

  const canRunCode = useMemo(() => code.trim().length > 0 && !runningCode, [code, runningCode])

  useEffect(() => {
    const onResize = () => setIsCompact(window.innerWidth < 1200)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!isResizing) return

    const onPointerMove = (event: PointerEvent) => {
      const container = layoutRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const splitterWidth = 12
      const minLeft = 420
      const minRight = 360
      const maxLeft = rect.width - minRight - splitterWidth
      const nextLeft = Math.min(Math.max(event.clientX - rect.left, minLeft), Math.max(minLeft, maxLeft))
      setLeftWidthPct((nextLeft / rect.width) * 100)
    }

    const onPointerUp = () => setIsResizing(false)

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [isResizing])

  useEffect(() => {
    if (!isResizingHeight) return

    const onPointerMove = (event: PointerEvent) => {
      const mapShell = mapShellRef.current
      if (!mapShell) return

      const rect = mapShell.getBoundingClientRect()
      const minHeight = 340
      const maxHeight = Math.max(minHeight, window.innerHeight - rect.top - 28)
      const nextHeight = Math.min(Math.max(event.clientY - rect.top, minHeight), maxHeight)
      setMapHeight(nextHeight)
    }

    const onPointerUp = () => setIsResizingHeight(false)

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [isResizingHeight])

  const mapUrl = useMemo(() => {
    const userId = user?.id || user?.email || user?.username || 'anonymous'
    const url = new URL(MINI_MAPS_URL)
    url.searchParams.set('user_id', userId)
    return url.toString()
  }, [user])

  const onRunCode = async () => {
    if (!canRunCode) return
    setError(null)
    setRunningCode(true)
    setCodeResult(null)
    try {
      const result = await runCode({
        code,
        language,
        stdin,
      })
      setCodeResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error ejecutando codigo')
    } finally {
      setRunningCode(false)
    }
  }

  return (
    <div
      ref={layoutRef}
      style={{
        padding: '20px 24px',
        display: isCompact ? 'grid' : 'flex',
        gap: isCompact ? 14 : 0,
        background: '#1a1a1a',
        minHeight: 'calc(100vh - 56px)',
      }}
    >
      <DashCard style={{ padding: '16px 18px', width: isCompact ? '100%' : `${leftWidthPct}%` }} speed={0.00035}>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 16, color: '#EDE6D6', fontWeight: 600, marginBottom: 4 }}>Pequeño editor de codigo</div>
          <div style={{ fontSize: 11, color: '#8C6A3E' }}>
            Ejecuta snippets rapidos con `code_run` (python/sql/javascript) en modo seguro.
          </div>
        </div>

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as 'python' | 'sql' | 'javascript')}
          style={{ ...textInputStyle, marginBottom: 8 }}
        >
          <option value="python">Python</option>
          <option value="sql">SQL (SQLite)</option>
          <option value="javascript">JavaScript (Node)</option>
        </select>

        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={{ ...textInputStyle, minHeight: 170, resize: 'vertical', marginBottom: 8, fontFamily: 'Consolas, monospace' }}
        />

        <textarea
          value={stdin}
          onChange={(e) => setStdin(e.target.value)}
          placeholder="stdin opcional"
          style={{ ...textInputStyle, minHeight: 64, resize: 'vertical', marginBottom: 10 }}
        />

        <button
          onClick={onRunCode}
          disabled={!canRunCode}
          style={{
            fontSize: 12,
            padding: '7px 14px',
            borderRadius: 6,
            cursor: canRunCode ? 'pointer' : 'not-allowed',
            border: '1px solid rgba(106,154,176,0.45)',
            background: canRunCode ? 'rgba(46,64,87,0.2)' : 'transparent',
            color: '#6a9ab0',
          }}
        >
          {runningCode ? 'Ejecutando...' : 'Run code'}
        </button>

        {codeResult && (
          <pre style={{ marginTop: 12, background: 'rgba(20,20,20,0.65)', border: '1px solid rgba(106,154,176,0.2)', borderRadius: 8, padding: 10, color: '#EDE6D6', fontSize: 11, whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(codeResult, null, 2)}
          </pre>
        )}
      </DashCard>

      {!isCompact && (
        <div
          onPointerDown={() => setIsResizing(true)}
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionar panel de mapa"
          style={{
            width: 12,
            margin: '0 10px',
            borderRadius: 999,
            cursor: 'col-resize',
            background: isResizing ? 'rgba(198,161,91,0.3)' : 'rgba(198,161,91,0.12)',
            border: '1px solid rgba(198,161,91,0.24)',
            boxShadow: isResizing ? '0 0 0 2px rgba(198,161,91,0.12)' : 'none',
            transition: 'background 0.12s ease, box-shadow 0.12s ease',
          }}
        />
      )}

      <DashCard style={{ padding: '16px 18px', flex: isCompact ? undefined : 1, width: isCompact ? '100%' : undefined, minWidth: isCompact ? undefined : 360 }} speed={0.00035}>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 16, color: '#EDE6D6', fontWeight: 600, marginBottom: 4 }}>Mini Maps</div>
          <div style={{ fontSize: 11, color: '#8C6A3E' }}>
            Mapa interactivo integrado: clic para crear puntos y popup para editar nombre, color y radio.
          </div>
          {!isCompact && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#8C7A5E' }}>
              Arrastra la barra central para ajustar el ancho del mapa sin invadir el editor.
            </div>
          )}
        </div>

        <a
          href={mapUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-block',
            marginBottom: 10,
            fontSize: 11,
            padding: '5px 10px',
            borderRadius: 999,
            border: '1px solid rgba(198,161,91,0.35)',
            color: '#C6A15B',
            textDecoration: 'none',
          }}
        >
          Abrir mapa en pestaña nueva
        </a>

        <div
          ref={mapShellRef}
          style={{
            height: isCompact ? 430 : mapHeight,
            borderRadius: 10,
            overflow: 'hidden',
            border: '1px solid rgba(198,161,91,0.2)',
            background: 'rgba(16,16,16,0.8)',
          }}
        >
          <iframe
            title="Mini Maps interactivo"
            src={mapUrl}
            style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>

        {!isCompact && (
          <div
            onPointerDown={() => setIsResizingHeight(true)}
            role="separator"
            aria-orientation="horizontal"
            aria-label="Redimensionar alto del mapa"
            style={{
              marginTop: 8,
              height: 10,
              borderRadius: 999,
              cursor: 'row-resize',
              background: isResizingHeight ? 'rgba(198,161,91,0.32)' : 'rgba(198,161,91,0.13)',
              border: '1px solid rgba(198,161,91,0.24)',
              boxShadow: isResizingHeight ? '0 0 0 2px rgba(198,161,91,0.12)' : 'none',
              transition: 'background 0.12s ease, box-shadow 0.12s ease',
            }}
          />
        )}
      </DashCard>

      {error && (
        <div style={{ gridColumn: '1 / -1', marginTop: 2, fontSize: 12, color: '#f08f8f', border: '1px solid rgba(240,143,143,0.3)', background: 'rgba(160,60,60,0.15)', borderRadius: 6, padding: '10px 12px' }}>
          {error}
        </div>
      )}
    </div>
  )
}
