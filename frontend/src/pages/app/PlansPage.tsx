import { useEffect, useMemo, useState } from 'react'
import DashCard from '../../components/ui/DashCard'
import { useAuthStore } from '../../store/authStore'
import { getAgentPlan, getAgentUsage, type AgentPlanResponse, type AgentUsageResponse } from '../../api/agent'

type PlanKey = 'free' | 'lite' | 'standard' | 'pro'

type PlanCard = {
  key: PlanKey
  title: string
  tagline: string
  monthlyPriceCop: number
  monthlyPrompts: number
  monthlyInputTokens: number
  monthlyOutputTokens: number
  contextItems: number
  memoryItems: number
  memoryDays: number
}

const PLAN_CARDS: PlanCard[] = [
  {
    key: 'free',
    title: 'Free',
    tagline: 'Para probar sin friccion',
    monthlyPriceCop: 0,
    monthlyPrompts: 80,
    monthlyInputTokens: 120000,
    monthlyOutputTokens: 60000,
    contextItems: 6,
    memoryItems: 30,
    memoryDays: 30,
  },
  {
    key: 'lite',
    title: 'Lite',
    tagline: 'Uso personal continuo',
    monthlyPriceCop: 9900,
    monthlyPrompts: 300,
    monthlyInputTokens: 360000,
    monthlyOutputTokens: 150000,
    contextItems: 10,
    memoryItems: 80,
    memoryDays: 60,
  },
  {
    key: 'standard',
    title: 'Standard',
    tagline: 'Equipos con flujo diario',
    monthlyPriceCop: 20900,
    monthlyPrompts: 1500,
    monthlyInputTokens: 2700000,
    monthlyOutputTokens: 1050000,
    contextItems: 20,
    memoryItems: 250,
    memoryDays: 180,
  },
  {
    key: 'pro',
    title: 'Pro',
    tagline: 'Carga alta y automatizacion',
    monthlyPriceCop: 49900,
    monthlyPrompts: 6000,
    monthlyInputTokens: 13200000,
    monthlyOutputTokens: 6000000,
    contextItems: 35,
    memoryItems: 800,
    memoryDays: 365,
  },
]

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US').format(n)
}

function fmtCop(n: number): string {
  return new Intl.NumberFormat('es-CO').format(n)
}

