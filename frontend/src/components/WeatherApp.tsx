'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';
import SplashScreen from './SplashScreen';
import LeftRail from './LeftRail';
import ChatWindow from './ChatWindow';
import ChatInput from './ChatInput';
import ProfileMenu from './ProfileMenu';
import HistorySidebar from './HistorySidebar';
import SosModal from './SosModal';
import DisasterWarningModal from './DisasterWarningModal';
import SatelliteModal from './SatelliteModal';
import LanguageModal from './LanguageModal';
import {
  ChatMessage,
  SessionState,
  SavedSession,
  UserProfile,
  DomainModeId,
} from '../types/chat';
import { IMDWarning } from '../types/weather';

// ─── Merge API response into local message objects ───────────────────────────

function apiResponseToMessage(resp: any, queryText: string): ChatMessage {
  return {
    id: resp.message_id || `msg_${Date.now()}`,
    role: 'assistant',
    turn_type: resp.turn_type || 'establishing',
    timestamp: new Date().toISOString(),
    variants: {
      en: resp.response_text_english || resp.response_text,
      [resp.detected_language || 'en']: resp.response_text,
    },
    response_text_english: resp.response_text_english,
    response_text: resp.response_text,
    weather_data: resp.weather_data,
    warnings: resp.warnings || [],
    risks: resp.risks || [],
    followup_chips_native: resp.followup_chips_native || [],
    followup_chips_english: resp.followup_chips_english || [],
    resolved_location: resp.resolved_location,
    domain_filter: resp.domain_filter,
    intent_category: resp.intent_category,
    data_freshness: resp.data_freshness,
    model_agreement: resp.model_agreement,
    sources: resp.sources || [],
    latency_ms: resp.latency_ms,
    requires_chart: resp.requires_chart,
  };
}

// ─── Local Storage Session Helpers ───────────────────────────────────────────

const STORAGE_KEY_SESSIONS = 'wgpt_local_sessions';

function loadLocalSessions(): SavedSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalSessions(sessions: SavedSession[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions.slice(0, 30)));
  } catch (e) {
    console.warn('Could not persist sessions to localStorage:', e);
  }
}

// ─── Main WeatherApp Component ────────────────────────────────────────────────

const DOMAIN_MODES = [
  { id: 'normal', icon: '🏙️', label: 'City', desc: 'Urban weather & rain updates' },
  { id: 'agriculture', icon: '🌾', label: 'AgriSense', desc: 'Crop advisory & irrigation' },
  { id: 'aviation', icon: '✈️', label: 'SkyOps', desc: 'Visibility & METAR briefing' },
  { id: 'marine', icon: '⚓', label: 'SeaCast', desc: 'Coastal winds & wave heights' },
  { id: 'research', icon: '📊', label: 'Climate X', desc: 'Historical anomalies & climate' },
];

