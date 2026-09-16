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
          SYSTEM PROTOCOL // CYBER INTELLIGENCE
        </div>

        {/* The interactive Futuristic Orb cleanly sized without overlap or wireframe */}
        <div style={{ width: '220px', height: '170px', margin: '0 auto 1.5rem auto', position: 'relative' }}>
          <FuturisticOrb isTyping={true} height={170} showGrid={false} />
        </div>

        <h2 className={styles.title}>MEGHA-SETU</h2>
        <p className={styles.subtitle}>MODERN MODE INITIALIZED // DARK PROTOCOL ACTIVE</p>

        <div className={styles.progressTrack}>
          <div className={styles.progressFill} />
        </div>

        <span className={styles.hint}>CLICK ANYWHERE OR WAIT TO ENTER</span>
      </div>
    </div>
  );
}
