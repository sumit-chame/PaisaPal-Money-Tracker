import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Share, X, Sparkles } from 'lucide-react';
import { usePwaStore } from '../../lib/pwa/pwaStore';
import { useToastStore } from '../../store';

export default function PwaInstallBanner() {
  const {
    isInstalled,
    isInstallable,
    platform,
    isDismissed,
    isReadyToShow,
    promptInstall,
    dismissPrompt,
  } = usePwaStore();

  const { addToast } = useToastStore();

  // Show only when not installed, not dismissed, after initial grace period, and when installable
  const isVisible = !isInstalled && !isDismissed && isReadyToShow && isInstallable;

  const handleInstallClick = async () => {
    const result = await promptInstall();
    if (result === 'accepted') {
      addToast({
        message: 'PaisaPal installed successfully! Launch it anytime from your home screen.',
        type: 'success',
      });
    } else if (result === 'unsupported') {
      addToast({
        message: 'Use your browser menu (⋮ or Share) to add PaisaPal to your Home Screen.',
        type: 'info',
      });
    }
  };

  const getActionLabel = () => {
    if (platform === 'ios') return 'Add to Home';
    if (platform === 'android') return 'Add to Home';
    return 'Install App';
  };

  const getSubtext = () => {
    if (platform === 'ios') return 'Add to Home Screen for fast, 100% offline access';
    if (platform === 'android') return 'Add to Home Screen for instant 1-tap logging';
    return 'Install desktop app for quick offline access';
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.aside
          role="region"
          aria-label="App installation prompt"
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            bottom: 'calc(var(--tab-h) + var(--safe-bottom) + 12px)',
            left: 12,
            right: 12,
            maxWidth: 440,
            margin: '0 auto',
            zIndex: 45,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '12px 14px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxSizing: 'border-box',
          }}
        >
          {/* App Icon */}
          <div
            style={{
              position: 'relative',
              width: 42,
              height: 42,
              borderRadius: 10,
              overflow: 'hidden',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              border: '1px solid var(--border)',
              background: 'var(--bg-0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src="/icon-192.png"
              alt="PaisaPal"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary-contrast)',
              }}
            >
              <Sparkles size={8} />
            </div>
          </div>

          {/* Text Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--text)',
                lineHeight: 1.2,
                marginBottom: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>Install PaisaPal</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '1px 5px',
                  borderRadius: 4,
                  background: 'var(--accent-dim)',
                  color: 'var(--primary)',
                  letterSpacing: '0.02em',
                }}
              >
                PWA
              </span>
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                lineHeight: 1.3,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {getSubtext()}
            </div>
          </div>

          {/* CTA Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={handleInstallClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: 'var(--primary)',
                color: 'var(--primary-contrast)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: '7px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: 'unset',
                whiteSpace: 'nowrap',
              }}
            >
              {platform === 'ios' ? <Share size={13} /> : <Download size={13} />}
              <span>{getActionLabel()}</span>
            </motion.button>

            <button
              onClick={dismissPrompt}
              aria-label="Dismiss installation prompt"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 'unset',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
