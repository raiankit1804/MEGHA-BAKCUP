'use client';

import React from 'react';
import styles from './SosModal.module.css';
import { getSosModalStrings, getHelplineTranslation } from '../i18n/translations';

interface HelplineItem {
  icon: string;
  name: string;
  number: string;
  altNumber?: string;
  displayNumber?: string;
  desc: string;
  category: string;
}

const HELPLINES: HelplineItem[] = [
  {
    icon: '🚨',
    name: 'National Emergency Helpline',
    number: '112',
    desc: 'All-India emergency response for Police, Fire, Ambulance & Disaster',
    category: 'national',
  },
  {
    icon: '🌊',
    name: 'NDRF Disaster Helpline',
    number: '1078',
    altNumber: '011-24363260',
    desc: 'National Disaster Response Force for floods, cyclones & earthquakes',
    category: 'disaster',
  },
  {
    icon: '⚡',
    name: 'State Disaster Management (SDMA)',
    number: '1070',
    desc: 'State emergency operations centre and district disaster relief',
    category: 'disaster',
  },
  {
    icon: '⚓',
    name: 'Indian Coast Guard (Maritime SOS)',
    number: '1554',
    desc: 'Emergency sea-rescue, cyclone distress & fishermen in coastal waters',
    category: 'marine',
  },
  {
    icon: '🚑',
    name: 'Medical Ambulance & First Aid',
    number: '108',
    altNumber: '102',
    desc: 'National ambulance emergency and critical care transport',
    category: 'medical',
  },
  {
    icon: '🚒',
    name: 'Fire & Rescue Service',
    number: '101',
    desc: 'Fire hazards, building collapse & industrial disasters',
    category: 'rescue',
  },
  {
    icon: '🌾',
    name: 'Kisan Call Centre (Farmer Helpline)',
    number: '18001801551',
    displayNumber: '1800-180-1551',
    desc: 'Toll-free agricultural weather advisory, crop loss & disaster compensation',
    category: 'agri',
  },
  {
    icon: '🏥',
    name: 'Disaster Mental Health & Distress',
    number: '14416',
    desc: 'Tele-MANAS national psychological support in distress situations',
    category: 'health',
  },
];

export interface SosModalProps {
  onClose: () => void;
  locationName?: string | null;
  language?: string;
}

export default function SosModal({ onClose, locationName, language }: SosModalProps) {
  const t = getSosModalStrings(language);

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Emergency SOS Helplines">
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <span className={styles.pulseIcon}>🚨</span>
            <div>
              <h2 className={styles.title}>{t.title}</h2>
              <p className={styles.subtitle}>
                {t.subtitle}
                {locationName ? ` • ${locationName}` : ''}
              </p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close emergency modal">
            ✕
          </button>
        </div>

        <div className={styles.alertNotice}>
          <span>⚠️</span>
          <span>{t.alertNotice}</span>
        </div>

        <div className={styles.grid}>
          {HELPLINES.map((item, idx) => {
            const loc = getHelplineTranslation(item.number, language);
            const itemName = loc?.name || item.name;
            const itemDesc = loc?.desc || item.desc;

            return (
              <div key={idx} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.cardIcon}>{item.icon}</span>
                  <div className={styles.cardInfo}>
                    <div className={styles.cardName}>{itemName}</div>
                    <div className={styles.cardDesc}>{itemDesc}</div>
                  </div>
                </div>

                <div className={styles.callRow}>
                  <span className={styles.phoneDisplay}>{item.displayNumber || item.number}</span>
                  <a
                    href={`tel:${item.number}`}
                    className={styles.callBtn}
                    aria-label={`Call ${itemName} at ${item.number}`}
                  >
                    📞 {t.callNow}
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.footer}>
          <span>{t.footer}</span>
          <button className={styles.doneBtn} onClick={onClose}>{t.done}</button>
        </div>
      </div>
    </>
  );
}
