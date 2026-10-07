import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import { startOfMonth, endOfMonth, subMonths, format, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts'
import { BarChart2 } from 'lucide-react'
import { db } from '../lib/db'
import { formatAmount, formatCompact } from '../lib/currency'

type Period = 'week' | 'month' | 'last'

export default function InsightsScreen() {
  const [period, setPeriod] = useState<Period>('month')

  const now = new Date()
  const periodRange = useMemo(() => {
    if (period === 'week') return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
    if (period === 'last') return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) }
    return { start: startOfMonth(now), end: endOfMonth(now) }
  }, [period])

  const transactions = useLiveQuery(() =>
    db.transactions
      .where('date').between(periodRange.start.getTime(), periodRange.end.getTime())
      .toArray(),
    [periodRange]
  ) ?? []

  const categories = useLiveQuery(() => db.categories.toArray()) ?? []
  const catMap = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories])

  const expenses = transactions.filter(t => t.type === 'expense')
  const incomes  = transactions.filter(t => t.type === 'income')

  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0)
  const totalIncome  = incomes.reduce((s, t) => s + t.amount, 0)

  // Donut data
  const donutData = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of expenses) {
      const cid = t.categoryId ?? '__none'
      map.set(cid, (map.get(cid) ?? 0) + t.amount)
    }
    return [...map.entries()]
      .map(([id, amt]) => ({ id, name: catMap[id]?.name ?? 'Other', color: catMap[id]?.color ?? '#7A9CBF', value: amt }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [expenses, catMap])

  // Daily bar data
  const days = eachDayOfInterval({ start: periodRange.start, end: period === 'month' ? now : periodRange.end })
  const barData = useMemo(() => days.map(d => {
    const dayExp = expenses.filter(t => {
      const td = new Date(t.date)
      return td.toDateString() === d.toDateString()
    }).reduce((s, t) => s + t.amount, 0)
    return { day: format(d, period === 'week' ? 'EEE' : 'd'), value: dayExp / 100 }
  }), [expenses, days, period])

  // Top spending categories
  const leaks = useMemo(() => {
    return donutData.slice(0, 3).map(d => ({ ...d, pct: totalExpense > 0 ? (d.value / totalExpense * 100).toFixed(0) : '0' }))
  }, [donutData, totalExpense])

  const PERIODS: { id: Period; label: string }[] = [
    { id: 'week', label: 'This week' },
    { id: 'month', label: 'This month' },
    { id: 'last', label: 'Last month' },
  ]

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ padding: '16px 20px', paddingBottom: 'calc(var(--tab-h) + var(--safe-bottom) + 24px)' }}>

        <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: '0 0 16px' }}>Insights</h1>

        {/* Period tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: period === p.id ? 'var(--primary)' : 'var(--surface)',
                color: period === p.id ? 'var(--primary-contrast)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                minHeight: 'unset',
                transition: 'all 0.15s',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Summary Row */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <SummaryCard label="Spent" value={totalExpense} color="var(--expense)" />
          <SummaryCard label="Earned" value={totalIncome} color="var(--income)" />
        </div>

        {/* Donut Chart */}
        {donutData.length > 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: 20 }}>
            <div className="card" style={{ padding: '16px' }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 14px' }}>Spending by Category</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 130, height: 130, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
                        {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {donutData.map(d => (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                      <span className="tabular-nums" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{formatCompact(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}

        {/* Daily Spend Bar */}
        {barData.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} style={{ marginBottom: 20 }}>
            <div className="card">
              <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 14px' }}>Daily Spending</h2>
              <div style={{ height: 130 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)' }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(v: any) => [`₹${Number(v ?? 0).toFixed(0)}`, 'Spent'] as any}
                    />
                    <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}

        {/* Money Leaks / Top Spending */}
        {leaks.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            <div className="card">
              <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>Top Expenses</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 14px' }}>Largest spending categories</p>
              {leaks.map((l, i) => (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: i < leaks.length - 1 ? 12 : 0 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--text)', fontWeight: 600, flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{l.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.pct}% of spending</div>
                  </div>
                  <div className="tabular-nums" style={{ fontWeight: 600, fontSize: 14, color: l.color }}>{formatCompact(l.value)}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {transactions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <BarChart2 size={36} strokeWidth={1.75} />
            </div>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>No data for this period</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Add transactions to see insights</div>
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      flex: 1,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '12px 16px',
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
      <div className="tabular-nums" style={{ fontSize: 18, fontWeight: 600, color }}>{formatCompact(value)}</div>
    </div>
  )
}
