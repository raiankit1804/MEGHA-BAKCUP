'use client';

import React, { useState, useEffect } from 'react';
import styles from './SatelliteModal.module.css';

// 3 Top Primary Sections matching IMD Mausam
const TOP_TABS = [
  { id: 'satellite', label: 'उपग्रह', enLabel: 'INSAT-3DS Satellite', icon: '🛰️' },
  { id: 'radar', label: 'राडार', enLabel: 'Doppler Radar Mosaic', icon: '📡' },
  { id: 'lightning', label: 'उपग्रह तड़ित पूर्वानुमान', enLabel: 'Lightning Forecast', icon: '⚡' },
];

// Satellite Channels
const SATELLITE_CHANNELS = [
  {
    id: 'ir',
    label: 'IR1 (Thermal 10.83 µm)',
    desc: 'Deep convective storm clusters, cyclone eyes & cloud tops (24x7 all-weather surveillance).',
    stillUrl: '/api/satellite/image?channel=ir',
    loopUrl: '/api/satellite/image?channel=ir_loop',
  },
  {
    id: 'wv',
    label: 'WV (Water Vapour 6.8 µm)',
    desc: 'Mid-to-upper tropospheric moisture, jet streams, and wind shear crucial for aviation & storms.',
    stillUrl: '/api/satellite/image?channel=wv',
    loopUrl: '/api/satellite/image?channel=wv_loop',
  },
  {
    id: 'vis',
    label: 'VIS (Visible Optical 0.65 µm)',
    desc: 'High-resolution optical daylight cloud reflectance, low-level fog banks & sea haze.',
    stillUrl: '/api/satellite/image?channel=vis',
    loopUrl: '/api/satellite/image?channel=vis_loop',
  },
  {
    id: 'ctbt',
    label: 'CTBT (Cloud Top Temp)',
    desc: 'Cloud top brightness temperature gradient tracking severe convective cell maturation.',
    stillUrl: '/api/satellite/image?channel=ctbt',
    loopUrl: '/api/satellite/image?channel=ctbt_loop',
  },
];

export interface SatelliteModalProps {
  onClose: () => void;
  activeMode?: string;
}

