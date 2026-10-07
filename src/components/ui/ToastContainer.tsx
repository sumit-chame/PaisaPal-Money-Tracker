import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToastStore, type Toast } from '../../store'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="toast-container" aria-live="polite" aria-label="Notifications">
      <AnimatePresence>
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const Icon = toast.type === 'error' ? AlertCircle : toast.type === 'info' ? Info : CheckCircle
  const color = toast.type === 'error' ? 'var(--expense)' : toast.type === 'info' ? 'var(--transfer)' : 'var(--income)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'var(--bg-2)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--r-md)',
        padding: '12px 16px',
        boxShadow: 'var(--shadow-md)',
        maxWidth: 360,
        minWidth: 240,
        pointerEvents: 'all',
        color: 'var(--text-1)',
        fontSize: 14,
        fontWeight: 500,
      }}
    >
      <Icon size={18} color={color} strokeWidth={2} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{toast.message}</span>
      {toast.action && (
        <button
          onClick={() => { toast.action!.fn(); onDismiss() }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent)',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            padding: '2px 4px',
            minHeight: 'unset',
            minWidth: 'unset',
            borderRadius: 6,
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-3)',
          cursor: 'pointer',
          padding: 2,
          minHeight: 'unset',
          minWidth: 'unset',
          display: 'flex',
          alignItems: 'center',
          borderRadius: 4,
        }}
      >
        <X size={14} />
      </button>
    </motion.div>
  )
}
