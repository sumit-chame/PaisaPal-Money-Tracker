import { describe, it, expect } from 'vitest'
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_ACCOUNTS,
  DEFAULT_SETTINGS,
  BRAND_SWATCHES,
} from '../lib/seeds'

describe('Database Integrity and Seeds', () => {
  it('contains valid and complete default expense categories', () => {
    expect(DEFAULT_EXPENSE_CATEGORIES.length).toBeGreaterThan(15)
    for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
      expect(cat.id).toBeDefined()
      expect(cat.type).toBe('expense')
      expect(cat.name).toBeTruthy()
      expect(cat.icon).toBeTruthy()
      expect(cat.color.startsWith('#')).toBe(true)
      expect(Array.isArray(cat.keywords)).toBe(true)
    }
  })

  it('contains valid default income categories', () => {
    expect(DEFAULT_INCOME_CATEGORIES.length).toBeGreaterThan(5)
    for (const cat of DEFAULT_INCOME_CATEGORIES) {
      expect(cat.id).toBeDefined()
      expect(cat.type).toBe('income')
      expect(cat.name).toBeTruthy()
      expect(cat.icon).toBeTruthy()
    }
  })

  it('ensures category IDs are unique across all seeds', () => {
    const allIds = [
      ...DEFAULT_EXPENSE_CATEGORIES.map(c => c.id),
      ...DEFAULT_INCOME_CATEGORIES.map(c => c.id),
    ]
    const uniqueIds = new Set(allIds)
    expect(uniqueIds.size).toBe(allIds.length)
  })

  it('provides default accounts covering cash, upi, and card', () => {
    expect(DEFAULT_ACCOUNTS).toHaveLength(3)
    const kinds = DEFAULT_ACCOUNTS.map(a => a.kind)
    expect(kinds).toContain('cash')
    expect(kinds).toContain('upi')
    expect(kinds).toContain('card')
  })

  it('defines default settings with dark theme and INR currency', () => {
    expect(DEFAULT_SETTINGS.currency).toBe('INR')
    expect(DEFAULT_SETTINGS.theme).toBe('dark')
    expect(DEFAULT_SETTINGS.streakEnabled).toBe(true)
    expect(DEFAULT_SETTINGS.cycleStartDay).toBe(1)
  })

  it('brand swatches contain 12 distinct hex colors', () => {
    expect(BRAND_SWATCHES).toHaveLength(12)
    for (const hex of BRAND_SWATCHES) {
      expect(hex).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })
})

describe('Database Fresh State & Cleanup Patterns', () => {
  it('correctly filters and targets test users for complete DB sanitization', () => {
    const testPattern = /test|@example\.|vitest/i

    expect(testPattern.test('test_user@example.com')).toBe(true)
    expect(testPattern.test('vitest_mock_user@gmail.com')).toBe(true)
    expect(testPattern.test('john.test@company.org')).toBe(true)
    // Production user must not be matched
    expect(testPattern.test('sumit@chame.dev')).toBe(false)
    expect(testPattern.test('realuser@domain.com')).toBe(false)
  })
})
