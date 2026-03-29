import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import DashCard from '../../components/ui/DashCard'
import {
  createExcelWorkbook,
  createWordOrPdf,
  getDocDownloadUrl,
  getExcelDownloadUrl,
  type DocumentFormat,
  type DocumentToolResult,
  type ExcelToolResult,
} from '../../api/documents'

type DownloadItem = { name: string; url: string; source: 'doc' | 'excel'; createdAt: string }

const RECENT_DOWNLOADS_KEY = 'orbit-docs-recent-downloads'
const MAX_RECENT_DOWNLOADS = 12

const textInputStyle: CSSProperties = {
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

function parseRowsFromText(raw: string): Array<Array<string | number | boolean | null>> {
  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  return lines.map((line) =>
    line.split(',').map((cell) => {
      const trimmed = cell.trim()
      if (trimmed === '') return null
      if (trimmed.toLowerCase() === 'true') return true
      if (trimmed.toLowerCase() === 'false') return false
      const asNumber = Number(trimmed)
      return Number.isFinite(asNumber) && trimmed !== '' ? asNumber : trimmed
    })
  )
}

export default function DocumentsPage() {
  const [recentDownloads, setRecentDownloads] = useState<DownloadItem[]>([])
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [docTitle, setDocTitle] = useState('')
  const [docContent, setDocContent] = useState('')
  const [docFormat, setDocFormat] = useState<DocumentFormat>('docx')
  const [docLoading, setDocLoading] = useState(false)
  const [docResult, setDocResult] = useState<DocumentToolResult | null>(null)

  const [excelTitle, setExcelTitle] = useState('')
  const [sheetName, setSheetName] = useState('Resumen')
  const [rowsText, setRowsText] = useState('KPI,Valor\nVentas,120000\nCostos,42000')
  const [excelLoading, setExcelLoading] = useState(false)
  const [excelResult, setExcelResult] = useState<ExcelToolResult | null>(null)

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_DOWNLOADS_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return
      const normalized: DownloadItem[] = parsed
        .filter((item) => item && typeof item === 'object')
        .map((item): DownloadItem => {
          const source: 'doc' | 'excel' = item.source === 'excel' ? 'excel' : 'doc'
          return {
            name: String(item.name || ''),
            url: String(item.url || ''),
            source,
            createdAt: String(item.createdAt || ''),
          }
        })
        .filter((item) => item.name && item.url)
        .slice(0, MAX_RECENT_DOWNLOADS)
      setRecentDownloads(normalized)
    } catch {
      // ignore malformed localStorage payloads
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(RECENT_DOWNLOADS_KEY, JSON.stringify(recentDownloads.slice(0, MAX_RECENT_DOWNLOADS)))
  }, [recentDownloads])

  const docFileNames = useMemo(() => {
    if (!docResult) return [] as string[]
    if (docResult.file_names && docResult.file_names.length > 0) return docResult.file_names
    return (docResult.files || []).map((path) => path.split(/[/\\]/).pop() || '').filter(Boolean)
  }, [docResult])

  const excelFileName = useMemo(() => {
    if (!excelResult) return ''
    if (excelResult.file_name) return excelResult.file_name
    if (!excelResult.file_path) return ''
    return excelResult.file_path.split(/[/\\]/).pop() || ''
  }, [excelResult])

  const canCreateDoc = useMemo(
    () => docTitle.trim().length > 0 && docContent.trim().length > 0 && !docLoading,
    [docTitle, docContent, docLoading]
  )

  const canCreateExcel = useMemo(
    () => excelTitle.trim().length > 0 && sheetName.trim().length > 0 && !excelLoading,
    [excelTitle, sheetName, excelLoading]
  )

  const onCreateDoc = async () => {
    if (!canCreateDoc) return
    setError(null)
    setDocResult(null)
    setDocLoading(true)
    try {
      const result = await createWordOrPdf({
        title: docTitle.trim(),
        content: docContent.trim(),
        format: docFormat,
      })
      setDocResult(result)

      const names = (result.file_names && result.file_names.length > 0)
        ? result.file_names
        : (result.files || []).map((path) => path.split(/[/\\]/).pop() || '').filter(Boolean)

      if (names.length > 0) {
        const now = new Date().toLocaleString()
        const records = names.map((name) => ({
          name,
          url: getDocDownloadUrl(name),
          source: 'doc' as const,
          createdAt: now,
        }))
        setRecentDownloads((prev) => [...records, ...prev].slice(0, MAX_RECENT_DOWNLOADS))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creando documento')
    } finally {
      setDocLoading(false)
    }
  }

  const onCreateExcel = async () => {
    if (!canCreateExcel) return
    setError(null)
    setExcelResult(null)
    setExcelLoading(true)
    try {
      const rows = parseRowsFromText(rowsText)
      const result = await createExcelWorkbook({
        title: excelTitle.trim(),
        sheets: [
          {
            name: sheetName.trim(),
            rows,
          },
        ],
      })
      setExcelResult(result)

      const fileName = result.file_name || (result.file_path ? (result.file_path.split(/[/\\]/).pop() || '') : '')
      if (fileName) {
        setRecentDownloads((prev) => [
          {
            name: fileName,
            url: getExcelDownloadUrl(fileName),
            source: 'excel' as const,
            createdAt: new Date().toLocaleString(),
          },
          ...prev,
        ].slice(0, MAX_RECENT_DOWNLOADS))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creando Excel')
    } finally {
      setExcelLoading(false)
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
          <div style={{ fontSize: 16, color: '#EDE6D6', fontWeight: 600, marginBottom: 4 }}>Word/PDF</div>
          <div style={{ fontSize: 11, color: '#8C6A3E' }}>
            Crea archivos DOCX, PDF o ambos usando el microservicio document_edit.
          </div>
        </div>

        <input
          value={docTitle}
          onChange={(e) => setDocTitle(e.target.value)}
          placeholder="Titulo"
          style={{ ...textInputStyle, marginBottom: 8 }}
        />

        <textarea
          value={docContent}
          onChange={(e) => setDocContent(e.target.value)}
          placeholder="Contenido del documento"
          style={{ ...textInputStyle, minHeight: 120, resize: 'vertical', marginBottom: 8 }}
        />

        <select
          value={docFormat}
          onChange={(e) => setDocFormat(e.target.value as DocumentFormat)}
          style={{ ...textInputStyle, marginBottom: 10 }}
        >
          <option value="docx">DOCX</option>
          <option value="pdf">PDF</option>
          <option value="both">DOCX + PDF</option>
        </select>

        <button
          onClick={onCreateDoc}
          disabled={!canCreateDoc}
          style={{
            fontSize: 12,
            padding: '7px 14px',
            borderRadius: 6,
            cursor: canCreateDoc ? 'pointer' : 'not-allowed',
            border: '1px solid rgba(198,161,91,0.45)',
            background: canCreateDoc ? 'rgba(198,161,91,0.08)' : 'transparent',
            color: '#C6A15B',
          }}
        >
          {docLoading ? 'Creando...' : 'Crear documento'}
        </button>

        {docResult && (
          <div
            style={{
              marginTop: 12,
              background: 'rgba(20,20,20,0.65)',
              border: '1px solid rgba(198,161,91,0.15)',
              borderRadius: 8,
              padding: 10,
            }}
          >
            <div style={{ fontSize: 11, color: '#8C6A3E', marginBottom: 8 }}>Archivos generados</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {docFileNames.map((name) => (
                <a
                  key={name}
                  href={getDocDownloadUrl(name)}
                  download={name}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 11,
                    padding: '5px 10px',
                    borderRadius: 999,
                    border: '1px solid rgba(198,161,91,0.4)',
                    color: '#C6A15B',
                    textDecoration: 'none',
                  }}
                >
                  Descargar {name}
                </a>
              ))}
            </div>
            <pre
              style={{
                margin: 0,
                color: '#EDE6D6',
                fontSize: 11,
                whiteSpace: 'pre-wrap',
              }}
            >
              {JSON.stringify(docResult, null, 2)}
            </pre>
          </div>
        )}
      </DashCard>

      <DashCard style={{ padding: '16px 18px' }} speed={0.00035}>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 16, color: '#EDE6D6', fontWeight: 600, marginBottom: 4 }}>Excel</div>
          <div style={{ fontSize: 11, color: '#8C6A3E' }}>
            Crea una hoja .xlsx enviando filas en formato CSV simple.
          </div>
        </div>

        <input
          value={excelTitle}
          onChange={(e) => setExcelTitle(e.target.value)}
          placeholder="Nombre del archivo"
          style={{ ...textInputStyle, marginBottom: 8 }}
        />

        <input
          value={sheetName}
          onChange={(e) => setSheetName(e.target.value)}
          placeholder="Nombre de hoja"
          style={{ ...textInputStyle, marginBottom: 8 }}
        />

        <textarea
          value={rowsText}
          onChange={(e) => setRowsText(e.target.value)}
          placeholder="KPI,Valor\nVentas,120000\nCostos,42000"
          style={{ ...textInputStyle, minHeight: 120, resize: 'vertical', marginBottom: 10 }}
        />

        <button
          onClick={onCreateExcel}
          disabled={!canCreateExcel}
          style={{
            fontSize: 12,
            padding: '7px 14px',
            borderRadius: 6,
            cursor: canCreateExcel ? 'pointer' : 'not-allowed',
            border: '1px solid rgba(106,154,176,0.45)',
            background: canCreateExcel ? 'rgba(46,64,87,0.2)' : 'transparent',
            color: '#6a9ab0',
          }}
        >
          {excelLoading ? 'Creando...' : 'Crear Excel'}
        </button>

        {excelResult && (
          <div
            style={{
              marginTop: 12,
              background: 'rgba(20,20,20,0.65)',
              border: '1px solid rgba(106,154,176,0.2)',
              borderRadius: 8,
              padding: 10,
            }}
          >
            {excelFileName && (
              <a
                href={getExcelDownloadUrl(excelFileName)}
                download={excelFileName}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-block',
                  marginBottom: 8,
                  fontSize: 11,
                  padding: '5px 10px',
                  borderRadius: 999,
                  border: '1px solid rgba(106,154,176,0.45)',
                  color: '#6a9ab0',
                  textDecoration: 'none',
                }}
              >
                Descargar {excelFileName}
              </a>
            )}
            <pre
              style={{
                margin: 0,
                color: '#EDE6D6',
                fontSize: 11,
                whiteSpace: 'pre-wrap',
              }}
            >
              {JSON.stringify(excelResult, null, 2)}
            </pre>
          </div>
        )}
      </DashCard>

      {error && (
        <div
          style={{
            gridColumn: '1 / -1',
            marginTop: 2,
            fontSize: 12,
            color: '#f08f8f',
            border: '1px solid rgba(240,143,143,0.3)',
            background: 'rgba(160,60,60,0.15)',
            borderRadius: 6,
            padding: '10px 12px',
          }}
        >
          {error}
        </div>
      )}

      <DashCard style={{ padding: '16px 18px', gridColumn: '1 / -1' }} speed={0.00035}>
        <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div>
            <div style={{ fontSize: 14, color: '#EDE6D6', fontWeight: 600, marginBottom: 4 }}>Descargas recientes</div>
            <div style={{ fontSize: 11, color: '#8C6A3E' }}>
              Historial local de archivos generados en esta sesion.
            </div>
          </div>

          <button
            onClick={() => setShowClearConfirm(true)}
            disabled={recentDownloads.length === 0}
            style={{
              fontSize: 11,
              padding: '6px 10px',
              borderRadius: 8,
              cursor: recentDownloads.length > 0 ? 'pointer' : 'not-allowed',
              border: '1px solid rgba(240,143,143,0.4)',
              background: recentDownloads.length > 0 ? 'rgba(160,60,60,0.15)' : 'transparent',
              color: recentDownloads.length > 0 ? '#f08f8f' : '#8C6A3E',
            }}
          >
            Limpiar historial
          </button>
        </div>

        <div style={{ fontSize: 10, color: '#8C6A3E', marginBottom: 10 }}>
          Se guarda en localStorage y se limpia con este boton.
        </div>

        {recentDownloads.length === 0 ? (
          <div style={{ fontSize: 12, color: '#8C6A3E' }}>Aun no hay descargas recientes.</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {recentDownloads.map((item, idx) => (
              <div
                key={`${item.name}-${idx}`}
                style={{
                  border: '1px solid rgba(198,161,91,0.14)',
                  background: 'rgba(20,20,20,0.6)',
                  borderRadius: 8,
                  padding: '8px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: '#EDE6D6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: 10, color: '#8C6A3E' }}>
                    {item.source.toUpperCase()} • {item.createdAt}
                  </div>
                </div>

                <a
                  href={item.url}
                  download={item.name}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 11,
                    padding: '5px 10px',
                    borderRadius: 999,
                    border: '1px solid rgba(198,161,91,0.35)',
                    color: '#C6A15B',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Descargar
                </a>
              </div>
            ))}
          </div>
        )}
      </DashCard>

      {showClearConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
            padding: 16,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 420,
              borderRadius: 10,
              border: '1px solid rgba(198,161,91,0.25)',
              background: '#171717',
              padding: 16,
            }}
          >
            <div style={{ fontSize: 15, color: '#EDE6D6', fontWeight: 600, marginBottom: 6 }}>
              Limpiar historial
            </div>
            <div style={{ fontSize: 12, color: '#8C6A3E', marginBottom: 14, lineHeight: 1.5 }}>
              Se eliminaran las descargas recientes guardadas en esta sesion y en localStorage.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setShowClearConfirm(false)}
                style={{
                  fontSize: 12,
                  padding: '7px 12px',
                  borderRadius: 7,
                  border: '1px solid rgba(198,161,91,0.25)',
                  background: 'transparent',
                  color: '#8C6A3E',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setRecentDownloads([])
                  setShowClearConfirm(false)
                }}
                style={{
                  fontSize: 12,
                  padding: '7px 12px',
                  borderRadius: 7,
                  border: '1px solid rgba(240,143,143,0.45)',
                  background: 'rgba(160,60,60,0.18)',
                  color: '#f08f8f',
                  cursor: 'pointer',
                }}
              >
                Si, limpiar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
