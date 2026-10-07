import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { X, UserPlus } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { db, type Friend } from '../lib/db'
import { useToastStore } from '../store'

interface AddFriendModalProps {
  onClose: () => void
  onSaved: (friendId: string) => void
}

export default function AddFriendModal({ onClose, onSaved }: AddFriendModalProps) {
  const [name, setName] = useState('')
  const { addToast } = useToastStore()

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      addToast({ message: 'Friend name is required', type: 'error' })
      return
    }

    const newId = uuid()
    const friend: Friend = {
      id: newId,
      name: trimmed,
      createdAt: Date.now(),
    }

    await db.friends.add(friend)
    addToast({ message: `Added "${trimmed}" to friends`, type: 'success' })
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
          maxWidth: 360,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserPlus size={18} color="var(--primary)" />
            <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>New Friend</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
            Friend Name
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Rahul, Sneha, Roommate"
            autoFocus
            style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', fontSize: 14 }}
          />
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
            Save Friend
          </button>
        </div>
      </motion.div>
    </>
  )
}
