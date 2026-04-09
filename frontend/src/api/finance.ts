const IA_URL = import.meta.env.VITE_IA_URL || 'http://localhost:12002'

export interface FinanceSummary {
  income: number; expenses: number; savings: number; investments: number
  incomeChange: number; expensesChange: number; savingsRate: number; investmentsReturn: number
}
export interface Transaction {
  id: string; name: string; date: string; amount: number
  type: 'income' | 'expense'; category?: string; subcategory?: string; source?: string
}
export interface Investment { id: string; name: string; value: number; change: number; allocation: number }
export interface MonthlyData { month: string; income: number; expenses: number }
export interface ExpenseCategory {
  name: string; percentage: number; color: string
  subs?: { name: string; pct: number }[]
}
export interface CategoryDef {
  name: string; color: string
  subcategories: string[]
}


export const CATEGORY_COLORS: Record<string, string> = {
  Education:     '#6a9ab0',
  Finance:       '#C6A15B',
  Utilities:     '#4a7a9a',
  Entertainment: '#9a4a9a',
  Transport:     '#4a9a59',
  Shopping:      '#c47070',
  Health:        '#9a9a4a',
  Food:          '#2E4057',
  Other:         '#8C6A3E',
}

export const DEFAULT_CATEGORY_DEFS: CategoryDef[] = [
  { name: 'Education',     color: '#6a9ab0', subcategories: ['Tuition', 'Books', 'Supplies'] },
  { name: 'Finance',       color: '#C6A15B', subcategories: ['Savings', 'Fees', 'Interest'] },
  { name: 'Utilities',     color: '#4a7a9a', subcategories: ['Internet', 'Phone', 'Gas'] },
  { name: 'Entertainment', color: '#9a4a9a', subcategories: ['Streaming', 'Games', 'Events'] },
  { name: 'Transport',     color: '#4a9a59', subcategories: ['Fuel', 'Parking', 'Transit'] },
  { name: 'Shopping',      color: '#c47070', subcategories: ['Clothing', 'Electronics', 'Home'] },
  { name: 'Health',        color: '#9a9a4a', subcategories: ['Doctor', 'Medicine', 'Gym'] },
  { name: 'Food',          color: '#2E4057', subcategories: ['Groceries', 'Restaurants', 'Delivery'] },
  { name: 'Other',         color: '#8C6A3E', subcategories: [] },
]

const FRONTEND_CATEGORY_MAP: [string[], string][] = [
  [["universidad", "colegio", "inscripciones", "matricula", "pregrado", "ingenieria", "nacional"], "Education"],
  [["fondo", "inversion", "bancolombia", "fiduciaria", "nequi", "accival", "bolsa", "davivienda"], "Finance"],
  [["movistar", "claro", "tigo", "etb", "virgin", "telecomunicaciones", "mobile", "une", "epm"],   "Utilities"],
  [["netflix", "spotify", "hbo", "disney", "dazn", "prime"],                                        "Entertainment"],
  [["uber", "rappi", "didi", "cabify", "lyft"],                                                      "Transport"],
  [["amazon", "mercadolibre", "ebay", "shopify"],                                                    "Shopping"],
  [["hospital", "clinica", "salud", "eps", "medica"],                                               "Health"],
  [["restaurante", "comida", "pizza", "burger", "domicilios"],                                      "Food"],
]

export function categorizeByName(name: string): string {
  const text = name.toLowerCase()
  for (const [keywords, cat] of FRONTEND_CATEGORY_MAP) {
    if (keywords.some(kw => text.includes(kw))) return cat
  }
  return 'Other'
}

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token')
  if (!token) return {}
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return { Authorization: `Bearer ${token}`, 'X-User-Id': payload.id || '' }
  } catch {
    return { Authorization: `Bearer ${token}` }
  }
}

const EMPTY_SUMMARY: FinanceSummary = { income: 0, expenses: 0, savings: 0, investments: 0, incomeChange: 0, expensesChange: 0, savingsRate: 0, investmentsReturn: 0 }

export const getSummary     = async (): Promise<FinanceSummary>    => EMPTY_SUMMARY
export const getMonthly     = async (): Promise<MonthlyData[]>     => []
export const getInvestments = async (): Promise<Investment[]>      => []
export const getCategories  = async (): Promise<ExpenseCategory[]> => []

const _mapTransactions = (data: any): Transaction[] => {
  if (!data.transactions || data.transactions.length === 0) return []
  return data.transactions.map((t: any) => ({
    id:          t.id,
    name:        t.name,
    date:        t.date,
    amount:      t.type === 'expense' ? -Math.abs(t.amount) : Math.abs(t.amount),
    type:        t.type as 'income' | 'expense',
    category:    t.category,
    subcategory: t.subcategory,
    source:      t.source,
  }))
}

export const getTransactions = async (): Promise<Transaction[]> => {
  try {
    const res = await fetch(`${IA_URL}/finance/transactions`, { headers: authHeaders() })
    if (!res.ok) throw new Error('API error')
    return _mapTransactions(await res.json())
  } catch {
    return []
  }
}

