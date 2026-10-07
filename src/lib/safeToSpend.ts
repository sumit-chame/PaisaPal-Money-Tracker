/**
 * Safe-to-spend calculation engine.
 * 
 * Formula:
 *   dailyAllowance = (totalBudget - totalExpenses) / daysRemaining
 *   safeToday = dailyAllowance - (todayExpenses - todayIncome)
 */

import { startOfDay, endOfDay, differenceInDays } from 'date-fns'

export interface SafeToSpendResult {
  amount: number      // paise — can be negative
  daysLeft: number
  cycleTotal: number  // total budget in paise
  cycleSpent: number  // total spent this cycle in paise
  cycleEarned: number // total income this cycle in paise
  todaySpent: number
  todayEarned: number
  status: 'on-track' | 'tight' | 'over'
}

export function calcSafeToSpend(opts: {
  transactions: { amount: number; type: string; date: number }[]
  budget: number         // paise total for cycle
  cycleStartDay: number  // 1–28
  now?: Date
}): SafeToSpendResult {
  const { transactions, budget, cycleStartDay, now = new Date() } = opts

  // Find cycle start
  const year = now.getFullYear()
  const month = now.getMonth()
  let cycleStart = new Date(year, month, cycleStartDay)
  if (cycleStart > now) cycleStart = new Date(year, month - 1, cycleStartDay)

  let cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, cycleStartDay)

  const cycleTxns = transactions.filter(t => t.date >= cycleStart.getTime() && t.date < cycleEnd.getTime())
  const todayStart = startOfDay(now).getTime()
  const todayEnd   = endOfDay(now).getTime()
  const todayTxns  = cycleTxns.filter(t => t.date >= todayStart && t.date <= todayEnd)

  const cycleSpent  = cycleTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const cycleEarned = cycleTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const todaySpent  = todayTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const todayEarned = todayTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)

  const daysLeft = Math.max(1, differenceInDays(cycleEnd, now))
  const remaining = budget - cycleSpent
  const dailyAllowance = remaining / daysLeft
  const safeToday = dailyAllowance - (todaySpent - todayEarned)

  const ratio = cycleSpent / (budget || 1)
  const status: SafeToSpendResult['status'] =
    ratio < 0.8 ? 'on-track' : ratio < 1 ? 'tight' : 'over'

  return {
    amount: Math.round(safeToday),
    daysLeft,
    cycleTotal: budget,
    cycleSpent,
    cycleEarned,
    todaySpent,
    todayEarned,
    status,
  }
}
