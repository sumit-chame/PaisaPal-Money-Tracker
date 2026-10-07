import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { addMonths, addWeeks, addYears } from 'date-fns'
import { db, type SubscriptionInterval, type Subscription } from '../lib/db'
import { useToastStore } from '../store'
import { parseToPaise } from '../lib/currency'

interface AddSubscriptionModalProps {
  onClose: () => void
  onSaved: () => void
}

const INTERVALS: { id: SubscriptionInterval; label: string }[] = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'weekly',  label: 'Weekly' },
  { id: 'yearly',  label: 'Yearly' },
]

export default function AddSubscriptionModal({ onClose, onSaved }: AddSubscriptionModalProps) {
  const [name, setName] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [interval, setInterval] = useState<SubscriptionInterval>('monthly')
  const { addToast } = useToastStore()

  const handleSave = async () => {
    const trimmed = name.trim()
    const paise = parseToPaise(amountStr)
    if (!trimmed) {
      addToast({ message: 'Subscription name is required', type: 'error' })
      return
    }
    if (!paise || paise <= 0) {
      addToast({ message: 'Enter a valid amount', type: 'error' })
      return
    }

    const now = new Date()
    let nextDue = addMonths(now, 1).getTime()
    if (interval === 'weekly') nextDue = addWeeks(now, 1).getTime()
    if (interval === 'yearly') nextDue = addYears(now, 1).getTime()

    const sub: Subscription = {
      id: uuid(),
      name: trimmed,
      amount: paise,
      interval,
      nextDue,
      color: '#1F3B6F',
    }

    await db.subscriptions.add(sub)
    addToast({ message: `Added "${trimmed}" subscription`, type: 'success' })
    onSaved()
  }

  return (
    <>
      <motion.div className="sheet-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ zIndex: 75 }} onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          margin: 'auto',
          height: 'fit-content',
          width: 'calc(100% - 32px)',
          maxWidth: 380,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          zIndex: 80,
          boxShadow: 'var(--shadow-md)',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>New Subscription</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
            Name
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Spotify, Netflix, Hostel Rent"
            autoFocus
            style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', fontSize: 14 }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
            Amount (₹)
          </label>
          <input
            type="number"
            value={amountStr}
            onChange={e => setAmountStr(e.target.value)}
            placeholder="e.g. 119"
            style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', fontSize: 14 }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
            Cycle
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            {INTERVALS.map(int => (
              <button
                key={int.id}
                type="button"
                onClick={() => setInterval(int.id)}
                style={{
                  flex: 1,
                  padding: '7px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: interval === int.id ? 'var(--primary)' : 'var(--surface-2)',
                  color: interval === int.id ? 'var(--primary-contrast)' : 'var(--text)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {int.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !amountStr}
            style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', background: 'var(--primary)', border: 'none', color: 'var(--primary-contrast)', fontWeight: 600, fontSize: 13, cursor: name.trim() && amountStr ? 'pointer' : 'default', opacity: name.trim() && amountStr ? 1 : 0.5 }}
          >
            Save
          </button>
        </div>
      </motion.div>
    </>
  )
}
