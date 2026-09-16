'use client';

import React, { useState, useEffect } from 'react';
import styles from './LanguageModal.module.css';
import { INDIAN_LANGUAGES } from '../i18n/translations';

export interface LanguageModalProps {
  onClose: () => void;
  currentLanguage?: string;
  onSelectLanguage: (code: string) => void;
}

export default function LanguageModal({
  onClose,
  currentLanguage = 'en',
  onSelectLanguage,
}: LanguageModalProps) {
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const filtered = INDIAN_LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(filter.toLowerCase()) ||
      l.native.toLowerCase().includes(filter.toLowerCase()) ||
      l.code.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Select Language">
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <span style={{ fontSize: '1.3rem' }}>🌐</span>
            <div>
              <h2 className={styles.title}>22 Official Indian Languages</h2>
              <p className={styles.subtitle}>Select your preferred language for instant UI localization</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className={styles.searchRow}>
          <input
            type="text"
            placeholder="Search language (e.g. Hindi, Tamil, বাংলা)…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={styles.searchInput}
            autoFocus
          />
        </div>

        <div className={styles.grid}>
          {filtered.map((lang) => {
            const isSelected = lang.code === currentLanguage;
            return (
              <button
                key={lang.code}
                type="button"
                className={`${styles.langCard} ${isSelected ? styles.langCardSelected : ''}`}
                onClick={() => {
                  onSelectLanguage(lang.code);
                  onClose();
                }}
              >
                <div className={styles.langLabel}>{lang.label}</div>
                <div className={styles.langInfo}>
                  <span className={styles.langName}>{lang.name}</span>
                  <span className={styles.langNative}>{lang.native}</span>
                </div>
                {isSelected && <span className={styles.checkIcon}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
