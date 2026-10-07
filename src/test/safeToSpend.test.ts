import { describe, it, expect } from 'vitest'
import { calcSafeToSpend } from '../lib/safeToSpend'
import { subDays, addDays } from 'date-fns'

describe('Safe-to-Spend Calculation Engine - calcSafeToSpend', () => {
  const baseDate = new Date(2026, 4, 15) // May 15, 2026

  it('calculates on-track status when spending is below 80%', () => {
    const budget = 500000 // ₹5000 budget (in paise)
    const txns = [
      { amount: 100000, type: 'expense', date: subDays(baseDate, 5).getTime() }, // ₹1000 spent
    ]

    const result = calcSafeToSpend({
      transactions: txns,
      budget,
      cycleStartDay: 1,
      now: baseDate,
    })

    expect(result.status).toBe('on-track')
    expect(result.cycleSpent).toBe(100000)
    expect(result.cycleTotal).toBe(500000)
    expect(result.amount).toBeGreaterThan(0)
  })

  it('calculates tight status when spending is between 80% and 100%', () => {
    const budget = 1000000 // ₹10,000
    const txns = [
      { amount: 850000, type: 'expense', date: subDays(baseDate, 2).getTime() }, // ₹8,500 spent (85%)
    ]

    const result = calcSafeToSpend({
      transactions: txns,
      budget,
      cycleStartDay: 1,
      now: baseDate,
    })

    expect(result.status).toBe('tight')
    expect(result.cycleSpent).toBe(850000)
  })

  it('calculates over status when spending exceeds budget', () => {
    const budget = 500000 // ₹5,000
    const txns = [
      { amount: 550000, type: 'expense', date: subDays(baseDate, 1).getTime() }, // ₹5,500 spent
    ]

    const result = calcSafeToSpend({
      transactions: txns,
      budget,
      cycleStartDay: 1,
      now: baseDate,
    })

    expect(result.status).toBe('over')
    expect(result.cycleSpent).toBe(550000)
    expect(result.amount).toBeLessThan(0)
  })

  it('accounts for today income and expenses correctly', () => {
    const budget = 1000000 // ₹10,000
    const today = baseDate.getTime()
    const txns = [
      { amount: 50000, type: 'expense', date: today }, // ₹500 spent today
      { amount: 20000, type: 'income', date: today },  // ₹200 earned today
    ]

    const result = calcSafeToSpend({
      transactions: txns,
      budget,
      cycleStartDay: 1,
      now: baseDate,
    })

    expect(result.todaySpent).toBe(50000)
    expect(result.todayEarned).toBe(20000)
  })

  it('ensures daysLeft is at least 1 even on cycle boundary', () => {
    const result = calcSafeToSpend({
      transactions: [],
      budget: 100000,
      cycleStartDay: 15,
      now: baseDate,
    })

    expect(result.daysLeft).toBeGreaterThanOrEqual(1)
  })
})
