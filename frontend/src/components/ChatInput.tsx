'use client';

import React, { useState, useRef, useEffect, ChangeEvent, KeyboardEvent } from 'react';
import { getTranslation, getModernLandingStrings } from '../i18n/translations';
import styles from './ChatInput.module.css';
import { DomainMode, DomainModeId } from '../types/chat';
import { useTheme } from '../theme/ThemeProvider';

const DOMAIN_MODES: DomainMode[] = [
  { id: 'normal', icon: '🏙️', nameKey: 'modes.normal', label: 'City', desc: 'Urban weather, daily commutes & rain updates' },
  { id: 'agriculture', icon: '🌾', nameKey: 'modes.agriculture', label: 'AgriSense', desc: 'Crop advisory, irrigation & spraying guidance' },
  { id: 'aviation', icon: '✈️', nameKey: 'modes.aviation', label: 'SkyOps', desc: 'Visibility, cloud base, wind shear & METAR briefing' },
  { id: 'marine', icon: '⚓', nameKey: 'modes.marine', label: 'SeaCast', desc: 'Coastal winds, wave heights & sea-state outlook' },
  { id: 'research', icon: '📊', nameKey: 'modes.research', label: 'Climate X', desc: 'Historical anomalies, baseline trends & climate analysis' },
];

function getBcp47Lang(code: string): string {
  const map: Record<string, string> = {
    hi: 'hi-IN',
    bn: 'bn-IN',
    te: 'te-IN',
    mr: 'mr-IN',
    ta: 'ta-IN',
    ur: 'ur-IN',
    gu: 'gu-IN',
    kn: 'kn-IN',
    ml: 'ml-IN',
    or: 'or-IN',
    pa: 'pa-IN',
    as: 'as-IN',
    en: 'en-IN',
  };
  return map[code] || 'en-IN';
}

export interface ChatInputProps {
  onSend: (query: string) => void;
  loading: boolean;
  language?: string;
  domainFilter?: DomainModeId | string;
  onDomainChange?: (domain: DomainModeId | string) => void;
  onOpenSatellite?: () => void;
  isHero?: boolean;
  onListeningChange?: (listening: boolean) => void;
}

