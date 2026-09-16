import React, { useState } from 'react';
import styles from './LeftRail.module.css';
import { getTranslation } from '../i18n/translations';
import { UserProfile } from '../types/chat';
import { useTheme } from '../theme/ThemeProvider';

export interface LeftRailProps {
  onNewChat: () => void;
  onToggleHistory: () => void;
  onOpenSatellite: () => void;
  onOpenWarnings: () => void;
  onOpenLanguage: () => void;
  onOpenSettings: () => void;
  onProfileClick: () => void;
  user?: UserProfile | null;
  language?: string;
  hasWarnings?: boolean;
  isHistoryOpen?: boolean;
  isMobileDrawerOpen?: boolean;
  onCloseMobileDrawer?: () => void;
}

export default function LeftRail({
  onNewChat,
  onToggleHistory,
  onOpenSatellite,
  onOpenWarnings,
  onOpenLanguage,
  onOpenSettings,
  onProfileClick,
  user,
  language = 'en',
  hasWarnings = false,
  isHistoryOpen = false,
  isMobileDrawerOpen = false,
  onCloseMobileDrawer,
}: LeftRailProps) {
  const { interfaceStyle, colorScheme, setColorScheme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      {/* Desktop & Tablet Placeholder so layout doesn't jump when rail expands on hover */}
      <div className={styles.railPlaceholder} aria-hidden="true" />

      {/* Desktop & Tablet Navigation Rail (Expands on Hover in Laptop/Desktop) */}
      <aside
        className={`${styles.rail} ${isHovered ? styles.railExpanded : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Main Navigation"
      >
        {/* Top Section */}
        <div className={styles.topGroup}>
          {/* MEGHA SETU Brand Logo with gentle micro-animation */}
          <div className={styles.logoBtn} onClick={onNewChat} title="MEGHA SETU — Home" aria-label="MEGHA SETU Home">
            <img
              src="/megha_setu_icon.png"
              alt="MEGHA SETU"
              className={styles.logoImg}
            />
            <div className={styles.logoTextWrapper}>
              <span className={styles.brandTitle}>MEGHA SETU</span>
              <span className={styles.brandTagline}>Weather GPT</span>
            </div>
          </div>

          {/* New Chat */}
          <button
            type="button"
            className={styles.railBtn}
            onClick={onNewChat}
            title={getTranslation(language, 'newChat', 'New chat')}
            aria-label="New chat"
          >
            <span className={styles.btnIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <span className={styles.btnLabel}>{getTranslation(language, 'newChat', 'New chat')}</span>
          </button>

          {/* Chat History */}
          <button
            type="button"
            className={`${styles.railBtn} ${isHistoryOpen ? styles.railBtnActive : ''}`}
            onClick={onToggleHistory}
            title={getTranslation(language, 'history', 'Chat history')}
            aria-label="Chat history"
          >
            <span className={styles.btnIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </span>
            <span className={styles.btnLabel}>{getTranslation(language, 'history', 'Chat history')}</span>
          </button>

          {/* 22 Indian Languages */}
          <button
            type="button"
            className={styles.railBtn}
            onClick={onOpenLanguage}
            title="22 Indian Languages + English"
            aria-label="Language selector"
          >
            <span className={styles.btnIcon} style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
              {language.toUpperCase().slice(0, 2)}
            </span>
            <span className={styles.btnLabel}>Languages ({language.toUpperCase()})</span>
          </button>
        </div>

        {/* Bottom Section: Theme Toggle, Settings & User Profile */}
        <div className={styles.bottomGroup}>
          {/* Quick Theme Toggle (Light / Dark) - Only in Minimal mode */}
          {interfaceStyle !== 'modern' && (
            <button
              type="button"
              className={styles.railBtn}
              onClick={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')}
              title={colorScheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle light/dark theme"
            >
              <span className={styles.btnIcon} style={{ fontSize: '1.15rem' }}>
                {colorScheme === 'dark' ? '☀️' : '🌙'}
              </span>
              <span className={styles.btnLabel}>
                {colorScheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </span>
            </button>
          )}

          {/* Settings */}
          <button
            type="button"
            className={styles.railBtn}
            onClick={onOpenSettings}
            title="Settings & Appearance"
            aria-label="Settings"
          >
            <span className={styles.btnIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </span>
            <span className={styles.btnLabel}>Settings</span>
          </button>

          {/* User Profile Avatar (at the very bottom left) */}
          <button
            type="button"
            className={styles.profileAvatarBtn}
            onClick={onProfileClick}
            title={user?.name || 'Account & Profile'}
            aria-label="User Account"
            id="profile-menu-trigger"
          >
            <span className={styles.btnIcon}>
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.name || 'User'} className={styles.avatarImg} />
              ) : (
                <div className={styles.avatarFallback}>
                  <span>{user?.name ? user.name.charAt(0).toUpperCase() : '👤'}</span>
                </div>
              )}
            </span>
            <span className={styles.btnLabel} style={{ fontWeight: 600 }}>
              {user?.name || 'Account'}
            </span>
          </button>
        </div>
      </aside>

      {/* Mobile Slide-out Drawer Navigation (When hamburger is clicked on phones) */}
      {isMobileDrawerOpen && (
        <>
          <div
            className={styles.mobileBackdrop}
            onClick={onCloseMobileDrawer}
            aria-hidden="true"
          />
          <nav
            className={styles.mobileDrawer}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Menu"
          >
            <div className={styles.mobileDrawerHeader}>
              <div className={styles.mobileBrand}>
                <img
                  src="/megha_setu_phone.png"
                  alt="MEGHA SETU"
                  style={{ height: 36, width: 'auto', objectFit: 'contain' }}
                />
              </div>
              <button
                type="button"
                className={styles.drawerCloseBtn}
                onClick={onCloseMobileDrawer}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <div className={styles.mobileMenuItems}>
              {/* Minimal New Chat Pill */}
              <button
                type="button"
                className={styles.mobileNewChatBtn}
                onClick={() => {
                  onNewChat?.();
                  onCloseMobileDrawer?.();
                }}
              >
                <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>＋</span>
                <span>{getTranslation(language, 'newChat', 'New chat')}</span>
              </button>

              {/* Chat History */}
              <button
                type="button"
                className={styles.mobileMenuItem}
                onClick={() => {
                  onToggleHistory?.();
                  onCloseMobileDrawer?.();
                }}
              >
                <span className={styles.itemIcon}>💬</span>
                <span className={styles.itemLabel}>{getTranslation(language, 'history', 'Chat history')}</span>
              </button>

              {/* 22 Languages */}
              <button
                type="button"
                className={styles.mobileMenuItem}
                onClick={() => {
                  onOpenLanguage?.();
                  onCloseMobileDrawer?.();
                }}
              >
                <span className={styles.itemIcon}>🌐</span>
                <span className={styles.itemLabel}>
                  Languages ({language.toUpperCase()})
                </span>
              </button>

              {/* Theme Toggle (Only in Minimal mode) */}
              {interfaceStyle !== 'modern' && (
                <button
                  type="button"
                  className={styles.mobileMenuItem}
                  onClick={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')}
                >
                  <span className={styles.itemIcon}>{colorScheme === 'dark' ? '☀️' : '🌙'}</span>
                  <span className={styles.itemLabel}>
                    {colorScheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  </span>
                </button>
              )}

              {/* Settings */}
              <button
                type="button"
                className={styles.mobileMenuItem}
                onClick={() => {
                  onOpenSettings?.();
                  onCloseMobileDrawer?.();
                }}
              >
                <span className={styles.itemIcon}>⚙️</span>
                <span className={styles.itemLabel}>Settings & Appearance</span>
              </button>
            </div>

            {/* User Profile at Bottom of Mobile Drawer */}
            <div className={styles.mobileDrawerFooter}>
              <button
                type="button"
                className={styles.mobileProfileBtn}
                onClick={() => {
                  onProfileClick?.();
                  onCloseMobileDrawer?.();
                }}
              >
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className={styles.mobileAvatarImg} />
                ) : (
                  <div className={styles.mobileAvatarFallback}>
                    <span>{user?.name ? user.name.charAt(0).toUpperCase() : '👤'}</span>
                  </div>
                )}
                <div className={styles.mobileProfileInfo}>
                  <span className={styles.mobileUserName}>{user?.name || 'Account & Profile'}</span>
                  <span className={styles.mobileUserEmail}>{user?.email || 'Sign in with Google'}</span>
                </div>
              </button>
            </div>
          </nav>
        </>
      )}
    </>
  );
}