export default function WeatherApp() {
  const [showSplash, setShowSplash] = useState(true);
  const [switchingMode, setSwitchingMode] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSos, setShowSos] = useState(false);
  const [showWarnings, setShowWarnings] = useState(false);
  const [showSatellite, setShowSatellite] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [showMobileModeMenu, setShowMobileModeMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const mobileModeMenuRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionsList, setSessionsList] = useState<SavedSession[]>([]);
  const [session, setSession] = useState<SessionState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('weathergpt_user_location');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.name && parsed.latitude && parsed.longitude) {
            return {
              session_id: `sess_${Date.now()}`,
              language: 'en',
              domainFilter: 'normal',
              sessionLocation: parsed,
            };
          }
        }
      } catch {}
    }
    return {
      session_id: `sess_${Date.now()}`,
      language: 'en',
      domainFilter: 'normal',
      sessionLocation: {
        name: 'Bengaluru, Karnataka',
        latitude: 12.9716,
        longitude: 77.5946,
        state: 'Karnataka',
        source: 'default',
      },
    };
  });
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeWarnings, setActiveWarnings] = useState<IMDWarning[]>([]);

  const currentModeObj = DOMAIN_MODES.find((m) => m.id === session.domainFilter) || DOMAIN_MODES[0];

  useEffect(() => {
    const handleOut = (e: MouseEvent) => {
      if (mobileModeMenuRef.current && !mobileModeMenuRef.current.contains(e.target as Node)) {
        setShowMobileModeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOut);
    return () => document.removeEventListener('mousedown', handleOut);
  }, []);

  // Check URL params for Google OAuth token callback & initialize user
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('auth_token', token);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    api.get('/api/auth/me')
      .then((u) => {
        if (u && u.id) setUser(u);
      })
      .catch(() => {
        /* guest mode */
      });

    const localSess = loadLocalSessions();
    setSessionsList(localSess);

    // Auto-detect high-accuracy location via HTML5 GPS or IP fallback
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          // Guard: ignore coordinates outside India bounding box
          if (lat < 6.0 || lat > 37.5 || lon < 68.0 || lon > 97.5) {
            console.warn(`GPS coordinates (${lat}, ${lon}) outside India.`);
            return;
          }
          try {
            const res = await api.get(`/api/location/reverse?lat=${lat}&lon=${lon}`);
            if (res.country_code && res.country_code !== 'IN') {
              return;
            }
            const fullLoc = res.name || 'Bengaluru';
            const state = res.admin1 || 'Karnataka';
            const locObj = { latitude: lat, longitude: lon, name: fullLoc, state, source: 'gps' as const };
            setSession((s) => ({
              ...s,
              sessionLocation: locObj,
            }));
            try {
              localStorage.setItem('weathergpt_user_location', JSON.stringify(locObj));
            } catch {}
          } catch (e) {
            console.warn('Reverse geocode failed:', e);
          }
        },
        () => {
          // If GPS fails or is denied, try IP location detect
          api.get('/api/location/detect')
            .then((res) => {
              if (res && res.latitude && res.country_code === 'IN') {
                const locObj = {
                  latitude: res.latitude,
                  longitude: res.longitude,
                  name: res.name || 'Bengaluru',
                  state: res.state || 'Karnataka',
                  source: 'ip' as const,
                };
                setSession((s) => ({
                  ...s,
                  sessionLocation: locObj,
                }));
                try {
                  localStorage.setItem('weathergpt_user_location', JSON.stringify(locObj));
                } catch {}
              }
            })
            .catch(() => {});
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
      );
    } else {
      api.get('/api/location/detect')
        .then((res) => {
          if (res && res.latitude && res.country_code === 'IN') {
            const locObj = {
              latitude: res.latitude,
              longitude: res.longitude,
              name: res.name || 'Bengaluru',
              state: res.state || 'Karnataka',
              source: 'ip' as const,
            };
            setSession((s) => ({
              ...s,
              sessionLocation: locObj,
            }));
            try {
              localStorage.setItem('weathergpt_user_location', JSON.stringify(locObj));
            } catch {}
          }
        })
        .catch(() => {});
    }
  }, []);

  // Proactively fetch official IMD warnings when location is known/changed
  useEffect(() => {
    const locName = session.sessionLocation?.name || 'Bengaluru';
    const lat = session.sessionLocation?.latitude;
    const lon = session.sessionLocation?.longitude;
    const state = session.sessionLocation?.state;
    const url = `/api/warnings?location=${encodeURIComponent(locName)}${lat ? `&lat=${lat}` : ''}${lon ? `&lon=${lon}` : ''}${state ? `&state=${encodeURIComponent(state)}` : ''}`;
    api.get(url)
      .then((res) => {
        if (res.warnings && res.warnings.length > 0) {
          setActiveWarnings(res.warnings);
        }
      })
      .catch(() => {});
  }, [session.sessionLocation?.name, session.sessionLocation?.latitude]);

  // Sync current conversation into sessionsList & localStorage
  useEffect(() => {
    if (messages.length === 0) return;

    const firstUserMsg = messages.find((m) => m.role === 'user');
    const title = firstUserMsg?.query || 'Weather Query';
    const lastMsg = messages[messages.length - 1];
    const preview =
      lastMsg.role === 'assistant'
        ? (lastMsg.response_text_english || lastMsg.response_text || '').slice(0, 70)
        : lastMsg.query || '';

    setSessionsList((prev) => {
      const idx = prev.findIndex((s) => s.id === session.session_id);
      const updated: SavedSession = {
        id: session.session_id,
        title: title.slice(0, 45),
        preview: preview ? `${preview}…` : 'Conversation…',
        date: new Date().toISOString(),
        messages: messages,
      };

      let nextList: SavedSession[];
      if (idx >= 0) {
        nextList = [...prev];
        nextList[idx] = updated;
      } else {
        nextList = [updated, ...prev];
      }
      saveLocalSessions(nextList);
      return nextList;
    });
  }, [messages, session.session_id]);

  // Handle send message
  const handleSend = useCallback(
    async (query: string) => {
      if (!query.trim() || loading) return;

      const userMsg: ChatMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        turn_type: messages.length === 0 ? 'establishing' : 'followup',
        query,
        text_en: query,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      setError(null);

      try {
        const payload: Record<string, any> = {
          query,
          session_id: session.session_id,
          language: session.language,
          domain_filter: session.domainFilter,
          user_id: user?.id || null,
        };

        if (session.sessionLocation?.latitude) {
          payload.latitude = session.sessionLocation.latitude;
          payload.longitude = session.sessionLocation.longitude;
          payload.location_name = session.sessionLocation.name;
        }

        const resp = await api.post('/api/chat', payload);

        setSession((s) => ({
          ...s,
          session_id: resp.session_id || s.session_id,
          sessionLocation: resp.resolved_location
            ? {
                name: resp.resolved_location,
                latitude: resp.weather_data?.location_info?.latitude ?? s.sessionLocation?.latitude,
                longitude: resp.weather_data?.location_info?.longitude ?? s.sessionLocation?.longitude,
                source: 'explicit',
              }
            : s.sessionLocation,
        }));

        const assistantMsg = apiResponseToMessage(resp, query);
        setMessages((prev) => [...prev, assistantMsg]);

        if (resp.warnings && resp.warnings.length > 0) {
          setActiveWarnings(resp.warnings);

          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            const firstWarn = resp.warnings[0];
            const title = `⚠️ Weather Alert: ${firstWarn.hazard_type || 'Severe Weather'}`;
            const body = `${firstWarn.severity?.toUpperCase() || 'WARNING'} in ${firstWarn.district || resp.resolved_location || 'your area'}: ${firstWarn.advisory_text || firstWarn.action_instructions || 'Check WeatherGPT for details.'}`;
            new Notification(title, {
              body,
              icon: 'https://cdn-icons-png.flaticon.com/512/1163/1163624.png',
            });
          }
        }
      } catch (err: any) {
        setError(err.message || 'Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [loading, session, user]
  );

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setSession((s) => ({ ...s, session_id: `sess_${Date.now()}` }));
    setShowHistory(false);
    setShowSatellite(false);
    setShowWarnings(false);
    setShowProfile(false);
    setShowLanguageModal(false);
    setIsMobileDrawerOpen(false);
  }, []);

  const handleSelectSession = useCallback(
    (sessId: string) => {
      const target = sessionsList.find((s) => s.id === sessId);
      if (target && target.messages) {
        setMessages(target.messages);
        setSession((s) => ({ ...s, session_id: target.id }));
      }
      setShowHistory(false);
    },
    [sessionsList]
  );

  const handleDeleteSession = useCallback((sessId: string) => {
    setSessionsList((prev) => {
      const next = prev.filter((s) => s.id !== sessId);
      saveLocalSessions(next);
      return next;
    });
  }, []);

  const handleClearAll = useCallback(() => {
    if (window.confirm('Clear all conversation history?')) {
      setSessionsList([]);
      saveLocalSessions([]);
      handleNewChat();
    }
  }, [handleNewChat]);

  // Language change — updates session and dynamically translates existing responses
  const handleLanguageChange = useCallback((lang: string) => {
    setSession((s) => ({ ...s, language: lang }));

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.role !== 'assistant') return msg;
        if (msg.variants && msg.variants[lang]) return msg;

        const sourceText = msg.response_text_english || msg.response_text;
        if (sourceText) {
          api
            .post('/api/translate', {
              text: sourceText,
              source_lang: 'en',
              target_lang: lang,
              follow_up_questions: msg.followup_chips_english,
            })
            .then((trans) => {
              if (trans && trans.translated_text) {
                setMessages((currentMsgs) =>
                  currentMsgs.map((m) => {
                    if (m.id === msg.id) {
                      return {
                        ...m,
                        variants: {
                          ...m.variants,
                          [lang]: trans.translated_text,
                        },
                        followup_chips_native: trans.translated_follow_ups?.length
                          ? trans.translated_follow_ups
                          : m.followup_chips_native,
                      };
                    }
                    return m;
                  })
                );
              }
            })
            .catch((err) => console.warn('Dynamic translation error:', err));
        }
        return msg;
      })
    );
  }, []);

  const handleDomainFilter = useCallback((filter: DomainModeId | string) => {
    setSwitchingMode(filter);
    setSession((s) => ({ ...s, domainFilter: filter }));
  }, []);

  if (showSplash) {
    return <SplashScreen onDone={() => setShowSplash(false)} mode="load" />;
  }

  return (
    <div style={appContainer}>
      {/* Mode Switch brief transition animation */}
      {switchingMode && (
        <SplashScreen
          onDone={() => setSwitchingMode(null)}
          mode="switch"
          targetDomain={switchingMode}
        />
      )}

      {/* Gemini-Style Left Navigation Rail */}
      <LeftRail
        onNewChat={handleNewChat}
        onToggleHistory={() => setShowHistory((v) => !v)}
        onOpenSatellite={() => setShowSatellite(true)}
        onOpenWarnings={() => setShowWarnings(true)}
        onOpenLanguage={() => setShowLanguageModal(true)}
        onOpenSettings={() => setShowProfile(true)}
        onProfileClick={() => setShowProfile((v) => !v)}
        user={user}
        language={session.language}
        hasWarnings={activeWarnings.length > 0}
        isHistoryOpen={showHistory}
        isMobileDrawerOpen={isMobileDrawerOpen}
        onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
      />

      {/* Main Content Area */}
      <div style={mainStage}>
        {/* Mobile Navigation Header (Only visible on screens <= 680px) */}
        <header className="mobileTopBar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0, flex: 1 }}>
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              aria-label="Open Navigation Menu"
              style={mobileMenuBtn}
            >
              <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>☰</span>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }} onClick={handleNewChat}>
              <img
                src="/megha_setu_phone.png"
                alt="MEGHA SETU"
                style={{ height: 26, width: 'auto', objectFit: 'contain' }}
              />
            </div>

            {/* Mode selector on top in phone view (above side, not in chat box) */}
            <div style={{ position: 'relative' }} ref={mobileModeMenuRef}>
              <button
                type="button"
                onClick={() => setShowMobileModeMenu((v) => !v)}
                style={mobileModePillBtn}
                aria-label="Switch Intelligence Mode"
                title="Switch mode: City, AgriSense, SkyOps, SeaCast, Climate X"
              >
                <span>{currentModeObj.icon}</span>
                <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-headline)', whiteSpace: 'nowrap' }}>
                  {currentModeObj.label}
                </span>
                <span style={{ fontSize: '0.62rem', opacity: 0.7 }}>▾</span>
              </button>

              {showMobileModeMenu && (
                <div style={mobileModeDropdownMenu} role="menu">
                  <div style={mobileDropdownHeader}>Intelligence Domain</div>
                  {DOMAIN_MODES.map((mode) => {
                    const isSel = session.domainFilter === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        style={{
                          ...mobileModeOptionBtn,
                          background: isSel ? 'var(--bg-glass-hover)' : 'transparent',
                        }}
                        onClick={() => {
                          handleDomainFilter(mode.id);
                          setShowMobileModeMenu(false);
                        }}
                      >
                        <span style={{ fontSize: '1.05rem', width: 22, textAlign: 'center' }}>{mode.icon}</span>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                          <span style={{ fontWeight: 600, fontSize: '0.82rem', color: isSel ? 'var(--accent-primary)' : 'var(--text-headline)' }}>
                            {mode.label}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                            {mode.desc}
                          </span>
                        </div>
                        {isSel && <span style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.85rem' }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
            <button
              type="button"
              onClick={handleNewChat}
              style={mobileHeaderActionBtn}
              title="New Chat"
              aria-label="New chat"
            >
              <span>＋</span>
            </button>
            <button
              type="button"
              onClick={() => setShowProfile(true)}
              style={mobileHeaderAvatarBtn}
              aria-label="Account"
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
              ) : (
                <span>{user?.name ? user.name.charAt(0).toUpperCase() : '👤'}</span>
              )}
            </button>
          </div>
        </header>

        {/* Chat History Slideout Drawer */}
        <HistorySidebar
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          sessions={sessionsList}
          currentSessionId={session.session_id}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onDeleteSession={handleDeleteSession}
          onClearAll={handleClearAll}
        />

        {/* Profile & Settings Menu */}
        {showProfile && (
          <ProfileMenu
            user={user}
            onClose={() => setShowProfile(false)}
            onSettingsChange={(changes) => {
              if (changes.history_opt_in !== undefined && user) {
                setUser((u) => (u ? { ...u, ...changes } : null));
              }
            }}
          />
        )}

        {/* 22 Official Indian Languages Modal */}
        {showLanguageModal && (
          <LanguageModal
            currentLanguage={session.language}
            onClose={() => setShowLanguageModal(false)}
            onSelectLanguage={handleLanguageChange}
          />
        )}

        {/* Live Disaster Warning Bulletin & Web Push Opt-In */}
        {showWarnings && (
          <DisasterWarningModal
            onClose={() => setShowWarnings(false)}
            warnings={activeWarnings}
            locationName={session.sessionLocation?.name}
            language={session.language}
          />
        )}

        {/* IMD Satellite & Doppler Radar Modal */}
        {showSatellite && (
          <SatelliteModal
            onClose={() => setShowSatellite(false)}
            activeMode={session.domainFilter}
          />
        )}

        {/* Emergency SOS Numbers Modal */}
        {showSos && (
          <SosModal
            onClose={() => setShowSos(false)}
            locationName={session.sessionLocation?.name}
            language={session.language}
          />
        )}

        {/* Chat Conversation & Centered Gemini Landing Screen */}
        <div
          style={{
            ...scrollArea,
            overflowY: messages.length === 0 ? 'hidden' : 'auto',
          }}
        >
          <ChatWindow
            messages={messages}
            language={session.language}
            loading={loading}
            onSend={handleSend}
            location={session.sessionLocation}
            domainFilter={session.domainFilter}
            heroInput={
              <ChatInput
                onSend={handleSend}
                loading={loading}
                language={session.language}
                domainFilter={session.domainFilter}
                onDomainChange={handleDomainFilter}
                onOpenSatellite={() => setShowSatellite(true)}
                isHero={true}
                onListeningChange={setIsListening}
              />
            }
            onNewChat={handleNewChat}
            onOpenSatellite={() => setShowSatellite(true)}
            user={user}
            isListening={isListening}
          />
        </div>

        {/* Error Bar */}
        {error && (
          <div style={errorBar} role="alert">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} style={dismissBtn}>
              ✕
            </button>
          </div>
        )}

        {/* Docked Chat Input (only shown when conversation is active) */}
        {messages.length > 0 && (
          <div style={inputWrapper}>
            <ChatInput
              onSend={handleSend}
              loading={loading}
              language={session.language}
              domainFilter={session.domainFilter}
              onDomainChange={handleDomainFilter}
              onOpenSatellite={() => setShowSatellite(true)}
              isHero={false}
            />
          </div>
        )}

        {/* Floating Circular Emergency SOS Button (Bottom Right) */}
        <button
          type="button"
          onClick={() => setShowSos(true)}
          style={floatingSosBtn}
          title="Emergency SOS & Helpline Numbers"
          aria-label="Emergency SOS"
        >
          <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>🚨</span>
          <span style={{ fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.06em' }}>SOS</span>
          <div style={pulseWave} />
        </button>
      </div>
    </div>
  );
}

// Layout Styles
const appContainer: React.CSSProperties = {
  display: 'flex',
  width: '100%',
  maxWidth: '100vw',
  height: '100dvh',
  overflow: 'hidden',
  overflowX: 'hidden',
  background: 'var(--bg-base)',
  position: 'relative',
  boxSizing: 'border-box',
};

const mainStage: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%',
  maxWidth: '100vw',
  minWidth: 0,
  overflow: 'hidden',
  overflowX: 'hidden',
  position: 'relative',
  boxSizing: 'border-box',
};

const scrollArea: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  overflowY: 'auto',
  overflowX: 'hidden',
  boxSizing: 'border-box',
};

const inputWrapper: React.CSSProperties = {
  flexShrink: 0,
  width: '100%',
  zIndex: 10,
};

const errorBar: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.5rem 1rem',
  background: 'color-mix(in srgb, var(--warning-red) 15%, var(--bg-surface))',
  borderTop: '1px solid var(--warning-red)',
  color: 'var(--warning-red)',
  fontSize: '0.85rem',
  flexShrink: 0,
};

const dismissBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--warning-red)',
  cursor: 'pointer',
  padding: '0.2rem 0.4rem',
  fontSize: '0.85rem',
};

const floatingWarningBtn: React.CSSProperties = {
  position: 'absolute',
  bottom: 92,
  right: 24,
  zIndex: 90,
  width: 58,
  height: 58,
  borderRadius: '50%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
  outline: 'none',
};

const warningPulseWave: React.CSSProperties = {
  position: 'absolute',
  inset: -6,
  borderRadius: '50%',
  border: '2px solid rgba(245, 158, 11, 0.55)',
  animation: 'pulse 1.8s infinite',
  pointerEvents: 'none',
};

const floatingSosBtn: React.CSSProperties = {
  position: 'absolute',
  bottom: 24,
  right: 24,
  zIndex: 90,
  width: 58,
  height: 58,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
  border: '2px solid rgba(255, 255, 255, 0.25)',
  boxShadow: '0 4px 20px rgba(239, 68, 68, 0.45)',
  color: '#fff',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
  outline: 'none',
};

const pulseWave: React.CSSProperties = {
  position: 'absolute',
  inset: -6,
  borderRadius: '50%',
  border: '2px solid rgba(239, 68, 68, 0.5)',
  animation: 'pulse 1.8s infinite',
  pointerEvents: 'none',
};

