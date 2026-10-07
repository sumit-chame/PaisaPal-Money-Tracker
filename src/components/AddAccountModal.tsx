import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { db, type AccountKind, type Account } from '../lib/db'
import { useToastStore } from '../store'

interface AddAccountModalProps {
  onClose: () => void
  onSaved: (accountId: string) => void
}

const KINDS: { id: AccountKind; label: string }[] = [
  { id: 'cash',  label: 'Cash' },
  { id: 'upi',   label: 'UPI' },
  { id: 'bank',  label: 'Bank' },
  { id: 'card',  label: 'Card' },
  { id: 'other', label: 'Custom' },
]

export default function AddAccountModal({ onClose, onSaved }: AddAccountModalProps) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<AccountKind>('upi')
  const { addToast } = useToastStore()

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      addToast({ message: 'Account name is required', type: 'error' })
      return
    }

    const newId = uuid()
    const account: Account = {
      id: newId,
      name: trimmed,
      kind,
      openingBalance: 0,
      createdAt: Date.now(),
    }

    await db.accounts.add(account)
    addToast({ message: `Added account "${trimmed}"`, type: 'success' })
    onSaved(newId)
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
          <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>New Account</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
            Account Name
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. HDFC Bank, Pocket Cash"
            autoFocus
            style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', fontSize: 14 }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
            Type
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {KINDS.map(k => (
              <button
                key={k.id}
                type="button"
                onClick={() => setKind(k.id)}
                style={{
                  padding: '7px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: kind === k.id ? 'var(--primary)' : 'var(--surface-2)',
                  color: kind === k.id ? 'var(--primary-contrast)' : 'var(--text)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  minHeight: 'unset',
                }}
              >
                {k.label}
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
            disabled={!name.trim()}
            style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', background: 'var(--primary)', border: 'none', color: 'var(--primary-contrast)', fontWeight: 600, fontSize: 13, cursor: name.trim() ? 'pointer' : 'default', opacity: name.trim() ? 1 : 0.5 }}
          >
            Save Account
          </button>
        </div>
      </motion.div>
    </>
  )
}
