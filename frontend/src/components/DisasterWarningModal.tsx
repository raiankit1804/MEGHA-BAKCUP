'use client';

import React, { useState, useEffect } from 'react';
import styles from './DisasterWarningModal.module.css';
import { IMDWarning } from '../types/weather';
import { getWarningModalStrings, localizeWarning } from '../i18n/translations';

export interface DisasterWarningModalProps {
  onClose: () => void;
  warnings?: IMDWarning[];
  locationName?: string | null;
  language?: string;
}

export default function DisasterWarningModal({
  onClose,
  warnings = [],
  locationName,
  language,
}: DisasterWarningModalProps) {
  const [notifPermission, setNotifPermission] = useState<string>('default');
  const t = getWarningModalStrings(language);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  const handleEnablePush = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Push notifications are not supported in your browser.');
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      new Notification('WeatherGPT Alerts Activated', {
        body: `You will now receive proactive disaster and severe weather warnings for ${locationName || 'your area'}.`,
        icon: 'https://cdn-icons-png.flaticon.com/512/1163/1163624.png',
      });
    }
  };

  const hasWarnings = warnings.length > 0;

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Disaster Warning Bulletin">
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <span className={styles.warnIcon}>⚠️</span>
            <div>
              <h2 className={styles.title}>{t.title}</h2>
              <p className={styles.subtitle}>
                {t.subtitle} {locationName ? `• ${locationName}` : ''}
              </p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close warning modal">✕</button>
        </div>

        <div className={styles.body}>
          {/* Push Notification Banner */}
          <div className={styles.notifBanner}>
            <div className={styles.notifInfo}>
              <span style={{ fontSize: '1.2rem' }}>🔔</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{t.pushTitle}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {t.pushDesc}
                </div>
              </div>
            </div>
            {notifPermission === 'granted' ? (
              <span className={styles.badgeGranted}>{t.active}</span>
            ) : (
              <button className={styles.enableBtn} onClick={handleEnablePush}>
                {t.enableAlerts}
              </button>
            )}
          </div>

          {/* Warning Items */}
          <div className={styles.warningsList}>
            {hasWarnings ? (
              warnings.map((w, idx) => {
                const locW = localizeWarning(w, language);
                return (
                  <div
                    key={idx}
                    className={`${styles.warningCard} ${
                      w.severity === 'red'
                        ? styles.cardRed
                        : w.severity === 'orange'
                        ? styles.cardOrange
                        : styles.cardYellow
                    }`}
                  >
                    <div className={styles.cardHeader}>
                      <span className={styles.levelBadge}>
                        {w.severity === 'yellow'
                          ? t.yellow
                          : w.severity === 'orange'
                          ? t.orange
                          : w.severity === 'red'
                          ? t.red
                          : (w.severity ? w.severity.toUpperCase() : t.alert)}
                      </span>
                      <span className={styles.hazardName}>{locW.hazard || 'Weather Warning'}</span>
                    </div>
                    <p className={styles.desc}>{locW.description}</p>
                    {locW.district && (
                      <div className={styles.districtBadge}>
                        📍 {t.affectedDistrict}: <strong>{locW.district}</strong>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className={styles.noWarning}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🟢</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-headline)' }}>
                  {t.noWarningsTitle}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: 360, margin: '0.4rem auto 0 auto' }}>
                  {t.noWarningsDesc}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <span>{t.dataSource}</span>
          <button className={styles.doneBtn} onClick={onClose}>{t.close}</button>
        </div>
      </div>
    </>
  );
}
