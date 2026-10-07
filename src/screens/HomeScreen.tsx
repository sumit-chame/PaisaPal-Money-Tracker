import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, isToday, isYesterday, startOfDay } from 'date-fns'
import { Plus, TrendingUp, TrendingDown, Search, Trash2, Edit3, Zap, Receipt, AlertTriangle, X } from 'lucide-react'
import { db, type Transaction, type Category } from '../lib/db'
import { calcSafeToSpend } from '../lib/safeToSpend'
import { formatAmount, formatCompact } from '../lib/currency'
import { useNavStore, useToastStore } from '../store'
import CategoryIcon from '../components/CategoryIcon'

export default function HomeScreen() {
  const { openAddSheet } = useNavStore()
  const { addToast } = useToastStore()

  const [deleteCandidate, setDeleteCandidate] = useState<Transaction | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  const transactions = useLiveQuery(() =>
    db.transactions.orderBy('date').reverse().toArray()
  ) ?? []

  const categories = useLiveQuery(() => db.categories.toArray()) ?? []
  const settings   = useLiveQuery(() => db.settings.get(1))
  const budgets    = useLiveQuery(() => db.budgets.toArray()) ?? []

  const catMap = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories])

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0) || 500000 // fallback ₹5000

  const safeToSpend = useMemo(() => calcSafeToSpend({
    transactions,
    budget: totalBudget,
    cycleStartDay: settings?.cycleStartDay ?? 1,
  }), [transactions, totalBudget, settings])

  // Filtered transactions for search
  const displayedTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions
    const q = searchQuery.toLowerCase().trim()
    return transactions.filter(t => {
      const cat = catMap[t.categoryId ?? '']
      const catName = (cat?.name ?? '').toLowerCase()
      const note = (t.note ?? '').toLowerCase()
      const amountStr = (t.amount / 100).toString()
      return catName.includes(q) || note.includes(q) || amountStr.includes(q)
    })
  }, [transactions, searchQuery, catMap])

  // Group by day
  const grouped = useMemo(() => {
    const map = new Map<string, typeof displayedTransactions>()
    for (const t of displayedTransactions) {
      const key = format(new Date(t.date), 'yyyy-MM-dd')
      const arr = map.get(key) ?? []
      arr.push(t)
      map.set(key, arr)
    }
    return [...map.entries()].slice(0, 15) // last 15 days
  }, [displayedTransactions])

  const handleEdit = (txn: Transaction) => {
    openAddSheet(txn)
  }

  const handleDelete = (txn: Transaction) => {
    setDeleteCandidate(txn)
  }

  const confirmDelete = async () => {
    if (!deleteCandidate) return
    const target = deleteCandidate
    setDeleteCandidate(null)
    await db.transactions.delete(target.id)
    addToast({
      message: 'Transaction deleted',
      type: 'info',
      duration: 5000,
      action: {
        label: 'Undo',
        fn: async () => {
          await db.transactions.add(target)
          addToast({ message: 'Transaction restored', type: 'success' })
        }
      }
    })
  }

  const statusColor = safeToSpend.status === 'on-track'
    ? 'var(--income)' : safeToSpend.status === 'tight'
    ? '#D97706' : 'var(--expense)'

  const statusLabel = safeToSpend.status === 'on-track'
    ? 'On track' : safeToSpend.status === 'tight'
    ? 'Tight budget' : 'Over budget'

  return (
    <div style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
      <div style={{ padding: '16px 20px', paddingBottom: 'calc(var(--tab-h) + var(--safe-bottom) + 24px)' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
              Pocket
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              {format(new Date(), 'EEEE, d MMMM')}
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => openAddSheet()}
            aria-label="Add transaction"
            style={{
              width: 38, height: 38, borderRadius: 'var(--radius-md)',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--primary)',
              minHeight: 'unset', minWidth: 'unset',
            }}
          >
            <Plus size={18} strokeWidth={2} />
          </motion.button>
        </div>

        {/* ── Safe to Spend Hero Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 20px 18px',
            marginBottom: 16,
            position: 'relative',
          }}
        >
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Left today
            </div>
            <div className="tabular-nums" style={{ fontSize: 44, fontWeight: 600, color: statusColor, lineHeight: 1, marginBottom: 6 }}>
              {safeToSpend.amount < 0 ? '-' : ''}
              {formatCompact(Math.abs(safeToSpend.amount))}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>
              {statusLabel} · {safeToSpend.daysLeft} days to go
            </div>

            {/* Mini stats */}
            <div style={{ display: 'flex', gap: 0, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <MiniStat label="Spent" value={safeToSpend.cycleSpent} color="var(--expense)" icon={<TrendingDown size={14} />} />
              <div style={{ width: 1, background: 'var(--border)', margin: '0 16px' }} />
              <MiniStat label="Earned" value={safeToSpend.cycleEarned} color="var(--income)" icon={<TrendingUp size={14} />} />
              <div style={{ width: 1, background: 'var(--border)', margin: '0 16px' }} />
              <MiniStat label="Budget" value={totalBudget} color="var(--text-2)" />
            </div>
          </div>
        </motion.div>

        {/* ── Quick Add ── */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => openAddSheet()}
          style={{
            width: '100%',
            padding: '14px 18px',
            background: 'var(--bg-2)',
            border: '1px dashed var(--border-strong)',
            borderRadius: 'var(--r-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: 'var(--text-3)',
            fontSize: 15,
            cursor: 'pointer',
            marginBottom: 24,
            minHeight: 'unset',
          }}
        >
          <Zap size={18} color="var(--accent)" />
          <span>chai 20 · auto 60 · mess 90…</span>
        </motion.button>

        {/* ── Recent Transactions ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showSearch ? 10 : 16 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Recent</h2>
            <button
              onClick={() => {
                setShowSearch(prev => !prev)
                if (showSearch) setSearchQuery('')
              }}
              style={{
                background: 'none',
                border: 'none',
                color: showSearch ? 'var(--primary)' : 'var(--text-3)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                minHeight: 'unset',
                padding: '4px 6px',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {showSearch ? <X size={15} /> : <Search size={15} />}
              {showSearch ? 'Close' : 'Search'}
            </button>
          </div>

          {/* Search bar input */}
          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden', marginBottom: 14 }}
              >
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={15} style={{ position: 'absolute', left: 12, color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by category, note, amount…"
                    autoFocus
                    style={{
                      width: '100%',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '8px 12px 8px 34px',
                      fontSize: 13,
                      color: 'var(--text)',
                      outline: 'none',
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: 8,
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {transactions.length === 0 ? (
            <EmptyState onAdd={() => openAddSheet()} />
          ) : displayedTransactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: 13 }}>
              No transactions matching "{searchQuery}"
            </div>
          ) : (
            grouped.map(([dateKey, txns], i) => (
              <motion.div
                key={dateKey}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                style={{ marginBottom: 20 }}
              >
                {/* Day header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-3)' }}>
                    {isToday(new Date(dateKey)) ? 'Today' : isYesterday(new Date(dateKey)) ? 'Yesterday' : format(new Date(dateKey), 'EEE, d MMM')}
                  </span>
                  <span className="tabular-nums" style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    {formatCompact(txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0))}
                  </span>
                </div>

                {/* Transaction list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {txns.map(txn => {
                    const cat = catMap[txn.categoryId ?? '']
                    return (
                      <TxnRow
                        key={txn.id}
                        txn={txn}
                        category={cat}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    )
                  })}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* ── Delete Confirmation Dialog ── */}
      <AnimatePresence>
        {deleteCandidate && (
          <>
            <motion.div
              className="sheet-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ zIndex: 60 }}
              onClick={() => setDeleteCandidate(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              style={{
                position: 'fixed',
                bottom: 'calc(32px + var(--safe-bottom))',
                left: 0,
                right: 0,
                margin: '0 auto',
                width: 'calc(100% - 32px)',
                maxWidth: 440,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: 24,
                zIndex: 65,
                textAlign: 'center',
                boxShadow: 'var(--shadow-md)',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--expense)' }}>
                <AlertTriangle size={32} />
              </div>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: 'var(--text)' }}>
                Delete Expense?
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
                Are you sure you want to permanently delete this {deleteCandidate.type} of {formatAmount(deleteCandidate.amount)}
                {deleteCandidate.categoryId && catMap[deleteCandidate.categoryId] ? ` (${catMap[deleteCandidate.categoryId].name})` : ''}? This action cannot be undone.
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setDeleteCandidate(null)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 14,
                    minHeight: 'unset',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'var(--expense)',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 14,
                    minHeight: 'unset',
                  }}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function MiniStat({ label, value, color, icon }: { label: string; value: number; color: string; icon?: React.ReactNode }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-3)', fontSize: 11, fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {icon} {label}
      </div>
      <div className="tabular-nums" style={{ fontSize: 15, fontWeight: 700, color }}>{formatCompact(value)}</div>
    </div>
  )
}

function TxnRow({
  txn,
  category,
  onEdit,
  onDelete,
}: {
  txn: Transaction
  category?: Category
  onEdit: (txn: Transaction) => void
  onDelete: (txn: Transaction) => void
}) {
  const isIncome = txn.type === 'income'
  const sign = isIncome ? '+' : txn.type === 'transfer' ? '↔' : '-'
  const amtColor = isIncome ? 'var(--income)' : txn.type === 'transfer' ? 'var(--transfer)' : 'var(--expense)'

  return (
    <motion.div
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onEdit(txn)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        transition: 'border-color 0.15s ease',
      }}
    >
      {/* Icon */}
      <div style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: category ? category.color + '18' : 'var(--bg-3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {category ? (
          <CategoryIcon name={category.icon} size={20} color={category.color} />
        ) : (
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--border-strong)' }} />
        )}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {category?.name ?? (txn.type === 'transfer' ? 'Transfer' : 'Transaction')}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {txn.note ?? format(new Date(txn.date), 'h:mm a')}
        </div>
      </div>

      {/* Amount */}
      <div className="tabular-nums" style={{ fontWeight: 700, fontSize: 15, color: amtColor, flexShrink: 0 }}>
        {sign}{formatAmount(txn.amount)}
      </div>

      {/* Action buttons (Edit & Delete) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexShrink: 0,
          marginLeft: 4,
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            onEdit(txn)
          }}
          aria-label="Edit expense"
          title="Edit"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-2)',
            padding: 0,
            minHeight: 'unset',
            minWidth: 'unset',
          }}
        >
          <Edit3 size={13} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            onDelete(txn)
          }}
          aria-label="Delete expense"
          title="Delete"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--expense)',
            padding: 0,
            minHeight: 'unset',
            minWidth: 'unset',
          }}
        >
          <Trash2 size={13} strokeWidth={2} />
        </button>
      </div>
    </motion.div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ textAlign: 'center', padding: '48px 24px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: 'var(--text-muted)' }}>
        <Receipt size={44} strokeWidth={1.75} />
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>No transactions yet</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, maxWidth: 280, margin: '0 auto 24px' }}>
        Track your expenses quickly. Press + to record your first entry.
      </div>
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={onAdd}
        style={{
          padding: '10px 24px',
          background: 'var(--primary)',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          color: 'var(--primary-contrast)',
          fontWeight: 600,
          fontSize: 14,
          cursor: 'pointer',
          minHeight: 'unset',
        }}
      >
        Add expense
      </motion.button>
    </motion.div>
  )
}
