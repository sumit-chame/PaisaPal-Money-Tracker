import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Mail, Key, LogOut, Trash2, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../lib/auth/store';
import { useToastStore } from '../../store';

interface AccountScreenProps {
  onClose: () => void;
}

export default function AccountScreen({ onClose }: AccountScreenProps) {
  const { user, updateName, changePassword, logout, deleteAccount, isLoading } = useAuthStore();
  const { addToast } = useToastStore();

  // Edit name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name || '');

  // Change password modal/form state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Delete account confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassInput, setDeletePassInput] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    const res = await updateName(nameInput.trim());
    if (res.ok) {
      addToast({ message: 'Name updated successfully', type: 'success' });
      setIsEditingName(false);
    } else {
      addToast({ message: res.error || 'Failed to update name', type: 'error' });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    const res = await changePassword(currentPassword, newPassword);
    if (res.ok) {
      addToast({ message: 'Password changed successfully', type: 'success' });
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordError(res.error || 'Failed to change password');
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);

    if (!deletePassInput) {
      setDeleteError('Please enter your password to confirm');
      return;
    }

    const res = await deleteAccount(deletePassInput);
    if (res.ok) {
      addToast({ message: 'Account deleted successfully', type: 'info' });
      setShowDeleteModal(false);
      onClose();
    } else {
      setDeleteError(res.error || 'Incorrect password');
    }
  };

  const handleLogout = async () => {
    await logout();
    addToast({ message: 'Logged out successfully', type: 'info' });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        width: '100vw',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
            color: 'var(--text-muted)',
            fontSize: 15,
            fontWeight: 500,
            padding: '4px 8px',
            borderRadius: 'var(--radius-sm)',
            minHeight: 'unset',
          }}
        >
          <ChevronLeft size={20} />
          <span>Back</span>
        </button>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
          Account & Profile
        </h2>
        <div style={{ width: 60 }} />
      </div>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 16px',
          maxWidth: 520,
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* User Card */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 18px',
            marginBottom: 20,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'var(--surface-2)',
                border: '2px solid var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
                fontWeight: 700,
                fontSize: 20,
                flexShrink: 0,
              }}
            >
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name || 'Account'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <Mail size={13} flex-shrink={0} />
                <span>{user?.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Settings */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, paddingLeft: 4 }}>
            Profile Details
          </div>
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
            }}
          >
            {/* Edit Name Row */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              {isEditingName ? (
                <form onSubmit={handleSaveName} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    required
                    style={{
                      flex: 1,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      color: 'var(--text)',
                      fontSize: 16,
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      background: 'var(--primary)',
                      color: 'var(--primary-contrast)',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 14px',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      minHeight: 'unset',
                    }}
                  >
                    <Check size={15} />
                    <span>Save</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingName(false);
                      setNameInput(user?.name || '');
                    }}
                    style={{
                      background: 'var(--surface-2)',
                      color: 'var(--text-muted)',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      fontSize: 13,
                      cursor: 'pointer',
                      minHeight: 'unset',
                    }}
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Name</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginTop: 2 }}>{user?.name}</div>
                  </div>
                  <button
                    onClick={() => setIsEditingName(true)}
                    style={{
                      background: 'var(--surface-2)',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      padding: '6px 12px',
                      color: 'var(--primary)',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      minHeight: 'unset',
                    }}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            {/* Email (Read only) */}
            <div style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Email</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginTop: 2 }}>{user?.email}</div>
            </div>
          </div>
        </div>

        {/* Security & Password */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, paddingLeft: 4 }}>
            Security
          </div>
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => {
                setShowPasswordModal(true);
                setPasswordError(null);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                minHeight: 'unset',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Key size={18} color="var(--primary)" />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Change Password</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Update your account security password</div>
                </div>
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>›</span>
            </button>
          </div>
        </div>

        {/* Danger Zone: Logout and Delete */}
        <div style={{ marginBottom: 30 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, paddingLeft: 4 }}>
            Actions
          </div>
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                background: 'none',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                textAlign: 'left',
                minHeight: 'unset',
              }}
            >
              <LogOut size={18} color="var(--text-muted)" />
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Sign Out</div>
            </button>

            <button
              onClick={() => {
                setShowDeleteModal(true);
                setDeleteError(null);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                minHeight: 'unset',
              }}
            >
              <Trash2 size={18} color="var(--expense)" />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--expense)' }}>Delete Account</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Permanently erase your online profile</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ── Change Password Modal ── */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPasswordModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              zIndex: 60,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: 24,
                width: '100%',
                maxWidth: 400,
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
                Change Password
              </h3>

              {passwordError && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'rgba(255, 122, 89, 0.12)',
                    border: '1px solid var(--expense)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 12px',
                    color: 'var(--expense)',
                    fontSize: 13,
                    marginBottom: 14,
                  }}
                >
                  <AlertCircle size={16} flex-shrink={0} />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 12px',
                      color: 'var(--text)',
                      fontSize: 16,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                    New Password (min 8 chars)
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 12px',
                      color: 'var(--text)',
                      fontSize: 16,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 12px',
                      color: 'var(--text)',
                      fontSize: 16,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      background: 'var(--surface-2)',
                      color: 'var(--text-muted)',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      minHeight: 'unset',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      background: 'var(--primary)',
                      color: 'var(--primary-contrast)',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      minHeight: 'unset',
                    }}
                  >
                    {isLoading && <Loader2 size={16} className="animate-spin" />}
                    <span>Update</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Account Confirmation Modal ── */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDeleteModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.65)',
              zIndex: 60,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--expense)',
                borderRadius: 'var(--radius-lg)',
                padding: 24,
                width: '100%',
                maxWidth: 400,
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--expense)' }}>
                Delete Account
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: 1.5 }}>
                Are you sure you want to delete your PaisaPal user account? To verify your identity, enter your password below:
              </p>

              {deleteError && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'rgba(255, 122, 89, 0.12)',
                    border: '1px solid var(--expense)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 12px',
                    color: 'var(--expense)',
                    fontSize: 13,
                    marginBottom: 14,
                  }}
                >
                  <AlertCircle size={16} flex-shrink={0} />
                  <span>{deleteError}</span>
                </div>
              )}

              <form onSubmit={handleDeleteAccount} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input
                  type="password"
                  value={deletePassInput}
                  onChange={(e) => setDeletePassInput(e.target.value)}
                  placeholder="Enter your current password"
                  required
                  style={{
                    width: '100%',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '11px 14px',
                    color: 'var(--text)',
                    fontSize: 16,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />

                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      background: 'var(--surface-2)',
                      color: 'var(--text-muted)',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      minHeight: 'unset',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      background: 'var(--expense)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      minHeight: 'unset',
                    }}
                  >
                    {isLoading && <Loader2 size={16} className="animate-spin" />}
                    <span>Delete</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