export interface SyncResult {
  transactions: Transaction[]
  warning: string | null
}

export const syncTransactions = async (): Promise<SyncResult> => {
  try {
    const res = await fetch(`${IA_URL}/finance/sync`, { method: 'POST', headers: authHeaders() })
    if (!res.ok) throw new Error('Sync error')
    const data = await res.json()
    return { transactions: _mapTransactions(data), warning: data.sync_warning ?? null }
  } catch {
    return { transactions: [], warning: 'Could not reach the sync service.' }
  }
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAY_NAMES   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function parseTxDate(dateStr: string): Date {
  // Format: "Mar 16, 2026"
  const [mon, dayComma, year] = dateStr.split(' ')
  return new Date(parseInt(year), MONTH_NAMES.indexOf(mon), parseInt(dayComma))
}

export function getChartDataForPeriod(transactions: Transaction[], period: string): MonthlyData[] {
  const now    = new Date()
  const cutoff = new Date(now)

  if (period === '7D') {
    cutoff.setDate(now.getDate() - 7)
    const order: string[] = []
    const map: Record<string, { income: number; expenses: number }> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i)
      const label = DAY_NAMES[d.getDay()]
      if (!map[label]) { map[label] = { income: 0, expenses: 0 }; order.push(label) }
    }
    transactions.forEach(t => {
      const d = parseTxDate(t.date)
      if (d >= cutoff) {
        const label = DAY_NAMES[d.getDay()]
        if (map[label]) {
          if (t.type === 'income') map[label].income += Math.abs(t.amount)
          else map[label].expenses += Math.abs(t.amount)
        }
      }
    })
    return order.map(month => ({ month, income: Math.round(map[month].income), expenses: Math.round(map[month].expenses) }))
  }

  if (period === '1M') {
    cutoff.setMonth(now.getMonth() - 1)
    const weeks = ['W1','W2','W3','W4']
    const map: Record<string, { income: number; expenses: number }> = {
      W1: { income: 0, expenses: 0 }, W2: { income: 0, expenses: 0 },
      W3: { income: 0, expenses: 0 }, W4: { income: 0, expenses: 0 },
    }
    transactions.forEach(t => {
      const d = parseTxDate(t.date)
      if (d >= cutoff) {
        const day  = d.getDate()
        const week = day <= 7 ? 'W1' : day <= 14 ? 'W2' : day <= 21 ? 'W3' : 'W4'
        if (t.type === 'income') map[week].income += Math.abs(t.amount)
        else map[week].expenses += Math.abs(t.amount)
      }
    })
    return weeks.map(month => ({ month, income: Math.round(map[month].income), expenses: Math.round(map[month].expenses) }))
  }

  // 3M / 1Y — agrupa por mes
  const numMonths = period === '3M' ? 3 : 12
  cutoff.setMonth(now.getMonth() - numMonths)
  const map: Record<string, { income: number; expenses: number; order: number }> = {}
  transactions.forEach(t => {
    const d = parseTxDate(t.date)
    if (d >= cutoff) {
      const label = MONTH_NAMES[d.getMonth()]
      if (!map[label]) map[label] = { income: 0, expenses: 0, order: d.getFullYear() * 12 + d.getMonth() }
      if (t.type === 'income') map[label].income += Math.abs(t.amount)
      else map[label].expenses += Math.abs(t.amount)
    }
  })
  const sorted = Object.entries(map)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([month, data]) => ({ month, income: Math.round(data.income), expenses: Math.round(data.expenses) }))
  return sorted
}

export const getDerivedMonthly = (transactions: Transaction[]): MonthlyData[] => {
  const monthMap: Record<string, { income: number; expenses: number }> = {}
  const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  transactions.forEach(t => {
    const month = t.date.split(' ')[0]
    if (!monthMap[month]) monthMap[month] = { income: 0, expenses: 0 }
    if (t.type === 'income') monthMap[month].income += Math.abs(t.amount)
    else monthMap[month].expenses += Math.abs(t.amount)
  })
  const sorted = Object.entries(monthMap)
    .sort((a, b) => monthOrder.indexOf(a[0]) - monthOrder.indexOf(b[0]))
    .map(([month, data]) => ({ month, income: Math.round(data.income), expenses: Math.round(data.expenses) }))
  return sorted
}

const MAX_PLANETS = 4

