import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { getAgentPlan, getAgentUsage, type AgentPlanResponse, type AgentUsageResponse } from '../../api/agent'
import { getConnectedApps } from '../../api/apps'
import { deleteAccount } from '../../api/profile'
import DashCard from '../../components/ui/DashCard'

const IA_URL = import.meta.env.VITE_IA_URL || 'http://localhost:12002'

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
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

function DeleteModal({ onConfirm, onCancel, loading }: {
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#1e1e1e', border: '1px solid rgba(154,74,74,0.5)',
        borderRadius: 10, padding: '28px 32px', maxWidth: 420, width: '90%',
      }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#EDE6D6', marginBottom: 10 }}>
          Delete account?
        </div>
        <div style={{ fontSize: 12, color: '#8C6A3E', lineHeight: 1.7, marginBottom: 24 }}>
          This action is <span style={{ color: '#c47070' }}>permanent and irreversible</span>.
          All your data, connected apps and activity history will be permanently deleted.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} disabled={loading} style={{
            background: 'none', border: '1px solid rgba(198,161,91,0.25)',
            borderRadius: 6, color: '#8C6A3E', cursor: 'pointer',
            fontFamily: 'Questrial, sans-serif', fontSize: 12, padding: '8px 18px',
          }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} style={{
            background: 'rgba(154,74,74,0.15)', border: '1px solid rgba(154,74,74,0.6)',
            borderRadius: 6, color: '#c47070', cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'Questrial, sans-serif', fontSize: 12, padding: '8px 18px',
            fontWeight: 600, opacity: loading ? 0.7 : 1,
          }}>
            {loading ? 'Deleting...' : 'Yes, delete my account'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const navigate  = useNavigate()
  const { user, logout } = useAuthStore()

  const [plan, setPlan]   = useState<AgentPlanResponse | null>(null)
  const [usage, setUsage] = useState<AgentUsageResponse | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(true)
  const [errorPlan, setErrorPlan]     = useState('')

  const [taskCount, setTaskCount]         = useState<number | null>(null)
  const [successRate, setSuccessRate]     = useState<number | null>(null)
  const [appsCount, setAppsCount]         = useState<number | null>(null)
  const [memberSince, setMemberSince]     = useState('—')

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting]               = useState(false)

  const fetchPlanAndUsage = useCallback(async () => {
    try {
      setLoadingPlan(true)
      setErrorPlan('')
      const [planData, usageData] = await Promise.all([getAgentPlan(), getAgentUsage()])
      setPlan(planData)
      setUsage(usageData)
    } catch (err) {
      setErrorPlan(err instanceof Error ? err.message : 'Error loading plan')
    } finally {
      setLoadingPlan(false)
    }
  }, [])

  useEffect(() => {
    fetchPlanAndUsage()

    // Agent history → tasks count & success rate
    fetch(`${IA_URL}/agent/history`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : { tasks: [] })
      .then(data => {
        const tasks: { status: string }[] = data.tasks ?? []
        const total = tasks.length
        const completed = tasks.filter(t => t.status === 'completed').length
        setTaskCount(total)
        setSuccessRate(total > 0 ? Math.round((completed / total) * 100) : 0)
      })
      .catch(() => {})

    // Connected apps count
    getConnectedApps()
      .then(apps => setAppsCount(apps.length))
      .catch(() => {})
  }, [fetchPlanAndUsage])

  // Member since — derived from user createdAt or profile API
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:12001'}/api/profile/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.createdAt) {
          const d = new Date(data.createdAt)
          setMemberSince(d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))
        }
      })
      .catch(() => {})
  }, [])

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      await deleteAccount()
      // Clear in-memory task history from IA-service
      const token = localStorage.getItem('token')
      if (token) {
        fetch(`${IA_URL}/agent/tasks`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {})
      }
      logout()
      setTimeout(() => window.location.href = '/', 100)
    } catch {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const toSafeNumber = (value: unknown) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0
    if (typeof value === 'string') { const p = Number(value); return Number.isFinite(p) ? p : 0 }
    return 0
  }

  const promptsUsed        = toSafeNumber(usage?.prompt_count)
  const promptsLimit       = toSafeNumber(plan?.plan?.monthly_prompts)
  const inputTokensUsed    = toSafeNumber(usage?.input_tokens)
  const inputTokensLimit   = toSafeNumber(plan?.plan?.monthly_input_tokens)
  const outputTokensUsed   = toSafeNumber(usage?.output_tokens)
  const outputTokensLimit  = toSafeNumber(plan?.plan?.monthly_output_tokens)
  const costUsed           = toSafeNumber(usage?.estimated_cost_usd)
  const toPercent = (used: number, limit: number) => limit <= 0 ? 0 : Math.min(100, (used / limit) * 100)

  const fullName = user?.username || '—'

  return (
    <div style={{
      padding: '20px 24px', background: '#1a1a1a',
      height: 'calc(100vh - 56px)', overflowY: 'auto',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {showDeleteModal && (
        <DeleteModal
          onConfirm={handleDeleteAccount}
          onCancel={() => setShowDeleteModal(false)}
          loading={deleting}
        />
      )}

      {/* Profile header */}
      <DashCard speed={0.0004} style={{ padding: '18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Avatar name={fullName} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#EDE6D6', marginBottom: 3 }}>{fullName}</div>
            <div style={{ fontSize: 12, color: '#C6A15B', marginBottom: 6 }}>{user?.email}</div>
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
        </div>
      </DashCard>

      {/* Account info + Usage */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <DashCard speed={0.0003} style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 10, color: '#C6A15B', textTransform: 'uppercase' as const, letterSpacing: 2, marginBottom: 4 }}>
            Account Information
          </div>
          <Field label="Full Name" value={fullName} />
          <Field label="Email"     value={user?.email || '—'} />
          <Field label="Plan"      value={usage?.plan_name || (loadingPlan ? 'Loading...' : 'free')} />
        </DashCard>

        <DashCard speed={0.0003} style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: '#C6A15B', textTransform: 'uppercase' as const, letterSpacing: 2 }}>
              Usage & Limits
            </div>
            <button onClick={fetchPlanAndUsage} disabled={loadingPlan} style={{
              background: 'none', border: '1px solid rgba(198,161,91,0.35)',
              borderRadius: 6, color: loadingPlan ? '#8C6A3E' : '#C6A15B',
              cursor: loadingPlan ? 'not-allowed' : 'pointer',
              fontFamily: 'Questrial, sans-serif', fontSize: 11, padding: '6px 12px',
            }}>
              {loadingPlan ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {errorPlan && <div style={{ fontSize: 11, color: '#9a4a4a', marginBottom: 12 }}>{errorPlan}</div>}

          {loadingPlan ? (
            <div style={{ fontSize: 12, color: '#8C6A3E' }}>Loading usage...</div>
          ) : usage && plan ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Prompts',       used: promptsUsed,      limit: promptsLimit,      pct: toPercent(promptsUsed, promptsLimit) },
                { label: 'Input tokens',  used: inputTokensUsed,  limit: inputTokensLimit,  pct: toPercent(inputTokensUsed, inputTokensLimit) },
                { label: 'Output tokens', used: outputTokensUsed, limit: outputTokensLimit, pct: toPercent(outputTokensUsed, outputTokensLimit) },
              ].map(m => (
                <div key={m.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                    <span style={{ color: '#8C6A3E' }}>{m.label}</span>
                    <span style={{ color: '#C6A15B' }}>{m.used} / {m.limit}</span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: 'rgba(198,161,91,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'linear-gradient(90deg, #C6A15B, #A67C52)', width: `${m.pct}%`, transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 11, color: '#8C6A3E' }}>
                Estimated monthly cost: <span style={{ color: '#C6A15B' }}>${costUsed.toFixed(4)}</span>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { value: taskCount  !== null ? taskCount  : '—', label: 'Tasks'   },
            { value: appsCount  !== null ? appsCount  : '—', label: 'Apps'    },
            { value: successRate !== null ? `${successRate}%` : '—', label: 'Success' },
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
        <button onClick={() => setShowDeleteModal(true)} style={{
          background: 'none', border: '1px solid rgba(154,74,74,0.5)',
          borderRadius: 6, color: '#9a4a4a', cursor: 'pointer',
          fontFamily: 'Questrial, sans-serif', fontSize: 12, padding: '8px 18px',
          flexShrink: 0,
        }}>Delete account</button>
      </div>
    </div>
  )
}
