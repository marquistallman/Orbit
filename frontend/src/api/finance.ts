const _BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export const getSummary = async () => {
  // REAL: GET /api/finance/summary
  return { income: 4200, expenses: 2840, savings: 1360, investments: 18500 }
}

export const getTransactions = async (_params?: { month?: string }) => {
  // REAL: GET /api/finance/transactions
  return []
}

export const getInvestments = async () => {
  // REAL: GET /api/finance/investments
  return []
}
