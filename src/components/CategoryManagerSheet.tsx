import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import { X, Plus, Edit2, Trash2, Eye, EyeOff, ChevronUp, ChevronDown, Check, AlertCircle } from 'lucide-react'
import { db, type Category } from '../lib/db'
import CategoryIcon, { ICON_GROUPS } from './CategoryIcon'
import { BRAND_SWATCHES } from '../lib/seeds'
import { useToastStore } from '../store'
import AddCategorySheet from './AddCategorySheet'

interface CategoryManagerSheetProps {
  onClose: () => void
}

export default function CategoryManagerSheet({ onClose }: CategoryManagerSheetProps) {
  const [tabType, setTabType] = useState<'expense' | 'income'>('expense')
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [reassignToCatId, setReassignToCatId] = useState<string>('')
  const [txnCountForDelete, setTxnCountForDelete] = useState<number>(0)

  const { addToast } = useToastStore()

  const categories = useLiveQuery(() =>
    db.categories.where('type').equals(tabType).sortBy('order'),
    [tabType]
  ) ?? []

  // Move category up/down in order
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= categories.length) return

    const currentCat = categories[index]
    const swapCat = categories[targetIndex]

    const tempOrder = currentCat.order
    await db.categories.update(currentCat.id, { order: swapCat.order })
    await db.categories.update(swapCat.id, { order: tempOrder })
  }

  // Toggle hide/show
  const handleToggleHide = async (cat: Category) => {
    await db.categories.update(cat.id, { hidden: !cat.hidden })
    addToast({
      message: cat.hidden ? `Shown "${cat.name}"` : `Hidden "${cat.name}"`,
      type: 'info',
    })
  }

  // Initiate delete
  const handleDeleteClick = async (cat: Category) => {
    if (cat.name.toLowerCase() === 'other') {
      addToast({ message: '"Other" is a default category and cannot be deleted', type: 'error' })
      return
    }

    const txnCount = await db.transactions.where('categoryId').equals(cat.id).count()
    setTxnCountForDelete(txnCount)

    if (txnCount > 0) {
      // Find default fallback category (like 'Other' or first available)
      const otherCat = categories.find(c => c.id !== cat.id && c.name.toLowerCase() === 'other')
      const fallback = otherCat || categories.find(c => c.id !== cat.id)
      setReassignToCatId(fallback?.id ?? '')
      setDeleteTarget(cat)
    } else {
      // No transactions, delete directly
      await db.categories.delete(cat.id)
      addToast({ message: `Deleted "${cat.name}"`, type: 'info' })
    }
  }

  // Confirm delete with reassign
  const handleConfirmReassignDelete = async () => {
    if (!deleteTarget) return

    if (txnCountForDelete > 0 && reassignToCatId) {
      await db.transactions.where('categoryId').equals(deleteTarget.id).modify({ categoryId: reassignToCatId })
    }

    await db.categories.delete(deleteTarget.id)
    addToast({
      message: `Deleted "${deleteTarget.name}" and reassigned transactions`,
      type: 'success',
    })
    setDeleteTarget(null)
  }

  return (
    <>
      <motion.div
        className="sheet-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ zIndex: 60 }}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Manage categories"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          margin: '0 auto',
          width: '100%',
          maxWidth: 480,
          height: '92dvh',
          maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px))',
          background: 'var(--surface)',
          borderTopLeftRadius: 'var(--radius-lg)',
          borderTopRightRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          borderBottom: 'none',
          zIndex: 65,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-md)',
          boxSizing: 'border-box',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>Manage Categories</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setShowAddSheet(true)}
              style={{
                background: 'var(--primary)',
                color: 'var(--primary-contrast)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 12px',
                fontSize: 13,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
              }}
            >
              <Plus size={14} strokeWidth={2} /> Add
            </button>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Type tabs */}
        <div style={{ padding: '12px 20px 8px' }}>
          <div style={{ display: 'flex', gap: 8, background: 'var(--surface-2)', padding: 3, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setTabType('expense')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: 'calc(var(--radius-md) - 2px)',
                border: 'none',
                background: tabType === 'expense' ? 'var(--surface)' : 'transparent',
                color: tabType === 'expense' ? 'var(--expense)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Expense ({categories.length})
            </button>
            <button
              onClick={() => setTabType('income')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: 'calc(var(--radius-md) - 2px)',
                border: 'none',
                background: tabType === 'income' ? 'var(--surface)' : 'transparent',
                color: tabType === 'income' ? 'var(--income)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Income
            </button>
          </div>
        </div>

        {/* Categories List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {categories.map((cat, index) => {
              const isOther = cat.name.toLowerCase() === 'other'
              return (
                <div
                  key={cat.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    background: cat.hidden ? 'var(--surface-2)' : 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    opacity: cat.hidden ? 0.6 : 1,
                  }}
                >
                  {/* Category icon */}
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: cat.color + '22',
                    border: `1.5px solid ${cat.color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <CategoryIcon name={cat.icon} size={18} color={cat.color} />
                  </div>

                  {/* Name and badge */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cat.name}
                      </span>
                      {isOther && (
                        <span style={{ fontSize: 10, padding: '2px 6px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)' }}>
                          Default
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Order controls */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button
                      disabled={index === 0}
                      onClick={() => handleMove(index, 'up')}
                      style={{ background: 'none', border: 'none', color: index === 0 ? 'transparent' : 'var(--text-muted)', cursor: 'pointer', padding: 2, minHeight: 'unset', minWidth: 'unset' }}
                    >
                      <ChevronUp size={15} />
                    </button>
                    <button
                      disabled={index === categories.length - 1}
                      onClick={() => handleMove(index, 'down')}
                      style={{ background: 'none', border: 'none', color: index === categories.length - 1 ? 'transparent' : 'var(--text-muted)', cursor: 'pointer', padding: 2, minHeight: 'unset', minWidth: 'unset' }}
                    >
                      <ChevronDown size={15} />
                    </button>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      onClick={() => handleToggleHide(cat)}
                      title={cat.hidden ? 'Show category' : 'Hide category'}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, minHeight: 'unset', minWidth: 'unset' }}
                    >
                      {cat.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>

                    <button
                      onClick={() => setEditingCategory(cat)}
                      title="Edit category"
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 4, minHeight: 'unset', minWidth: 'unset' }}
                    >
                      <Edit2 size={16} />
                    </button>

                    {!isOther && (
                      <button
                        onClick={() => handleDeleteClick(cat)}
                        title="Delete category"
                        style={{ background: 'none', border: 'none', color: 'var(--expense)', cursor: 'pointer', padding: 4, minHeight: 'unset', minWidth: 'unset' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </motion.div>

      {/* ── Add Category Sheet ── */}
      <AnimatePresence>
        {showAddSheet && (
          <AddCategorySheet
            initialType={tabType}
            onClose={() => setShowAddSheet(false)}
            onSaved={() => setShowAddSheet(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Edit Category Modal ── */}
      <AnimatePresence>
        {editingCategory && (
          <EditCategoryModal
            category={editingCategory}
            onClose={() => setEditingCategory(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Reassign & Delete Dialog ── */}
      <AnimatePresence>
        {deleteTarget && (
          <>
            <motion.div className="sheet-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ zIndex: 75 }} onClick={() => setDeleteTarget(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 'calc(100% - 32px)',
                maxWidth: 400,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
                zIndex: 80,
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--expense)', marginBottom: 12 }}>
                <AlertCircle size={20} />
                <span style={{ fontWeight: 600, fontSize: 16 }}>Delete "{deleteTarget.name}"</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
                This category has <strong>{txnCountForDelete}</strong> existing transaction{txnCountForDelete > 1 ? 's' : ''}. Choose where to move them before deleting:
              </p>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                  Move transactions to:
                </label>
                <select
                  value={reassignToCatId}
                  onChange={e => setReassignToCatId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 14,
                  }}
                >
                  {categories
                    .filter(c => c.id !== deleteTarget.id)
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setDeleteTarget(null)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReassignDelete}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--expense)',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Move & Delete
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

/* ── Inline Edit Category Modal ── */
function EditCategoryModal({ category, onClose }: { category: Category; onClose: () => void }) {
  const [name, setName] = useState(category.name)
  const [color, setColor] = useState(category.color)
  const [icon, setIcon] = useState(category.icon)
  const { addToast } = useToastStore()

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      addToast({ message: 'Name is required', type: 'error' })
      return
    }

    await db.categories.update(category.id, {
      name: trimmed,
      color,
      icon,
      keywords: [trimmed.toLowerCase()],
    })

    addToast({ message: `Updated "${trimmed}"`, type: 'success' })
    onClose()
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
          maxWidth: 420,
          maxHeight: '85dvh',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          zIndex: 80,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-md)',
          overflowY: 'auto',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>Edit Category</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Live Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: color + '22', border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
            <CategoryIcon name={icon} size={22} color={color} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{name || 'Category Name'}</span>
        </div>

        {/* Name input */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value.slice(0, 20))}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', fontSize: 14 }}
          />
        </div>

        {/* Brand color swatches */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Color</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
            {BRAND_SWATCHES.map(swatch => (
              <button
                key={swatch}
                onClick={() => setColor(swatch)}
                style={{
                  height: 32,
                  borderRadius: 'var(--radius-sm)',
                  background: swatch,
                  border: color === swatch ? '2px solid var(--text)' : '1px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 'unset',
                  minWidth: 'unset',
                }}
              >
                {color === swatch && <Check size={14} color="#fff" strokeWidth={2.5} />}
              </button>
            ))}
          </div>
        </div>

        {/* Common icons selection */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Select Icon</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, maxHeight: 130, overflowY: 'auto' }}>
            {ICON_GROUPS.flatMap(g => g.icons).slice(0, 24).map(ic => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                style={{
                  height: 36,
                  borderRadius: 'var(--radius-sm)',
                  background: icon === ic ? 'var(--surface-2)' : 'var(--surface)',
                  border: icon === ic ? `2px solid ${color}` : '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  minHeight: 'unset',
                  minWidth: 'unset',
                }}
              >
                <CategoryIcon name={ic} size={18} color={icon === ic ? color : 'var(--text)'} />
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
            style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', background: 'var(--primary)', border: 'none', color: 'var(--primary-contrast)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            Save Changes
          </button>
        </div>
      </motion.div>
    </>
  )
}
