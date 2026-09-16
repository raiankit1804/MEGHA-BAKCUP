'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { api } from '../api/client';
import { INDIAN_LANGUAGES, getTranslation } from '../i18n/translations';
import { SessionState, SessionLocation, UserProfile } from '../types/chat';

export interface TopBarProps {
  session?: SessionState;
  onLocationChange: (loc: SessionLocation) => void;
  onLanguageChange: (lang: string) => void;
  user?: UserProfile | null;
  onProfileClick: () => void;
  onToggleHistory: () => void;
  onOpenWarnings: () => void;
  onOpenSatellite: () => void;
  hasWarnings?: boolean;
}

export default function TopBar({
  session,
  onLocationChange,
  onLanguageChange,
  user,
  onProfileClick,
  onToggleHistory,
  onOpenWarnings,
  onOpenSatellite,
  hasWarnings = false,
}: TopBarProps) {
  const { interfaceStyle, colorScheme, setColorScheme } = useTheme();
  const [showLocPicker, setShowLocPicker] = useState(false);

  const locationName = session?.sessionLocation?.name || 'Bengaluru, Karnataka';
  const language = session?.language || 'en';
  const isApproximate = session?.sessionLocation?.source === 'approximate';

  return (
    <header style={header}>
      {/* Left: History drawer toggle & Brand Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <button
          type="button"
          onClick={onToggleHistory}
          style={iconBtn}
          title={getTranslation(language, 'history')}
          aria-label="Toggle chat history"
        >
          <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>☰</span>
        </button>

        <div style={logo}>
          <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <circle cx="16" cy="16" r="14" fill="var(--accent-primary)" opacity="0.9" />
            <path d="M9 18 Q16 10 23 18" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M6 21 Q16 12 26 21" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
          </svg>
          <span style={wordmark}>WeatherGPT</span>
          <span style={badge}>SIH26068</span>
        </div>
      </div>

      {/* Center — location picker pill */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        <button
          style={locationBtn}
          onClick={() => setShowLocPicker((v) => !v)}
          aria-label={getTranslation(language, 'changeLocation')}
        >
          <span style={{ fontSize: '0.95rem' }}>📍</span>
          <span
            style={{
              fontWeight: 500,
              color: 'var(--text-primary)',
              maxWidth: 160,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: '0.86rem',
            }}
          >
            {locationName}
          </span>
          {isApproximate && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {getTranslation(language, 'approx')}
            </span>
          )}
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>▾</span>
        </button>

        {showLocPicker && (
          <LocationSelector
            language={language}
            onSelect={(loc) => {
              onLocationChange(loc);
              setShowLocPicker(false);
            }}
            onClose={() => setShowLocPicker(false)}
          />
        )}
      </div>

      {/* Right actions: Warning triangle, Satellite, Language dropdown, Far-right Profile */}
      <div style={actions}>
        {/* Yellow Warning Triangle Button */}
        <button
          type="button"
          onClick={onOpenWarnings}
          style={{
            ...actionPillBtn,
            borderColor: hasWarnings ? '#f59e0b' : 'var(--border-subtle)',
            background: hasWarnings ? 'rgba(245, 158, 11, 0.14)' : 'var(--bg-glass)',
          }}
          title={getTranslation(language, 'disasterAlert')}
          aria-label="Disaster warnings"
        >
          <span style={{ fontSize: '1rem', color: '#eab308' }}>⚠️</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: hasWarnings ? '#f59e0b' : 'var(--text-secondary)' }}>
            Alerts
          </span>
          {hasWarnings && (
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#ef4444',
                boxShadow: '0 0 8px #ef4444',
                animation: 'pulse 1.4s infinite',
              }}
            />
          )}
        </button>

        {/* IMD Satellite Quick Launcher */}
        <button
          type="button"
          onClick={onOpenSatellite}
          style={actionPillBtn}
          title="Live IMD Satellite & Doppler Radar viewer"
          aria-label="Open satellite viewer"
        >
          <span style={{ fontSize: '0.95rem' }}>🛰️</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
            Satellite
          </span>
        </button>

        {/* 22 Indian Languages selector */}
        <LanguageToggle value={language} onChange={onLanguageChange} />

        {/* Quick Light/Dark Toggle Button (Only for Minimal mode — Modern mode is strictly dark) */}
        {interfaceStyle !== 'modern' && (
          <button
            type="button"
            onClick={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')}
            style={{
              ...actionPillBtn,
              background: colorScheme === 'light' ? 'rgba(171, 0, 91, 0.12)' : 'var(--bg-glass)',
              borderColor: colorScheme === 'light' ? 'var(--accent-primary)' : 'var(--border-subtle)',
            }}
            title={colorScheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle light/dark theme"
          >
            <span style={{ fontSize: '0.95rem' }}>{colorScheme === 'dark' ? '☀️' : '🌙'}</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {colorScheme === 'dark' ? 'Light' : 'Dark'}
            </span>
          </button>
        )}

        {/* Far-Right Profile Menu Button */}
        <ProfileButton user={user} onClick={onProfileClick} />
      </div>
    </header>
  );
}

