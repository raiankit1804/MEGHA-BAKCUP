'use client';

/**
 * ChatWindow — renders conversation messages and modern landing page.
 * Features:
 * - Establishing turn: WeatherCard + Gemini-style formatted advisory + chips
 * - Markdown rendering: bullet points, bold headers, clean lists
 * - Voice output: Listen (TTS) / Stop button with SpeechSynthesis & backend fallback
 * - Landing page: Interactive prompt cards, detected location quick-search, domain tags
 */
import React, { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import WeatherCard from './WeatherCard';
import { getTranslation } from '../i18n/translations';
import styles from './ChatWindow.module.css';
import { ChatMessage, DomainModeId, SessionLocation, UserProfile } from '../types/chat';
import { useTheme } from '../theme/ThemeProvider';
import FuturisticOrb from './FuturisticOrb';

marked.setOptions({ breaks: true, gfm: true });

export interface ChatWindowProps {
  messages?: ChatMessage[];
  language?: string;
  loading?: boolean;
  onSend?: (query: string) => void;
  location?: SessionLocation | null;
  domainFilter?: DomainModeId | string;
  heroInput?: React.ReactNode;
  onNewChat?: () => void;
  onOpenSatellite?: (mode?: string) => void;
  user?: UserProfile | null;
  isListening?: boolean;
}

export default function ChatWindow({
  messages = [],
  language = 'en',
  loading = false,
  onSend,
  location,
  domainFilter = 'normal',
  heroInput,
  onNewChat,
  onOpenSatellite,
  user,
  isListening = false,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <div className={styles.window} aria-live="polite" aria-label="Conversation">
      {messages.length === 0 && !loading && (
        <EmptyState
          onSend={onSend}
          location={location}
          domainFilter={domainFilter}
          language={language}
          heroInput={heroInput}
          onNewChat={onNewChat}
          user={user}
          isListening={isListening}
        />
      )}
      {messages.map((msg) => (
        <MessageGroup
          key={msg.id || msg.timestamp}
          msg={msg}
          language={language}
          onSend={onSend}
          onOpenSatellite={onOpenSatellite}
        />
      ))}
      {loading && <LoadingBubble />}
      <div ref={bottomRef} />
    </div>
  );
}

interface MessageGroupProps {
  msg: ChatMessage;
  language: string;
  onSend?: (query: string) => void;
  onOpenSatellite?: (mode?: string) => void;
}

function MessageGroup({ msg, language, onSend, onOpenSatellite }: MessageGroupProps) {
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (msg.role === 'user') {
    return (
      <div className={`${styles.row} ${styles.rowUser}`}>
        <div className={`${styles.bubble} ${styles.bubbleUser}`}>
          {msg.text_en || msg.query}
        </div>
      </div>
    );
  }

  // Assistant message
  const text = getVariant(msg, language);

  // Stop speech if unmounted
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleListen = (rawText: string, langCode: string) => {
    if (typeof window === 'undefined') return;

    if (speaking) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setSpeaking(false);
      return;
    }

    if (!rawText) return;

    // 1. Clean emojis and markdown artifacts
    let clean = rawText
      .replace(
        /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2B50}\u{200D}\u{FE0F}]/gu,
        ''
      )
      .replace(/https?:\/\/\S+/g, '')
      .replace(/===ENGLISH_VERSION===[\s\S]*/g, '')
      .replace(/Data source:.*$/im, '')
      .replace(/Sources:.*$/im, '')
      .replace(/[*#_`~>|]/g, ' ')
      .replace(/^[•\-\*]\s*/gm, '')
      .replace(/\n[•\-\*]\s*/g, '. ');

    // 2. Weather units to natural spoken language
    const isIndic = /[\u0900-\u0D7F]/.test(clean);
    if (isIndic) {
      clean = clean
        .replace(/°\s*C\b/g, ' डिग्री सेल्सियस')
        .replace(/\bkm\/h\b/gi, ' किलोमीटर प्रति घंटा')
        .replace(/%\b/g, ' प्रतिशत')
        .replace(/\bmm\b/gi, ' मिलीमीटर')
        .replace(/\bhPa\b/gi, ' हेक्टोपास्कल');
    } else {
      clean = clean
        .replace(/°\s*C\b/g, ' degrees Celsius')
        .replace(/\bkm\/h\b/gi, ' kilometers per hour')
        .replace(/%\b/g, ' percent')
        .replace(/\bmm\b/gi, ' millimeters')
        .replace(/\bhPa\b/gi, ' hectopascals');
    }

    clean = clean.replace(/\n+/g, '. ').replace(/\s+/g, ' ').trim();
    if (!clean) return;

    // 3. Check for native browser voice with target language
    const langMap: Record<string, string> = {
      hi: 'hi-IN', bn: 'bn-IN', ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN',
      mr: 'mr-IN', gu: 'gu-IN', ml: 'ml-IN', pa: 'pa-IN', ur: 'ur-IN',
      or: 'or-IN', as: 'as-IN', en: 'en-IN',
    };
    const targetTag = langMap[langCode] || (langCode.length === 2 ? `${langCode}-IN` : langCode);

    let matchVoice: SpeechSynthesisVoice | null = null;
    if ('speechSynthesis' in window) {
      const voices = window.speechSynthesis.getVoices();
      matchVoice =
        voices.find(
          (v) =>
            v.lang.toLowerCase().startsWith(langCode.toLowerCase()) ||
            v.lang.toLowerCase() === targetTag.toLowerCase()
        ) || null;
    }

    if (
      matchVoice &&
      (langCode === 'en' || matchVoice.lang.toLowerCase().startsWith(langCode.toLowerCase()))
    ) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = targetTag;
      utterance.voice = matchVoice;
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } else {
      setSpeaking(true);
      fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean.slice(0, 500), language: langCode }),
      })
        .then((res) => {
          if (!res.ok) throw new Error('TTS server error');
          return res.blob();
        })
        .then((blob) => {
          if (audioRef.current) {
            audioRef.current.pause();
          }
          const audio = new Audio(URL.createObjectURL(blob));
          audioRef.current = audio;
          audio.onplay = () => setSpeaking(true);
          audio.onended = () => {
            setSpeaking(false);
            audioRef.current = null;
          };
          audio.onerror = () => {
            setSpeaking(false);
            audioRef.current = null;
          };
          audio.play().catch(() => setSpeaking(false));
        })
        .catch(() => {
          setSpeaking(false);
        });
    }
  };

  // Clean up any residual bracketed warning tags and awkward raw inline provenance lines
  const sanitizedText = (text || '')
    .replace(/\[(YELLOW|ORANGE|RED|GREEN|WATCH|WARNING|ALERT)\]\s*/gi, '')
    .replace(/(?:\n\s*)?\*?Data source:.*$/gim, '')
    .replace(/(?:\n\s*)?\*?Sources?:.*$/gim, '')
    .trim();
  const parsedHtml = (marked.parse(sanitizedText) as string) || '';

  return (
    <div className={`${styles.row} ${styles.rowAssistant}`}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', width: '100%' }}>
        <div className={styles.avatar} aria-hidden="true">
          🌦️
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Establishing turn: full interactive weather card */}
          {msg.turn_type === 'establishing' && msg.weather_data && (
            <div style={{ marginBottom: '0.75rem' }}>
              <WeatherCard
                weather={msg.weather_data}
                warnings={msg.warnings}
                risks={msg.risks}
                location={msg.resolved_location || 'India'}
                language={language}
                dataFreshness={msg.data_freshness}
                modelAgreement={msg.model_agreement}
                sources={msg.sources}
                requiresChart={msg.requires_chart}
                onOpenSatellite={onOpenSatellite}
              />
            </div>
          )}

          {/* Formatted advisory bubble */}
          <div className={`${styles.bubble} ${styles.bubbleAssistant}`}>
            <div
              className={styles.advisoryText}
              dangerouslySetInnerHTML={{ __html: parsedHtml }}
            />

            <div className={styles.metaRow}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <span className={styles.domain}>
                  {domainEmoji(msg.domain_filter)} {msg.domain_filter || 'normal'}
                </span>
                <span className={styles.sourceTag}>
                  📡 IMD • Open-Meteo
                </span>
              </div>

              {/* Voice playback button */}
              <button
                type="button"
                className={`${styles.listenBtn} ${speaking ? styles.listenBtnPlaying : ''}`}
                onClick={() => handleListen(text, language)}
                aria-label={speaking ? 'Stop listening' : 'Listen to response'}
                title={speaking ? 'Stop listening' : 'Listen to response'}
              >
                {speaking ? (
                  <>
                    <span>⏹</span>
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <span>🔊</span>
                    <span>Listen</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Follow-up question chips */}
          {(Boolean(msg.followup_chips_english?.length) || Boolean(msg.followup_chips_native?.length)) && (
            <FollowupChips
              native={msg.followup_chips_native}
              english={msg.followup_chips_english}
              language={language}
              onChipClick={onSend}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface FollowupChipsProps {
  native?: string[];
  english?: string[];
  language: string;
  onChipClick?: (query: string) => void;
}

function cleanFollowupChip(raw: string): string {
  if (!raw) return '';
  let text = raw.trim();
  // Strip introductory translation chatter
  text = text.replace(/^(?:Here is the translation[^\n:]*[:\n]+|Here's the translation[^\n:]*[:\n]+|Sure,[^\n:]*[:\n]+|Certainly,[^\n:]*[:\n]+)/i, '').trim();
  // Strip bold/italic markdown
  text = text.replace(/[*_#`~[\]]/g, '').trim();
  // If it contains a question mark, take up to the first question mark
  const qIndex = text.indexOf('?');
  if (qIndex !== -1 && qIndex < 80) {
    text = text.slice(0, qIndex + 1).trim();
  } else if (text.length > 70) {
    text = text.slice(0, 65).trim() + '...';
  }
  return text;
}

function FollowupChips({ native, english, language, onChipClick }: FollowupChipsProps) {
  const rawChips = language !== 'en' ? (native?.length ? native : english) : english;
  const cleanedChips = (rawChips || [])
    .map(cleanFollowupChip)
    .filter((c) => Boolean(c) && !c.toLowerCase().includes('here is the translation'));

  if (!cleanedChips.length) return null;

  return (
    <div className={styles.chips}>
      {cleanedChips.slice(0, 3).map((chip, i) => (
        <button
          key={i}
          className={styles.chip}
          onClick={() => onChipClick?.(chip)}
          aria-label={`Follow-up question: ${chip}`}
          title={chip}
        >
          {chip}
        </button>
      ))}
    </div>
  );
}

function LoadingBubble() {
  return (
    <div className={`${styles.row} ${styles.rowAssistant}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div className={styles.avatar} aria-hidden="true">
          🌦️
        </div>
        <div
          className={`${styles.bubble} ${styles.bubbleAssistant}`}
          style={{ padding: '0.75rem 1rem', display: 'flex', gap: 6 }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--accent-primary)',
                display: 'inline-block',
                animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  onSend?: (query: string) => void;
  location?: SessionLocation | null;
  domainFilter?: DomainModeId | string;
  language: string;
  heroInput?: React.ReactNode;
  onNewChat?: () => void;
  user?: UserProfile | null;
  isListening?: boolean;
}

function EmptyState({ onSend, location, domainFilter, language, heroInput, onNewChat, user, isListening = false }: EmptyStateProps) {
  const { interfaceStyle, colorScheme, setColorScheme } = useTheme();
  const locName = location?.name && location.name !== 'Select location' ? location.name : null;
  const userName = user?.name ? user.name.split(' ')[0] : 'Raf';

  // ─── STRICT MODERN MODE: Futuristic Interactive UI matching screenshot ───
  if (interfaceStyle === 'modern') {
    return (
      <div className={styles.futuristicContainer}>
        {/* 1. Interactive Green 3D Fluid Object (Floating Orb) */}
        <FuturisticOrb isListening={isListening} />

        {/* 2. Futuristic Greeting */}
        <div className={styles.futuristicGreeting}>
          <div className={styles.greetingHey}>Hey! {userName}</div>
          <div className={styles.greetingHelp}>What can I help with?</div>
        </div>

        {/* 3. Three Recommendation Cards with colored pill badges */}
        <div className={styles.futuristicCardsRow}>
          <button
            type="button"
            className={styles.futuristicCard}
            onClick={() => onSend?.(locName ? `AgriSense farm weather and crop health advisory for ${locName}` : "What are the crop sowing and irrigation advisories?")}
            title="Help with crop health & sowing advisory"
          >
            <span className={styles.cardBadgeCyan}>Content Help</span>
            <span className={styles.futuristicCardSubtitle}>Help with crop health & sowing advisory</span>
          </button>

          <button
            type="button"
            className={styles.futuristicCard}
            onClick={() => onSend?.(locName ? `Live Doppler radar, storm probability and IMD warnings for ${locName}` : "Show live IMD warnings and rain radar")}
            title="Track storm probability & radar ideas"
          >
            <span className={styles.cardBadgeSalmon}>Suggestions</span>
            <span className={styles.futuristicCardSubtitle}>Track storm probability & radar ideas</span>
          </button>

          <button
            type="button"
            className={styles.futuristicCard}
            onClick={() => onSend?.(locName ? `Waterlogged roads and inundated underpasses near ${locName}` : "What roads and underpasses are waterlogged?")}
            title="Help avoid flooded underpasses & commute delays"
          >
            <span className={styles.cardBadgeMint}>Job Application</span>
            <span className={styles.futuristicCardSubtitle}>Help avoid flooded underpasses & commute delay</span>
          </button>
        </div>

        {/* 4. Futuristic Sleek Chat Input */}
        {heroInput && (
          <div className={styles.futuristicInputWrapper}>
            {heroInput}
          </div>
        )}

        {/* 5. Detected Location Pill */}
        {locName && (
          <div className={styles.locationPill} style={{ marginTop: '1.25rem' }}>
            <span className={styles.locDot}>📍</span>
            <span>{getTranslation(language, 'detectedLocation', 'Detected Location')}: <strong>{locName}</strong></span>
            <button
              type="button"
              className={styles.locCheckBtn}
              onClick={() => onSend?.(`What is the current live weather in ${locName}?`)}
            >
              {getTranslation(language, 'checkWeather', 'Check Live Weather')}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── CLASSICAL MINIMAL LANDING (when interfaceStyle !== 'modern') ─────────
  const rawPrompts = getTranslation(language, 'quickPrompts') || [
    "What's the rain forecast and temperature today?",
    "3-day weather outlook and storm probability",
    "What is the current Air Quality Index (AQI) and PM2.5?",
  ];
  const localizedQuestions: string[] = rawPrompts.slice(0, 3);

  const greeting = getTranslation(language, 'heroGreeting', 'Where should we start?');

  return (
    <div className={styles.geminiLanding}>
      {/* Atmospheric Gemini Glow Backdrop */}
      <div className={styles.geminiHeroGlow} aria-hidden="true" />

      <h1 className={styles.geminiTitle}>
        {greeting}
      </h1>

      {locName && (
        <div className={styles.locationPill}>
          <span className={styles.locDot}>📍</span>
          <span>{getTranslation(language, 'detectedLocation', 'Detected Location')}: <strong>{locName}</strong></span>
          <button
            type="button"
            className={styles.locCheckBtn}
            onClick={() => onSend?.(locName ? `What is the weather in ${locName}?` : localizedQuestions[0])}
          >
            {getTranslation(language, 'checkWeather', 'Check Live Weather')}
          </button>
        </div>
      )}

      {/* Center Input Holder */}
      {heroInput && (
        <div className={styles.centerInputHolder}>
          {heroInput}
        </div>
      )}

      {/* Clean vertical list with ↳ icon matching the Gemini screenshot */}
      <div className={styles.geminiQuestionsList}>
        {localizedQuestions.map((questionText, idx) => (
          <button
            key={idx}
            type="button"
            className={styles.geminiQuestionItem}
            onClick={() => {
              const fullQuery = locName ? `${questionText} in ${locName}` : questionText;
              onSend?.(fullQuery);
            }}
          >
            <span className={styles.returnArrow}>↳</span>
            <span className={styles.questionText}>{questionText}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function getVariant(msg: ChatMessage, language: string): string {
  if (!msg.variants) return msg.response_text_english || msg.text_en || '';
  return msg.variants[language] || msg.variants['en'] || msg.response_text || '';
}

function domainEmoji(domain?: string): string {
  const map: Record<string, string> = {
    normal: '🏙️',
    agriculture: '🌾',
    aviation: '✈️',
    marine: '⚓',
    research: '📊',
  };
  return (domain ? map[domain] : '') || '🌐';
}