export default function PlansPage() {
  const { user } = useAuthStore()
  const [plan, setPlan] = useState<AgentPlanResponse | null>(null)
  const [usage, setUsage] = useState<AgentUsageResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutPlan, setCheckoutPlan] = useState<PlanCard | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const [planData, usageData] = await Promise.all([getAgentPlan(), getAgentUsage()])
        if (!active) return
        setPlan(planData)
        setUsage(usageData)
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Error loading plans')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  const currentPlan = (usage?.plan_name || plan?.plan?.name || 'free').toLowerCase()

  const handleUpgradeClick = (planKey: PlanKey) => {
    const selected = PLAN_CARDS.find((item) => item.key === planKey)
    if (!selected) return

    if (planKey === currentPlan) {
      alert('Ya tienes este plan')
      return
    }
    setCheckoutPlan(selected)
    setCheckoutOpen(true)
  }

  const usageSummary = useMemo(() => {
    if (!usage || !plan?.plan) return null

    const promptsLimit = plan.plan.monthly_prompts
    const inputLimit = plan.plan.monthly_input_tokens
    const outputLimit = plan.plan.monthly_output_tokens

    const toPct = (used: number, limit: number) => {
      if (limit <= 0) return 0
      return Math.min(100, (used / limit) * 100)
    }

    return {
      promptsPct: toPct(usage.prompt_count, promptsLimit),
      inputPct: toPct(usage.input_tokens, inputLimit),
      outputPct: toPct(usage.output_tokens, outputLimit),
      promptsLimit,
      inputLimit,
      outputLimit,
    }
  }, [plan, usage])

  return (
    <div
      style={{
        padding: '20px 24px',
        background: '#1a1a1a',
        minHeight: 'calc(100vh - 56px)',
        display: 'grid',
        gap: 14,
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px',
        borderRadius: 8,
        background: 'rgba(184,90,90,0.1)',
        border: '1px solid rgba(184,90,90,0.35)',
        color: '#e0a0a0',
        fontSize: 12,
      }}>
        <span style={{ fontSize: 15 }}>🚧</span>
        <span>Esta sección está en construcción — los planes y el checkout aún no están completamente implementados.</span>
      </div>

      <DashCard style={{ padding: '16px 20px' }} speed={0.0003}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#EDE6D6', marginBottom: 4 }}>Planes Orbit</div>
            <div style={{ fontSize: 12, color: '#8C6A3E' }}>
              Vista central de planes, limites y consumo del ciclo actual.
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#C6A15B', border: '1px solid rgba(198,161,91,0.3)', borderRadius: 999, padding: '6px 12px' }}>
            Plan actual: {currentPlan}
          </div>
        </div>
      </DashCard>

      {loading && <div style={{ color: '#8C6A3E', fontSize: 12 }}>Cargando planes...</div>}
      {error && <div style={{ color: '#b85a5a', fontSize: 12 }}>{error}</div>}

      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
          {PLAN_CARDS.map((item) => {
            const isCurrent = item.key === currentPlan
            return (
              <DashCard key={item.key} style={{ padding: '16px 18px', border: isCurrent ? '1px solid rgba(198,161,91,0.5)' : undefined }} speed={0.0003}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 16, color: '#EDE6D6', fontWeight: 600 }}>{item.title}</div>
                  {isCurrent && (
                    <span style={{ fontSize: 10, color: '#C6A15B', border: '1px solid rgba(198,161,91,0.35)', borderRadius: 999, padding: '3px 8px' }}>
                      Activo
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#8C6A3E', marginBottom: 10 }}>{item.tagline}</div>
                <div style={{ fontSize: 12, color: '#EDE6D6', display: 'grid', gap: 5 }}>
                  <div>Prompts/mes: <span style={{ color: '#C6A15B' }}>{fmt(item.monthlyPrompts)}</span></div>
                  <div>Input tokens/mes: <span style={{ color: '#C6A15B' }}>{fmt(item.monthlyInputTokens)}</span></div>
                  <div>Output tokens/mes: <span style={{ color: '#C6A15B' }}>{fmt(item.monthlyOutputTokens)}</span></div>
                  <div>Contexto por prompt: <span style={{ color: '#C6A15B' }}>{item.contextItems}</span></div>
                  <div>Memoria max: <span style={{ color: '#C6A15B' }}>{item.memoryItems}</span></div>
                  <div>Retencion: <span style={{ color: '#C6A15B' }}>{item.memoryDays} dias</span></div>
                </div>
                <button
                  onClick={() => handleUpgradeClick(item.key)}
                  style={{
                    width: '100%',
                    marginTop: 12,
                    padding: '8px 12px',
                    backgroundColor: isCurrent ? 'rgba(198,161,91,0.2)' : 'rgba(198,161,91,0.15)',
                    border: '1px solid rgba(198,161,91,0.4)',
                    borderRadius: 6,
                    color: '#C6A15B',
                    fontSize: 11,
                    fontWeight: 500,
                    fontFamily: "'Questrial', sans-serif",
                    cursor: isCurrent ? 'default' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => !isCurrent && (e.currentTarget.style.background = 'rgba(198,161,91,0.25)')}
                  onMouseLeave={e => !isCurrent && (e.currentTarget.style.background = 'rgba(198,161,91,0.15)')}
                  disabled={isCurrent}
                >
                  {isCurrent ? 'Plan Actual' : `Cambiar a ${item.title}`}
                </button>
              </DashCard>
            )
          })}
        </div>
      )}

      {!loading && usageSummary && usage && (
        <DashCard style={{ padding: '16px 20px' }} speed={0.0003}>
          <div style={{ fontSize: 14, color: '#EDE6D6', fontWeight: 600, marginBottom: 10 }}>Consumo del ciclo ({usage.month_key})</div>
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              { label: 'Prompts', used: usage.prompt_count, limit: usageSummary.promptsLimit, pct: usageSummary.promptsPct },
              { label: 'Input tokens', used: usage.input_tokens, limit: usageSummary.inputLimit, pct: usageSummary.inputPct },
              { label: 'Output tokens', used: usage.output_tokens, limit: usageSummary.outputLimit, pct: usageSummary.outputPct },
            ].map((row) => (
              <div key={row.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                  <span style={{ color: '#8C6A3E' }}>{row.label}</span>
                  <span style={{ color: '#C6A15B' }}>{fmt(row.used)} / {fmt(row.limit)}</span>
                </div>
                <div style={{ width: '100%', height: 6, background: 'rgba(198,161,91,0.12)', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${row.pct}%`, height: '100%', background: 'linear-gradient(90deg, #C6A15B, #A67C52)' }} />
                </div>
              </div>
            ))}
            <div style={{ fontSize: 11, color: '#8C6A3E' }}>
              Costo estimado: <span style={{ color: '#C6A15B' }}>${usage.estimated_cost_usd.toFixed(4)}</span>
            </div>
          </div>
        </DashCard>
      )}

      {checkoutOpen && checkoutPlan && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.68)',
            backdropFilter: 'blur(2px)',
            zIndex: 60,
            display: 'grid',
            placeItems: 'center',
            padding: 18,
          }}
        >
          <div
            style={{
              width: 'min(980px, 96vw)',
              borderRadius: 20,
              border: '1px solid rgba(198,161,91,0.24)',
              background: '#1d1d1d',
              boxShadow: '0 20px 60px rgba(0,0,0,0.42)',
              padding: 20,
              display: 'grid',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: '#EDE6D6', fontSize: 28, fontWeight: 600 }}>Configura tu plan</div>
              <button
                onClick={() => setCheckoutOpen(false)}
                style={{
                  border: '1px solid rgba(198,161,91,0.28)',
                  background: 'transparent',
                  color: '#C6A15B',
                  borderRadius: 999,
                  width: 32,
                  height: 32,
                  cursor: 'pointer',
                }}
                aria-label="Cerrar"
              >
                x
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ color: '#EDE6D6', fontSize: 18, marginBottom: 4 }}>Metodo de pago</div>
                <div style={{ display: 'grid', gap: 10 }}>
                  <input placeholder="Numero de tarjeta" style={{ border: '1px solid rgba(198,161,91,0.16)', borderRadius: 12, background: '#2b2b2b', color: '#EDE6D6', fontSize: 15, padding: '14px 12px' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input placeholder="Fecha de caducidad" style={{ border: '1px solid rgba(198,161,91,0.16)', borderRadius: 12, background: '#2b2b2b', color: '#EDE6D6', fontSize: 15, padding: '14px 12px' }} />
                    <input placeholder="Codigo de seguridad" style={{ border: '1px solid rgba(198,161,91,0.16)', borderRadius: 12, background: '#2b2b2b', color: '#EDE6D6', fontSize: 15, padding: '14px 12px' }} />
                  </div>
                </div>

                <div style={{ color: '#EDE6D6', fontSize: 18, marginBottom: 4, marginTop: 4 }}>Direccion de facturacion</div>
                <div style={{ display: 'grid', gap: 10 }}>
                  <input placeholder="Nombre completo" defaultValue={user?.username || ''} style={{ border: '1px solid rgba(198,161,91,0.16)', borderRadius: 12, background: '#2b2b2b', color: '#EDE6D6', fontSize: 15, padding: '14px 12px' }} />
                  <input placeholder="Pais o region" defaultValue="Colombia" style={{ border: '1px solid rgba(198,161,91,0.16)', borderRadius: 12, background: '#2b2b2b', color: '#EDE6D6', fontSize: 15, padding: '14px 12px' }} />
                  <input placeholder="Linea 1 de direccion" style={{ border: '1px solid rgba(198,161,91,0.16)', borderRadius: 12, background: '#2b2b2b', color: '#EDE6D6', fontSize: 15, padding: '14px 12px' }} />
                </div>
              </div>

              <div style={{ border: '1px solid rgba(198,161,91,0.24)', borderRadius: 20, background: '#2a2a2a', padding: 20, display: 'grid', gap: 14, alignContent: 'start' }}>
                <div style={{ color: '#EDE6D6', fontSize: 36, fontWeight: 600 }}>Plan {checkoutPlan.title}</div>
                <div style={{ color: '#EDE6D6', fontSize: 16, marginBottom: 6 }}>Funciones destacadas</div>
                <div style={{ display: 'grid', gap: 10, color: '#EDE6D6', fontSize: 15 }}>
                  <div>Respuestas mas rapidas e inteligentes</div>
                  <div>Mas mensajes y cargas</div>
                  <div>Memoria y contexto adicionales</div>
                </div>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.12)', margin: '8px 0' }} />
                <div style={{ display: 'grid', gap: 6, fontSize: 15 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#EDE6D6' }}>
                    <span>Mensual suscripcion</span>
                    <span>$ {fmtCop(checkoutPlan.monthlyPriceCop)},00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#EDE6D6' }}>
                    <span>VAT (0%)</span>
                    <span>$ 0,00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#EDE6D6', fontWeight: 700, marginTop: 4 }}>
                    <span>Importe a pagar hoy</span>
                    <span>$ {fmtCop(checkoutPlan.monthlyPriceCop)},00</span>
                  </div>
                </div>
                <button
                  onClick={() => alert('Checkout implementado en UI. Siguiente paso: conectar pasarela (Stripe/Wompi) y confirmar suscripcion en backend.')}
                  style={{
                    marginTop: 6,
                    width: '100%',
                    border: '1px solid rgba(198,161,91,0.35)',
                    borderRadius: 999,
                    background: '#EDE6D6',
                    color: '#1b1b1b',
                    fontSize: 18,
                    padding: '12px 16px',
                    cursor: 'pointer',
                  }}
                >
                  Suscribirme
                </button>
                <div style={{ color: '#d7c9ad', fontSize: 12, lineHeight: 1.35 }}>
                  Se renueva mensualmente hasta que se cancele. Al suscribirte, aceptas terminos y politica de privacidad.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
