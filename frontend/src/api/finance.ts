const BASE_URL = 'http://localhost:8080'

export interface FinanceSummary {
  income: number
  expenses: number
  savings: number
  investments: number
  incomeChange: number
  expensesChange: number
  savingsRate: number
  investmentsReturn: number
}

export interface Transaction {
  id: string
  name: string
  date: string
  amount: number
  type: 'income' | 'expense'
}

export interface Investment {
  id: string
  name: string
  value: number
  change: number
  allocation: number
}

export interface MonthlyData {
  month: string
  income: number
  expenses: number
}

export interface ExpenseCategory {
  name: string
  percentage: number
  color: string
}

// MOCK DATA
const MOCK_SUMMARY: FinanceSummary = {
  income: 4200, expenses: 2840, savings: 1360, investments: 18500,
  incomeChange: 8, expensesChange: 12, savingsRate: 32, investmentsReturn: 3.2,
}

const MOCK_MONTHLY: MonthlyData[] = [
  { month: 'Oct', income: 3800, expenses: 3100 },
  { month: 'Nov', income: 4100, expenses: 2900 },
  { month: 'Dec', income: 3600, expenses: 3300 },
  { month: 'Jan', income: 4400, expenses: 2700 },
  { month: 'Feb', income: 3900, expenses: 3000 },
  { month: 'Mar', income: 4200, expenses: 2840 },
]

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', name: 'March Payroll',     date: 'Mar 16, 2026', amount: 4200,  type: 'income'  },
  { id: '2', name: 'Rent',              date: 'Mar 15, 2026', amount: -850,  type: 'expense' },
  { id: '3', name: 'Grocery store',     date: 'Mar 14, 2026', amount: -120,  type: 'expense' },
  { id: '4', name: 'Freelance project', date: 'Mar 12, 2026', amount: 600,   type: 'income'  },
  { id: '5', name: 'Utilities',         date: 'Mar 10, 2026', amount: -210,  type: 'expense' },
]

const MOCK_INVESTMENTS: Investment[] = [
  { id: '1', name: 'S&P 500 ETF',  value: 8200, change: 4.1,   allocation: 80 },
  { id: '2', name: 'Bitcoin',       value: 4800, change: 12.3,  allocation: 52 },
  { id: '3', name: 'Bonds CDT',     value: 3500, change: 2.1,   allocation: 35 },
  { id: '4', name: 'Tech stocks',   value: 2000, change: -1.8,  allocation: 20 },
]

const MOCK_CATEGORIES: ExpenseCategory[] = [
  { name: 'Housing',   percentage: 30, color: '#C6A15B' },
  { name: 'Food',      percentage: 21, color: '#2E4057' },
  { name: 'Transport', percentage: 15, color: '#4a9a59' },
  { name: 'Other',     percentage: 34, color: '#8C6A3E' },
]

export const getSummary    = async (): Promise<FinanceSummary>     => { await new Promise(r => setTimeout(r, 400)); return MOCK_SUMMARY }
export const getMonthly    = async (): Promise<MonthlyData[]>      => { await new Promise(r => setTimeout(r, 400)); return MOCK_MONTHLY }
export const getTransactions = async (): Promise<Transaction[]>    => { await new Promise(r => setTimeout(r, 400)); return MOCK_TRANSACTIONS }
export const getInvestments  = async (): Promise<Investment[]>     => { await new Promise(r => setTimeout(r, 400)); return MOCK_INVESTMENTS }
export const getCategories   = async (): Promise<ExpenseCategory[]>=> { await new Promise(r => setTimeout(r, 400)); return MOCK_CATEGORIES }
