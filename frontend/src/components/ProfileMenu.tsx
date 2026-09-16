'use client';

import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { api } from '../api/client';
import { UserProfile } from '../types/chat';

const GOOGLE_AUTH_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/api/auth/google`;

export interface ProfileMenuProps {
  user?: UserProfile | null;
  onClose: () => void;
  onSettingsChange?: (changes: Partial<UserProfile>) => void;
}

export default function ProfileMenu({ user, onClose, onSettingsChange }: ProfileMenuProps) {
  const { interfaceStyle, setInterfaceStyle, colorScheme, setColorScheme } = useTheme();
  const [historyOptIn, setHistoryOptIn] = useState(user?.history_opt_in ?? false);
  const [clearing, setClearing] = useState(false);

  const handleLogin = () => {
    window.location.href = GOOGLE_AUTH_URL;
  };

  const handleLogout = async () => {
    await api.post('/api/auth/logout', {});
    window.location.reload();
  };

  const handleHistoryToggle = async () => {
    const newVal = !historyOptIn;
    setHistoryOptIn(newVal);
    if (user) {
      await api.patch('/api/user', { history_opt_in: newVal });
      onSettingsChange?.({ history_opt_in: newVal });
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Delete all your chat history? This cannot be undone.')) return;
    setClearing(true);
    try {
      await api.delete('/api/history');
    } catch {
      /* non-critical */
    }
    setClearing(false);
  };

  const updateInterfaceStyle = (style: string) => {
    setInterfaceStyle(style);
    if (user) api.patch('/api/user', { interface_style: style }).catch(() => {});
  };

  const updateColorScheme = (scheme: string) => {
    setColorScheme(scheme);
    if (user) api.patch('/api/user', { color_scheme: scheme }).catch(() => {});
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={backdrop} aria-hidden="true" />

      <div style={panel} role="dialog" aria-modal="true" aria-label="Profile settings">
        {/* User identity */}
        <div style={section}>
          {user ? (
            <div style={userRow}>
              {user.avatar_url && <img src={user.avatar_url} alt="" style={avatar} />}
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.email}</div>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                Sign in to save chat history and preferences across devices.
              </p>
              <button className="btn-primary" onClick={handleLogin} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <GoogleIcon />
                Sign in with Google
              </button>
            </div>
          )}
        </div>

        <div style={divider} />

        {/* Interface Style */}
        <div style={section}>
          <label style={sectionLabel}>Interface Style</label>
          <div style={toggleRow}>
            {[['modern', '✨ Modern'], ['minimal', '📄 Minimal']].map(([val, lbl]) => (
              <button
                key={val}
                style={{
                  ...toggleChip,
                  borderColor: interfaceStyle === val ? 'var(--accent-primary)' : 'var(--border-subtle)',
                  color: interfaceStyle === val ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  background: interfaceStyle === val ? 'var(--badge-bg)' : 'var(--bg-glass)',
                }}
                onClick={() => updateInterfaceStyle(val)}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Color Scheme */}
        <div style={section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <label style={sectionLabel}>Color Scheme</label>
            {interfaceStyle === 'modern' && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-glass)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                Dark only in Modern mode
              </span>
            )}
          </div>
          <div style={toggleRow}>
            {[['dark', '🌙 Dark'], ['light', '☀️ Light']].map(([val, lbl]) => {
              const isLockedLight = interfaceStyle === 'modern' && val === 'light';
              return (
                <button
                  key={val}
                  disabled={isLockedLight}
                  style={{
                    ...toggleChip,
                    borderColor: colorScheme === val ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    color: colorScheme === val ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    background: colorScheme === val ? 'var(--badge-bg)' : 'var(--bg-glass)',
                    opacity: isLockedLight ? 0.35 : 1,
                    cursor: isLockedLight ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() => !isLockedLight && updateColorScheme(val)}
                  title={isLockedLight ? 'Modern mode is exclusively designed in dark futuristic theme' : undefined}
                >
                  {lbl}
                </button>
              );
            })}
          </div>
        </div>

        <div style={divider} />

        {/* Chat History */}
        <div style={section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={sectionLabel}>Chat History (MongoDB)</label>
            <ToggleSwitch value={historyOptIn} onChange={handleHistoryToggle} id="history-toggle" />
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {historyOptIn
              ? 'Your conversations are saved and used for personalized suggestions.'
              : 'Chat history is off. Queries are processed but not stored.'}
          </p>
          {historyOptIn && user && (
            <button onClick={handleClearHistory} disabled={clearing} style={{ ...clearBtn, marginTop: '0.5rem' }}>
              {clearing ? 'Clearing…' : '🗑️ Clear all history'}
            </button>
          )}
        </div>

        {user && (
          <>
            <div style={divider} />
            <div style={section}>
              <button onClick={handleLogout} className="btn-ghost" style={{ width: '100%' }}>Sign out</button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function ToggleSwitch({ value, onChange, id }: { value: boolean; onChange: () => void; id: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={value}
      onClick={onChange}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: value ? 'var(--accent-primary)' : 'var(--border-card)',
        border: 'none', cursor: 'pointer', position: 'relative',
        transition: 'background var(--transition-base)', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: value ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transition: 'left var(--transition-base)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

// Styles
const backdrop: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 199, background: 'var(--bg-overlay)',
};
const panel: React.CSSProperties = {
  position: 'fixed', top: 56, right: 12, zIndex: 200, width: 320,
  background: 'var(--bg-surface)', border: '1px solid var(--border-card)',
  borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)',
  maxHeight: 'calc(100dvh - 70px)', overflowY: 'auto',
};
const section: React.CSSProperties = { padding: '1rem 1.25rem' };
const divider: React.CSSProperties = { height: 1, background: 'var(--border-subtle)' };
const sectionLabel: React.CSSProperties = { fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.75rem' };
const userRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.75rem' };
const avatar: React.CSSProperties = { width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' };
const toggleRow: React.CSSProperties = { display: 'flex', gap: '0.5rem' };
const toggleChip: React.CSSProperties = { flex: 1, padding: '0.45rem', borderRadius: 'var(--radius-md)', border: '1px solid', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.85rem', transition: 'all var(--transition-fast)' };
const clearBtn: React.CSSProperties = { background: 'transparent', border: '1px solid var(--warning-red)', color: 'var(--warning-red)', borderRadius: 'var(--radius-md)', padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.825rem', fontFamily: 'var(--font-body)', width: '100%', transition: 'background var(--transition-fast)' };
