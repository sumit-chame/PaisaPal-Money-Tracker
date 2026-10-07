/**
 * Format paise (integer) into a display string.
 * e.g. 100000 → "₹1,000"
 */
export function formatAmount(paise: number, currency = 'INR', locale = 'en-IN'): string {
  const amount = paise / 100
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format a raw number (paise) as compact — e.g. 100000 → "₹1K"
 */
export function formatCompact(paise: number, currency = 'INR', locale = 'en-IN'): string {
  const amount = paise / 100
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
  if (amount >= 1000)   return `₹${(amount / 1000).toFixed(1)}K`
  return formatAmount(paise, currency, locale)
}

/**
 * Parse a display string into paise integer.
 * e.g. "₹80", "80rs", "80", "1.5k", "1,200" → integer paise
 */
export function parseToPaise(raw: string): number | null {
  const cleaned = raw
    .toLowerCase()
    .replace(/[₹,\s]/g, '')
    .replace(/rs\.?$/, '')

  const kMatch = cleaned.match(/^(\d+\.?\d*)k$/i)
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000 * 100)

  const lMatch = cleaned.match(/^(\d+\.?\d*)l$/)
  if (lMatch) return Math.round(parseFloat(lMatch[1]) * 100000 * 100)

  const num = parseFloat(cleaned)
  if (!isNaN(num) && num > 0) return Math.round(num * 100)

  return null
}

/**
 * Convert a word amount to number.
 * e.g. "two hundred" → 200
 */
const ONES = ['zero','one','two','three','four','five','six','seven','eight','nine',
              'ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen',
              'seventeen','eighteen','nineteen']
const TENS = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety']

export function wordsToNumber(text: string): number | null {
  const lower = text.toLowerCase().trim()
  // check for simple numeric first
  const direct = parseToPaise(lower)
  if (direct !== null) return direct / 100

  let total = 0
  let current = 0
  const words = lower.replace(/-/g, ' ').split(/\s+/)

  for (const word of words) {
    const oIdx = ONES.indexOf(word)
    const tIdx = TENS.indexOf(word)
    if (oIdx >= 0) { current += oIdx }
    else if (tIdx >= 0) { current += tIdx * 10 }
    else if (word === 'hundred') { current *= 100 }
    else if (word === 'thousand') { total += current * 1000; current = 0 }
    else if (word === 'lakh') { total += current * 100000; current = 0 }
    else { return null }
  }

  const result = total + current
  return result > 0 ? result : null
}
