import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, BarChart2, Plus, PiggyBank, User } from 'lucide-react'
import { useNavStore, useSettingsStore, useThemeStore, type TabId } from '../store'
import ToastContainer from './ui/ToastContainer'
import PwaInstallBanner from './pwa/PwaInstallBanner'
import PwaIosInstructionsModal from './pwa/PwaIosInstructionsModal'
import { usePwaStore } from '../lib/pwa/pwaStore'

// Lazy-loaded tab screens
const HomeScreen     = React.lazy(() => import('../screens/HomeScreen'))
const InsightsScreen = React.lazy(() => import('../screens/InsightsScreen'))
const BudgetsScreen  = React.lazy(() => import('../screens/BudgetsScreen'))
const MeScreen       = React.lazy(() => import('../screens/MeScreen'))
const AddSheet       = React.lazy(() => import('./AddSheet'))

const TAB_ITEMS: { id: TabId; label: string; Icon: React.FC<{ size?: number }> }[] = [
  { id: 'home',     label: 'Home',     Icon: Home },
  { id: 'insights', label: 'Insights', Icon: BarChart2 },
  { id: 'budgets',  label: 'Budgets',  Icon: PiggyBank },
  { id: 'me',       label: 'Me',       Icon: User },
]

export default function AppShell() {
  const { activeTab, setActiveTab, isAddSheetOpen, editingTransaction, openAddSheet, closeAddSheet } = useNavStore()
  const { loadSettings } = useSettingsStore()
  const { _syncResolved } = useThemeStore()
  const { isIosModalOpen, setIsIosModalOpen, initPwa } = usePwaStore()

  useEffect(() => {
    loadSettings()
    const cleanupPwa = initPwa()

    // Listen for system theme changes
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => _syncResolved()
    mq.addEventListener('change', handler)

    return () => {
      cleanupPwa()
      mq.removeEventListener('change', handler)
    }
  }, [initPwa, loadSettings, _syncResolved])

  // Keyboard shortcut: N = open add sheet
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const active = document.activeElement
        const tag = active?.tagName.toLowerCase()
        if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
          openAddSheet()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openAddSheet])

  return (
    <div
      className="app-shell"
      style={{
        height: '100%',
        minHeight: '100dvh',
        maxHeight: '100dvh',
        width: '100%',
        maxWidth: '100vw',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-0)',
        overflow: 'hidden',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Screen Area ── */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative', width: '100%', maxWidth: '100vw', boxSizing: 'border-box' }}>
        <React.Suspense fallback={<ScreenLoader />}>
          <AnimatePresence mode="wait">
            {activeTab === 'home'     && <TabScreen key="home"><HomeScreen /></TabScreen>}
            {activeTab === 'insights' && <TabScreen key="insights"><InsightsScreen /></TabScreen>}
            {activeTab === 'budgets'  && <TabScreen key="budgets"><BudgetsScreen /></TabScreen>}
            {activeTab === 'me'       && <TabScreen key="me"><MeScreen /></TabScreen>}
          </AnimatePresence>
        </React.Suspense>
      </div>

      {/* ── Bottom Tab Bar ── */}
      <nav
        aria-label="Main navigation"
        style={{
          height: 'calc(var(--tab-h) + var(--safe-bottom))',
          paddingBottom: 'var(--safe-bottom)',
          background: 'var(--bg-1)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          flexShrink: 0,
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '100vw',
          boxSizing: 'border-box',
        }}
      >
        {/* Left 2 tabs */}
        {TAB_ITEMS.slice(0, 2).map(tab => (
          <TabButton key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
        ))}

        {/* Center Add Button */}
        <div style={{ position: 'relative' }}>
          <motion.button
            id="add-transaction-btn"
            aria-label="Add transaction"
            onClick={() => openAddSheet()}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'var(--primary)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--primary-contrast)',
              flexShrink: 0,
              minHeight: 'unset',
              minWidth: 'unset',
            }}
          >
            <Plus size={24} strokeWidth={2} />
          </motion.button>
        </div>

        {/* Right 2 tabs */}
        {TAB_ITEMS.slice(2).map(tab => (
          <TabButton key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
        ))}
      </nav>

      {/* ── Add Sheet ── */}
      <AnimatePresence>
        {isAddSheetOpen && (
          <React.Suspense fallback={null}>
            <AddSheet onClose={closeAddSheet} editTxn={editingTransaction} />
          </React.Suspense>
        )}
      </AnimatePresence>

      {/* ── PWA Installation Prompt Banner ── */}
      <PwaInstallBanner />

      {/* ── iOS Add-to-Home Instructions Modal ── */}
      <AnimatePresence>
        {isIosModalOpen && (
          <PwaIosInstructionsModal onClose={() => setIsIosModalOpen(false)} />
        )}
      </AnimatePresence>

      {/* ── Toasts ── */}
      <ToastContainer />
    </div>
  )
}

/* ── Tab Button ── */
function TabButton({ tab, active, onClick }: { tab: typeof TAB_ITEMS[0]; active: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      aria-label={tab.label}
      aria-current={active ? 'page' : undefined}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: active ? 'var(--accent)' : 'var(--text-3)',
        padding: '4px 6px',
        borderRadius: 'var(--r-sm)',
        minHeight: 'unset',
        minWidth: 0,
        transition: 'color 0.2s',
        flex: 1,
      }}
    >
      <tab.Icon size={22} />
      <span style={{ fontSize: 11, fontWeight: active ? 600 : 500 }}>{tab.label}</span>
      {active && (
        <motion.div
          layoutId="tab-indicator"
          style={{
            position: 'absolute',
            top: -1,
            width: 24,
            height: 2,
            background: 'var(--accent)',
            borderRadius: 2,
          }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        />
      )}
    </motion.button>
  )
}

/* ── Screen Wrapper (fade animation) ── */
function TabScreen({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
      style={{ height: '100%', overflow: 'hidden' }}
    >
      {children}
    </motion.div>
  )
}

/* ── Loading fallback ── */
function ScreenLoader() {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-3)',
    }}>
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.4, repeat: Infinity }}
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'var(--accent-dim)',
          border: '2px solid var(--accent)',
        }}
      />
    </div>
  )
}
