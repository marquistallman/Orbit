import { useEffect, useRef, useState } from 'react'
import DashCard from '../../components/ui/DashCard'
import { getMessages, summarizeMessage, suggestReply, sendReply, syncMessages, formatEmailDate, telegramSendMessage, type Message } from '../../api/messages'

const SOURCE_COLORS: Record<string, string> = {
  gmail:    '#c47070',
  telegram: '#5b9bd5',
}

function PulseLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 0' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 5, height: 5, borderRadius: '50%',
          background: '#C6A15B',
          animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:0.2;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }`}</style>
    </div>
  )
}

export default function MessagesPage() {
  const [messages, setMessages]         = useState<Message[]>([])
  const [selected, setSelected]         = useState<Message | null>(null)
  const [filter, setFilter]             = useState<'all' | 'unread' | 'urgent'>('all')
  const [source, setSource]             = useState<'all' | 'gmail' | 'telegram'>('all')
  const [loading, setLoading]           = useState(true)
  const [summary, setSummary]           = useState('')
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [replyLoading, setReplyLoading] = useState(false)
  const [replyText, setReplyText]       = useState('')
  const [sending,   setSending]         = useState(false)
  const [sent,      setSent]            = useState(false)
  const [sendError, setSendError]       = useState<string | null>(null)
  const [syncing,   setSyncing]         = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [replyText])

  useEffect(() => {
    getMessages().then(msgs => {
      setMessages(msgs)
      setSelected(msgs[0])
      setLoading(false)
    })
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    try {
      await syncMessages()
      const msgs = await getMessages()
      setMessages(msgs)
      if (!selected) setSelected(msgs[0] ?? null)
    } catch {
      // sync failed silently
    } finally {
      setSyncing(false)
    }
  }

  const handleSelect = (msg: Message) => {
    setSelected(msg)
    setSummary('')
    setReplyText('')
    setSent(false)
    setSendError(null)
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m))
  }

  const handleSummarize = async () => {
    if (!selected) return
    setSummaryLoading(true)
    const s = await summarizeMessage(selected.id, selected.body)
    setSummary(s)
    setSummaryLoading(false)
  }

  const handleSend = async () => {
    if (!selected || !replyText.trim()) return
    setSending(true)
    setSent(false)
    setSendError(null)
    try {
      if (selected.source === 'telegram' && selected.chat_id) {
        await telegramSendMessage(selected.chat_id, replyText)
      } else {
        await sendReply(selected.email, `Re: ${selected.subject}`, replyText)
      }
      setReplyText('')
      setSent(true)
      setTimeout(() => setSent(false), 3000)
    } catch (e: unknown) {
      setSendError(e instanceof Error ? e.message : 'Error al enviar')
    } finally {
      setSending(false)
    }
  }

  const handleSuggestReply = async () => {
    if (!selected) return
    setReplyLoading(true)
    const r = await suggestReply(selected.body)
    setReplyText(r)
    setReplyLoading(false)
  }

  const filtered = messages.filter(m => {
    if (filter === 'unread' && m.read) return false
    if (filter === 'urgent' && !m.urgent) return false
    if (source !== 'all' && m.source !== source) return false
    return true
  })

  const unreadCount = messages.filter(m => !m.read).length

  return (
    <div style={{
      padding: '20px 24px',
      display: 'grid',
      gridTemplateColumns: '280px 1fr',
      gap: 14,
      height: 'calc(100vh - 56px)',
      background: '#1a1a1a',
      overflow: 'hidden',
    }}>

      {/* ── LEFT: Message list ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>

        {/* Header + filters */}
        <DashCard style={{ padding: '12px 14px', flexShrink: 0 }} speed={0.0004}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#EDE6D6' }}>Mensajes</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {unreadCount > 0 && (
                <div style={{
                  fontSize: 9, background: 'rgba(198,161,91,0.15)', color: '#C6A15B',
                  border: '1px solid rgba(198,161,91,0.3)', borderRadius: 10, padding: '2px 7px',
                }}>{unreadCount} sin leer</div>
              )}
              <button onClick={handleSync} disabled={syncing} style={{
                fontSize: 10, padding: '3px 10px', borderRadius: 5, cursor: syncing ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                border: '1px solid rgba(198,161,91,0.3)',
                background: 'rgba(198,161,91,0.08)',
                color: '#C6A15B',
                opacity: syncing ? 0.6 : 1,
              }}>
                {syncing ? 'Sync...' : '↻ Sync'}
              </button>
            </div>
          </div>

          {/* Status filters */}
          <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
            {(['all', 'unread', 'urgent'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                fontSize: 10, padding: '3px 9px', borderRadius: 4, cursor: 'pointer',
                fontFamily: 'inherit',
                border: filter === f ? '1px solid #C6A15B' : '1px solid rgba(198,161,91,0.15)',
                background: filter === f ? 'rgba(198,161,91,0.1)' : 'transparent',
                color: filter === f ? '#C6A15B' : '#8C6A3E',
              }}>
                {{ all: 'All', unread: 'Unread', urgent: 'Urgent' }[f]}
              </button>
            ))}
          </div>

          {/* Source filters */}
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
            {(['all', 'gmail', 'telegram'] as const).map(s => (
              <button key={s} onClick={() => setSource(s)} style={{
                fontSize: 9, padding: '2px 8px', borderRadius: 10, cursor: 'pointer',
                fontFamily: 'inherit',
                border: source === s ? `1px solid ${SOURCE_COLORS[s] ?? '#C6A15B'}` : '1px solid rgba(198,161,91,0.12)',
                background: 'transparent',
                color: source === s ? (SOURCE_COLORS[s] ?? '#C6A15B') : '#8C6A3E',
              }}>
                {s === 'all' ? '● All' : s === 'gmail' ? '● Gmail' : '● Telegram'}
              </button>
            ))}
          </div>
        </DashCard>

        {/* Message rows */}
        <DashCard style={{ padding: 0, flex: 1, minHeight: 0, overflow: 'auto' }} speed={0.0003}>
          {loading ? (
            <div style={{ padding: 16 }}><PulseLoader /></div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 16, fontSize: 12, color: '#8C6A3E', textAlign: 'center' }}>Sin mensajes</div>
          ) : filtered.map(msg => (
            <div
              key={msg.id}
              onClick={() => handleSelect(msg)}
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid rgba(198,161,91,0.07)',
                cursor: 'pointer',
                background: selected?.id === msg.id ? 'rgba(198,161,91,0.07)' : 'transparent',
                borderLeft: selected?.id === msg.id ? '2px solid #C6A15B' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 11, color: msg.read ? '#8C6A3E' : '#EDE6D6', fontWeight: msg.read ? 400 : 600 }}>
                  {msg.from}
                </span>
                <span style={{ fontSize: 9, color: '#8C6A3E' }}>{formatEmailDate(msg.date)}</span>
              </div>
              <div style={{ fontSize: 11, color: '#EDE6D6', marginBottom: 3, fontWeight: msg.read ? 400 : 500 }}>
                {msg.subject}
              </div>
              <div style={{ fontSize: 10, color: '#8C6A3E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {msg.preview}
              </div>
              <div style={{ display: 'flex', gap: 5, marginTop: 5 }}>
                {!msg.read && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#C6A15B' }} />}
                <span style={{
                  fontSize: 8, padding: '1px 5px', borderRadius: 8,
                  background: `${SOURCE_COLORS[msg.source]}20`,
                  color: SOURCE_COLORS[msg.source],
                  border: `1px solid ${SOURCE_COLORS[msg.source]}40`,
                }}>{msg.source}</span>
                {msg.urgent && (
                  <span style={{
                    fontSize: 8, padding: '1px 5px', borderRadius: 8,
                    background: 'rgba(198,161,91,0.1)', color: '#C6A15B',
                    border: '1px solid rgba(198,161,91,0.3)',
                  }}>urgente</span>
                )}
              </div>
            </div>
          ))}
        </DashCard>
      </div>

      {/* ── RIGHT: Message detail ── */}
      {selected ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>

          {/* Header */}
          <DashCard style={{ padding: '14px 18px', flexShrink: 0 }} speed={0.0004}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#EDE6D6', marginBottom: 6 }}>
              {selected.subject}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: '#8C6A3E' }}>
                De: <span style={{ color: '#C6A15B' }}>{selected.from}</span> · {selected.email}
              </span>
              <span style={{ fontSize: 10, color: '#8C6A3E' }}>{formatEmailDate(selected.date)}</span>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { label: 'Reply', primary: true },
                { label: 'Forward', primary: false },
                { label: 'Archive', primary: false },
              ].map(btn => (
                <button key={btn.label} style={{
                  fontSize: 11, padding: '5px 13px', borderRadius: 5, cursor: 'pointer',
                  fontFamily: 'inherit',
                  border: btn.primary ? '1px solid #C6A15B' : '1px solid rgba(198,161,91,0.2)',
                  background: 'transparent',
                  color: btn.primary ? '#C6A15B' : '#8C6A3E',
                }}>{btn.label}</button>
              ))}
              <button onClick={handleSummarize} disabled={summaryLoading} style={{
                fontSize: 11, padding: '5px 13px', borderRadius: 5, cursor: 'pointer',
                fontFamily: 'inherit',
                border: '1px solid rgba(46,64,87,0.6)',
                background: 'rgba(46,64,87,0.2)',
                color: '#6a9ab0',
              }}>
                {summaryLoading ? '...' : 'Summarize with AI'}
              </button>
              <button onClick={handleSuggestReply} disabled={replyLoading} style={{
                fontSize: 11, padding: '5px 13px', borderRadius: 5, cursor: 'pointer',
                fontFamily: 'inherit',
                border: '1px solid rgba(46,64,87,0.6)',
                background: 'rgba(46,64,87,0.2)',
                color: '#6a9ab0',
              }}>
                {replyLoading ? '...' : 'Reply with AI'}
              </button>
            </div>
          </DashCard>

          {/* AI Summary */}
          {(summary || summaryLoading) && (
            <DashCard style={{ padding: '12px 16px', flexShrink: 0 }} speed={0.0003}>
              <div style={{ fontSize: 9, color: '#6a9ab0', textTransform: 'uppercase' as const, letterSpacing: 1.5, marginBottom: 6 }}>
                Resumen del agente Orbit
              </div>
              {summaryLoading ? <PulseLoader /> : (
                <p style={{ fontSize: 12, color: '#EDE6D680', lineHeight: 1.6 }}>{summary}</p>
              )}
            </DashCard>
          )}

          {/* Body */}
          <DashCard style={{ padding: '16px 18px', flex: 1, minHeight: 0, overflow: 'auto' }} speed={0.0003}>
            <div style={{ fontSize: 13, color: '#EDE6D6', lineHeight: 1.8, whiteSpace: 'pre-wrap', opacity: 0.88 }}>
              {selected.body}
            </div>
          </DashCard>

          {/* Reply box */}
          <DashCard style={{ padding: '12px 16px', flexShrink: 0 }} speed={0.0003}>
            {replyLoading && <PulseLoader />}
            <textarea
              ref={textareaRef}
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              style={{
                width: '100%', background: '#1B1B1B',
                border: '1px solid rgba(198,161,91,0.2)',
                borderRadius: 6, padding: '9px 12px',
                fontSize: 12, color: '#EDE6D6',
                fontFamily: 'inherit', resize: 'none',
                minHeight: 80, height: 'auto', outline: 'none', lineHeight: 1.6,
                boxSizing: 'border-box', overflow: 'hidden',
              }}
            />
            {sendError && (
              <div style={{ fontSize: 11, color: '#c47070', marginTop: 6 }}>⚠ {sendError}</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={handleSend} disabled={sending || !replyText.trim()} style={{
                background: sent ? '#4a9a59' : '#C6A15B', border: 'none', borderRadius: 6,
                padding: '7px 20px', fontSize: 12, fontWeight: 600,
                color: '#1B1B1B', cursor: sending || !replyText.trim() ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', opacity: sending || !replyText.trim() ? 0.7 : 1,
                transition: 'background 0.3s',
              }}>
                {sent ? '✓ Enviado' : sending ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </DashCard>
        </div>
      ) : (
        <DashCard style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} speed={0.0003}>
          <span style={{ fontSize: 12, color: '#8C6A3E' }}>Selecciona un mensaje</span>
        </DashCard>
      )}
    </div>
  )
}
