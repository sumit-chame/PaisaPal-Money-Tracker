import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { X, Search, Check } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { db, type Category } from '../lib/db'
import { BRAND_SWATCHES } from '../lib/seeds'
import CategoryIcon, { ICON_GROUPS } from './CategoryIcon'
import { useToastStore } from '../store'

interface AddCategorySheetProps {
  initialType?: 'expense' | 'income'
  initialName?: string
  onClose: () => void
  onSaved: (categoryId: string) => void
}

export default function AddCategorySheet({
  initialType = 'expense',
  initialName = '',
  onClose,
  onSaved,
}: AddCategorySheetProps) {
  const [type, setType] = useState<'expense' | 'income'>(initialType)
  const [name, setName] = useState(initialName.slice(0, 20))
  const [color, setColor] = useState<string>(BRAND_SWATCHES[1]) // Default to Brand Teal (#00BFA6)
  const [icon, setIcon] = useState<string>('Sparkles')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeGroup, setActiveGroup] = useState<string>('All')

  const { addToast } = useToastStore()

  // Filter icons based on search and active group
  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase()
    return ICON_GROUPS.map(group => {
      if (activeGroup !== 'All' && group.name !== activeGroup) return null
      const icons = group.icons.filter(ic => {
        if (!q) return true
        return ic.toLowerCase().includes(q) || group.name.toLowerCase().includes(q)
      })
      if (icons.length === 0) return null
      return { ...group, icons }
    }).filter(Boolean) as typeof ICON_GROUPS
  }, [search, activeGroup])

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      addToast({ message: 'Category name is required', type: 'error' })
      return
    }
    if (trimmed.length > 20) {
      addToast({ message: 'Name must be 20 characters or less', type: 'error' })
      return
    }

    setSaving(true)

    // Check duplicate within the same type
    const existing = await db.categories
      .where('type')
      .equals(type)
      .filter(c => c.name.toLowerCase() === trimmed.toLowerCase())
      .first()

    if (existing) {
      addToast({ message: `"${trimmed}" already exists in ${type}s`, type: 'error' })
      setSaving(false)
      return
    }

    // Get max order
    const allCats = await db.categories.where('type').equals(type).toArray()
    const maxOrder = allCats.reduce((max, c) => Math.max(max, c.order ?? 0), 0)

    const newId = uuid()
    const newCategory: Category = {
      id: newId,
      type,
      name: trimmed,
      icon,
      color,
      order: maxOrder + 1,
      isDefault: false,
      keywords: [trimmed.toLowerCase()],
    }

    await db.categories.add(newCategory)
    addToast({ message: `Created "${trimmed}"`, type: 'success' })
    onSaved(newId)
  }

  return (
    <>
      <motion.div
        className="sheet-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ zIndex: 65 }}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Add category"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 36 }}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          margin: '0 auto',
          width: '100%',
          maxWidth: 480,
          maxHeight: 'calc(90dvh - env(safe-area-inset-top, 0px))',
          background: 'var(--surface)',
          borderTopLeftRadius: 'var(--radius-lg)',
          borderTopRightRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          borderBottom: 'none',
          zIndex: 70,
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
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 4 }}
          >
            Cancel
          </button>
          <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>New Category</span>
          <button
            onClick={() => handleSave()}
            disabled={saving || !name.trim()}
            style={{
              background: 'var(--primary)',
              color: 'var(--primary-contrast)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 600,
              cursor: name.trim() ? 'pointer' : 'default',
              opacity: name.trim() ? 1 : 0.5,
            }}
          >
            Save
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px calc(24px + var(--safe-bottom))' }}>

          {/* ── Live Preview ── */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '16px',
            background: 'var(--surface-2)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Live Preview
            </div>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: color + '22',
              border: `2px solid ${color}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 6,
            }}>
              <CategoryIcon name={icon} size={24} color={color} />
            </div>
            <span style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text)',
              maxWidth: 120,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {name.trim() || 'Category Name'}
            </span>
          </div>

          {/* ── Type Toggle ── */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
              Type
            </label>
            <div style={{ display: 'flex', gap: 8, background: 'var(--surface-2)', padding: 3, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={() => setType('expense')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: 'calc(var(--radius-md) - 2px)',
                  border: 'none',
                  background: type === 'expense' ? 'var(--surface)' : 'transparent',
                  color: type === 'expense' ? 'var(--expense)' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: 'calc(var(--radius-md) - 2px)',
                  border: 'none',
                  background: type === 'income' ? 'var(--surface)' : 'transparent',
                  color: type === 'income' ? 'var(--income)' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                Income
              </button>
            </div>
          </div>

          {/* ── Name Input ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label htmlFor="cat-name-input" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                Name
              </label>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{name.length}/20</span>
            </div>
            <input
              id="cat-name-input"
              value={name}
              onChange={e => setName(e.target.value.slice(0, 20))}
              placeholder="e.g. Printouts, Cafeteria"
              autoFocus
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: 14,
                outline: 'none',
              }}
            />
          </div>

          {/* ── Brand Color Palette (12 swatches) ── */}
          <div style={{ marginBottom: 22 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
              Brand Color
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: 8,
            }}>
              {BRAND_SWATCHES.map(swatch => {
                const isSelected = color.toLowerCase() === swatch.toLowerCase()
                return (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => setColor(swatch)}
                    style={{
                      height: 38,
                      borderRadius: 'var(--radius-sm)',
                      background: swatch,
                      border: isSelected ? '2px solid var(--text)' : '1px solid transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: 'unset',
                      minWidth: 'unset',
                    }}
                  >
                    {isSelected && <Check size={16} color="#fff" strokeWidth={2.5} />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Icon Picker with Search and Groups ── */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                Icon
              </label>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Selected: {icon}</span>
            </div>

            {/* Search */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              background: 'var(--surface-2)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              marginBottom: 10,
            }}>
              <Search size={15} color="var(--text-muted)" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search icons…"
                style={{
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  fontSize: 13,
                  width: '100%',
                  padding: 0,
                  color: 'var(--text)',
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, minHeight: 'unset', minWidth: 'unset' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Group Pills */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 12 }}>
              {['All', ...ICON_GROUPS.map(g => g.name)].map(grp => (
                <button
                  key={grp}
                  type="button"
                  onClick={() => setActiveGroup(grp)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: activeGroup === grp ? 'var(--primary)' : 'var(--surface-2)',
                    color: activeGroup === grp ? 'var(--primary-contrast)' : 'var(--text-muted)',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    minHeight: 'unset',
                  }}
                >
                  {grp}
                </button>
              ))}
            </div>

            {/* Icons Display */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {filteredGroups.map(grp => (
                <div key={grp.name}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                    {grp.name}
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(6, 1fr)',
                    gap: 8,
                  }}>
                    {grp.icons.map(icName => {
                      const isSel = icon === icName
                      return (
                        <button
                          key={icName}
                          type="button"
                          onClick={() => setIcon(icName)}
                          title={icName}
                          style={{
                            height: 44,
                            borderRadius: 'var(--radius-sm)',
                            background: isSel ? 'var(--surface-2)' : 'var(--surface)',
                            border: isSel ? `2px solid ${color}` : '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: isSel ? color : 'var(--text)',
                            minHeight: 'unset',
                            minWidth: 'unset',
                          }}
                        >
                          <CategoryIcon name={icName} size={20} color={isSel ? color : 'currentColor'} strokeWidth={1.75} />
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )
}
