import { db } from './db'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, DEFAULT_ACCOUNTS, DEFAULT_SETTINGS } from './seeds'

/**
 * Initialize the database with seed data on first launch.
 * Idempotent — only seeds if tables are empty.
 */
export async function initDB(): Promise<void> {
  const [catCount, acctCount, settingsCount] = await Promise.all([
    db.categories.count(),
    db.accounts.count(),
    db.settings.count(),
  ])

  const seedOps: Promise<unknown>[] = []

  if (catCount === 0) {
    seedOps.push(
      db.categories.bulkAdd([
        ...DEFAULT_EXPENSE_CATEGORIES,
        ...DEFAULT_INCOME_CATEGORIES,
      ])
    )
  }

  if (acctCount === 0) {
    seedOps.push(db.accounts.bulkAdd(DEFAULT_ACCOUNTS))
  }

  if (settingsCount === 0) {
    seedOps.push(db.settings.add(DEFAULT_SETTINGS))
  }

  if (seedOps.length > 0) {
    await Promise.all(seedOps)
    console.log('[Pocket] Database seeded with defaults.')
  }
}

/**
 * Load demo data — triggered manually from Settings.
 * Seeds representative transactions over the past 30 days.
 */
export async function loadDemoData(): Promise<void> {
  const { v4: uuid } = await import('uuid')
  const { addDays, subDays, startOfDay } = await import('date-fns')

  // Get category IDs
  const cats = await db.categories.toArray()
  const getCat = (name: string) => cats.find(c => c.name.includes(name))?.id ?? cats[0].id

  const accounts = await db.accounts.toArray()
  const cashId = accounts.find(a => a.kind === 'cash')?.id ?? accounts[0].id
  const upiId  = accounts.find(a => a.kind === 'upi')?.id  ?? accounts[0].id

  const now = Date.now()
  const txns = []

  // Income
  txns.push({ id: uuid(), type: 'income' as const, amount: 500000, categoryId: getCat('Pocket'), accountId: cashId, note: 'Monthly pocket money', date: subDays(now, 25).getTime(), createdAt: now, updatedAt: now })
  txns.push({ id: uuid(), type: 'income' as const, amount: 1200000, categoryId: getCat('Stipend'), accountId: upiId, note: 'Internship stipend', date: subDays(now, 20).getTime(), createdAt: now, updatedAt: now })

  // Expenses
  const expenseData = [
    { name: 'Food', amount: 8500, note: 'Dinner at mess', days: 1 },
    { name: 'Chai', amount: 2000, note: 'Chai and samosa', days: 1 },
    { name: 'Transport', amount: 6000, note: 'Auto to college', days: 2 },
    { name: 'Food', amount: 12000, note: 'Pizza with friends', days: 2 },
    { name: 'Chai', amount: 3000, note: 'Coffee at CCD', days: 3 },
    { name: 'Groceries', amount: 45000, note: 'Monthly grocery run', days: 3 },
    { name: 'Transport', amount: 4500, note: 'Metro card recharge', days: 4 },
    { name: 'Subscriptions', amount: 17900, note: 'Netflix monthly', days: 5 },
    { name: 'Food', amount: 9000, note: 'Biryani for lunch', days: 5 },
    { name: 'Books', amount: 38000, note: 'Algorithms textbook', days: 6 },
    { name: 'Transport', amount: 8000, note: 'Ola to airport', days: 7 },
    { name: 'Mobile Recharge', amount: 23900, note: 'Jio recharge 84 days', days: 8 },
    { name: 'Chai', amount: 2500, note: 'Morning tea', days: 9 },
    { name: 'Health', amount: 15000, note: 'Pharmacy — vitamins', days: 9 },
    { name: 'Fun', amount: 35000, note: 'Movie — Pathaan', days: 10 },
    { name: 'Gaming', amount: 49900, note: 'BGMI UC purchase', days: 11 },
    { name: 'Food', amount: 7500, note: 'Mess fee', days: 12 },
    { name: 'Printouts', amount: 3500, note: 'Assignment printouts', days: 12 },
    { name: 'Gym', amount: 120000, note: 'Gym monthly membership', days: 13 },
    { name: 'Chai', amount: 1500, note: 'Campus chai', days: 14 },
    { name: 'Transport', amount: 5000, note: 'Bus pass', days: 15 },
    { name: 'Gifts', amount: 60000, note: "Rahul's birthday gift", days: 16 },
    { name: 'Friends', amount: 45000, note: 'Group dinner split', days: 16 },
    { name: 'Food', amount: 11000, note: 'Swiggy order', days: 17 },
    { name: 'Internet', amount: 39900, note: 'Broadband bill', days: 18 },
    { name: 'Clothing', amount: 89900, note: 'Myntra kurti', days: 19 },
    { name: 'Chai', amount: 2000, note: 'Bun maska + chai', days: 20 },
    { name: 'Transport', amount: 7500, note: 'Rapido to station', days: 21 },
    { name: 'Food', amount: 13500, note: 'Restaurant outing', days: 22 },
    { name: 'Misc', amount: 5000, note: 'Random stuff', days: 23 },
  ]

  for (const d of expenseData) {
    txns.push({
      id: uuid(),
      type: 'expense' as const,
      amount: d.amount,
      categoryId: getCat(d.name),
      accountId: d.days % 2 === 0 ? upiId : cashId,
      note: d.note,
      date: subDays(startOfDay(now), d.days).getTime(),
      createdAt: now,
      updatedAt: now,
    })
  }

  await db.transactions.bulkAdd(txns)

  // Seed sample friends if empty
  const friendsCount = await db.friends.count()
  if (friendsCount === 0) {
    await db.friends.bulkAdd([
      { id: uuid(), name: 'Rahul', createdAt: now },
      { id: uuid(), name: 'Sneha', createdAt: now },
      { id: uuid(), name: 'Ankit', createdAt: now },
    ])
  }

  // Seed sample subscriptions if empty
  const subsCount = await db.subscriptions.count()
  if (subsCount === 0) {
    await db.subscriptions.bulkAdd([
      { id: uuid(), name: 'Spotify Student', amount: 5900, interval: 'monthly', nextDue: addDays(now, 12).getTime(), color: '#16A34A' },
      { id: uuid(), name: 'Netflix Mobile', amount: 14900, interval: 'monthly', nextDue: addDays(now, 22).getTime(), color: '#D4183D' },
      { id: uuid(), name: 'Hostel WiFi', amount: 39900, interval: 'monthly', nextDue: addDays(now, 5).getTime(), color: '#2563EB' },
    ])
  }

  // Set a budget
  const budgets = await db.budgets.count()
  if (budgets === 0) {
    await db.budgets.add({
      id: uuid(),
      name: 'Monthly Budget',
      amount: 500000, // ₹5000
      cycleStartDay: 1,
      rollover: false,
    })
  }

  console.log('[Pocket] Demo data loaded.')
}
