'use client';

import React, { useState, useEffect } from 'react';
import styles from './HistorySidebar.module.css';
import { SavedSession } from '../types/chat';

export interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions?: any[];
  currentSessionId?: string;
  onSelectSession?: (sessionId: string) => void;
  onNewChat?: () => void;
  onDeleteSession?: (sessionId: string) => void;
  onClearAll?: () => void;
}

export default function HistorySidebar({
  isOpen,
  onClose,
  sessions = [],
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onClearAll,
}: HistorySidebarProps) {
  const [search, setSearch] = useState('');

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = sessions.filter((s) =>
    (s.title || s.preview || 'Weather conversation')
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <aside
        className={styles.sidebar}
        role="dialog"
        aria-modal="true"
        aria-label="Conversation History"
      >
        {/* Top Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <span style={{ fontSize: '1.2rem' }}>💬</span>
            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-headline)' }}>
              Chat History
            </span>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close history sidebar">
            ✕
          </button>
        </div>

        {/* New Chat Action */}
        <div className={styles.actionRow}>
          <button
            className={styles.newChatBtn}
            onClick={() => {
              onNewChat?.();
              onClose();
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>+</span>
            <span>New Weather Chat</span>
          </button>
        </div>

        {/* Search Input */}
        {sessions.length > 3 && (
          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="Search conversations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        )}

        {/* Sessions List */}
        <div className={styles.list}>
          {filtered.length > 0 ? (
            filtered.map((s) => {
              const isActive = s.id === currentSessionId;
              const dateStr = s.timestamp || s.date ? new Date(s.timestamp || s.date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';

              return (
                <div
                  key={s.id}
                  className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
                  onClick={() => {
                    onSelectSession?.(s.id);
                    onClose();
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className={styles.itemContent}>
                    <span className={styles.itemIcon}>{domainIcon(s.domain_filter)}</span>
                    <div className={styles.itemInfo}>
                      <div className={styles.itemTitle}>{s.title || s.preview || 'Weather Query'}</div>
                      <div className={styles.itemMeta}>
                        {dateStr && <span>{dateStr}</span>}
                        {s.location && <span>• {s.location}</span>}
                      </div>
                    </div>
                  </div>

                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession?.(s.id);
                    }}
                    title="Delete conversation"
                    aria-label="Delete conversation"
                  >
                    🗑️
                  </button>
                </div>
              );
            })
          ) : (
            <div className={styles.empty}>
              <span style={{ fontSize: '2rem' }}>🌤️</span>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.4rem 0 0 0' }}>
                No past conversations yet. Start a new chat to see your weather history here.
              </p>
            </div>
          )}
        </div>

        {/* Footer with Clear All */}
        {sessions.length > 0 && (
          <div className={styles.footer}>
            <button className={styles.clearBtn} onClick={onClearAll}>
              Clear all history
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

function domainIcon(domain?: string): string {
  switch (domain) {
    case 'agriculture':
      return '🌾';
    case 'aviation':
      return '✈️';
    case 'marine':
      return '⚓';
    case 'research':
      return '📊';
    default:
      return '🏙️';
  }
}
