import { useMemo, useState } from 'react'
import DashCard from '../../components/ui/DashCard'
import { generateMiniMap, getMiniMapFileUrl, runCode, type CodeRunResult, type MiniMapResult } from '../../api/labs'

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

function parsePoints(raw: string): Array<{ name: string; x: number; y: number }> {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [nameRaw, xRaw, yRaw] = line.split(',').map((p) => p.trim())
      return {
        name: nameRaw || 'Point',
        x: Number(xRaw),
        y: Number(yRaw),
      }
    })
    .filter((p) => p.name && Number.isInteger(p.x) && Number.isInteger(p.y) && p.x >= 0 && p.x <= 8 && p.y >= 0 && p.y <= 8)
}

export default function LabsPage() {
  const [code, setCode] = useState('print("Hola desde Orbit")')
  const [language, setLanguage] = useState<'python' | 'sql' | 'javascript'>('python')
  const [stdin, setStdin] = useState('')
  const [runningCode, setRunningCode] = useState(false)
  const [codeResult, setCodeResult] = useState<CodeRunResult | null>(null)

  const [mapTitle, setMapTitle] = useState('Ruta Demo')
  const [pointsText, setPointsText] = useState('Casa,1,1\nOficina,6,2\nParque,4,6')
  const [runningMap, setRunningMap] = useState(false)
  const [mapResult, setMapResult] = useState<MiniMapResult | null>(null)

  const [error, setError] = useState<string | null>(null)

  const canRunCode = useMemo(() => code.trim().length > 0 && !runningCode, [code, runningCode])
  const canRunMap = useMemo(() => mapTitle.trim().length > 0 && !runningMap, [mapTitle, runningMap])

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

  const onGenerateMap = async () => {
    if (!canRunMap) return
    setError(null)
    setRunningMap(true)
    setMapResult(null)
    try {
      const points = parsePoints(pointsText)
      const result = await generateMiniMap({
        title: mapTitle,
        points,
      })
      setMapResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generando mini mapa')
    } finally {
      setRunningMap(false)
    }
  }

  return (
    <div
      style={{
        padding: '20px 24px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 14,
        background: '#1a1a1a',
        minHeight: 'calc(100vh - 56px)',
      }}
    >
      <DashCard style={{ padding: '16px 18px' }} speed={0.00035}>
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

      <DashCard style={{ padding: '16px 18px' }} speed={0.00035}>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 16, color: '#EDE6D6', fontWeight: 600, marginBottom: 4 }}>Mini Maps</div>
          <div style={{ fontSize: 11, color: '#8C6A3E' }}>
            Genera un mini mapa 9x9 con puntos usando coordenadas simples.
          </div>
        </div>

        <input
          value={mapTitle}
          onChange={(e) => setMapTitle(e.target.value)}
          placeholder="Titulo del mapa"
          style={{ ...textInputStyle, marginBottom: 8 }}
        />

        <textarea
          value={pointsText}
          onChange={(e) => setPointsText(e.target.value)}
          placeholder="Casa,1,1\nOficina,6,2\nParque,4,6"
          style={{ ...textInputStyle, minHeight: 170, resize: 'vertical', marginBottom: 10 }}
        />

        <button
          onClick={onGenerateMap}
          disabled={!canRunMap}
          style={{
            fontSize: 12,
            padding: '7px 14px',
            borderRadius: 6,
            cursor: canRunMap ? 'pointer' : 'not-allowed',
            border: '1px solid rgba(198,161,91,0.45)',
            background: canRunMap ? 'rgba(198,161,91,0.08)' : 'transparent',
            color: '#C6A15B',
          }}
        >
          {runningMap ? 'Generando...' : 'Generate mini map'}
        </button>

        {mapResult && (
          <div style={{ marginTop: 12, background: 'rgba(20,20,20,0.65)', border: '1px solid rgba(198,161,91,0.2)', borderRadius: 8, padding: 10 }}>
            {mapResult.interactive_map_file && (
              <a
                href={getMiniMapFileUrl(mapResult.interactive_map_file)}
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
                Abrir mapa interactivo
              </a>
            )}
            <pre style={{ margin: 0, color: '#EDE6D6', fontSize: 11, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {mapResult.map_lines.join('\n')}
            </pre>
            <pre style={{ marginTop: 10, color: '#8C6A3E', fontSize: 11, whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(mapResult.legend, null, 2)}
            </pre>
          </div>
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