export const getDerivedCategories = (
  transactions: Transaction[],
  customCats: CategoryDef[] = []
): ExpenseCategory[] => {
  const catMap: Record<string, number> = {}
  const subMap: Record<string, Record<string, number>> = {}
  let total = 0

  const allDefs = [...DEFAULT_CATEGORY_DEFS, ...customCats.filter(c => !DEFAULT_CATEGORY_DEFS.find(d => d.name === c.name))]
  const getColor = (name: string) => allDefs.find(d => d.name === name)?.color || CATEGORY_COLORS[name] || '#8C6A3E'

  transactions.filter(t => t.type === 'expense').forEach(t => {
    const cat = t.category || categorizeByName(t.name)
    const sub = t.subcategory
    catMap[cat] = (catMap[cat] || 0) + Math.abs(t.amount)
    if (sub) {
      if (!subMap[cat]) subMap[cat] = {}
      subMap[cat][sub] = (subMap[cat][sub] || 0) + Math.abs(t.amount)
    }
    total += Math.abs(t.amount)
  })

  if (total === 0) return []

  // Subcategorías dinámicas para Other basadas en transacciones individuales
  const otherTxs = transactions.filter(t => t.type === 'expense' && (t.category || categorizeByName(t.name)) === 'Other')
  const otherTxMap: Record<string, number> = {}
  otherTxs.forEach(t => {
    const key = t.name.split('—')[0].trim().slice(0, 20)
    otherTxMap[key] = (otherTxMap[key] || 0) + Math.abs(t.amount)
  })
  const otherTxTotal = Object.values(otherTxMap).reduce((s, v) => s + v, 0)
  const otherTxSubs = Object.entries(otherTxMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amount]) => ({ name, pct: Math.round((amount / otherTxTotal) * 100) }))

  const sorted = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => {
      const subTotal = Object.values(subMap[name] || {}).reduce((s, v) => s + v, 0)
      const subs = Object.entries(subMap[name] || {})
        .sort((a, b) => b[1] - a[1])
        .map(([sname, samount]) => ({
          name: sname,
          pct: Math.round((samount / (subTotal || 1)) * 100),
        }))
      return { name, amount, percentage: Math.round((amount / total) * 100), color: getColor(name), subs: subs.length > 0 ? subs : undefined }
    })

  if (sorted.length <= MAX_PLANETS) {
    return sorted.map(({ name, percentage, color, subs }) => ({
      name, percentage, color,
      subs: name === 'Other' ? (subs?.length ? subs : otherTxSubs) : subs,
    }))
  }

  // Si Other está entre los top MAX_PLANETS, mostrar top 4 + desplazadas como satélites de Other
  const topFour = sorted.slice(0, MAX_PLANETS)
  const displaced = sorted.slice(MAX_PLANETS)
  if (topFour.find(c => c.name === 'Other')) {
    const displacedAsSubs = displaced.map(c => ({ name: c.name, pct: c.percentage }))
    return topFour.map(({ name, percentage, color, subs }) => ({
      name, percentage, color,
      subs: name === 'Other'
        ? [...(subs?.length ? subs : otherTxSubs), ...displacedAsSubs]
        : subs,
    }))
  }

  // Fusionar el resto en Other — las categorías desplazadas se convierten en satélites
  const top  = sorted.slice(0, MAX_PLANETS - 1)
  const rest = sorted.slice(MAX_PLANETS - 1)

  const otherAmount = rest.reduce((s, c) => s + c.amount, 0)
  const otherPct    = Math.round((otherAmount / total) * 100)

  // Categorías desplazadas como subs — si Other está entre ellas, expandir con otherTxSubs
  const finalSubs = rest.flatMap(c =>
    c.name === 'Other' && otherTxSubs.length > 0
      ? otherTxSubs
      : [{ name: c.name, pct: otherAmount > 0 ? Math.round((c.amount / otherAmount) * 100) : 0 }]
  )

  const existingOtherColor = rest.find(c => c.name === 'Other')?.color || '#8C6A3E'

  return [
    ...top.map(({ name, percentage, color, subs: s }) => ({ name, percentage, color, subs: s })),
    { name: 'Other', percentage: otherPct, color: existingOtherColor, subs: finalSubs },
  ]
}

export const getDerivedSummary = (transactions: Transaction[], base: FinanceSummary): FinanceSummary => {
  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0)
  const now          = new Date()
  const currentMonth = now.toLocaleString('en', { month: 'short' })
  const prevDate     = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonth    = prevDate.toLocaleString('en', { month: 'short' })
  const expensesThisMonth = transactions
    .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
    .reduce((s, t) => s + Math.abs(t.amount), 0)
  const expensesPrevMonth = transactions
    .filter(t => t.type === 'expense' && t.date.startsWith(prevMonth))
    .reduce((s, t) => s + Math.abs(t.amount), 0)
  const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0)
  const savings  = income - expenses
  const expensesChange = expensesPrevMonth > 0
    ? Math.round(((expensesThisMonth - expensesPrevMonth) / expensesPrevMonth) * 100)
    : 0
  return {
    ...base,
    income:         Math.round(income),
    expenses:       expenses > 0 ? Math.round(expenses) : base.expenses,
    savings:        Math.round(savings),
    savingsRate:    income > 0 ? Math.round((savings / income) * 100) : 0,
    expensesChange: expensesChange,
    incomeChange:   income === 0 ? 0 : base.incomeChange,
  }
}
