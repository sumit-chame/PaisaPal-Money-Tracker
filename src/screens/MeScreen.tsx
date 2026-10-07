import React, { useState, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sun, Moon, Monitor, Download, Trash2, ChevronRight, Palette, Database, Tag, CreditCard, Users, ShieldCheck } from 'lucide-react'
import { db, type ThemeMode } from '../lib/db'
import { useThemeStore, useToastStore } from '../store'
import { loadDemoData } from '../lib/init'
import CategoryManagerSheet from '../components/CategoryManagerSheet'
import AddAccountModal from '../components/AddAccountModal'
import AddFriendModal from '../components/AddFriendModal'
import { useAuthStore } from '../lib/auth/store'
import AuthSheet from './auth/AuthSheet'
import AccountScreen from './auth/AccountScreen'
import { User as UserIcon } from 'lucide-react'

export default function MeScreen() {
  const { theme, setTheme } = useThemeStore()
  const { addToast } = useToastStore()

  const [showCatManager, setShowCatManager] = useState(false)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showFriendModal, setShowFriendModal] = useState(false)
  const [showAuthSheet, setShowAuthSheet] = useState(false)
  const [showAccountScreen, setShowAccountScreen] = useState(false)

  const { user, status } = useAuthStore()

  const transactions = useLiveQuery(() => db.transactions.count()) ?? 0
  const categories   = useLiveQuery(() => db.categories.count()) ?? 0
  const accounts     = useLiveQuery(() => db.accounts.count()) ?? 0
  const friends      = useLiveQuery(() => db.friends.count()) ?? 0

  const handleLoadDemo = async () => {
    await loadDemoData()
    addToast({ message: 'Demo data loaded successfully', type: 'success', duration: 4000 })
  }

  const csvInputRef = useRef<HTMLInputElement>(null)

  const handleExportJSON = async () => {
    const txns = await db.transactions.toArray()
    const cats  = await db.categories.toArray()
    const accts = await db.accounts.toArray()
    const frnds = await db.friends.toArray()
    const data = { transactions: txns, categories: cats, accounts: accts, friends: frnds, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `pocket-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click(); URL.revokeObjectURL(url)
    addToast({ message: 'Backup exported (JSON)', type: 'success' })
  }

  const handleExportCSV = async () => {
    const txns = await db.transactions.toArray()
    const cats = await db.categories.toArray()
    const accts = await db.accounts.toArray()
    const catMap = Object.fromEntries(cats.map(c => [c.id, c.name]))
    const acctMap = Object.fromEntries(accts.map(a => [a.id, a.name]))

    const headers = ['Date', 'Type', 'Category', 'Amount (INR)', 'Account', 'Note']
    const rows = txns.map(t => [
      new Date(t.date).toISOString().slice(0, 16),
      t.type,
      `"${catMap[t.categoryId ?? ''] ?? 'Other'}"`,
      (t.amount / 100).toFixed(2),
      `"${acctMap[t.accountId] ?? 'Default'}"`,
      `"${(t.note || '').replace(/"/g, '""')}"`
    ])

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pocket-transactions-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    addToast({ message: 'CSV exported successfully', type: 'success' })
  }

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const lines = text.split('\n').filter(l => l.trim().length > 0)
    if (lines.length <= 1) {
      addToast({ message: 'CSV file is empty', type: 'error' })
      return
    }

    const { v4: uuid } = await import('uuid')
    const accts = await db.accounts.toArray()
    const fallbackAcctId = accts[0]?.id ?? 'default'
    const cats = await db.categories.toArray()
    const getCatId = (name: string) => cats.find(c => c.name.toLowerCase() === name.toLowerCase())?.id

    let importedCount = 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newTxns: any[] = []

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(s => s.trim().replace(/^"|"$/g, ''))
      if (parts.length >= 4) {
        const dateStr = parts[0]
        const type = (parts[1] === 'income' || parts[1] === 'transfer') ? parts[1] : 'expense'
        const catName = parts[2]
        const amtNum = parseFloat(parts[3])
        const note = parts[5] || ''

        if (!isNaN(amtNum) && amtNum > 0) {
          const parsedDate = new Date(dateStr).getTime() || Date.now()
          newTxns.push({
            id: uuid(),
            type,
            amount: Math.round(amtNum * 100),
            categoryId: getCatId(catName),
            accountId: fallbackAcctId,
            note: note || undefined,
            date: parsedDate,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })
          importedCount++
        }
      }
    }

    if (newTxns.length > 0) {
      await db.transactions.bulkAdd(newTxns)
      addToast({ message: `Imported ${importedCount} transactions from CSV`, type: 'success' })
    } else {
      addToast({ message: 'No valid rows found in CSV', type: 'error' })
    }
    if (csvInputRef.current) csvInputRef.current.value = ''
  }

  const handleClearData = async () => {
    addToast({
      message: 'This will delete ALL data. Are you sure?',
      type: 'error',
      duration: 8000,
      action: {
        label: 'Yes, delete all',
        fn: async () => {
          await Promise.all([
            db.transactions.clear(),
            db.goals.clear(),
            db.budgets.clear(),
            db.friends.clear(),
            db.subscriptions.clear(),
          ])
          addToast({ message: 'All data cleared', type: 'info' })
        }
      }
    })
  }

  const THEME_OPTIONS: { id: ThemeMode; label: string; Icon: React.FC<{ size?: number }> }[] = [
    { id: 'dark',   label: 'Dark',   Icon: Moon },
    { id: 'light',  label: 'Light',  Icon: Sun },
    { id: 'system', label: 'System', Icon: Monitor },
  ]

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ padding: '16px 20px', paddingBottom: 'calc(var(--tab-h) + var(--safe-bottom) + 24px)' }}>

        {/* Header */}
        <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>Settings</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px' }}>Your data stays on your device.</p>

        {/* Stats chips */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <Chip label={`${transactions} transactions`} color="var(--primary)" />
          <Chip label={`${categories} categories`} color="var(--income)" />
          <Chip label={`${accounts} accounts`} color="var(--transfer)" />
          <Chip label={`${friends} friends`} color="var(--text-muted)" />
        </div>

        {/* ── User Account Card ── */}
        <div style={{ marginBottom: 20 }}>
          {status === 'signedIn' && user ? (
            <button
              onClick={() => setShowAccountScreen(true)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                textAlign: 'left',
                minHeight: 'unset',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'var(--surface-2)',
                  border: '1.5px solid var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)',
                  fontWeight: 700,
                  fontSize: 15,
                  flexShrink: 0,
                }}
              >
                {user.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email} • Account & Profile
                </div>
              </div>
              <ChevronRight size={16} color="var(--text-muted)" />
            </button>
          ) : (
            <button
              onClick={() => setShowAuthSheet(true)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                textAlign: 'left',
                minHeight: 'unset',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)',
                  flexShrink: 0,
                }}
              >
                <UserIcon size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                  Sign in or create account
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Save your profile to cloud
                </div>
              </div>
              <ChevronRight size={16} color="var(--text-muted)" />
            </button>
          )}
        </div>

        {/* Appearance */}
        <Section title="Appearance" icon={<Palette size={15} />}>
          <div style={{ display: 'flex', gap: 8, padding: 10 }}>
            {THEME_OPTIONS.map(t => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                style={{
                  flex: 1,
                  padding: '10px 6px',
                  background: theme === t.id ? 'var(--surface-2)' : 'var(--surface)',
                  border: `1.5px solid ${theme === t.id ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  color: theme === t.id ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 12,
                  minHeight: 'unset',
                  transition: 'all 0.15s',
                }}
              >
                <t.Icon size={18} />
                {t.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Manage Categories, Accounts & Friends */}
        <Section title="Management" icon={<Tag size={15} />}>
          <SettingRow
            icon={<Tag size={17} color="var(--primary)" />}
            label="Categories"
            sublabel="Reorder, edit, hide, or create categories"
            onClick={() => setShowCatManager(true)}
          />
          <SettingRow
            icon={<CreditCard size={17} color="var(--primary)" />}
            label="Accounts"
            sublabel="Add Cash, Bank, UPI, or custom accounts"
            onClick={() => setShowAccountModal(true)}
          />
          <SettingRow
            icon={<Users size={17} color="var(--primary)" />}
            label="Friends"
            sublabel="Manage friends list for expense splitting"
            onClick={() => setShowFriendModal(true)}
          />
        </Section>

        {/* Data */}
        <Section title="Data" icon={<Database size={15} />}>
          <SettingRow
            icon={<Database size={17} color="var(--primary)" />}
            label="Load Demo Data"
            sublabel="Sample transactions to explore the app"
            onClick={handleLoadDemo}
          />
          <SettingRow
            icon={<Download size={17} color="var(--income)" />}
            label="Export Backup (JSON)"
            sublabel="Save full database to a JSON file"
            onClick={handleExportJSON}
          />
          <SettingRow
            icon={<Download size={17} color="var(--primary)" />}
            label="Export Transactions (CSV)"
            sublabel="Spreadsheet-compatible CSV report"
            onClick={handleExportCSV}
          />
          <SettingRow
            icon={<Download size={17} color="var(--transfer)" style={{ transform: 'rotate(180deg)' }} />}
            label="Import Transactions (CSV)"
            sublabel="Load transactions from a CSV spreadsheet"
            onClick={() => csvInputRef.current?.click()}
          />
          <SettingRow
            icon={<Trash2 size={17} color="var(--expense)" />}
            label="Delete All Data"
            sublabel="Permanently erase local database"
            onClick={handleClearData}
            danger
          />
        </Section>
        <input
          type="file"
          ref={csvInputRef}
          accept=".csv"
          style={{ display: 'none' }}
          onChange={handleImportCSV}
        />

        {/* About */}
        <div style={{ marginTop: 28, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, color: 'var(--primary)' }}>
            <ShieldCheck size={28} strokeWidth={1.75} />
          </div>
          <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>Pocket</div>
          <div style={{ fontSize: 12 }}>Local-first finance manager.</div>
        </div>
      </div>

      {/* ── Category Manager Sheet ── */}
      <AnimatePresence>
        {showCatManager && (
          <CategoryManagerSheet onClose={() => setShowCatManager(false)} />
        )}
      </AnimatePresence>

      {/* ── Add Account Modal ── */}
      <AnimatePresence>
        {showAccountModal && (
          <AddAccountModal
            onClose={() => setShowAccountModal(false)}
            onSaved={() => setShowAccountModal(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Add Friend Modal ── */}
      <AnimatePresence>
        {showFriendModal && (
          <AddFriendModal
            onClose={() => setShowFriendModal(false)}
            onSaved={() => setShowFriendModal(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Auth Sheet Modal ── */}
      <AnimatePresence>
        {showAuthSheet && (
          <AuthSheet onClose={() => setShowAuthSheet(false)} />
        )}
      </AnimatePresence>

      {/* ── Account Screen ── */}
      <AnimatePresence>
        {showAccountScreen && (
          <AccountScreen onClose={() => setShowAccountScreen(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {icon} {title}
      </div>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}

function SettingRow({ icon, label, sublabel, onClick, danger }: { icon: React.ReactNode; label: string; sublabel?: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        background: 'none',
        border: 'none',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        textAlign: 'left',
        minHeight: 'unset',
      }}
    >
      <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: danger ? 'var(--expense)' : 'var(--text)' }}>{label}</div>
        {sublabel && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sublabel}</div>}
      </div>
      <ChevronRight size={16} color="var(--text-muted)" />
    </button>
  )
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <div style={{
      padding: '4px 10px',
      borderRadius: 'var(--radius-sm)',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      fontSize: 12,
      fontWeight: 600,
      color,
    }}>
      {label}
    </div>
  )
}