function LanguageToggle({ value, onChange }: { value: string; onChange: (lang: string) => void }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const ref = useRef<HTMLDivElement | null>(null);

  const current = INDIAN_LANGUAGES.find((l) => l.code === value) || INDIAN_LANGUAGES[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = INDIAN_LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(filter.toLowerCase()) ||
      l.native.toLowerCase().includes(filter.toLowerCase()) ||
      l.code.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        style={langBtn}
        onClick={() => {
          setOpen((v) => !v);
          setFilter('');
        }}
        aria-label="Change language (22 Indian languages)"
      >
        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{current.label}</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>▾</span>
      </button>

      {open && (
        <div style={dropdown} role="listbox" aria-label="Language selection">
          <div style={{ padding: '0.4rem 0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <input
              type="text"
              placeholder="Filter 22 languages…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={langFilterInput}
              autoFocus
            />
          </div>
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {filtered.map((l) => (
              <button
                key={l.code}
                role="option"
                aria-selected={l.code === value}
                style={{
                  ...dropItem,
                  background: l.code === value ? 'var(--bg-glass-hover)' : 'transparent',
                  color: l.code === value ? 'var(--accent-primary)' : 'var(--text-primary)',
                }}
                onClick={() => {
                  onChange(l.code);
                  setOpen(false);
                }}
              >
                <span style={{ fontWeight: 700, minWidth: 26, color: 'var(--accent-primary)', fontSize: '0.82rem' }}>
                  {l.label}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: 1.2 }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 500 }}>{l.name}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{l.native}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileButton({ user, onClick }: { user?: UserProfile | null; onClick: () => void }) {
  if (user?.avatar_url) {
    return (
      <button
        onClick={onClick}
        style={avatarBtn}
        aria-label="Profile menu"
        id="profile-menu-trigger"
        title={user.name || 'Profile'}
      >
        <img
          src={user.avatar_url}
          alt={user.name || 'User'}
          style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
        />
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      style={{
        ...avatarBtn,
        background: 'var(--bg-glass)',
        border: '1px solid var(--border-subtle)',
      }}
      aria-label="Profile menu"
      id="profile-menu-trigger"
      title="User profile & settings"
    >
      <span style={{ fontSize: '1.15rem' }}>👤</span>
    </button>
  );
}

interface LocationSelectorProps {
  language: string;
  onSelect: (loc: SessionLocation) => void;
  onClose: () => void;
}

function LocationSelector({ language, onSelect, onClose }: LocationSelectorProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`
      );
      const data = await res.json();
      setSuggestions((data.results || []).filter((r: any) => r.country_code === 'IN'));
    } catch {
      setSuggestions([]);
    }
  };

  const handleGPS = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        if (lat < 6.0 || lat > 37.5 || lon < 68.0 || lon > 97.5) {
          alert('Detected coordinates are outside India. Defaulting to Bengaluru, Karnataka.');
          onSelect({ latitude: 12.9716, longitude: 77.5946, name: 'Bengaluru, Karnataka', state: 'Karnataka', source: 'default' });
          return;
        }
        try {
          const res = await api.get(`/api/location/reverse?lat=${lat}&lon=${lon}`);
          if (res.country_code && res.country_code !== 'IN') {
            onSelect({ latitude: 12.9716, longitude: 77.5946, name: 'Bengaluru, Karnataka', state: 'Karnataka', source: 'default' });
            return;
          }
          const fullLoc = res.name || 'Bengaluru';
          const state = res.admin1 || 'Karnataka';
          const locObj = { latitude: lat, longitude: lon, name: fullLoc, state, source: 'gps' as const };
          try {
            localStorage.setItem('weathergpt_user_location', JSON.stringify(locObj));
          } catch {}
          onSelect(locObj);
        } catch {
          const locObj = { latitude: lat, longitude: lon, name: 'Bengaluru, Karnataka', state: 'Karnataka', source: 'gps' as const };
          onSelect(locObj);
        }
      },
      () => {
        // GPS blocked - try IP detection
        api.get('/api/location/detect')
          .then((res) => {
            if (res && res.latitude) {
              const locObj = {
                latitude: res.latitude,
                longitude: res.longitude,
                name: res.name || 'Bengaluru',
                state: res.state || 'Karnataka',
                source: 'ip' as const,
              };
              try {
                localStorage.setItem('weathergpt_user_location', JSON.stringify(locObj));
              } catch {}
              onSelect(locObj);
            } else {
              onSelect({ latitude: 12.9716, longitude: 77.5946, name: 'Bengaluru, Karnataka', state: 'Karnataka', source: 'default' });
            }
          })
          .catch(() => {
            onSelect({ latitude: 12.9716, longitude: 77.5946, name: 'Bengaluru, Karnataka', state: 'Karnataka', source: 'default' });
          });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  const bangaloreQuickSpots = [
    { name: 'Bengaluru (Central)', lat: 12.9716, lon: 77.5946, state: 'Karnataka' },
    { name: 'Indiranagar, Bengaluru', lat: 12.9784, lon: 77.6408, state: 'Karnataka' },
    { name: 'Koramangala, Bengaluru', lat: 12.9352, lon: 77.6245, state: 'Karnataka' },
    { name: 'Whitefield, Bengaluru', lat: 12.9698, lon: 77.7500, state: 'Karnataka' },
    { name: 'Yelahanka, Bengaluru', lat: 13.1007, lon: 77.5963, state: 'Karnataka' },
  ];

  return (
    <div ref={ref} style={locPanel} role="dialog" aria-label={getTranslation(language, 'searchLocation')}>
      <input
        autoFocus
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder={getTranslation(language, 'searchLocation')}
        style={locInput}
        aria-label="Search location"
      />
      <button onClick={handleGPS} style={{ ...dropItem, color: 'var(--accent-primary)', fontWeight: 600 }}>
        📍 {getTranslation(language, 'useGPS')} / Detect Location
      </button>

      {query.length === 0 && (
        <div style={{ padding: '0.4rem 0.6rem 0.2rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Bengaluru Localities:
        </div>
      )}

      {query.length === 0 &&
        bangaloreQuickSpots.map((spot) => (
          <button
            key={spot.name}
            style={dropItem}
            onClick={() =>
              onSelect({
                name: spot.name,
                latitude: spot.lat,
                longitude: spot.lon,
                state: spot.state,
                source: 'explicit',
              })
            }
          >
            <span style={{ fontWeight: 500 }}>{spot.name}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{spot.state}</span>
          </button>
        ))}

      {suggestions.map((s) => (
        <button
          key={s.id}
          style={dropItem}
          onClick={() =>
            onSelect({
              name: s.name,
              latitude: s.latitude,
              longitude: s.longitude,
              state: s.admin1,
              source: 'explicit',
            })
          }
        >
          <span style={{ fontWeight: 500 }}>{s.name}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{s.admin1}, India</span>
        </button>
      ))}
    </div>
  );
}

// Styles
const header: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.85rem',
  padding: '0.65rem 1.25rem',
  background: 'var(--bg-surface)',
  borderBottom: '1px solid var(--border-subtle)',
  position: 'sticky',
  top: 0,
  zIndex: 100,
  backdropFilter: 'blur(12px)',
};

const iconBtn: React.CSSProperties = {
  background: 'var(--bg-glass)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  padding: '0.4rem 0.55rem',
  cursor: 'pointer',
  color: 'var(--text-primary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all var(--transition-fast)',
};

const logo: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 };
const wordmark: React.CSSProperties = {
  fontFamily: 'var(--font-headline)',
  fontWeight: 700,
  fontSize: '1.05rem',
  color: 'var(--text-headline)',
  letterSpacing: '-0.02em',
};
const badge: React.CSSProperties = {
  fontSize: '0.65rem',
  padding: '1px 6px',
  background: 'var(--bg-glass)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-muted)',
};

const locationBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
  background: 'var(--bg-glass)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-pill)',
  padding: '0.4rem 0.85rem',
  cursor: 'pointer',
  transition: 'background var(--transition-fast)',
  boxShadow: 'var(--shadow-sm)',
};

const actions: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 };

const actionPillBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  background: 'var(--bg-glass)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-pill)',
  padding: '0.38rem 0.75rem',
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
  transition: 'all var(--transition-fast)',
};

const langBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
  background: 'var(--bg-glass)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-pill)',
  padding: '0.38rem 0.65rem',
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
};

const avatarBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  borderRadius: '50%',
  border: 'none',
  cursor: 'pointer',
  background: 'transparent',
  padding: 0,
  flexShrink: 0,
  marginLeft: '0.25rem',
};

const dropdown: React.CSSProperties = {
  position: 'absolute',
  right: 0,
  top: 'calc(100% + 6px)',
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-card)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-card)',
  zIndex: 250,
  minWidth: 190,
  overflow: 'hidden',
};

const langFilterInput: React.CSSProperties = {
  width: '100%',
  padding: '0.35rem 0.5rem',
  background: 'var(--bg-glass)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)',
  fontSize: '0.8rem',
  color: 'var(--text-primary)',
  outline: 'none',
  fontFamily: 'var(--font-body)',
};

const dropItem: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  textAlign: 'left',
  fontFamily: 'var(--font-body)',
  transition: 'background var(--transition-fast)',
};

const locPanel: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 6px)',
  left: '50%',
  transform: 'translateX(-50%)',
  width: 320,
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-card)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-card)',
  zIndex: 250,
};

const locInput: React.CSSProperties = {
  width: '100%',
  padding: '0.65rem 0.85rem',
  border: 'none',
  borderBottom: '1px solid var(--border-subtle)',
  background: 'transparent',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.9rem',
  outline: 'none',
};
