import { useEffect, useRef, useState } from 'react'
import DashCard from '../../components/ui/DashCard'
import ExpenseSystem from '../../components/orbit/ExpenseSystem'
import {
  getSummary, getMonthly, getTransactions, getInvestments, getCategories,
  type FinanceSummary, type Transaction, type Investment,
  type MonthlyData, type ExpenseCategory,
} from '../../api/finance'

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (target === 0) return
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

// ── Bar chart ─────────────────────────────────────────────────
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
      ctx.font = '10px Arial, sans-serif'
      ctx.textAlign = 'center'
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
        ctx.fillStyle = 'rgba(27,27,27,0.95)'
        ctx.strokeStyle = 'rgba(198,161,91,0.35)'
        ctx.lineWidth = 1
        ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, 5); ctx.fill(); ctx.stroke()
        ctx.fillStyle = active.color
        ctx.font = '10px Arial, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
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
      const W = canvas.offsetWidth
      const H = canvas.offsetHeight
      if (!W || !H) return
      canvas.width  = W * dpr
      canvas.height = H * dpr
      const ctx = canvas.getContext('2d')!
      ctx.scale(dpr, dpr)
      ctxRef.current = ctx
      dimRef.current = { W, H }
      progRef.current = 0
      cancelAnimationFrame(frameRef.current)
      const animate = () => {
        progRef.current = Math.min(progRef.current + 0.04, 1)
        redraw(progRef.current)
        if (progRef.current < 1) frameRef.current = requestAnimationFrame(animate)
      }
      animate()
    }

    // Wait for layout with rAF to ensure offsetWidth/Height are available
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
    return () => {
      cancelAnimationFrame(frameRef.current)
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseleave', onLeave)
    }
  }, [data])

  return <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
}

function Label({ children, action, onAction }: { children: string; action?: string; onAction?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: '#8C6A3E', textTransform: 'uppercase' as const, letterSpacing: 2 }}>{children}</div>
      {action && (
        <div onClick={onAction} style={{ fontSize: 10, color: '#C6A15B', cursor: onAction ? 'pointer' : 'default' }}>
          {action}
        </div>
      )}
    </div>
  )
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

