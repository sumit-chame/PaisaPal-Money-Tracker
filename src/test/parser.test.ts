import { describe, it, expect } from 'vitest'
import { parseNaturalLanguage } from '../lib/parser'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../lib/seeds'
import { startOfDay, subDays } from 'date-fns'

const ALL_CATEGORIES = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES]

describe('Natural Language Parser - parseNaturalLanguage', () => {
  it('handles empty or whitespace-only input', () => {
    const res = parseNaturalLanguage('', ALL_CATEGORIES)
    expect(res.rawText).toBe('')
    expect(res.type).toBe('expense')
    expect(res.amount).toBeUndefined()
  })

  it('detects simple expense amount and category', () => {
    const res = parseNaturalLanguage('Food 150', ALL_CATEGORIES)
    expect(res.type).toBe('expense')
    expect(res.amount).toBe(15000) // ₹150 in paise
    expect(res.categoryName).toBe('Food')
  })

  it('detects chai & snacks category from keywords', () => {
    const res = parseNaturalLanguage('Chai 20 with samosa', ALL_CATEGORIES)
    expect(res.type).toBe('expense')
    expect(res.amount).toBe(2000) // ₹20
    expect(res.categoryName).toBe('Chai & Snacks')
  })

  it('detects income type from keywords (e.g., stipend)', () => {
    const res = parseNaturalLanguage('Internship stipend 12000', ALL_CATEGORIES)
    expect(res.type).toBe('income')
    expect(res.amount).toBe(1200000) // ₹12,000 in paise
    expect(res.categoryName).toBe('Stipend / Intern')
  })

  it('detects pocket money as income', () => {
    const res = parseNaturalLanguage('Pocket money 5000 from parents', ALL_CATEGORIES)
    expect(res.type).toBe('income')
    expect(res.amount).toBe(500000)
    expect(res.categoryName).toBe('Pocket Money')
  })

  it('detects relative date "yesterday"', () => {
    const res = parseNaturalLanguage('Yesterday auto 60', ALL_CATEGORIES)
    expect(res.amount).toBe(6000)
    expect(res.categoryName).toBe('Transport')
    expect(res.date).toBeDefined()
    if (res.date) {
      const yesterday = subDays(new Date(), 1)
      expect(res.date.getDate()).toBe(yesterday.getDate())
    }
  })

  it('detects relative date "day before yesterday"', () => {
    const res = parseNaturalLanguage('day before yesterday metro 40', ALL_CATEGORIES)
    expect(res.amount).toBe(4000)
    expect(res.categoryName).toBe('Transport')
    expect(res.date).toBeDefined()
    if (res.date) {
      const twoDaysAgo = subDays(new Date(), 2)
      expect(res.date.getDate()).toBe(twoDaysAgo.getDate())
    }
  })

  it('handles "k" shorthand for amounts', () => {
    const res = parseNaturalLanguage('20k freelance project', ALL_CATEGORIES)
    expect(res.type).toBe('income')
    expect(res.amount).toBe(2000000) // ₹20,000 in paise
    expect(res.categoryName).toBe('Freelance')
  })

  it('extracts leftover text as the clean note when category keyword is consumed', () => {
    const res = parseNaturalLanguage('Pizza at cafe 350', ALL_CATEGORIES)
    expect(res.amount).toBe(35000)
    expect(res.note).toBeDefined()
    expect(res.note).toBe('pizza at cafe')
  })
})