export default function ChatInput({
  onSend,
  loading,
  language = 'en',
  domainFilter = 'normal',
  onDomainChange,
  onOpenSatellite,
  isHero = false,
  onListeningChange,
}: ChatInputProps) {
  const [query, setQuery] = useState('');
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    onListeningChange?.(recording);
  }, [recording, onListeningChange]);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [modeGlow, setModeGlow] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const modeMenuRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const activeMode = DOMAIN_MODES.find((m) => m.id === domainFilter) || DOMAIN_MODES[0];
  const activeModeName = language === 'en' ? activeMode.label : (getTranslation(language, activeMode.nameKey) || activeMode.label);
  const placeholder = getTranslation(language, 'inputPlaceholder', 'Ask WeatherGPT…');

  // Close mode menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modeMenuRef.current && !modeMenuRef.current.contains(e.target as Node)) {
        setShowModeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleModeSelect = (id: DomainModeId) => {
    onDomainChange?.(id);
    setShowModeMenu(false);
    setModeGlow(true);
    setTimeout(() => setModeGlow(false), 1200);
  };

  const handleSend = () => {
    const q = query.trim();
    if (!q || loading) return;
    onSend(q);
    setQuery('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  // Robust Native Web Speech Recognition with Audio Fallback
  const handleVoice = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (recording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setRecording(false);
      return;
    }

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = getBcp47Lang(language);

        recognition.onstart = () => {
          setRecording(true);
        };

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          const currentText = finalTranscript || interimTranscript;
          if (currentText) {
            setQuery(currentText);
            if (textareaRef.current) {
              textareaRef.current.style.height = 'auto';
              textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
            }
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setRecording(false);
          if (event.error === 'not-allowed') {
            alert('Microphone permission was denied. Please allow microphone access in your browser settings.');
          } else {
            fallbackMediaRecorder();
          }
        };

        recognition.onend = () => {
          setRecording(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
        return;
      } catch (err) {
        console.warn('Native speech recognition failed, trying MediaRecorder:', err);
      }
    }

    fallbackMediaRecorder();
  };

  const fallbackMediaRecorder = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('Microphone is not supported in this browser environment.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });

        try {
          const res = await fetch(`/api/transcribe?language=${encodeURIComponent(language)}`, {
            method: 'POST',
            body: blob,
            headers: { 'Content-Type': 'audio/webm' },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.text) {
              setQuery(data.text);
              textareaRef.current?.focus();
            }
          }
        } catch (e) {
          console.warn('Server transcription error:', e);
        }
        setRecording(false);
      };

      recorder.start();
      setRecording(true);
      // Automatically stop after 7 seconds max
      setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, 7000);
    } catch (err) {
      console.warn('Could not access microphone:', err);
      setRecording(false);
      alert('Please grant microphone permission to use voice input.');
    }
  };

  const { interfaceStyle } = useTheme();
  const isModernHero = isHero && interfaceStyle === 'modern';
  const isAeroMarine = domainFilter === 'aviation' || domainFilter === 'marine';

  // ─── STRICT MODERN HERO CARD: Matches user's futuristic screenshot ────────
  if (isModernHero) {
    const modernT = getModernLandingStrings(language);

    return (
      <div className={`${styles.wrapper} ${styles.wrapperHero}`}>
        <div className={`${styles.modernHeroCard} ${modeGlow ? styles.containerGlow : ''}`}>
          {/* Top Sparkle Icon */}
          <div className={styles.modernHeroSparkle} aria-hidden="true">
            <SparkleIcon />
          </div>

          {/* Clean multiline textarea */}
          <textarea
            ref={textareaRef}
            value={query}
            onChange={handleInput}
            onKeyDown={handleKey}
            placeholder={modernT.inputPlaceholder}
            className={styles.modernHeroTextarea}
            rows={2}
            disabled={loading}
            aria-label={modernT.inputPlaceholder}
            id="chat-input"
          />

          {/* Bottom Controls Row: Attach file, Mode pill, Mic on left; Upward arrow on right */}
          <div className={styles.modernHeroBottom}>
            <div className={styles.modernHeroLeft}>
              {/* Attach File Button */}
              <button
                type="button"
                className={styles.modernAttachBtn}
                onClick={onOpenSatellite || (() => textareaRef.current?.focus())}
                title={modernT.attachFile}
                aria-label={modernT.attachFile}
              >
                <PaperclipIcon />
                <span>{modernT.attachFile}</span>
              </button>

              {/* Mode Picker Pill */}
              <div className={styles.modeWrapper} ref={modeMenuRef}>
                <button
                  type="button"
                  className={`${styles.modePill} ${modeGlow ? styles.modePillAnimated : ''}`}
                  onClick={() => setShowModeMenu((v) => !v)}
                  aria-label="Change intelligence domain mode"
                  title="Switch intelligence mode"
                >
                  <span className={styles.modeIcon}>{activeMode.icon}</span>
                  <span className={styles.modeName}>{activeModeName}</span>
                  <span className={styles.modeChevron}>▾</span>
                </button>

                {/* Mode Dropdown Menu */}
                {showModeMenu && (
                  <div className={`${styles.modeDropdown} ${styles.modeDropdownDown}`} role="menu">
                    <div className={styles.dropdownHeader}>Select Domain Mode</div>
                    {DOMAIN_MODES.map((mode) => {
                      const isSelected = domainFilter === mode.id;
                      const localizedName = language === 'en' ? mode.label : (getTranslation(language, mode.nameKey) || mode.label);

                      return (
                        <button
                          key={mode.id}
                          type="button"
                          className={`${styles.modeOption} ${isSelected ? styles.modeOptionActive : ''}`}
                          onClick={() => handleModeSelect(mode.id)}
                          role="menuitem"
                        >
                          <span className={styles.optIcon}>{mode.icon}</span>
                          <div className={styles.optInfo}>
                            <span className={styles.optName}>{localizedName}</span>
                            <span className={styles.optDesc}>{mode.desc}</span>
                          </div>
                          {isSelected && <span className={styles.optCheck}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Satellite shortcut in Aviation/Marine mode */}
              {isAeroMarine && (
                <button
                  type="button"
                  className={styles.satShortcutBtn}
                  onClick={onOpenSatellite}
                  title="Open Live IMD Satellite & Radar"
                >
                  <span>🛰️</span>
                  <span>Satellite</span>
                </button>
              )}

              {/* Voice Microphone */}
              <button
                type="button"
                className={`${styles.actionBtn} ${recording ? styles.actionBtnActive : ''}`}
                onClick={handleVoice}
                aria-label={recording ? 'Stop listening' : 'Start voice input'}
                title={recording ? 'Listening… click to stop' : 'Voice Input (all languages)'}
              >
                <MicIcon />
                {recording && <span className={styles.pulseDot} />}
              </button>
            </div>

            {/* Bright Cyan/Teal Send Button with Upward Arrow ↑ (Exact match to screenshot!) */}
            <button
              type="button"
              className={styles.modernHeroSendBtn}
              onClick={handleSend}
              disabled={loading || !query.trim()}
              aria-label="Send message"
              title="Send"
            >
              {loading ? (
                <SpinnerIcon />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── CLASSIC / DOCKED CHAT INPUT ──────────────────────────────────────────
  return (
    <div className={`${styles.wrapper} ${isHero ? styles.wrapperHero : ''}`}>
      <div className={`${styles.inputContainer} ${isHero ? styles.inputContainerHero : ''} ${modeGlow ? styles.containerGlow : ''}`}>
        {/* Top input row */}
        <div className={styles.topRow}>
          {/* Gemini '+' action icon */}
          <button
            type="button"
            className={styles.plusBtn}
            onClick={() => textareaRef.current?.focus()}
            title="Options & Tools"
            aria-label="Add options"
          >
            <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>+</span>
          </button>

          {/* Auto-expanding textarea */}
          <textarea
            ref={textareaRef}
            value={query}
            onChange={handleInput}
            onKeyDown={handleKey}
            placeholder={placeholder}
            className={styles.textarea}
            rows={1}
            disabled={loading}
            aria-label="Type your weather question"
            id="chat-input"
          />

          {/* Right controls: Mode selector pill & Microphone */}
          <div className={styles.rightControls}>
            {/* Mode Picker Pill */}
            <div className={styles.modeWrapper} ref={modeMenuRef}>
              <button
                type="button"
                className={`${styles.modePill} ${modeGlow ? styles.modePillAnimated : ''}`}
                onClick={() => setShowModeMenu((v) => !v)}
                aria-label="Change intelligence domain mode"
                title="Switch intelligence mode (City, Agriculture, Aviation, Marine, Research)"
              >
                <span className={styles.modeIcon}>{activeMode.icon}</span>
                <span className={styles.modeName}>{activeModeName}</span>
                <span className={styles.modeChevron}>▾</span>
              </button>

              {/* Satellite shortcut in Aviation/Marine mode */}
              {isAeroMarine && (
                <button
                  type="button"
                  className={styles.satShortcutBtn}
                  onClick={onOpenSatellite}
                  title="Open Live IMD Satellite & Radar"
                >
                  <span>🛰️</span>
                  <span>Satellite</span>
                </button>
              )}

              {/* Mode Dropdown Menu */}
              {showModeMenu && (
                <div className={`${styles.modeDropdown} ${isHero ? styles.modeDropdownDown : ''}`} role="menu">
                  <div className={styles.dropdownHeader}>Select Domain Mode</div>
                  {DOMAIN_MODES.map((mode) => {
                    const isSelected = domainFilter === mode.id;
                    const localizedName = mode.label || getTranslation(language, mode.nameKey, mode.id);

                    return (
                      <button
                        key={mode.id}
                        type="button"
                        className={`${styles.modeOption} ${isSelected ? styles.modeOptionActive : ''}`}
                        onClick={() => handleModeSelect(mode.id)}
                        role="menuitem"
                      >
                        <span className={styles.optIcon}>{mode.icon}</span>
                        <div className={styles.optInfo}>
                          <span className={styles.optName}>{localizedName}</span>
                          <span className={styles.optDesc}>{mode.desc}</span>
                        </div>
                        {isSelected && <span className={styles.optCheck}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Microphone Button */}
            <button
              type="button"
              className={`${styles.actionBtn} ${recording ? styles.actionBtnActive : ''}`}
              onClick={handleVoice}
              aria-label={recording ? 'Stop listening' : 'Start voice input'}
              title={recording ? 'Listening… click to stop' : 'Voice Input (all languages)'}
            >
              <MicIcon />
              {recording && <span className={styles.pulseDot} />}
            </button>

            {/* Send Button */}
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.sendBtn} ${query.trim() ? styles.sendBtnReady : ''}`}
              onClick={handleSend}
              disabled={loading || !query.trim()}
              aria-label="Send message"
              title="Send (Enter)"
            >
              {loading ? <SpinnerIcon /> : <SendIcon />}
            </button>
          </div>
        </div>
      </div>

      {!isHero && (
        <div className={styles.hintRow}>
          <span>Shift+Enter for new line</span>
          <span>22 Indian Languages • Live Meteorological Intelligence</span>
        </div>
      )}
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="20" x2="12" y2="24" />
      <line x1="8" y1="24" x2="16" y2="24" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }} aria-hidden="true">
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
  );
}

