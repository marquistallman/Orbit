import { useEffect, useRef, useState } from 'react'
import DashCard from '../../components/ui/DashCard'
import ExpenseSystem from '../../components/orbit/ExpenseSystem'
import {
  getSummary, getTransactions,
  getDerivedCategories, getDerivedSummary, getChartDataForPeriod, syncTransactions,
  DEFAULT_CATEGORY_DEFS,
  type FinanceSummary, type Transaction,
  type MonthlyData, type ExpenseCategory, type CategoryDef,
} from '../../api/finance'

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (target === 0) { setValue(0); return }
    const start = Date.now()
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1)
      setValue(Math.round(target * p))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return value
}

function BarChart({ data }: { data: MonthlyData[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef  = useRef<number>(0)
  const progRef   = useRef(0)
  const hovRef    = useRef<{ col: number; bar: 'income' | 'expenses' } | null>(null)
  type BarRect = { x: number; y: number; w: number; h: number; type: 'income' | 'expenses'; col: number }
  const rectsRef = useRef<BarRect[]>([])
  const ctxRef   = useRef<CanvasRenderingContext2D | null>(null)
  const dimRef   = useRef({ W: 0, H: 0 })

  const redraw = (p: number) => {
    const ctx = ctxRef.current
    const { W, H } = dimRef.current
    if (!ctx || !W || !H) return
    ctx.clearRect(0, 0, W, H)
    rectsRef.current = []
    const max  = Math.max(...data.map(d => Math.max(d.income, d.expenses))) * 1.12
    const padT = 14, padB = 28, padL = 10, padR = 10
    const chartH = H - padT - padB
    const colW   = (W - padL - padR) / data.length
    const bw     = colW * 0.20
    const gap    = colW * 0.04
    data.forEach((d, i) => {
      const x  = padL + i * colW
      const cx = x + colW / 2
      const ix = cx - bw - gap / 2
      const ex = cx + gap / 2
      const incH = (d.income   / max) * chartH * p
      const expH = (d.expenses / max) * chartH * p
      const iy   = padT + chartH - incH
      const ey   = padT + chartH - expH
      const hovInc = hovRef.current?.col === i && hovRef.current?.bar === 'income'
      const hovExp = hovRef.current?.col === i && hovRef.current?.bar === 'expenses'
      ctx.fillStyle = hovInc ? 'rgba(74,154,89,0.9)' : 'rgba(74,154,89,0.55)'
      ctx.beginPath(); ctx.roundRect(ix, iy, bw, incH, [2,2,0,0]); ctx.fill()
      ctx.fillStyle = hovExp ? 'rgba(154,74,74,0.9)' : 'rgba(154,74,74,0.55)'
      ctx.beginPath(); ctx.roundRect(ex, ey, bw, expH, [2,2,0,0]); ctx.fill()
      ctx.fillStyle = hovRef.current?.col === i ? '#C6A15B' : '#8C6A3E'
      ctx.font = '10px Arial, sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(d.month, cx, H - 8)
      rectsRef.current.push(
        { x: ix, y: iy, w: bw, h: incH, type: 'income',   col: i },
        { x: ex, y: ey, w: bw, h: expH, type: 'expenses', col: i },
      )
      const active = hovInc ? { x: ix, y: iy, label: `Income: $${d.income.toLocaleString()}`, color: '#4a9a59' }
                   : hovExp ? { x: ex, y: ey, label: `Expenses: $${d.expenses.toLocaleString()}`, color: '#9a4a4a' }
                   : null
      if (active && p >= 1) {
        const tw = 140, th = 22
        let tx = active.x + bw / 2 - tw / 2
        tx = Math.max(4, Math.min(tx, W - tw - 4))
        const ty = Math.max(4, active.y - th - 6)
        ctx.fillStyle = 'rgba(27,27,27,0.95)'; ctx.strokeStyle = 'rgba(198,161,91,0.35)'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, 5); ctx.fill(); ctx.stroke()
        ctx.fillStyle = active.color; ctx.font = '10px Arial, sans-serif'
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(active.label, tx + tw / 2, ty + th / 2)
        ctx.textBaseline = 'alphabetic'
      }
    })
  }

  useEffect(() => {
    if (!data.length) return
    const canvas = canvasRef.current!
    const dpr = window.devicePixelRatio || 1
    const setup = () => {
      const W = canvas.offsetWidth, H = canvas.offsetHeight
      if (!W || !H) return
      canvas.width = W * dpr; canvas.height = H * dpr
      const ctx = canvas.getContext('2d')!
      ctx.scale(dpr, dpr)
      ctxRef.current = ctx; dimRef.current = { W, H }
      progRef.current = 0; cancelAnimationFrame(frameRef.current)
      const animate = () => {
        progRef.current = Math.min(progRef.current + 0.04, 1)
        redraw(progRef.current)
        if (progRef.current < 1) frameRef.current = requestAnimationFrame(animate)
      }
      animate()
    }
    requestAnimationFrame(() => requestAnimationFrame(setup))
    const onMove = (e: MouseEvent) => {
      if (progRef.current < 1) return
      const { W, H } = dimRef.current
      const rect = canvas.getBoundingClientRect()
      const mx = (e.clientX - rect.left) * (W / rect.width)
      const my = (e.clientY - rect.top)  * (H / rect.height)
      let found: typeof hovRef.current = null
      for (const r of rectsRef.current) {
        if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
          found = { col: r.col, bar: r.type }; break
        }
      }
      if (JSON.stringify(found) !== JSON.stringify(hovRef.current)) {
        hovRef.current = found; redraw(1)
      }
    }
    const onLeave = () => { hovRef.current = null; if (progRef.current >= 1) redraw(1) }
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseleave', onLeave)
    return () => { cancelAnimationFrame(frameRef.current); canvas.removeEventListener('mousemove', onMove); canvas.removeEventListener('mouseleave', onLeave) }
  }, [data])

  return <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
}

