import { describe, it, expect } from 'vitest'
import {
  formatAmount,
  formatCompact,
  parseToPaise,
  wordsToNumber,
} from '../lib/currency'

describe('Currency Utility - formatAmount', () => {
  it('formats whole rupee amounts correctly in INR', () => {
    // 100000 paise = 1000 INR
    const result = formatAmount(100000)
    expect(result).toMatch(/₹\s?1,000/)
  })

  it('formats fractional rupee amounts with 2 decimal places', () => {
    // 1050 paise = 10.50 INR
    const result = formatAmount(1050)
    expect(result).toMatch(/₹\s?10\.50?/)
  })

  it('formats zero correctly', () => {
    const result = formatAmount(0)
    expect(result).toMatch(/₹\s?0/)
  })

  it('supports custom currency', () => {
    const result = formatAmount(50000, 'USD', 'en-US')
    expect(result).toBe('$500')
  })
})

describe('Currency Utility - formatCompact', () => {
  it('formats values below 1000 with regular formatting', () => {
    const result = formatCompact(50000) // ₹500
    expect(result).toMatch(/₹\s?500/)
  })

  it('formats thousands with K suffix', () => {
    // 5000 INR = 500000 paise
    expect(formatCompact(500000)).toBe('₹5.0K')
    // 12500 INR = 1250000 paise
    expect(formatCompact(1250000)).toBe('₹12.5K')
  })

  it('formats lakhs with L suffix', () => {
    // 150000 INR = 15000000 paise
    expect(formatCompact(15000000)).toBe('₹1.5L')
  })
})

describe('Currency Utility - parseToPaise', () => {
  it('parses plain numbers into paise', () => {
    expect(parseToPaise('50')).toBe(5000)
    expect(parseToPaise('120.50')).toBe(12050)
  })

  it('strips rupee symbols and Rs prefixes', () => {
    expect(parseToPaise('₹80')).toBe(8000)
    expect(parseToPaise('80rs')).toBe(8000)
    expect(parseToPaise('₹ 150')).toBe(15000)
  })

  it('handles comma separators', () => {
    expect(parseToPaise('1,500')).toBe(150000)
    expect(parseToPaise('₹1,20,000')).toBe(12000000)
  })

  it('parses "k" notation correctly', () => {
    expect(parseToPaise('1.5k')).toBe(150000)
    expect(parseToPaise('20k')).toBe(2000000)
    expect(parseToPaise('5K')).toBe(500000)
  })

  it('parses "l" notation correctly', () => {
    expect(parseToPaise('2l')).toBe(20000000)
    expect(parseToPaise('1.5l')).toBe(15000000)
  })

  it('returns null for invalid or non-numeric input', () => {
    expect(parseToPaise('')).toBeNull()
    expect(parseToPaise('hello')).toBeNull()
    expect(parseToPaise('-50')).toBeNull()
  })
})

describe('Currency Utility - wordsToNumber', () => {
  it('handles direct numeric strings', () => {
    expect(wordsToNumber('500')).toBe(500)
    expect(wordsToNumber('1.5k')).toBe(1500)
  })

  it('converts English words to numbers', () => {
    expect(wordsToNumber('twenty')).toBe(20)
    expect(wordsToNumber('two hundred')).toBe(200)
    expect(wordsToNumber('five thousand')).toBe(5000)
    expect(wordsToNumber('one lakh')).toBe(100000)
  })

  it('converts compound number words', () => {
    expect(wordsToNumber('twenty five')).toBe(25)
    expect(wordsToNumber('one thousand five hundred')).toBe(1500)
  })

  it('returns null for unparseable words', () => {
    expect(wordsToNumber('nonsense words here')).toBeNull()
  })
})
