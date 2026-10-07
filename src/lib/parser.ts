import { subDays, startOfDay } from 'date-fns'
import type { Category, TxType } from './db'

export interface ParsedNLResult {
  amount?: number       // in paise
  categoryId?: string
  categoryName?: string
  type: TxType
  date?: Date
  note?: string
  rawText: string
}

const INCOME_KEYWORDS = [
  'salary', 'stipend', 'income', 'earned', 'received', 'got', 'cashback',
  'refund', 'pocket money', 'allowance', 'scholarship', 'freelance'
]

export function parseNaturalLanguage(text: string, categories: Category[]): ParsedNLResult {
  const raw = text.trim()
  if (!raw) {
    return { type: 'expense', rawText: '' }
  }

  let remaining = raw.toLowerCase()
  let detectedType: TxType = 'expense'
  let detectedAmount: number | undefined
  let detectedCategory: Category | undefined
  let detectedDate: Date | undefined

  // 1. Check Income keywords
  for (const kw of INCOME_KEYWORDS) {
    if (new RegExp(`\\b${kw}\\b`, 'i').test(remaining)) {
      detectedType = 'income'
      break
    }
  }

  // 2. Parse Date
  const now = new Date()
  if (/\bday before yesterday\b/i.test(remaining)) {
    detectedDate = subDays(now, 2)
    remaining = remaining.replace(/\bday before yesterday\b/i, '')
  } else if (/\byesterday\b/i.test(remaining)) {
    detectedDate = subDays(now, 1)
    remaining = remaining.replace(/\byesterday\b/i, '')
  } else if (/\btoday\b/i.test(remaining)) {
    detectedDate = now
    remaining = remaining.replace(/\btoday\b/i, '')
  }

  // 3. Parse Amount
  // Matches "₹ 20", "rs. 50", "20k", "500.50", "120"
  const amountRegex = /(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(k)?\b/i
  const match = remaining.match(amountRegex)
  if (match) {
    let num = parseFloat(match[1])
    if (match[2] && match[2].toLowerCase() === 'k') {
      num *= 1000
    }
    if (!isNaN(num) && num > 0) {
      detectedAmount = Math.round(num * 100)
      remaining = remaining.replace(match[0], '')
    }
  }

  // 4. Match Category
  const typeCategories = categories.filter(c => c.type === detectedType)
  let bestMatch: Category | undefined
  let bestMatchLength = 0

  for (const cat of typeCategories) {
    const allKeywords = [cat.name.toLowerCase(), ...(cat.keywords || [])]
    for (const kw of allKeywords) {
      const regex = new RegExp(`\\b${kw}\\b`, 'i')
      if (regex.test(remaining)) {
        if (kw.length > bestMatchLength) {
          bestMatch = cat
          bestMatchLength = kw.length
        }
      }
    }
  }

  if (bestMatch) {
    detectedCategory = bestMatch
    // Remove the keyword from remaining string
    const kwRegex = new RegExp(`\\b(${bestMatch.name}|${(bestMatch.keywords || []).join('|')})\\b`, 'i')
    remaining = remaining.replace(kwRegex, '')
  }

  // Clean note
  const cleanedNote = remaining
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return {
    amount: detectedAmount,
    categoryId: detectedCategory?.id,
    categoryName: detectedCategory?.name,
    type: detectedType,
    date: detectedDate,
    note: cleanedNote || undefined,
    rawText: raw,
  }
}