const mobileMenuBtn: React.CSSProperties = {
  background: 'var(--bg-glass)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  width: 38,
  height: 38,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: 'var(--text-primary)',
  position: 'relative',
};

const mobileWarningDot: React.CSSProperties = {
  position: 'absolute',
  top: 4,
  right: 4,
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: '#ef4444',
  boxShadow: '0 0 6px #ef4444',
};

const mobileHeaderActionBtn: React.CSSProperties = {
  background: 'var(--bg-glass)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  width: 36,
  height: 36,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: 'var(--text-primary)',
  fontSize: '1rem',
};

const mobileHeaderAvatarBtn: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: '50%',
  border: '1px solid var(--border-subtle)',
  background: 'var(--bg-glass)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  overflow: 'hidden',
  padding: 0,
  flexShrink: 0,
};

const mobileModePillBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.3rem',
  padding: '0.28rem 0.6rem',
  background: 'var(--bg-glass)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-pill)',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  outline: 'none',
};

const mobileModeDropdownMenu: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 8px)',
  left: 0,
  width: 255,
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-card)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: '0 16px 40px rgba(0, 0, 0, 0.55)',
  padding: '0.35rem',
  zIndex: 350,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.15rem',
};

const mobileDropdownHeader: React.CSSProperties = {
  padding: '0.35rem 0.55rem 0.2rem',
  fontSize: '0.66rem',
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const mobileModeOptionBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  padding: '0.5rem 0.6rem',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  textAlign: 'left',
  width: '100%',
  color: 'var(--text-primary)',
  boxSizing: 'border-box',
};
