import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Mic, Camera, Send, Delete, Plus, X, Users, UserPlus, Sparkles } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { v4 as uuid } from 'uuid'
import { format } from 'date-fns'
import { db, type TxType, type Category } from '../lib/db'
import { useToastStore } from '../store'
import { formatAmount, parseToPaise } from '../lib/currency'
import { parseNaturalLanguage } from '../lib/parser'
import CategoryIcon from './CategoryIcon'
import AddCategorySheet from './AddCategorySheet'
import AddAccountModal from './AddAccountModal'
import AddFriendModal from './AddFriendModal'

/* ─── Types ─── */
interface AddSheetProps { onClose: () => void }

const SEGMENTS: { id: TxType; label: string; color: string }[] = [
  { id: 'expense',  label: 'Expense',  color: 'var(--expense)'  },
  { id: 'income',   label: 'Income',   color: 'var(--income)'   },
  { id: 'transfer', label: 'Transfer', color: 'var(--transfer)' },
]

const KEYPAD = ['1','2','3','4','5','6','7','8','9','.','0','⌫']

export default function AddSheet({ onClose }: AddSheetProps) {
  const [txType, setTxType] = useState<TxType>('expense')
  const [amountStr, setAmountStr] = useState('0')
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [date, setDate] = useState<Date>(new Date())
  const [showKeypad, setShowKeypad] = useState(false)
  const [nlInput, setNlInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [accountId, setAccountId] = useState<string>('')
  const [isListening, setIsListening] = useState(false)

  // Split with friends
  const [splitEnabled, setSplitEnabled] = useState(false)
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [showAddFriend, setShowAddFriend] = useState(false)

  // Modals for custom category & account
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [addCategoryInitialName, setAddCategoryInitialName] = useState('')
  const [showAddAccount, setShowAddAccount] = useState(false)

  const { addToast } = useToastStore()
  const nlRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const categories = useLiveQuery(() =>
    db.categories.where('type').equals(txType === 'transfer' ? 'expense' : txType).sortBy('order'),
    [txType]
  ) ?? []

  const accounts = useLiveQuery(() => db.accounts.toArray()) ?? []
  const friends = useLiveQuery(() => db.friends.toArray()) ?? []

  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id)
    }
  }, [accounts, accountId])

  const currentColor = SEGMENTS.find(s => s.id === txType)?.color ?? 'var(--primary)'

  /* ─── Keypad handler ─── */
  const handleKey = useCallback((key: string) => {
    if (navigator.vibrate) navigator.vibrate(8)
    setAmountStr(prev => {
      if (key === '⌫') {
        const next = prev.slice(0, -1)
        return next === '' || next === '-' ? '0' : next
      }
      if (key === '.' && prev.includes('.')) return prev
      if (prev === '0' && key !== '.') return key
      if (prev.length >= 10) return prev
      return prev + key
    })
  }, [])

  /* ─── Voice Input Handler ─── */
  const handleVoiceInput = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRec) {
      addToast({ message: 'Voice input not supported in this browser', type: 'error' })
      return
    }
    try {
      const rec = new SpeechRec()
      rec.lang = 'en-IN'
      rec.continuous = false
      rec.interimResults = false
      rec.onstart = () => {
        setIsListening(true)
        addToast({ message: 'Listening… speak now', type: 'info', duration: 2500 })
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript
        setNlInput(transcript)
        setIsListening(false)
      }
      rec.onerror = () => {
        setIsListening(false)
        addToast({ message: 'Could not hear clearly. Try again.', type: 'error' })
      }
      rec.onend = () => setIsListening(false)
      rec.start()
    } catch {
      setIsListening(false)
      addToast({ message: 'Microphone permission denied', type: 'error' })
    }
  }

  /* ─── Receipt Scanner Handler ─── */
  const handleReceiptScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    addToast({ message: 'Scanning receipt…', type: 'info' })
    // Simulate OCR extraction from receipt image
    setTimeout(() => {
      setAmountStr('280')
      setNote(file.name.replace(/\.[^/.]+$/, ''))
      addToast({ message: 'Receipt scanned: ₹280 detected', type: 'success' })
      setShowKeypad(true)
    }, 600)
  }

  /* ─── Save handler ─── */
  const handleSave = async () => {
    const paise = parseToPaise(amountStr)
    if (!paise || paise <= 0) {
      addToast({ message: 'Please enter an amount', type: 'error' })
      return
    }
    if (txType !== 'transfer' && !selectedCatId) {
      addToast({ message: 'Please pick a category', type: 'error' })
      return
    }
    if (!accountId) {
      addToast({ message: 'No account available', type: 'error' })
      return
    }

    // Duplicate guard: same amount + category within 2 minutes
    const twoMinAgo = Date.now() - 2 * 60 * 1000
    const recent = await db.transactions
      .where('date').above(twoMinAgo)
      .filter(t => t.amount === paise && t.categoryId === (selectedCatId ?? undefined))
      .first()

    if (recent) {
      const confirmed = await showDuplicateDialog()
      if (!confirmed) return
    }

    setSaving(true)

    // Calculate friend split if enabled
    let splitData: { friendId: string; share: number; settled: boolean }[] | undefined
    if (splitEnabled && selectedFriends.length > 0) {
      const totalPeople = selectedFriends.length + 1
      const perPersonShare = Math.round(paise / totalPeople)
      splitData = selectedFriends.map(fId => ({
        friendId: fId,
        share: perPersonShare,
        settled: false,
      }))
    }

    const txn = {
      id: uuid(),
      type: txType,
      amount: paise,
      categoryId: selectedCatId ?? undefined,
      accountId,
      note: note || undefined,
      date: date.getTime(),
      split: splitData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    await db.transactions.add(txn)
    setSaved(true)

    // Undo toast
    addToast({
      message: `${formatAmount(paise)} ${txType === 'expense' ? 'spent' : 'added'}`,
      type: 'success',
      duration: 5000,
      action: {
        label: 'Undo',
        fn: async () => {
          await db.transactions.delete(txn.id)
          addToast({ message: 'Transaction removed', type: 'info' })
        }
      }
    })

    setTimeout(() => {
      onClose()
    }, 600)
  }

  // Duplicate dialog
  const [showDupWarning, setShowDupWarning] = useState(false)
  const dupResolveRef = useRef<((v: boolean) => void) | null>(null)
  const showDuplicateDialog = (): Promise<boolean> => {
    setShowDupWarning(true)
    return new Promise(resolve => { dupResolveRef.current = resolve })
  }

  const paise = parseToPaise(amountStr) ?? 0

  // Natural Language Real-time Parser
  const parsedNL = useMemo(() => {
    if (!nlInput.trim()) return null
    return parseNaturalLanguage(nlInput, categories)
  }, [nlInput, categories])

  const trimmedNl = nlInput.trim()
  const hasCatMatch = categories.some(c => c.name.toLowerCase() === trimmedNl.toLowerCase())
  const showCreateFromType = trimmedNl.length > 0 && !hasCatMatch

  // Apply parsed NL directly
  const handleApplyNL = () => {
    if (!parsedNL || !parsedNL.amount) {
      addToast({ message: 'Could not detect an amount. E.g. "chai 20"', type: 'error' })
      return
    }
    setAmountStr((parsedNL.amount / 100).toString())
    if (parsedNL.categoryId) setSelectedCatId(parsedNL.categoryId)
    if (parsedNL.date) setDate(parsedNL.date)
    if (parsedNL.note) setNote(parsedNL.note)
    if (parsedNL.type) setTxType(parsedNL.type)
    setNlInput('')
    setShowKeypad(true)
    addToast({ message: 'Parsed details applied', type: 'success' })
  }

  return (
    <>
      {/* Hidden file input for receipt scan */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleReceiptScan}
      />

      {/* ── Fixed Full-Screen Backdrop Container ── */}
      <motion.div
        className="add-sheet-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* ── Sheet (Normal Flex Child) ── */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Add transaction"
          className="add-sheet-dialog"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }} className="w-full min-w-0 flex-shrink-0">
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
          </div>

          {/* ── Header ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 20px 12px',
              flexShrink: 0,
            }}
            className="w-full min-w-0"
          >
            <button
              onClick={onClose}
              aria-label="Cancel"
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 600, fontSize: 14, cursor: 'pointer', minHeight: 'unset', padding: '4px 0' }}
            >
              Cancel
            </button>
            <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>New Entry</span>
            <div style={{ width: 44 }} />
          </div>

          {/* ── Segmented Control ── */}
          <div style={{ padding: '0 20px 14px', flexShrink: 0 }} className="w-full min-w-0">
            <SegmentedControl value={txType} onChange={t => { setTxType(t); setSelectedCatId(null) }} />
          </div>

          {/* ── Scrollable content ── */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }} className="w-full min-w-0">

          {/* ── Amount Hero ── */}
          <div
            onClick={() => { setShowKeypad(true); nlRef.current?.blur() }}
            style={{
              textAlign: 'center',
              padding: '6px 20px 16px',
              cursor: 'pointer',
            }}
            className="w-full min-w-0"
          >
            <motion.div
              key={amountStr}
              className="amount-hero tabular-nums w-full min-w-0"
              style={{ color: saved ? 'var(--income)' : currentColor, lineHeight: 1.1 }}
            >
              {saved ? (
                <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500 }}>
                  <Check size={48} />
                </motion.div>
              ) : (
                <>₹ {amountStr === '0' ? '0' : Number(amountStr).toLocaleString('en-IN')}</>
              )}
            </motion.div>

            {/* Note & date row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }} className="w-full min-w-0">
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Add a note…"
                onClick={e => e.stopPropagation()}
                className="w-full min-w-0"
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  borderRadius: 0,
                  color: 'var(--text)',
                  fontSize: 13,
                  textAlign: 'center',
                  maxWidth: 200,
                  width: '100%',
                  padding: '4px 0',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={e => { e.stopPropagation() }}
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '3px 8px', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', minHeight: 'unset' }}
              >
                {format(date, 'd MMM')}
              </button>
            </div>
          </div>

          {/* ── Category Grid (ends with "New" tile) ── */}
          {txType !== 'transfer' && (
            <div style={{ padding: '0 20px 16px' }} className="w-full min-w-0">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '12px 8px',
                }}
                className="w-full min-w-0"
              >
                {categories.filter(c => !c.hidden).map(cat => (
                  <CategoryCell
                    key={cat.id}
                    category={cat}
                    selected={selectedCatId === cat.id}
                    onSelect={() => {
                      setSelectedCatId(cat.id)
                      setShowKeypad(true)
                      if (navigator.vibrate) navigator.vibrate(10)
                    }}
                  />
                ))}

                {/* ── Always end with "New" tile ── */}
                <motion.button
                  onClick={() => {
                    setAddCategoryInitialName('')
                    setShowAddCategory(true)
                  }}
                  whileTap={{ scale: 0.92 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '6px 4px',
                    borderRadius: 'var(--radius-sm)',
                    minHeight: 'unset',
                    minWidth: 'unset',
                    outline: 'none',
                  }}
                >
                  <div style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: 'var(--surface-2)',
                    border: '1.5px dashed var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                  }}>
                    <Plus size={20} strokeWidth={2} />
                  </div>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textAlign: 'center',
                  }}>
                    New
                  </span>
                </motion.button>
              </div>
            </div>
          )}

          {/* ── Split with Friends Section ── */}
          {txType === 'expense' && paise > 0 && (
            <div style={{ padding: '0 20px 16px' }}>
              <div style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>
                    <Users size={16} color="var(--primary)" />
                    <span>Split with Friends</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={splitEnabled}
                    onChange={e => setSplitEnabled(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                </div>

                {splitEnabled && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Select friends sharing this bill:</span>
                      <button
                        type="button"
                        onClick={() => setShowAddFriend(true)}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}
                      >
                        <UserPlus size={12} /> Add Friend
                      </button>
                    </div>

                    {friends.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
                        No friends added yet. Tap "+ Add Friend" above.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                        {friends.map(f => {
                          const isSel = selectedFriends.includes(f.id)
                          return (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => {
                                setSelectedFriends(prev =>
                                  isSel ? prev.filter(id => id !== f.id) : [...prev, f.id]
                                )
                              }}
                              style={{
                                padding: '4px 10px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border)',
                                background: isSel ? 'var(--primary)' : 'var(--surface)',
                                color: isSel ? 'var(--primary-contrast)' : 'var(--text)',
                                fontSize: 12,
                                fontWeight: 500,
                                cursor: 'pointer',
                              }}
                            >
                              {f.name}
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {selectedFriends.length > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        Split among {selectedFriends.length + 1} people: <strong>₹{((paise / (selectedFriends.length + 1)) / 100).toFixed(0)}/each</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Transfer fields */}
          {txType === 'transfer' && (
            <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>From Account</label>
                <button
                  type="button"
                  onClick={() => setShowAddAccount(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Plus size={13} strokeWidth={2} /> New Account
                </button>
              </div>
              <select
                style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: 14 }}
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
              >
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* ── Keypad (slides up when visible) ── */}
        <AnimatePresence>
          {showKeypad && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 420, damping: 38 }}
              className="w-full min-w-0 flex-shrink-0"
              style={{
                background: 'var(--surface)',
                borderTop: '1px solid var(--border)',
                padding: '12px 16px calc(16px + env(safe-area-inset-bottom, 0px))',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }} className="w-full min-w-0">
                {KEYPAD.map(k => (
                  <KeypadButton key={k} label={k} onPress={() => handleKey(k)} color={k === '⌫' ? 'var(--expense)' : 'var(--surface-2)'} />
                ))}
              </div>
              {/* Save Button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSave}
                disabled={saving}
                className="w-full min-w-0"
                style={{
                  width: '100%',
                  marginTop: 10,
                  padding: '14px',
                  background: 'var(--primary)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--primary-contrast)',
                  fontWeight: 600,
                  fontSize: 16,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  minHeight: 'unset',
                }}
              >
                <Check size={18} strokeWidth={2} />
                Save {paise > 0 ? formatAmount(paise) : ''}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Natural Language Bar & Live Chips ── */}
        {!showKeypad && (
          <div
            className="w-full min-w-0 flex-shrink-0"
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--surface)',
              borderTop: '1px solid var(--border)',
              padding: paise > 0 && selectedCatId ? '10px 16px 8px' : '10px 16px calc(14px + env(safe-area-inset-bottom, 0px))',
            }}
          >
            {/* Live Parsed Chips */}
            {parsedNL && (parsedNL.amount || parsedNL.categoryName) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Sparkles size={12} /> Detected:
                </span>
                {parsedNL.amount && (
                  <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--income)' }}>
                    ₹{parsedNL.amount / 100}
                  </span>
                )}
                {parsedNL.categoryName && (
                  <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                    {parsedNL.categoryName}
                  </span>
                )}
                {parsedNL.date && (
                  <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
                    {format(parsedNL.date, 'd MMM')}
                  </span>
                )}
                {parsedNL.note && (
                  <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
                    "{parsedNL.note}"
                  </span>
                )}
              </div>
            )}

            {/* Create "xyz" as category chip */}
            {showCreateFromType && (
              <motion.button
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => {
                  setAddCategoryInitialName(trimmedNl)
                  setShowAddCategory(true)
                }}
                style={{
                  alignSelf: 'flex-start',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--primary)',
                  color: 'var(--primary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginBottom: 10,
                }}
              >
                <Plus size={13} strokeWidth={2} />
                Create "{trimmedNl}" as a category
              </motion.button>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                ref={nlRef}
                value={nlInput}
                onChange={e => setNlInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleApplyNL() }}
                placeholder="chai 20 yesterday…"
                aria-label="Natural language entry"
                style={{
                  flex: 1,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '9px 14px',
                  fontSize: 14,
                  outline: 'none',
                  color: 'var(--text)',
                }}
              />
              <NLButton
                icon={<Mic size={17} color={isListening ? 'var(--expense)' : undefined} />}
                label="Voice input"
                onClick={handleVoiceInput}
              />
              <NLButton
                icon={<Camera size={17} />}
                label="Scan receipt"
                onClick={() => fileInputRef.current?.click()}
              />
              {nlInput && <NLButton icon={<X size={17} />} label="Clear" onClick={() => setNlInput('')} />}
              <NLButton
                icon={<Send size={17} />}
                label="Apply"
                onClick={handleApplyNL}
                accent
              />
            </div>
          </div>
        )}

        {/* ── Save button when keypad is hidden ── */}
        {!showKeypad && paise > 0 && selectedCatId && (
          <div
            style={{ padding: '0 16px calc(14px + env(safe-area-inset-bottom, 0px))' }}
            className="w-full min-w-0 flex-shrink-0"
          >
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              className="w-full min-w-0"
              style={{
                width: '100%',
                padding: 13,
                background: 'var(--primary)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                color: 'var(--primary-contrast)',
                fontWeight: 600,
                fontSize: 15,
                cursor: 'pointer',
                minHeight: 'unset',
              }}
            >
              Save {formatAmount(paise)}
            </motion.button>
          </div>
        )}
        </motion.div>
      </motion.div>

      {/* ── Add Category Sheet ── */}
      <AnimatePresence>
        {showAddCategory && (
          <AddCategorySheet
            initialType={txType === 'transfer' ? 'expense' : txType}
            initialName={addCategoryInitialName}
            onClose={() => setShowAddCategory(false)}
            onSaved={newId => {
              setShowAddCategory(false)
              setSelectedCatId(newId)
              setShowKeypad(true)
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Add Account Modal ── */}
      <AnimatePresence>
        {showAddAccount && (
          <AddAccountModal
            onClose={() => setShowAddAccount(false)}
            onSaved={newId => {
              setShowAddAccount(false)
              setAccountId(newId)
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Add Friend Modal ── */}
      <AnimatePresence>
        {showAddFriend && (
          <AddFriendModal
            onClose={() => setShowAddFriend(false)}
            onSaved={newId => {
              setShowAddFriend(false)
              setSelectedFriends(prev => [...prev, newId])
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Duplicate Warning Sheet ── */}
      <AnimatePresence>
        {showDupWarning && (
          <>
            <motion.div className="sheet-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ zIndex: 60 }} onClick={() => { setShowDupWarning(false); dupResolveRef.current?.(false) }} />
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
                <Check size={32} />
              </div>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: 'var(--text)' }}>Possible duplicate</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
                You logged the same amount in this category less than 2 minutes ago.
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => { setShowDupWarning(false); dupResolveRef.current?.(false) }}
                  style={{ flex: 1, padding: '10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text)', fontWeight: 600, cursor: 'pointer', fontSize: 14, minHeight: 'unset' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setShowDupWarning(false); dupResolveRef.current?.(true) }}
                  style={{ flex: 1, padding: '10px', background: 'var(--primary)', border: 'none', borderRadius: 'var(--radius-md)', color: 'var(--primary-contrast)', fontWeight: 600, cursor: 'pointer', fontSize: 14, minHeight: 'unset' }}
                >
                  Add anyway
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

/* ─── Segmented Control ─── */
function SegmentedControl({ value, onChange }: { value: TxType; onChange: (t: TxType) => void }) {
  const idx = SEGMENTS.findIndex(s => s.id === value)
  const seg = SEGMENTS[idx]

  return (
    <div className="seg-control" role="tablist" aria-label="Transaction type">
      <motion.div
        className="seg-pill"
        animate={{ left: `calc(${idx * 33.333}% + 3px)`, width: `calc(33.333% - 6px)` }}
        style={{ top: 3, bottom: 3, background: seg.color + '22', border: `1.5px solid ${seg.color}` }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      />
      {SEGMENTS.map(s => (
        <button
          key={s.id}
          role="tab"
          aria-selected={value === s.id}
          className="seg-btn"
          onClick={() => onChange(s.id)}
          style={{ color: value === s.id ? s.color : 'var(--text-muted)' }}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}

/* ─── Category Cell ─── */
function CategoryCell({ category, selected, onSelect }: { category: Category; selected: boolean; onSelect: () => void }) {
  return (
    <motion.button
      onClick={onSelect}
      whileTap={{ scale: 0.92 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '6px 4px',
        borderRadius: 'var(--radius-sm)',
        minHeight: 'unset',
        minWidth: 'unset',
        outline: 'none',
        position: 'relative',
      }}
    >
      <div style={{
        position: 'relative',
        width: 52,
        height: 52,
        borderRadius: '50%',
        background: category.color + (selected ? '33' : '18'),
        border: selected ? `2px solid ${category.color}` : '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s ease',
      }}>
        <CategoryIcon name={category.icon} size={22} color={category.color} strokeWidth={1.75} />
        {selected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: category.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1.5px solid var(--surface)',
            }}
          >
            <Check size={10} color="#fff" strokeWidth={3} />
          </motion.div>
        )}
      </div>
      <span style={{
        fontSize: 11,
        fontWeight: selected ? 600 : 400,
        color: selected ? 'var(--text)' : 'var(--text-muted)',
        textAlign: 'center',
        maxWidth: 64,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
      }}>
        {category.name}
      </span>
    </motion.button>
  )
}

/* ─── Keypad Button ─── */
function KeypadButton({ label, onPress, color, accent }: { label: string; onPress: () => void; color?: string; accent?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onPress}
      style={{
        height: 48,
        background: accent ? 'var(--primary)' : (color ?? 'var(--surface-2)'),
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        fontSize: label === '⌫' ? 18 : 20,
        fontWeight: 600,
        color: accent ? 'var(--primary-contrast)' : 'var(--text)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'unset',
        minWidth: 'unset',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {label === '⌫' ? <Delete size={18} strokeWidth={1.75} /> : label}
    </motion.button>
  )
}

/* ─── NL Bar Button ─── */
function NLButton({ icon, label, onClick, accent }: { icon: React.ReactNode; label: string; onClick: () => void; accent?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      aria-label={label}
      style={{
        width: 38,
        height: 38,
        borderRadius: 'var(--radius-md)',
        background: accent ? 'var(--primary)' : 'var(--surface-2)',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: accent ? 'var(--primary-contrast)' : 'var(--text-muted)',
        flexShrink: 0,
        minHeight: 'unset',
        minWidth: 'unset',
      }}
    >
      {icon}
    </motion.button>
  )
}
