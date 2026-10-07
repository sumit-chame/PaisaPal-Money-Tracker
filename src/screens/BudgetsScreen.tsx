import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Target, AlertCircle, Coins, Repeat, Check, Trash2, Calendar } from 'lucide-react'
import { format, addMonths, addWeeks, addYears } from 'date-fns'
import { v4 as uuid } from 'uuid'
import { db, type Subscription } from '../lib/db'
import { formatAmount, formatCompact } from '../lib/currency'
import CategoryIcon from '../components/CategoryIcon'
import AddSubscriptionModal from '../components/AddSubscriptionModal'
import { useToastStore } from '../store'

type BudgetTab = 'envelopes' | 'subscriptions' | 'goals'

export default function BudgetsScreen() {
  const [activeTab, setActiveTab] = useState<BudgetTab>('envelopes')
  const [showAddSub, setShowAddSub] = useState(false)

  const { addToast } = useToastStore()

  const budgets = useLiveQuery(() => db.budgets.toArray()) ?? []
  const goals   = useLiveQuery(() => db.goals.toArray()) ?? []
  const subscriptions = useLiveQuery(() => db.subscriptions.toArray()) ?? []
  const transactions = useLiveQuery(() => db.transactions.toArray()) ?? []
  const categories = useLiveQuery(() => db.categories.toArray()) ?? []
  const accounts = useLiveQuery(() => db.accounts.toArray()) ?? []

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const monthExpenses = transactions.filter(t => t.type === 'expense' && t.date >= monthStart)

  const handlePaySubscription = async (sub: Subscription) => {
    const upiOrCash = accounts[0]?.id ?? 'default'
    const subCat = categories.find(c => c.name.toLowerCase().includes('subscription'))?.id

    // Add transaction
    await db.transactions.add({
      id: uuid(),
      type: 'expense',
      amount: sub.amount,
      categoryId: subCat,
      accountId: upiOrCash,
      note: `${sub.name} payment`,
      date: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    // Advance next due date
    const nextDate = sub.interval === 'yearly'
      ? addYears(new Date(sub.nextDue), 1)
      : sub.interval === 'weekly'
      ? addWeeks(new Date(sub.nextDue), 1)
      : addMonths(new Date(sub.nextDue), 1)

    await db.subscriptions.update(sub.id, { nextDue: nextDate.getTime() })
    addToast({ message: `Recorded ${sub.name} payment of ${formatAmount(sub.amount)}`, type: 'success' })
  }

  const handleDeleteSub = async (id: string, name: string) => {
    await db.subscriptions.delete(id)
    addToast({ message: `Removed "${name}"`, type: 'info' })
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ padding: '16px 20px', paddingBottom: 'calc(var(--tab-h) + var(--safe-bottom) + 24px)' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: '0 0 16px' }}>Budgets & Plans</h1>

        {/* Tab switch */}
        <div style={{ display: 'flex', gap: 6, background: 'var(--surface)', padding: 3, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: 20 }}>
          <button
            onClick={() => setActiveTab('envelopes')}
            style={{
              flex: 1,
              padding: '7px 8px',
              borderRadius: 'calc(var(--radius-md) - 2px)',
              border: 'none',
              background: activeTab === 'envelopes' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'envelopes' ? 'var(--primary-contrast)' : 'var(--text-muted)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Envelopes
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            style={{
              flex: 1,
              padding: '7px 8px',
              borderRadius: 'calc(var(--radius-md) - 2px)',
              border: 'none',
              background: activeTab === 'subscriptions' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'subscriptions' ? 'var(--primary-contrast)' : 'var(--text-muted)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Subscriptions ({subscriptions.length})
          </button>
          <button
            onClick={() => setActiveTab('goals')}
            style={{
              flex: 1,
              padding: '7px 8px',
              borderRadius: 'calc(var(--radius-md) - 2px)',
              border: 'none',
              background: activeTab === 'goals' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'goals' ? 'var(--primary-contrast)' : 'var(--text-muted)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Goals
          </button>
        </div>

        {/* ── Envelopes Tab ── */}
        {activeTab === 'envelopes' && (
          <div>
            <SectionHeader title="Category Limits" />
            {budgets.length === 0 ? (
              <EmptyCard icon={<Coins size={28} strokeWidth={1.75} color="var(--primary)" />} text="No envelopes set. Create spending budgets to keep track." />
            ) : (
              budgets.map(budget => {
                const spent = monthExpenses
                  .filter(t => !budget.categoryId || t.categoryId === budget.categoryId)
                  .reduce((s, t) => s + t.amount, 0)
                const pct = Math.min(100, (spent / budget.amount) * 100)
                const over = spent > budget.amount
                const catName = budget.categoryId ? catMap[budget.categoryId]?.name : 'All Categories'

                return (
                  <motion.div
                    key={budget.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card"
                    style={{ marginBottom: 12 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{budget.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{catName}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="tabular-nums" style={{ fontWeight: 600, fontSize: 14, color: over ? 'var(--expense)' : 'var(--text)' }}>
                          {formatCompact(spent)}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>of {formatCompact(budget.amount)}</div>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        style={{
                          height: '100%',
                          borderRadius: 3,
                          background: over ? 'var(--expense)' : pct > 80 ? '#D97706' : 'var(--income)',
                        }}
                      />
                    </div>
                    {over && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, color: 'var(--expense)', fontSize: 12 }}>
                        <AlertCircle size={13} /> Over by {formatCompact(spent - budget.amount)}
                      </div>
                    )}
                  </motion.div>
                )
              })
            )}
          </div>
        )}

        {/* ── Subscriptions Tab ── */}
        {activeTab === 'subscriptions' && (
          <div>
            <SectionHeader
              title="Recurring Subscriptions"
              action={{ label: 'Add Subscription', onClick: () => setShowAddSub(true) }}
            />
            {subscriptions.length === 0 ? (
              <EmptyCard icon={<Repeat size={28} strokeWidth={1.75} color="var(--primary)" />} text="No subscriptions added yet. Track Spotify, Netflix, Hostel Rent, etc." />
            ) : (
              subscriptions.map(sub => (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card"
                  style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Repeat size={18} color="var(--primary)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{sub.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <Calendar size={12} />
                      <span>Due {format(new Date(sub.nextDue), 'd MMM')} · {sub.interval}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="tabular-nums" style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>
                      {formatAmount(sub.amount)}
                    </div>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handlePaySubscription(sub)}
                        style={{
                          background: 'var(--surface-2)',
                          border: '1px solid var(--border)',
                          color: 'var(--income)',
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        <Check size={12} /> Pay
                      </button>
                      <button
                        onClick={() => handleDeleteSub(sub.id, sub.name)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 3 }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* ── Goals Tab ── */}
        {activeTab === 'goals' && (
          <div>
            <SectionHeader title="Savings Targets" />
            {goals.length === 0 ? (
              <EmptyCard icon={<Target size={28} strokeWidth={1.75} color="var(--primary)" />} text="No savings goals yet. Set targets for trips or gadget purchases." />
            ) : (
              goals.map(goal => {
                const pct = Math.min(100, (goal.saved / goal.target) * 100)
                return (
                  <motion.div key={goal.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: goal.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <CategoryIcon name="Target" size={20} color={goal.color} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>{goal.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{formatCompact(goal.saved)} of {formatCompact(goal.target)}</div>
                        <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} style={{ height: '100%', borderRadius: 3, background: goal.color }} />
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', paddingLeft: 8 }}>
                        <div className="tabular-nums" style={{ fontWeight: 600, fontSize: 15, color: goal.color }}>{pct.toFixed(0)}%</div>
                      </div>
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Add Subscription Modal */}
      <AnimatePresence>
        {showAddSub && (
          <AddSubscriptionModal
            onClose={() => setShowAddSub(false)}
            onSaved={() => setShowAddSub(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function SectionHeader({ title, action }: { title: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{title}</h2>
      {action && (
        <button onClick={action.onClick} style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--primary)', padding: '5px 12px', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: 12, cursor: 'pointer', minHeight: 'unset', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Plus size={13} strokeWidth={2} /> {action.label}
        </button>
      )}
    </div>
  )
}

function EmptyCard({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ padding: '24px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', textAlign: 'center', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{text}</div>
    </div>
  )
}
