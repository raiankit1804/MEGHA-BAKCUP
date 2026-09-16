import React, { useState } from 'react';
import styles from './LeftRail.module.css';
import { getTranslation } from '../i18n/translations';
import { UserProfile } from '../types/chat';
import { useTheme } from '../theme/ThemeProvider';

export const DOMAIN_MODES = [
  { id: 'normal', icon: '🏙️', label: 'City', desc: 'Urban weather & rain updates' },
  { id: 'agriculture', icon: '🌾', label: 'AgriSense', desc: 'Crop advisory & irrigation' },
  { id: 'aviation', icon: '✈️', label: 'SkyOps', desc: 'Visibility & METAR briefing' },
  { id: 'marine', icon: '⚓', label: 'SeaCast', desc: 'Coastal winds & wave heights' },
  { id: 'research', icon: '🔬', label: 'Climate X', desc: 'Historical anomalies & climate' },
];

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
  onOpenMobileDrawer?: () => void;
  domainFilter?: string;
  onDomainChange?: (modeId: string) => void;
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
  onOpenMobileDrawer,
  domainFilter = 'normal',
  onDomainChange,
}: LeftRailProps) {
  const { interfaceStyle } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const currentModeObj = DOMAIN_MODES.find((m) => m.id === domainFilter) || DOMAIN_MODES[0];

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
          {/* Hamburger Menu button at top (toggles drawer on any screen) */}
          <button
            type="button"
            className={styles.railHamburgerBtn}
            onClick={onOpenMobileDrawer}
            title="Open Menu (☰)"
            aria-label="Open Navigation Menu"
          >
            <span className={styles.btnIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </span>
            <span className={styles.btnLabel} style={{ fontWeight: 600 }}>Menu</span>
          </button>

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

        {/* Bottom Section: Settings & User Profile */}
        <div className={styles.bottomGroup}>

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

              {/* Intelligence Domain Modes */}
              <div className={styles.drawerSection}>
                <div className={styles.drawerSectionHeader}>
                  <span>INTELLIGENCE MODES</span>
                  {currentModeObj && (
                    <span className={styles.drawerActiveDomainBadge}>
                      {currentModeObj.icon} {currentModeObj.label}
                    </span>
                  )}
                </div>
                <div className={styles.drawerModesList}>
                  {DOMAIN_MODES.map((mode) => {
                    const isSel = domainFilter === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        className={`${styles.drawerModeBtn} ${isSel ? styles.drawerModeBtnActive : ''}`}
                        onClick={() => {
                          onDomainChange?.(mode.id);
                          onCloseMobileDrawer?.();
                        }}
                      >
                        <span className={styles.drawerModeIcon}>{mode.icon}</span>
                        <div className={styles.drawerModeInfo}>
                          <div className={styles.drawerModeHeaderRow}>
                            <span className={styles.drawerModeTitle}>{mode.label}</span>
                            {isSel && <span className={styles.drawerModeActivePill}>ACTIVE</span>}
                          </div>
                          <span className={styles.drawerModeDesc}>{mode.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={styles.drawerDivider} />

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
