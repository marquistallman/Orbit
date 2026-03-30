import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { getAgentPlan, getAgentUsage, type AgentPlanResponse, type AgentUsageResponse } from '../../api/agent'
import DashCard from '../../components/ui/DashCard'
import SubtleBorderAnimation from '../../components/orbit/SubtleBorderAnimation'

const MOCK_STATS = {
  tasks: 247, apps: 4, success: 100,
  lastSession: 'Today, 14:30', activeDays: 14, agentExecuted: 38,
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: 70, height: 70, borderRadius: '50%',
      border: '2px solid rgba(198,161,91,0.5)',
      background: '#1B1B1B',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 22, fontWeight: 600, color: '#C6A15B',
      flexShrink: 0,
      fontFamily: 'Questrial, sans-serif',
    }}>
      {initials}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '12px 0',
      borderBottom: '1px solid rgba(198,161,91,0.07)',
    }}>
      <span style={{ flex: 1, fontSize: 12, color: '#8C6A3E' }}>{label}</span>
      <span style={{ fontSize: 12, color: '#EDE6D6' }}>{value}</span>
    </div>
  )
}

function Input({
  label, value, onChange, type = 'text', span = false, textarea = false
}: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; span?: boolean; textarea?: boolean
}) {
  const base: React.CSSProperties = {
    width: '100%', background: '#1B1B1B',
    border: '1px solid rgba(198,161,91,0.25)',
    borderRadius: 7, padding: '10px 14px',
    fontSize: 12, color: '#EDE6D6',
    fontFamily: 'Questrial, sans-serif',
    outline: 'none', resize: 'none' as const,
    boxSizing: 'border-box' as const,
  }
  return (
    <div style={{ gridColumn: span ? '1 / -1' : 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 10, color: '#8C6A3E', letterSpacing: 1 }}>{label}</label>
      {textarea
        ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} style={base} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} style={base} />
      }
    </div>
  )
}