export default function SatelliteModal({ onClose, activeMode = 'aviation' }: SatelliteModalProps) {
  const [activeTab, setActiveTab] = useState<string>('satellite');
  const [selectedSatChannel, setSelectedSatChannel] = useState<string>(
    activeMode === 'marine' ? 'wv' : 'ir'
  );
  const [isLoopMode, setIsLoopMode] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [imgError, setImgError] = useState<boolean>(false);
  const [timestamp, setTimestamp] = useState<string>('');
  const [gmtIstTime, setGmtIstTime] = useState<string>('');

  useEffect(() => {
    setTimestamp(new Date().toLocaleTimeString());
  }, []);

  // Format GMT & IST like IMD INSAT-3DS header
  useEffect(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const day = pad(now.getDate());
    const month = pad(now.getMonth() + 1);
    const year = now.getFullYear();

    const gmtHours = pad(now.getUTCHours());
    const istHours = pad(now.getHours());
    const istMins = pad(now.getMinutes());

    setGmtIstTime(
      `GMT: ${day}-${month}-${year}/(${gmtHours}00-${gmtHours}30) • IST: ${day}-${month}-${year}/(${istHours}${istMins})`
    );
  }, [timestamp]);

  // Determine current image URL
  let currentImgUrl = '';
  let currentTitle = '';
  let currentDesc = '';

  if (activeTab === 'satellite') {
    const ch = SATELLITE_CHANNELS.find((c) => c.id === selectedSatChannel) || SATELLITE_CHANNELS[0];
    currentImgUrl = isLoopMode ? ch.loopUrl : ch.stillUrl;
    currentTitle = `INSAT-3DS IMG, ${ch.label} — L1C MERCATOR`;
    currentDesc = ch.desc;
  } else if (activeTab === 'radar') {
    currentImgUrl = '/api/satellite/image?channel=radar';
    currentTitle = 'IMD National Doppler Weather Radar (DWR) Composite Mosaic';
    currentDesc = 'Multi-radar synchronized network detecting live precipitation reflectivity (dBZ) & squalls across Indian mainland.';
  } else if (activeTab === 'lightning') {
    currentImgUrl = '/api/satellite/image?channel=lightning';
    currentTitle = 'IMD Satellite Convective Lightning Forecast (Realtime Prediction)';
    currentDesc = 'Derived flash density index mapping severe convective thunderstorm potential and lightning strike hazard zones.';
  }

  const handleRefresh = () => {
    setLoading(true);
    setImgError(false);
    setTimestamp(new Date().toLocaleTimeString());
  };

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="IMD Satellite and Radar Viewer">
        {/* Header with IMD Branding */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.imdEmblem}>
              <span className={styles.satIcon}>🛰️</span>
            </div>
            <div>
              <div className={styles.titleRow}>
                <h2 className={styles.title}>IMD Earth Observation & Radar Surveillance</h2>
                <span className={styles.livePill}>
                  <span className={styles.pulseDot} />
                  LIVE IMD INSAT-3DS
                </span>
              </div>
              <p className={styles.subtitle}>
                India Meteorological Department & ISRO Space Applications Centre
              </p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close viewer">✕</button>
        </div>

        {/* Streamlined Top Navigation Bar */}
        <div className={styles.navBar}>
          {/* Primary View Switcher */}
          <div className={styles.topTabs}>
            {TOP_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`${styles.topTabBtn} ${activeTab === tab.id ? styles.topTabActive : ''}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  setLoading(true);
                  setImgError(false);
                  setZoom(1);
                }}
              >
                <span className={styles.tabIcon}>{tab.icon}</span>
                <span className={styles.tabLabel}>{tab.enLabel}</span>
                <span className={styles.tabHindiBadge}>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Sub-controls: Channels & Loop/Still when in satellite view */}
          {activeTab === 'satellite' && (
            <div className={styles.satControlsGroup}>
              <div className={styles.channelButtons}>
                {SATELLITE_CHANNELS.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    className={`${styles.channelBtn} ${selectedSatChannel === ch.id ? styles.channelBtnActive : ''}`}
                    onClick={() => {
                      setSelectedSatChannel(ch.id);
                      setLoading(true);
                      setImgError(false);
                    }}
                  >
                    {ch.label.split(' ')[0]}
                  </button>
                ))}
              </div>

              <div className={styles.modeToggleGroup}>
                <button
                  type="button"
                  className={`${styles.modeBtn} ${isLoopMode ? styles.modeBtnActive : ''}`}
                  onClick={() => {
                    setIsLoopMode(true);
                    setLoading(true);
                    setImgError(false);
                  }}
                  title="Continuous meteorological motion loop"
                >
                  ⚡ Loop (GIF)
                </button>
                <button
                  type="button"
                  className={`${styles.modeBtn} ${!isLoopMode ? styles.modeBtnActive : ''}`}
                  onClick={() => {
                    setIsLoopMode(false);
                    setLoading(true);
                    setImgError(false);
                  }}
                  title="Single high-resolution radiometric frame"
                >
                  📸 Still (HD)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Main Observation Viewport */}
        <div className={styles.viewport}>
          {/* Floating HUD status bar on top of image */}
          <div className={styles.hudOverlay}>
            <div className={styles.hudMeta}>
              <span className={isLoopMode && activeTab !== 'lightning' ? styles.statusLoop : styles.statusStill}>
                {activeTab === 'satellite' && isLoopMode ? '● REALTIME LOOP' : '● ACTIVE FEED'}
              </span>
              <span className={styles.hudTime}>{gmtIstTime}</span>
            </div>

            <div className={styles.zoomControls}>
              <button
                type="button"
                className={styles.toolBtn}
                onClick={() => setZoom((z) => Math.max(0.7, z - 0.2))}
                title="Zoom Out"
              >
                −
              </button>
              <span className={styles.zoomVal}>{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                className={styles.toolBtn}
                onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
                title="Zoom In"
              >
                +
              </button>
              <button
                type="button"
                className={styles.toolBtn}
                onClick={() => setZoom(1)}
                title="Reset Zoom"
              >
                1:1
              </button>
              <button
                type="button"
                className={styles.toolBtn}
                onClick={handleRefresh}
                title="Reload Latest Imagery"
              >
                🔄
              </button>
            </div>
          </div>

          {/* Main Image Stage */}
          <div className={styles.imageContainer}>
            {loading && !imgError && (
              <div className={styles.loaderOverlay}>
                <div className={styles.spinner} />
                <p className={styles.loaderText}>
                  Streaming live {activeTab === 'satellite' ? (isLoopMode ? 'INSAT-3DS animation loop' : 'INSAT-3DS HD imagery') : activeTab} from IMD...
                </p>
              </div>
            )}

            {!imgError ? (
              <div className={styles.imageWrapper}>
                <img
                  key={`${currentImgUrl}-${timestamp}`}
                  src={`${currentImgUrl}&t=${Date.now()}`}
                  alt={currentTitle}
                  className={`${styles.satImage} ${activeTab === 'satellite' ? styles.satImageSatellite : styles.satImageRadar}`}
                  style={{
                    transform: `scale(${zoom})`,
                    opacity: loading ? 0.3 : 1,
                  }}
                  onLoad={() => setLoading(false)}
                  onError={() => {
                    setLoading(false);
                    setImgError(true);
                  }}
                />
              </div>
            ) : (
              <div className={styles.fallbackBox}>
                <div style={{ fontSize: '2.5rem' }}>🛰️</div>
                <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '1.1rem' }}>
                  {currentTitle}
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', maxWidth: 460 }}>
                  Live meteorological stream temporarily rerouted. You can verify the official IMD Mausam portal directly:
                </p>
                <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.4rem' }}>
                  <a
                    href="https://mausam.imd.gov.in/responsive/satellite.php"
                    target="_blank"
                    rel="noreferrer"
                    className={styles.extLink}
                  >
                    Open IMD Satellite ↗
                  </a>
                  <a
                    href="https://mosdac.gov.in"
                    target="_blank"
                    rel="noreferrer"
                    className={styles.extLink}
                  >
                    Open ISRO MOSDAC ↗
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Clean Metadata Footer */}
          <div className={styles.infoFooter}>
            <div className={styles.infoLeft}>
              <strong className={styles.feedTitle}>{currentTitle}</strong>
              <span className={styles.feedSub}>{currentDesc}</span>
            </div>
            <div className={styles.footerActions}>
              <div className={styles.subcontinentalInfo}>
                <span>Subcontinent: 8°N-37°N, 68°E-97°E</span>
              </div>
              <button type="button" className={styles.doneBtn} onClick={onClose}>Done</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
