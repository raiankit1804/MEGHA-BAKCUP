'use client';

import React, { useEffect, useState } from 'react';
import styles from './ModernFlashScreen.module.css';
import FuturisticOrb from './FuturisticOrb';

interface ModernFlashScreenProps {
  onDone: () => void;
}

export default function ModernFlashScreen({ onDone }: ModernFlashScreenProps) {
  const [isDismissing, setIsDismissing] = useState(false);

  useEffect(() => {
    // Auto complete flash screen after 1.5s
    const timer = setTimeout(() => {
      handleDismiss();
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsDismissing(true);
    setTimeout(() => {
      onDone();
    }, 380);
  };

  return (
    <div
      className={`${styles.overlay} ${isDismissing ? styles.flashDismissing : ''}`}
      onClick={handleDismiss}
      role="dialog"
      aria-label="Modern Mode Initialized"
    >
      <div className={styles.ambientShock} />

      <div className={styles.content}>
        <div className={styles.hudTag}>
          <span className={styles.hudDot} />
          ATMOSPHERIC INTELLIGENCE // METEOROLOGY AI
        </div>

        {/* The interactive Atmospheric Cloud Orb */}
        <div style={{ width: '220px', height: '170px', margin: '0 auto 1.5rem auto', position: 'relative' }}>
          <FuturisticOrb
            isTyping={true}
            height={170}
            showGrid={false}
            primaryColor="#2563eb"
            secondaryColor="#0ea5e9"
            accentColor="#38bdf8"
          />
        </div>

        <h2 className={styles.title}>MEGHA-SETU</h2>
        <p className={styles.subtitle}>INDIA'S WEATHER GPT • IMD & NWP FORECASTING ACTIVE</p>

        <div className={styles.progressTrack}>
          <div className={styles.progressFill} />
        </div>

        <span className={styles.hint}>CLICK ANYWHERE OR WAIT TO ENTER</span>
      </div>
    </div>
  );
}