export default function FinancePage() {
  const [summary,      setSummary]      = useState<FinanceSummary | null>(null)
  const [monthly,      setMonthly]      = useState<MonthlyData[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [investments,  setInvestments]  = useState<Investment[]>([])
  const [categories,   setCategories]   = useState<ExpenseCategory[]>([])
  const [period,       setPeriod]       = useState('1M')
  const [expanded,     setExpanded]     = useState(false)
  const [expandedInv,  setExpandedInv]  = useState(false)

  const income     = useCountUp(summary?.income      ?? 0)
  const expenses   = useCountUp(summary?.expenses    ?? 0)
  const savings    = useCountUp(summary?.savings     ?? 0)
  const invest_val = useCountUp(summary?.investments ?? 0)

  useEffect(() => {
    getSummary().then(setSummary)
    getMonthly().then(setMonthly)
    getTransactions().then(setTransactions)
    getInvestments().then(setInvestments)
    getCategories().then(setCategories)
  }, [])

  const fmt = (n: number) => `$${n.toLocaleString()}`

  return (
    <>
    <div style={{
      padding: '16px 24px',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: 'auto auto 1fr',
      gap: 12,
      height: 'calc(100vh - 56px)',
      background: '#1a1a1a',
      overflow: 'hidden',
      boxSizing: 'border-box',
    }}>

      {/* Metrics */}
      <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        {[
          { label: 'Income',      value: fmt(income),     sub: `+${summary?.incomeChange ?? 0}% this month`,   color: '#4a9a59' },
          { label: 'Expenses',    value: fmt(expenses),   sub: `+${summary?.expensesChange ?? 0}% this month`, color: '#9a4a4a' },
          { label: 'Savings',     value: fmt(savings),    sub: `${summary?.savingsRate ?? 0}% of income`,      color: '#C6A15B' },
          { label: 'Investments', value: fmt(invest_val), sub: `+${summary?.investmentsReturn ?? 0}% return`,  color: '#C6A15B' },
        ].map(m => (
          <DashCard key={m.label} style={{ padding: '10px 14px' }} speed={0.00025}>
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
        <div style={{ height: 200, overflow: 'hidden' }}>
          <BarChart data={monthly} />
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#8C6A3E' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(74,154,89,0.55)' }} /> Income
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#8C6A3E' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(154,74,74,0.55)' }} /> Expenses
          </div>
        </div>
      </DashCard>

      {/* Expense Breakdown */}
      <DashCard speed={0.0004} style={{ minHeight: 0 }}>
        <Label>Expense breakdown</Label>
        <div style={{ height: 280 }}>
          <ExpenseSystem categories={categories} />
        </div>
      </DashCard>

      {/* Recent Transactions */}
      <DashCard speed={0.0003} style={{ minHeight: 0, overflow: 'auto' }}>
        <Label action="View all" onAction={() => setExpanded(true)}>Recent transactions</Label>
        {transactions.map((tx, i) => (
          <div key={tx.id} style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '7px 0',
            borderBottom: i < transactions.length - 1 ? '1px solid rgba(198,161,91,0.06)' : 'none',
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: '#1B1B1B', border: '1px solid rgba(198,161,91,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: tx.type === 'income' ? '#4a9a59' : '#9a4a4a', flexShrink: 0,
            }}>
              {tx.type === 'income' ? '↑' : '↓'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#EDE6D6', fontWeight: 500 }}>{tx.name}</div>
              <div style={{ fontSize: 9, color: '#8C6A3E', marginTop: 1 }}>{tx.date}</div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: tx.type === 'income' ? '#4a9a59' : '#9a4a4a' }}>
              {tx.type === 'income' ? '+' : ''}{fmt(Math.abs(tx.amount))}
            </div>
          </div>
        ))}
      </DashCard>

      {/* Investments */}
      <DashCard speed={0.0003} style={{ minHeight: 0, overflow: 'auto' }}>
        <Label action="Manage" onAction={() => setExpandedInv(true)}>Investments</Label>
        {investments.map(inv => (
          <div key={inv.id} style={{
            background: '#1B1B1B', border: '1px solid rgba(198,161,91,0.1)',
            borderRadius: 6, padding: '8px 10px', marginBottom: 7,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ flex: 1, fontSize: 11, color: '#EDE6D6', fontWeight: 500 }}>{inv.name}</div>
            <div style={{ fontSize: 11, color: '#EDE6D6' }}>{fmt(inv.value)}</div>
            <div style={{
              fontSize: 9, padding: '1px 6px', borderRadius: 10, flexShrink: 0,
              background: inv.change >= 0 ? 'rgba(74,154,89,0.14)' : 'rgba(154,74,74,0.14)',
              color:      inv.change >= 0 ? '#4a9a59' : '#9a4a4a',
              border:     `1px solid ${inv.change >= 0 ? 'rgba(74,154,89,0.3)' : 'rgba(154,74,74,0.3)'}`,
            }}>
              {inv.change >= 0 ? '+' : ''}{inv.change}%
            </div>
            <div style={{ width: 55, height: 3, background: 'rgba(198,161,91,0.12)', borderRadius: 2, flexShrink: 0 }}>
              <div style={{
                width: `${inv.allocation}%`, height: '100%', borderRadius: 2,
                background: inv.change >= 0 ? '#C6A15B' : '#9a4a4a',
                transition: 'width 0.8s ease',
              }} />
            </div>
          </div>
        ))}
      </DashCard>
    </div>

      {/* ── Expanded Transactions Overlay ── */}
      {expanded && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(10,10,10,0.82)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(3px)',
        }} onClick={() => setExpanded(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '72vw', maxHeight: '80vh',
              background: '#1e1e1e',
              border: '1px solid rgba(198,161,91,0.25)',
              borderRadius: 10,
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{
              padding: '16px 22px',
              borderBottom: '1px solid rgba(198,161,91,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div style={{ fontSize: 10, color: '#8C6A3E', textTransform: 'uppercase' as const, letterSpacing: 2 }}>
                Recent transactions
              </div>
              <button onClick={() => setExpanded(false)} style={{
                background: 'none', border: '1px solid rgba(198,161,91,0.2)',
                borderRadius: 5, color: '#8C6A3E', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 11, padding: '4px 12px',
              }}>✕ Close</button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '36px 1fr 140px 110px 100px',
              gap: 12, padding: '10px 22px',
              borderBottom: '1px solid rgba(198,161,91,0.08)',
              flexShrink: 0,
            }}>
              {['', 'Description', 'Date', 'Category', 'Amount'].map(h => (
                <div key={h} style={{ fontSize: 9, color: '#8C6A3E', textTransform: 'uppercase' as const, letterSpacing: 1.5 }}>{h}</div>
              ))}
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {transactions.map((tx, i) => (
                <div key={tx.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '36px 1fr 140px 110px 100px',
                    gap: 12, padding: '13px 22px',
                    borderBottom: i < transactions.length - 1 ? '1px solid rgba(198,161,91,0.05)' : 'none',
                    alignItems: 'center',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(198,161,91,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: '#1B1B1B', border: '1px solid rgba(198,161,91,0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, color: tx.type === 'income' ? '#4a9a59' : '#9a4a4a',
                  }}>{tx.type === 'income' ? '↑' : '↓'}</div>
                  <div style={{ fontSize: 13, color: '#EDE6D6', fontWeight: 500 }}>{tx.name}</div>
                  <div style={{ fontSize: 11, color: '#8C6A3E' }}>{tx.date}</div>
                  <div style={{
                    fontSize: 10, padding: '3px 9px', borderRadius: 10, display: 'inline-block',
                    background: tx.type === 'income' ? 'rgba(74,154,89,0.1)' : 'rgba(154,74,74,0.1)',
                    color: tx.type === 'income' ? '#4a9a59' : '#9a4a4a',
                    border: `1px solid ${tx.type === 'income' ? 'rgba(74,154,89,0.25)' : 'rgba(154,74,74,0.25)'}`,
                  }}>{tx.type === 'income' ? 'Income' : 'Expense'}</div>
                  <div style={{
                    fontSize: 13, fontWeight: 700, textAlign: 'right' as const,
                    color: tx.type === 'income' ? '#4a9a59' : '#9a4a4a',
                  }}>{tx.type === 'income' ? '+' : ''}{fmt(Math.abs(tx.amount))}</div>
                </div>
              ))}
            </div>

            <div style={{
              padding: '12px 22px',
              borderTop: '1px solid rgba(198,161,91,0.1)',
              display: 'flex', gap: 28, flexShrink: 0,
            }}>
              {[
                { label: 'Total income',   value: fmt(transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)), color: '#4a9a59' },
                { label: 'Total expenses', value: fmt(transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0)), color: '#9a4a4a' },
                { label: 'Net',            value: fmt(transactions.reduce((s, t) => s + t.amount, 0)), color: '#C6A15B' },
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

      {/* ── Expanded Investments Overlay ── */}
      {expandedInv && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(10,10,10,0.82)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(3px)',
        }} onClick={() => setExpandedInv(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '68vw', maxHeight: '80vh',
              background: '#1e1e1e',
              border: '1px solid rgba(198,161,91,0.25)',
              borderRadius: 10,
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '16px 22px',
              borderBottom: '1px solid rgba(198,161,91,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div style={{ fontSize: 10, color: '#8C6A3E', textTransform: 'uppercase' as const, letterSpacing: 2 }}>
                Investments
              </div>
              <button onClick={() => setExpandedInv(false)} style={{
                background: 'none', border: '1px solid rgba(198,161,91,0.2)',
                borderRadius: 5, color: '#8C6A3E', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 11, padding: '4px 12px',
              }}>✕ Close</button>
            </div>

            {/* Column headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 110px 90px 90px 120px',
              gap: 12, padding: '10px 22px',
              borderBottom: '1px solid rgba(198,161,91,0.08)',
              flexShrink: 0,
            }}>
              {['Asset', 'Value', 'Return', 'Allocation', 'Performance'].map(h => (
                <div key={h} style={{ fontSize: 9, color: '#8C6A3E', textTransform: 'uppercase' as const, letterSpacing: 1.5 }}>{h}</div>
              ))}
            </div>

            {/* Rows */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {investments.map((inv, i) => (
                <div key={inv.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 110px 90px 90px 120px',
                    gap: 12, padding: '16px 22px',
                    borderBottom: i < investments.length - 1 ? '1px solid rgba(198,161,91,0.05)' : 'none',
                    alignItems: 'center',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(198,161,91,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Name */}
                  <div style={{ fontSize: 14, color: '#EDE6D6', fontWeight: 500 }}>{inv.name}</div>

                  {/* Value */}
                  <div style={{ fontSize: 14, color: '#EDE6D6' }}>{fmt(inv.value)}</div>

                  {/* Return badge */}
                  <div style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 10, display: 'inline-block',
                    background: inv.change >= 0 ? 'rgba(74,154,89,0.12)' : 'rgba(154,74,74,0.12)',
                    color: inv.change >= 0 ? '#4a9a59' : '#9a4a4a',
                    border: `1px solid ${inv.change >= 0 ? 'rgba(74,154,89,0.3)' : 'rgba(154,74,74,0.3)'}`,
                    fontWeight: 600,
                  }}>
                    {inv.change >= 0 ? '+' : ''}{inv.change}%
                  </div>

                  {/* Allocation % */}
                  <div style={{ fontSize: 13, color: '#8C6A3E' }}>{inv.allocation}%</div>

                  {/* Progress bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 4, background: 'rgba(198,161,91,0.1)', borderRadius: 2 }}>
                      <div style={{
                        width: `${inv.allocation}%`, height: '100%', borderRadius: 2,
                        background: inv.change >= 0 ? '#C6A15B' : '#9a4a4a',
                        transition: 'width 0.8s ease',
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer summary */}
            <div style={{
              padding: '14px 22px',
              borderTop: '1px solid rgba(198,161,91,0.1)',
              display: 'flex', gap: 32, flexShrink: 0,
            }}>
              {[
                { label: 'Total invested', value: fmt(investments.reduce((s, i) => s + i.value, 0)), color: '#C6A15B' },
                { label: 'Avg return',     value: `${(investments.reduce((s, i) => s + i.change, 0) / investments.length).toFixed(1)}%`, color: '#4a9a59' },
                { label: 'Best asset',     value: investments.reduce((a, b) => a.change > b.change ? a : b).name, color: '#EDE6D6' },
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
    </>
  )
}