function PeriodTabs({ active, onChange }: { active: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {['7D', '1M', '3M', '1Y'].map(t => (
        <button key={t} onClick={() => onChange(t)} style={{
          fontSize: 10, padding: '3px 9px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
          border: active === t ? '1px solid #C6A15B' : '1px solid rgba(198,161,91,0.15)',
          background: active === t ? 'rgba(198,161,91,0.08)' : 'transparent',
          color: active === t ? '#C6A15B' : '#8C6A3E',
        }}>{t}</button>
      ))}
    </div>
  )
}

const PRESET_COLORS = ['#C6A15B','#4a9a59','#9a4a4a','#6a9ab0','#9a4a9a','#4a7a9a','#c47070','#8C6A3E','#2E4057']

// TxRow — sin picker, solo muestra info y botones básicos
interface TxRowProps {
  tx: Transaction
  hovTx: string | null
  onHover: (id: string | null) => void
  onMarkAs: (id: string, type: 'income' | 'expense') => void
  onDelete: (id: string) => void
  onOpenPicker: (id: string, el: HTMLElement) => void
  fmt: (n: number) => string
}

function TxRow({ tx, hovTx, onHover, onMarkAs, onDelete, onOpenPicker, fmt }: TxRowProps) {
  const isHov = hovTx === tx.id
  return (
    <div
      onMouseEnter={() => onHover(tx.id)}
      onMouseLeave={() => onHover(null)}
      style={{
        display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0',
        borderBottom: '1px solid rgba(198,161,91,0.06)', position: 'relative' as const,
        background: isHov ? 'rgba(198,161,91,0.03)' : 'transparent', transition: 'background 0.15s',
      }}
    >
      <div style={{
        width: 26, height: 26, borderRadius: '50%', background: '#1B1B1B',
        border: '1px solid rgba(198,161,91,0.18)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 11, color: tx.type === 'income' ? '#4a9a59' : '#9a4a4a', flexShrink: 0,
      }}>{tx.type === 'income' ? '↑' : '↓'}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#EDE6D6', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{tx.name}</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 1 }}>
          <div style={{ fontSize: 9, color: '#8C6A3E' }}>{tx.date}</div>
          {tx.category && <div style={{ fontSize: 8, padding: '1px 6px', borderRadius: 8, background: 'rgba(198,161,91,0.1)', color: '#C6A15B' }}>{tx.category}</div>}
          {tx.subcategory && <div style={{ fontSize: 8, padding: '1px 6px', borderRadius: 8, background: 'rgba(106,154,176,0.15)', color: '#6a9ab0' }}>{tx.subcategory}</div>}
        </div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: tx.type === 'income' ? '#4a9a59' : '#9a4a4a', flexShrink: 0 }}>
        {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
      </div>

      <div style={{ display: 'flex', gap: 4, opacity: isHov ? 1 : 0, transition: 'opacity 0.15s', flexShrink: 0 }}>
        <button onClick={() => onMarkAs(tx.id, 'income')} title="Mark as income" style={{
          width: 22, height: 22, borderRadius: 4, border: '1px solid rgba(74,154,89,0.4)',
          background: 'transparent', color: '#4a9a59', cursor: 'pointer', fontSize: 11,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>↑</button>
        <button onClick={() => onMarkAs(tx.id, 'expense')} title="Mark as expense" style={{
          width: 22, height: 22, borderRadius: 4, border: '1px solid rgba(154,74,74,0.4)',
          background: 'transparent', color: '#9a4a4a', cursor: 'pointer', fontSize: 11,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>↓</button>
        <button
          title="Assign category"
          onClick={e => { e.stopPropagation(); onOpenPicker(tx.id, e.currentTarget as HTMLElement) }}
          style={{
            width: 22, height: 22, borderRadius: 4, border: '1px solid rgba(198,161,91,0.4)',
            background: 'transparent', color: '#C6A15B', cursor: 'pointer', fontSize: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>🏷</button>
        <button onClick={() => onDelete(tx.id)} title="Delete" style={{
          width: 22, height: 22, borderRadius: 4, border: '1px solid rgba(154,74,74,0.25)',
          background: 'transparent', color: '#9a4a4a', cursor: 'pointer', fontSize: 11,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>
      </div>
    </div>
  )
}

export default function FinancePage() {
  const [summary,      setSummary]      = useState<FinanceSummary | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories,   setCategories]   = useState<ExpenseCategory[]>([])
  const [categoryDefs, setCategoryDefs] = useState<CategoryDef[]>(DEFAULT_CATEGORY_DEFS)
  const [period,       setPeriod]       = useState('1M')
  const [expanded,     setExpanded]     = useState(false)
  const [catModal,     setCatModal]     = useState(false)
  const [hovTx,        setHovTx]        = useState<string | null>(null)
  const [loading,      setLoading]      = useState(false)
  const [syncWarning,  setSyncWarning]  = useState<string | null>(null)

  // Picker state — managed in FinancePage so it always sees latest categoryDefs
  const [picker, setPicker] = useState<{
    txId: string; step: 'cat' | 'sub'; cat?: string
    top: number; left: number
  } | null>(null)

  // Cat modal state
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [newCatName,  setNewCatName]  = useState('')
  const [newCatColor, setNewCatColor] = useState('#C6A15B')
  const [newSubName,  setNewSubName]  = useState('')

  const income   = useCountUp(summary?.income   ?? 0)
  const expenses = useCountUp(summary?.expenses ?? 0)
  const savings  = useCountUp(summary?.savings  ?? 0)

  const recalc = (txs: Transaction[], defs: CategoryDef[]) => {
    setCategories(getDerivedCategories(txs, defs))
    getSummary().then(base => setSummary(getDerivedSummary(txs, base)))
  }

  const loadTransactions = (defs: CategoryDef[] = categoryDefs) => {
    
    setLoading(true)
    getTransactions().then(txs => {
      setTransactions(txs)
      recalc(txs, defs)
      setLoading(false)
    const cats = getDerivedCategories(txs, categoryDefs)
    console.log('CATS JSON:', JSON.stringify(cats))
    setCategories(cats)
    })
  }

  useEffect(() => { loadTransactions(DEFAULT_CATEGORY_DEFS) }, [])

  const fmt = (n: number) => `$${Math.abs(n).toLocaleString()}`

  const markAs = (id: string, type: 'income' | 'expense') => {
    setTransactions(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, type } : t)
      recalc(updated, categoryDefs)
      return updated
    })
  }

  const deleteTx = (id: string) => {
    setTransactions(prev => {
      const updated = prev.filter(t => t.id !== id)
      recalc(updated, categoryDefs)
      return updated
    })
  }

  const assignCategory = (txId: string, cat: string) => {
    setTransactions(prev => {
      const updated = prev.map(t => t.id === txId ? { ...t, category: cat, subcategory: undefined } : t)
      recalc(updated, categoryDefs)
      return updated
    })
    setPicker(null)
  }

  const assignSubcategory = (txId: string, cat: string, sub: string) => {
    setTransactions(prev => {
      const updated = prev.map(t => t.id === txId ? { ...t, category: cat, subcategory: sub } : t)
      recalc(updated, categoryDefs)
      return updated
    })
    setPicker(null)
  }

  const openPicker = (txId: string, el: HTMLElement) => {
    const rect = el.getBoundingClientRect()
    setPicker({ txId, step: 'cat', top: rect.bottom + 4, left: Math.min(rect.right - 280, window.innerWidth - 290) })
  }

  const addCategory = () => {
    if (!newCatName.trim()) return
    const newDef: CategoryDef = { name: newCatName.trim(), color: newCatColor, subcategories: [] }
    setCategoryDefs(prev => {
      const updated = [...prev, newDef]
      recalc(transactions, updated)
      return updated
    })
    setSelectedCat(newCatName.trim())
    setNewCatName(''); setNewCatColor('#C6A15B')
  }

  const deleteCategory = (name: string) => {
    setCategoryDefs(prev => {
      const updated = prev.filter(c => c.name !== name)
      recalc(transactions, updated)
      return updated
    })
    if (selectedCat === name) setSelectedCat(null)
  }

  const addSubcategory = () => {
    if (!newSubName.trim() || !selectedCat) return
    setCategoryDefs(prev => {
      const updated = prev.map(c => c.name === selectedCat
        ? { ...c, subcategories: [...c.subcategories, newSubName.trim()] }
        : c)
      recalc(transactions, updated)
      return updated
    })
    setNewSubName('')
  }

  const deleteSubcategory = (catName: string, subName: string) => {
    setCategoryDefs(prev => {
      const updated = prev.map(c => c.name === catName
        ? { ...c, subcategories: c.subcategories.filter(s => s !== subName) }
        : c)
      recalc(transactions, updated)
      return updated
    })
  }

  const selectedCatDef = categoryDefs.find(c => c.name === selectedCat)
  const pickerCatDef   = picker?.cat ? categoryDefs.find(c => c.name === picker.cat) : null
  const catKey = categories.map(c => `${c.name}:${c.percentage}:${c.color}`).join(',')

  const txRowProps = {
    hovTx, onHover: setHovTx, onMarkAs: markAs, onDelete: deleteTx,
    onOpenPicker: openPicker, fmt,
  }

  return (
    <div style={{
      padding: '16px 24px', display: 'grid',
      gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto auto auto',
      gap: 12, height: 'calc(100vh - 56px)',
      background: '#1a1a1a', overflow: 'hidden', boxSizing: 'border-box' as const,
    }} onClick={() => setPicker(null)}>

      {/* Metrics */}
      <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {[
          { label: 'Income',   value: fmt(income),   sub: `${summary?.incomeChange   ?? 0}% this month`, color: '#4a9a59' },
          { label: 'Expenses', value: fmt(expenses), sub: `${summary?.expensesChange ?? 0}% this month`, color: '#9a4a4a' },
          { label: 'Savings',  value: fmt(savings),  sub: `${summary?.savingsRate    ?? 0}% of income`,  color: '#C6A15B' },
        ].map(m => (
          <DashCard key={m.label} style={{ padding: '14px 20px' }} speed={0.00025}>
            <div style={{ fontSize: 9, color: '#8C6A3E', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: m.color, lineHeight: 1 }}>{m.value}</div>
            <div style={{ fontSize: 9, color: m.color, marginTop: 3, opacity: 0.8 }}>{m.sub}</div>
          </DashCard>
        ))}
      </div>

      {/* Income vs Expenses */}
      <DashCard speed={0.0004}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: '#8C6A3E', textTransform: 'uppercase' as const, letterSpacing: 2 }}>Income vs Expenses</div>
          <PeriodTabs active={period} onChange={setPeriod} />
        </div>
        <div style={{ height: 200, overflow: 'hidden' }}><BarChart data={getChartDataForPeriod(transactions, period)} /></div>
        <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
          {[['rgba(74,154,89,0.55)','Income'],['rgba(154,74,74,0.55)','Expenses']].map(([bg,label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#8C6A3E' }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: bg }} /> {label}
            </div>
          ))}
        </div>
      </DashCard>

      {/* Expense Breakdown */}
      <DashCard speed={0.0004} style={{ minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: '#8C6A3E', textTransform: 'uppercase' as const, letterSpacing: 2 }}>Expense breakdown</div>
          <button onClick={e => { e.stopPropagation(); setCatModal(true) }} style={{
            fontSize: 10, color: '#C6A15B', background: 'none', border: '1px solid rgba(198,161,91,0.3)',
            borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontFamily: 'Questrial, sans-serif',
          }}>Manage categories</button>
        </div>
        <div style={{ height: 260 }}>
          <ExpenseSystem key={catKey} categories={categories} />
        </div>
      </DashCard>

      {/* Recent Transactions */}
      <DashCard speed={0.0003} style={{ minHeight: 0, overflow: 'auto', gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: '#8C6A3E', textTransform: 'uppercase' as const, letterSpacing: 2 }}>Recent transactions</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => {
              setLoading(true)
              setSyncWarning(null)
              syncTransactions().then(({ transactions: txs, warning }) => {
                setTransactions(txs)
                recalc(txs, categoryDefs)
                setSyncWarning(warning)
                setLoading(false)
              })
            }} disabled={loading} style={{
              fontSize: 10, color: '#C6A15B', background: 'none', border: '1px solid rgba(198,161,91,0.3)',
              borderRadius: 5, padding: '3px 10px', cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Questrial, sans-serif', opacity: loading ? 0.6 : 1,
            }}>{loading ? 'Syncing...' : '↻ Sync'}</button>
            <div onClick={() => setExpanded(true)} style={{ fontSize: 10, color: '#C6A15B', cursor: 'pointer', lineHeight: '26px' }}>View all</div>
          </div>
        </div>
        {syncWarning && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', marginBottom: 8, borderRadius: 6,
            background: 'rgba(154,74,74,0.1)', border: '1px solid rgba(154,74,74,0.3)',
          }}>
            <span style={{ fontSize: 13, color: '#c47070' }}>⚠</span>
            <span style={{ fontSize: 11, color: '#c47070', flex: 1 }}>{syncWarning}</span>
            <button onClick={() => setSyncWarning(null)} style={{
              background: 'none', border: 'none', color: '#8C6A3E', cursor: 'pointer', fontSize: 13, lineHeight: 1,
            }}>✕</button>
          </div>
        )}
        {transactions.slice(0, 8).map(tx => <TxRow key={tx.id} tx={tx} {...txRowProps} />)}
      </DashCard>

      {/* Floating Category Picker — rendered in FinancePage so it always sees latest state */}
      {picker && (
        <div onClick={e => e.stopPropagation()} style={{
          position: 'fixed', top: picker.top, left: picker.left, zIndex: 200,
          background: '#1a1a1a', border: '1px solid rgba(198,161,91,0.25)',
          borderRadius: 8, overflow: 'hidden', minWidth: 220, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {picker.step === 'cat' ? (
            <>
              <div style={{ padding: '8px 12px', fontSize: 9, color: '#8C6A3E', textTransform: 'uppercase' as const, letterSpacing: 1, borderBottom: '1px solid rgba(198,161,91,0.08)' }}>
                Select category
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto' as const }}>
                {categoryDefs.map(cat => (
                  <div key={cat.name}
                    onClick={() => setPicker(p => p ? { ...p, step: 'sub', cat: cat.name } : null)}
                    style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 11, color: '#EDE6D6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(198,161,91,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color }} />
                      {cat.name}
                    </div>
                    <span style={{ fontSize: 9, color: '#8C6A3E' }}>›</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{ padding: '8px 12px', fontSize: 9, color: '#8C6A3E', textTransform: 'uppercase' as const, letterSpacing: 1, borderBottom: '1px solid rgba(198,161,91,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span onClick={() => setPicker(p => p ? { ...p, step: 'cat', cat: undefined } : null)} style={{ cursor: 'pointer', color: '#C6A15B' }}>‹</span>
                {picker.cat} › Subcategory
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto' as const }}>
                <div
                  onClick={() => assignCategory(picker.txId, picker.cat || '')}
                  style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 11, color: '#8C6A3E', fontStyle: 'italic' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(198,161,91,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >No subcategory</div>
                {pickerCatDef?.subcategories.map(sub => (
                  <div key={sub}
                    onClick={() => assignSubcategory(picker.txId, picker.cat || '', sub)}
                    style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 11, color: '#EDE6D6', display: 'flex', alignItems: 'center', gap: 8 }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(198,161,91,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: pickerCatDef.color, opacity: 0.6 }} />
                    {sub}
                  </div>
                ))}
                {(!pickerCatDef?.subcategories.length) && (
                  <div style={{ padding: '10px 12px', fontSize: 11, color: '#8C6A3E', textAlign: 'center' as const }}>
                    No subcategories — add them in Manage Categories
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Expanded Modal */}
      {expanded && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(10,10,10,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }}
          onClick={() => setExpanded(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '76vw', maxHeight: '84vh', background: '#1e1e1e',
            border: '1px solid rgba(198,161,91,0.25)', borderRadius: 10,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{ padding: '14px 22px', borderBottom: '1px solid rgba(198,161,91,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: '#8C6A3E', textTransform: 'uppercase' as const, letterSpacing: 2 }}>All transactions</div>
              <button onClick={() => setExpanded(false)} style={{ background: 'none', border: '1px solid rgba(198,161,91,0.2)', borderRadius: 5, color: '#8C6A3E', cursor: 'pointer', fontFamily: 'Questrial, sans-serif', fontSize: 11, padding: '4px 12px' }}>✕ Close</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '0 22px' }}>
              {transactions.map(tx => <TxRow key={tx.id} tx={tx} {...txRowProps} />)}
            </div>
            <div style={{ padding: '12px 22px', borderTop: '1px solid rgba(198,161,91,0.1)', display: 'flex', gap: 28, flexShrink: 0 }}>
              {[
                { label: 'Total income',   value: fmt(transactions.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0)),  color: '#4a9a59' },
                { label: 'Total expenses', value: fmt(transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0)), color: '#9a4a4a' },
                { label: 'Net',            value: fmt(Math.abs(transactions.reduce((s, t) => s + t.amount, 0))), color: '#C6A15B' },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 9, color: '#8C6A3E', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 3 }}>{s.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Manage Categories Modal */}
      {catModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(10,10,10,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }}
          onClick={() => setCatModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: 620, maxHeight: '82vh', background: '#1e1e1e',
            border: '1px solid rgba(198,161,91,0.25)', borderRadius: 10,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(198,161,91,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: '#8C6A3E', textTransform: 'uppercase' as const, letterSpacing: 2 }}>Manage categories</div>
              <button onClick={() => setCatModal(false)} style={{ background: 'none', border: '1px solid rgba(198,161,91,0.2)', borderRadius: 5, color: '#8C6A3E', cursor: 'pointer', fontFamily: 'Questrial, sans-serif', fontSize: 11, padding: '4px 12px' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              {/* Left — Categories */}
              <div style={{ width: 240, borderRight: '1px solid rgba(198,161,91,0.1)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(198,161,91,0.08)', flexShrink: 0 }}>
                  <div style={{ fontSize: 9, color: '#8C6A3E', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>Categories</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="New category" style={{
                      flex: 1, background: '#1B1B1B', border: '1px solid rgba(198,161,91,0.2)',
                      borderRadius: 5, padding: '5px 8px', fontSize: 11, color: '#EDE6D6',
                      fontFamily: 'Questrial, sans-serif', outline: 'none',
                    }} />
                    <button onClick={addCategory} style={{
                      background: 'rgba(198,161,91,0.1)', border: '1px solid #C6A15B',
                      borderRadius: 5, color: '#C6A15B', cursor: 'pointer',
                      fontFamily: 'Questrial, sans-serif', fontSize: 11, padding: '5px 10px',
                    }}>+</button>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const, marginTop: 6 }}>
                    {PRESET_COLORS.map(c => (
                      <div key={c} onClick={() => setNewCatColor(c)} style={{
                        width: 14, height: 14, borderRadius: '50%', background: c, cursor: 'pointer',
                        border: newCatColor === c ? '2px solid #EDE6D6' : '2px solid transparent',
                      }} />
                    ))}
                  </div>
                </div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {categoryDefs.map(cat => (
                    <div key={cat.name} onClick={() => setSelectedCat(cat.name)} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', cursor: 'pointer',
                      background: selectedCat === cat.name ? 'rgba(198,161,91,0.08)' : 'transparent',
                      borderBottom: '1px solid rgba(198,161,91,0.04)',
                    }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: 12, color: '#EDE6D6' }}>{cat.name}</div>
                      <div style={{ fontSize: 9, color: '#8C6A3E' }}>{cat.subcategories.length} subs</div>
                      <button onClick={e => { e.stopPropagation(); deleteCategory(cat.name) }}
                        style={{ background: 'none', border: 'none', color: '#9a4a4a', cursor: 'pointer', fontSize: 11 }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — Subcategories */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {selectedCatDef ? (
                  <>
                    <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(198,161,91,0.08)', flexShrink: 0 }}>
                      <div style={{ fontSize: 9, color: '#8C6A3E', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>
                        Subcategories of <span style={{ color: selectedCatDef.color }}>{selectedCatDef.name}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input value={newSubName} onChange={e => setNewSubName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addSubcategory()}
                          placeholder="New subcategory" style={{
                            flex: 1, background: '#1B1B1B', border: '1px solid rgba(198,161,91,0.2)',
                            borderRadius: 5, padding: '5px 8px', fontSize: 11, color: '#EDE6D6',
                            fontFamily: 'Questrial, sans-serif', outline: 'none',
                          }} />
                        <button onClick={addSubcategory} style={{
                          background: 'rgba(198,161,91,0.1)', border: '1px solid #C6A15B',
                          borderRadius: 5, color: '#C6A15B', cursor: 'pointer',
                          fontFamily: 'Questrial, sans-serif', fontSize: 11, padding: '5px 10px',
                        }}>+</button>
                      </div>
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1, padding: '6px 0' }}>
                      {selectedCatDef.subcategories.length === 0 ? (
                        <div style={{ padding: '20px 14px', fontSize: 11, color: '#8C6A3E', textAlign: 'center' as const }}>No subcategories yet</div>
                      ) : selectedCatDef.subcategories.map(sub => (
                        <div key={sub} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderBottom: '1px solid rgba(198,161,91,0.04)' }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: selectedCatDef.color, opacity: 0.6 }} />
                          <div style={{ flex: 1, fontSize: 12, color: '#EDE6D6' }}>{sub}</div>
                          <button onClick={() => deleteSubcategory(selectedCatDef.name, sub)}
                            style={{ background: 'none', border: 'none', color: '#9a4a4a', cursor: 'pointer', fontSize: 11 }}>✕</button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, fontSize: 11, color: '#8C6A3E' }}>
                    ← Select a category to manage subcategories
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
