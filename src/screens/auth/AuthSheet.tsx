import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Mail, User, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../lib/auth/store';
import { useToastStore, useNavStore } from '../../store';

interface AuthSheetProps {
  onClose: () => void;
  initialTab?: 'login' | 'register';
}

export default function AuthSheet({ onClose, initialTab = 'login' }: AuthSheetProps) {
  const [tab, setTab] = useState<'login' | 'register'>(initialTab);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inlineError, setInlineError] = useState<string | null>(null);

  const { login, register, isLoading, clearError } = useAuthStore();
  const { addToast } = useToastStore();
  const { setActiveTab } = useNavStore();

  const handleTabSwitch = (newTab: 'login' | 'register') => {
    if (isLoading) return;
    setTab(newTab);
    setInlineError(null);
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Prevent duplicate concurrent submissions
    setInlineError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setInlineError('Email address is required');
      return;
    }

    if (password.length < 8) {
      setInlineError('Password must be at least 8 characters');
      return;
    }

    if (tab === 'register') {
      const trimmedName = name.trim();
      if (!trimmedName) {
        setInlineError('Please enter your full name');
        return;
      }

      const res = await register(trimmedName, trimmedEmail, password);
      if (res.ok) {
        addToast({ message: `Welcome to PaisaPal, ${trimmedName}!`, type: 'success' });
        onClose();
        setActiveTab('home'); // Redirect to dashboard / home
      } else {
        setInlineError(res.error || 'Failed to create account. Please try again.');
      }
    } else {
      const res = await login(trimmedEmail, password);
      if (res.ok) {
        addToast({ message: 'Signed in successfully', type: 'success' });
        onClose();
        setActiveTab('home'); // Redirect to dashboard / home
      } else {
        setInlineError(res.error || 'Invalid email or password');
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        zIndex: 55,
        overflow: 'hidden',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
        touchAction: 'none',
        boxSizing: 'border-box',
      }}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          maxHeight: '92dvh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface)',
          borderTopLeftRadius: 'var(--radius-lg)',
          borderTopRightRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          borderBottom: 'none',
          boxShadow: 'var(--shadow-md)',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>

        {/* Top bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 20px 12px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>
            {tab === 'login' ? 'Sign In to PaisaPal' : 'Create an Account'}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'var(--surface-2)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              minHeight: 'unset',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs: Login / Register */}
        <div style={{ padding: '16px 20px 8px', flexShrink: 0 }}>
          <div
            style={{
              display: 'flex',
              background: 'var(--surface-2)',
              borderRadius: 'var(--radius-md)',
              padding: 3,
            }}
          >
            <button
              type="button"
              onClick={() => handleTabSwitch('login')}
              style={{
                flex: 1,
                padding: '9px 0',
                background: tab === 'login' ? 'var(--surface)' : 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                color: tab === 'login' ? 'var(--text)' : 'var(--text-muted)',
                fontWeight: tab === 'login' ? 600 : 500,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all 0.15s',
                minHeight: 'unset',
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('register')}
              style={{
                flex: 1,
                padding: '9px 0',
                background: tab === 'register' ? 'var(--surface)' : 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                color: tab === 'register' ? 'var(--text)' : 'var(--text-muted)',
                fontWeight: tab === 'register' ? 600 : 500,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all 0.15s',
                minHeight: 'unset',
              }}
            >
              Register
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 24px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Inline Error */}
            <AnimatePresence>
              {inlineError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'rgba(255, 122, 89, 0.12)',
                    border: '1px solid var(--expense)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 14px',
                    color: 'var(--expense)',
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  <AlertCircle size={16} flex-shrink={0} />
                  <span>{inlineError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Name field for Register */}
            {tab === 'register' && (
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                  Full Name
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <User size={16} style={{ position: 'absolute', left: 14, color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    disabled={isLoading}
                    required
                    style={{
                      width: '100%',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 14px 12px 42px',
                      color: 'var(--text)',
                      fontSize: 16, // 16px to prevent mobile zoom
                      outline: 'none',
                      boxSizing: 'border-box',
                      opacity: isLoading ? 0.7 : 1,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                Email Address
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoCapitalize="none"
                  autoCorrect="off"
                  disabled={isLoading}
                  required
                  style={{
                    width: '100%',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px 12px 42px',
                    color: 'var(--text)',
                    fontSize: 16, // 16px to prevent mobile zoom
                    outline: 'none',
                    boxSizing: 'border-box',
                    opacity: isLoading ? 0.7 : 1,
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                Password {tab === 'register' && <span style={{ fontWeight: 400 }}>(min 8 characters)</span>}
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading}
                  required
                  style={{
                    width: '100%',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px 12px 42px',
                    color: 'var(--text)',
                    fontSize: 16, // 16px to prevent mobile zoom
                    outline: 'none',
                    boxSizing: 'border-box',
                    opacity: isLoading ? 0.7 : 1,
                  }}
                />
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%',
                marginTop: 8,
                padding: '13px 20px',
                background: 'var(--primary)',
                color: 'var(--primary-contrast)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                fontSize: 15,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: isLoading ? 0.75 : 1,
                minHeight: 'unset',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>{tab === 'login' ? 'Signing in…' : 'Creating account…'}</span>
                </>
              ) : (
                <span>{tab === 'login' ? 'Sign In' : 'Create Account'}</span>
              )}
            </motion.button>
          </form>

          {/* Privacy footnote */}
          <p
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              textAlign: 'center',
              marginTop: 18,
              lineHeight: 1.5,
            }}
          >
            Your expenses and budgets remain stored safely on your device. Account connects with MongoDB Atlas for future sync.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
