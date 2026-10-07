import Dexie, { type Table } from 'dexie'

/* ─── Types ────────────────────────────────── */

export type TxType = 'expense' | 'income' | 'transfer'
export type ThemeMode = 'dark' | 'light' | 'system'
export type AccountKind = 'cash' | 'bank' | 'upi' | 'card' | 'other'
export type RecurringInterval = 'daily' | 'weekly' | 'monthly'
export type SubscriptionInterval = 'weekly' | 'monthly' | 'yearly'

export interface Transaction {
  id: string
  type: TxType
  amount: number          // stored as integer paise (amount × 100)
  categoryId?: string
  accountId: string
  toAccountId?: string    // transfer only
  note?: string
  date: number            // epoch ms
  tags?: string[]
  receiptBlobId?: string
  split?: { friendId: string; share: number; settled: boolean }[]
  recurringId?: string
  createdAt: number
  updatedAt: number
}

export interface Category {
  id: string
  type: 'expense' | 'income'
  name: string
  icon: string            // lucide icon name
  color: string           // hex
  order: number
  hidden?: boolean
  keywords?: string[]
  isDefault?: boolean
}

export interface Account {
  id: string
  name: string
  kind: AccountKind
  openingBalance: number  // paise
  createdAt: number
}

export interface Budget {
  id: string
  name: string
  categoryId?: string     // undefined = total budget
  amount: number          // paise per cycle
  cycleStartDay: number
  rollover?: boolean
  color?: string
}

export interface Goal {
  id: string
  name: string
  target: number          // paise
  saved: number           // paise
  deadline?: number
  icon: string
  color: string
  createdAt: number
}

export interface Friend {
  id: string
  name: string
  createdAt: number
}

export interface Subscription {
  id: string
  name: string
  amount: number          // paise
  interval: SubscriptionInterval
  nextDue: number
  categoryId?: string
  color?: string
  icon?: string
}

export interface Recurring {
  id: string
  template: Partial<Transaction>
  interval: RecurringInterval
  nextRun: number
  enabled: boolean
}

export interface ReceiptBlob {
  id: string
  data: Blob
  createdAt: number
}

export interface Settings {
  id: 1
  currency: string
  locale: string
  theme: ThemeMode
  cycleStartDay: number
  appLock?: boolean
  dailyReminderTime?: string   // "HH:MM"
  streakEnabled: boolean
  schemaVersion: number
}

/* ─── Database ─────────────────────────────── */

export class PocketDB extends Dexie {
  transactions!: Table<Transaction>
  categories!:   Table<Category>
  accounts!:     Table<Account>
  budgets!:      Table<Budget>
  goals!:        Table<Goal>
  friends!:      Table<Friend>
  subscriptions!: Table<Subscription>
  recurrings!:   Table<Recurring>
  receiptBlobs!: Table<ReceiptBlob>
  settings!:     Table<Settings>

  constructor() {
    super('pocket-db')
    this.version(1).stores({
      transactions: 'id, type, categoryId, accountId, date, createdAt',
      categories:   'id, type, order',
      accounts:     'id, kind',
      budgets:      'id, categoryId',
      goals:        'id',
      friends:      'id',
      subscriptions:'id, nextDue',
      recurrings:   'id, nextRun',
      receiptBlobs: 'id',
      settings:     'id',
    })
  }
}

export const db = new PocketDB()