export default function ProfilePage() {
  const navigate  = useNavigate()
  const { user }  = useAuthStore()
  const [form, setForm] = useState({
    firstName:   user?.username?.split(' ')[0] || 'Nicolas',
    lastName:    user?.username?.split(' ')[1] || 'Luis',
    email:       user?.email || 'luis@gmail.com',
    description: 'Frontend developer passionate about futuristic interfaces and autonomous agents.',
    timezone:    'UTC-5 (Bogotá)',
    language:    'English',
    password:    '',
    newPassword: '',
  })

  const [plan, setPlan] = useState<AgentPlanResponse | null>(null)
  const [usage, setUsage] = useState<AgentUsageResponse | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(true)
  const [errorPlan, setErrorPlan] = useState('')

  const fetchPlanAndUsage = useCallback(async () => {
    try {
      setLoadingPlan(true)
      setErrorPlan('')
      const [planData, usageData] = await Promise.all([
        getAgentPlan(),
        getAgentUsage(),
      ])
      setPlan(planData)
      setUsage(usageData)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error loading plan'
      setErrorPlan(msg)
      console.error('Error fetching plan/usage:', err)
    } finally {
      setLoadingPlan(false)
    }
  }, [])

  useEffect(() => {
    fetchPlanAndUsage()
  }, [fetchPlanAndUsage])

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  const fullName    = `${form.firstName} ${form.lastName}`.trim()
  const memberSince = 'March 2026'

  const handleSave = () => {
      // TODO: connect to auth-service PUT /api/auth/profile
      navigate('/app/profile')
  }

  const toSafeNumber = (value: unknown) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0
    if (typeof value === 'string') {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : 0
    }
    return 0
  }

  const promptsUsed = toSafeNumber(usage?.prompts_used)
  const promptsLimit = toSafeNumber(plan?.prompts_limit)
  const tokensUsed = toSafeNumber(usage?.tokens_used)
  const tokensLimit = toSafeNumber(plan?.tokens_limit)
  const costUsed = toSafeNumber(usage?.cost_used)
  const maxCost = toSafeNumber(plan?.max_cost)

  const toPercent = (used: number, limit: number) => {
    if (limit <= 0) return 0
    return Math.min(100, (used / limit) * 100)
  }

  // Calculate usage percentages
  const promptsPercent = toPercent(promptsUsed, promptsLimit)
  const tokensPercent = toPercent(tokensUsed, tokensLimit)
  const costPercent = toPercent(costUsed, maxCost)

  // ── View mode ──────────────────────────────────────────────
  return (
    <div style={{
      padding: '20px 24px', background: '#1a1a1a',
      height: 'calc(100vh - 56px)', overflowY: 'auto',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {/* Profile header */}
      <DashCard speed={0.0004} style={{ padding: '18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Avatar name={fullName} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#EDE6D6', marginBottom: 3 }}>{fullName}</div>
            <div style={{ fontSize: 12, color: '#C6A15B', marginBottom: 6 }}>{form.email}</div>
            <div style={{ fontSize: 12, color: '#8C6A3E', marginBottom: 6 }}>{form.description}</div>
            <div style={{ fontSize: 10, color: '#8C6A3E' }}>
              <span style={{ color: '#C6A15B', marginRight: 4 }}>—</span>
              Member since {memberSince}
            </div>
          </div>
          <button onClick={() => navigate('/app/profile/edit')} style={{
            background: 'none', border: '1px solid rgba(198,161,91,0.35)',
            borderRadius: 6, color: '#C6A15B', cursor: 'pointer',
            fontFamily: 'Questrial, sans-serif', fontSize: 12, padding: '8px 18px',
            flexShrink: 0,
          }}>Edit profile</button>
          <div style={{
            width: 70, height: 70, borderRadius: '50%',
            border: '1px solid rgba(198,161,91,0.08)',
            flexShrink: 0,
          }} />
        </div>
      </DashCard>

      {/* Account info + Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Account Information */}
        <DashCard speed={0.0003} style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 10, color: '#C6A15B', textTransform: 'uppercase' as const, letterSpacing: 2, marginBottom: 4 }}>
            Account Information
          </div>
          <Field label="Full Name" value={fullName} />
          <Field label="Email"     value={form.email} />
          <Field label="Timezone"  value={form.timezone} />
          <Field label="Language"  value={form.language} />
          <Field label="Plan"      value={usage?.plan || (loadingPlan ? 'Loading...' : 'Free')} />
        </DashCard>

        {/* Plan & Usage */}
        <DashCard speed={0.0003} style={{ padding: '16px 20px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}>
            <div style={{ fontSize: 10, color: '#C6A15B', textTransform: 'uppercase' as const, letterSpacing: 2 }}>
              Usage & Limits
            </div>
            <button
              onClick={fetchPlanAndUsage}
              disabled={loadingPlan}
              style={{
                background: 'none',
                border: '1px solid rgba(198,161,91,0.35)',
                borderRadius: 6,
                color: loadingPlan ? '#8C6A3E' : '#C6A15B',
                cursor: loadingPlan ? 'not-allowed' : 'pointer',
                fontFamily: 'Questrial, sans-serif',
                fontSize: 11,
                padding: '6px 12px',
              }}
            >
              {loadingPlan ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          
          {errorPlan && (
            <div style={{ fontSize: 11, color: '#9a4a4a', marginBottom: 12 }}>
              {errorPlan}
            </div>
          )}

          {loadingPlan ? (
            <div style={{ fontSize: 12, color: '#8C6A3E' }}>Loading usage...</div>
          ) : usage && plan ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Prompts */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                  <span style={{ color: '#8C6A3E' }}>Prompts</span>
                  <span style={{ color: '#C6A15B' }}>{promptsUsed} / {promptsLimit}</span>
                </div>
                <div style={{
                  width: '100%', height: 6, background: 'rgba(198,161,91,0.1)',
                  borderRadius: 3, overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', background: 'linear-gradient(90deg, #C6A15B, #A67C52)',
                    width: `${promptsPercent}%`, transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>

              {/* Tokens */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                  <span style={{ color: '#8C6A3E' }}>Tokens</span>
                  <span style={{ color: '#C6A15B' }}>{tokensUsed} / {tokensLimit}</span>
                </div>
                <div style={{
                  width: '100%', height: 6, background: 'rgba(198,161,91,0.1)',
                  borderRadius: 3, overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', background: 'linear-gradient(90deg, #C6A15B, #A67C52)',
                    width: `${tokensPercent}%`, transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>

              {/* Cost */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                  <span style={{ color: '#8C6A3E' }}>Cost</span>
                  <span style={{ color: '#C6A15B' }}>${costUsed.toFixed(2)} / ${maxCost.toFixed(2)}</span>
                </div>
                <div style={{
                  width: '100%', height: 6, background: 'rgba(198,161,91,0.1)',
                  borderRadius: 3, overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', background: costPercent > 80 
                      ? 'linear-gradient(90deg, #9a4a4a, #6b3131)' 
                      : 'linear-gradient(90deg, #C6A15B, #A67C52)',
                    width: `${costPercent}%`, transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>
            </div>
          ) : null}
        </DashCard>
      </div>

      {/* Operator Activity */}
      <DashCard speed={0.0003} style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: 10, color: '#C6A15B', textTransform: 'uppercase' as const, letterSpacing: 2, marginBottom: 12 }}>
          Operator Activity
        </div>

        {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
            {[
              { value: MOCK_STATS.tasks,   label: 'Tasks'   },
              { value: MOCK_STATS.apps,    label: 'Apps'    },
              { value: `${MOCK_STATS.success}%`, label: 'Success' },
            ].map(s => (
              <div key={s.label} style={{
                border: '1px solid rgba(198,161,91,0.2)',
                borderRadius: 7, padding: '10px 8px', textAlign: 'center' as const,
              }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#C6A15B', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 9, color: '#8C6A3E', textTransform: 'uppercase' as const, letterSpacing: 1, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid rgba(198,161,91,0.08)', paddingTop: 12 }}>
            <Field label="Last session"    value={MOCK_STATS.lastSession} />
            <Field label="Active days"     value={`${MOCK_STATS.activeDays} days`} />
            <Field label="Agent executed"  value={`${MOCK_STATS.agentExecuted} times`} />
          </div>
        </DashCard>

      {/* Danger zone */}
      <div style={{
        border: '1px solid rgba(154,74,74,0.4)',
        borderRadius: 8, padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 11, color: '#9a4a4a', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: 1 }}>
            Danger zone
          </div>
          <div style={{ fontSize: 12, color: '#8C6A3E' }}>
            Delete account and all associated data permanently
          </div>
        </div>
        <button style={{
          background: 'none', border: '1px solid rgba(154,74,74,0.5)',
          borderRadius: 6, color: '#9a4a4a', cursor: 'pointer',
          fontFamily: 'Questrial, sans-serif', fontSize: 12, padding: '8px 18px',
          flexShrink: 0,
        }}>Delete account</button>
      </div>
    </div>
  )
}
