'use client';

import React, { useEffect, useRef } from 'react';
import styles from './SplashScreen.module.css';

interface DomainDetail {
  icon: string;
  name: string;
  desc: string;
}

const DOMAIN_DETAILS: Record<string, DomainDetail> = {
  normal: { icon: '🏙️', name: 'City', desc: 'Ground-level microclimate, temperature & rain' },
  agriculture: { icon: '🌾', name: 'AgriSense', desc: 'Soil moisture, crop spray index, IMD Agromet advisory' },
  aviation: { icon: '✈️', name: 'SkyOps', desc: 'METAR, TAF, cloud ceilings, visibility & runway crosswinds' },
  marine: { icon: '⚓', name: 'SeaCast', desc: 'INCOIS wave heights, sea swell & coastal squall warnings' },
  research: { icon: '📊', name: 'Climate X', desc: 'ERA5 reanalysis, seasonal anomalies & IMD synoptic baselines' },
};

export interface SplashScreenProps {
  onDone: () => void;
  mode?: 'load' | 'switch';
  targetDomain?: string;
}

export default function SplashScreen({ onDone, mode = 'load', targetDomain = 'normal' }: SplashScreenProps) {
  const duration = mode === 'load' ? 1500 : 700;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const domainInfo = DOMAIN_DETAILS[targetDomain] || DOMAIN_DETAILS.normal;

  useEffect(() => {
    timerRef.current = setTimeout(onDone, duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [duration, onDone]);

  return (
    <div className={styles.splashOverlay} aria-label="MEGHA SETU Loading" role="status">
      {/* Ambient Atmospheric Glow (Theme-adaptive) */}
      <div className={styles.glowBackdrop} aria-hidden="true" />

      {mode === 'switch' ? (
        <div className={styles.switchContainer}>
          <span className={styles.switchIcon}>{domainInfo.icon}</span>
          <span className={styles.switchPre}>SWITCHING DOMAIN</span>
          <h2 className={styles.switchTitle}>{domainInfo.name}</h2>
          <p className={styles.switchDesc}>{domainInfo.desc}</p>
          <div className={styles.progressBarContainer}>
            <div className={styles.progressBarFill} />
          </div>
        </div>
      ) : (
        <div className={styles.brandContainer}>
          {/* Official Animated MEGHA SETU Logo (No Card) */}
          <div className={styles.logoWrapper}>
            <picture>
              <source media="(max-width: 640px)" srcSet="/megha_setu_phone.png" />
              <img
                src="/megha_setu_trimmed.png"
                alt="MEGHA SETU — Weather GPT AI Powered"
                className={styles.logoImage}
              />
            </picture>
          </div>

          <p className={styles.subtitle}>
            Conversational Meteorological Intelligence • Official IMD & NWP Data
          </p>

          {/* Minimalist Shimmer Loading Line */}
          <div className={styles.progressBarContainer}>
            <div className={styles.progressBarFill} />
          </div>
        </div>
      )}
    </div>
  );
}
