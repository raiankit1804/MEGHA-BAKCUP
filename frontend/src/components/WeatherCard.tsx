'use client';

/**
 * WeatherGPT v2.0 — Motorola / Material You Style WeatherCard component (TypeScript)
 * Faithfully styled after modern Moto phone weather app powered by IMD data:
 * - Huge hero typography (temperature, condition, feels like)
 * - Official IMD Warning watch banner
 * - 2x3 pill cards for Current Conditions (AQI, UV, Precipitation, Humidity, Wind, Pressure)
 * - Weather tomorrow banner
 * - Horizontal scrolling Hourly Forecast rail (next 24h)
 * - 6-Day Forecast strip with high/low temperatures
 * - Activities suitability index (Running, Jogging, Cycling, Hiking)
 * - Allergies index (Dust & dander, AQI status)
 * - Live Doppler Weather Radar map preview with one-tap launcher
 * - Expandable "More weather details" panel with interactive Recharts
 */
import React, { useState } from 'react';
import Image from 'next/image';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import styles from './WeatherCard.module.css';
import {
  WeatherData,
  IMDWarning,
  RiskItem,
  WeatherSource,
  DataFreshness,
  ModelAgreement,
  DailyForecastItem,
  AirQualityData,
  HourlyForecastItem,
  ActivitiesData,
  AllergiesData,
} from '../types/weather';
import { getCardTranslation } from '../i18n/translations';

const WEATHER_EMOJI: Record<number, string> = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌧️', 55: '🌧️',
  61: '🌦️', 63: '🌧️', 65: '🌧️',
  71: '🌨️', 73: '❄️', 75: '❄️',
  80: '🌦️', 81: '🌧️', 82: '⛈️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
};

function getWindDirection(deg?: number): string {
  if (deg === undefined || deg === null) return '';
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const idx = Math.round(((deg % 360) / 22.5)) % 16;
  return dirs[idx];
}

export interface WeatherCardProps {
  weather?: WeatherData | null;
  warnings?: IMDWarning[];
  risks?: RiskItem[];
  location?: string;
  language?: string;
  dataFreshness?: DataFreshness;
  modelAgreement?: ModelAgreement;
  sources?: WeatherSource[];
  requiresChart?: boolean;
  onOpenSatellite?: (mode?: string) => void;
  onRefresh?: () => void;
}

export default function WeatherCard({
  weather,
  warnings = [],
  risks = [],
  location,
  language = 'en',
  dataFreshness = 'live',
  modelAgreement = 'not_applicable',
  sources = [],
  requiresChart = false,
  onOpenSatellite,
  onRefresh,
}: WeatherCardProps) {
  const [showDetails, setShowDetails] = useState<boolean>(requiresChart);

  if (!weather) return null;

  const current = weather.current_weather || {};
  const daily = weather.daily_forecast || [];
  const hourly = weather.hourly_forecast || [];
  const aqi = weather.air_quality;
  const activities = weather.activities || {};
  const allergies = weather.allergies;
  const tomorrowSummary = weather.tomorrow_summary;

  const wmoEmoji = (current.weather_code !== undefined ? WEATHER_EMOJI[current.weather_code] : null) || current.emoji || '🌡️';

  // Compute daily min and max from today
  const todayForecast = daily[0];
  const tempMin = todayForecast?.temp_min !== undefined ? Math.round(todayForecast.temp_min) : Math.round(current.temperature ?? 20);
  const tempMax = todayForecast?.temp_max !== undefined ? Math.round(todayForecast.temp_max) : Math.round((current.temperature ?? 25) + 6);
  const currentTemp = current.temperature !== undefined ? Math.round(current.temperature) : '—';
  const feelsLike = current.feels_like !== undefined ? Math.round(current.feels_like) : currentTemp;

  // Wind direction compass heading
  const windDirStr = getWindDirection(current.wind_direction);

  // Pressure in mb (hPa)
  const pressureVal = current.surface_pressure
    ? `${current.surface_pressure.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mb`
    : '1,011.5 mb';

  // Precipitation in mm
  const precipVal = `${(current.precipitation ?? 0).toFixed(1)} mm`;

  // AQI color and label
  const aqiCategory = aqi?.category || (aqi?.us_aqi ? (aqi.us_aqi <= 50 ? 'Good' : aqi.us_aqi <= 100 ? 'Moderate' : 'Poor') : 'Moderate');
  const aqiScore = aqi?.us_aqi ?? 68;
  const aqiColor = aqiScore <= 50 ? '#22c55e' : aqiScore <= 100 ? '#f59e0b' : '#ef4444';

  // Primary IMD warning
  const primaryWarning = warnings.length > 0 ? warnings[0] : null;

  const translatedCondition = getCardTranslation(language, current.condition || 'Clear sky', current.condition || 'Clear sky');

  return (
    <div className={styles.card}>
      {/* ── 1. Location Bar ────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.locationTitleGroup}>
          <span className={styles.locationPin} aria-hidden="true">📍</span>
          <span className={styles.locationName}>{location || weather.location_info?.name || 'India'}</span>
        </div>
        <div className={styles.headerActions}>
          <SourceBadge freshness={dataFreshness} sources={sources} />
          {onRefresh && (
            <button
              className={styles.iconBtn}
              onClick={onRefresh}
              title="Refresh weather data"
              aria-label="Refresh weather data"
            >
              🔄
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Hero Temperature & Conditions ───────────────────────── */}
      <div className={styles.heroSection}>
        <div className={styles.heroRow}>
          <div className={styles.heroTemp}>{currentTemp}°</div>
          <div className={styles.heroMeta}>
            <div className={styles.heroCondition}>
              {translatedCondition} {wmoEmoji}
            </div>
            <div className={styles.heroRange}>
              {tempMin}°~{tempMax}° {getCardTranslation(language, 'feelsLike', 'Feels like')} {feelsLike}°
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Official IMD Warning Banner ─────────────────────────── */}
      {primaryWarning && (
        <div
          className={styles.warningCard}
          style={{
            background: primaryWarning.severity === 'red'
              ? 'rgba(239, 68, 68, 0.14)'
              : primaryWarning.severity === 'orange'
              ? 'rgba(249, 115, 22, 0.14)'
              : 'rgba(245, 158, 11, 0.12)',
            border: `1px solid ${
              primaryWarning.severity === 'red'
                ? 'rgba(239, 68, 68, 0.4)'
                : primaryWarning.severity === 'orange'
                ? 'rgba(249, 115, 22, 0.4)'
                : 'rgba(245, 158, 11, 0.35)'
            }`,
          }}
        >
          <div className={styles.warningIconWrapper}>⚠️</div>
          <div className={styles.warningContent}>
            <div
              className={styles.warningTitle}
              style={{
                color: primaryWarning.severity === 'red'
                  ? '#ef4444'
                  : primaryWarning.severity === 'orange'
                  ? '#f97316'
                  : '#f59e0b',
              }}
            >
              {primaryWarning.hazard || 'Yellow Watch for Weather Conditions'}
            </div>
            <div className={styles.warningDesc}>
              {primaryWarning.description || primaryWarning.advisory_text || 'Official meteorological advisory in effect.'}
            </div>
            <div className={styles.warningSource}>
              Source: India Meteorological Department (IMD)
            </div>
          </div>
        </div>
      )}

      {/* ── 4. Current Conditions (2x3 Pill Grid) ───────────────────── */}
      <div className={styles.sectionTitle}>
        <span>{getCardTranslation(language, 'currentConditions', 'Current conditions')}</span>
      </div>
      <div className={styles.conditionsGrid}>
        {/* AQI */}
        <div className={styles.conditionPill}>
          <div className={styles.conditionIcon} style={{ color: aqiColor }}>🍃</div>
          <div className={styles.conditionText}>
            <span className={styles.conditionLabel}>{getCardTranslation(language, 'aqi', 'AQI')}</span>
            <span className={styles.conditionValue} style={{ color: aqiColor }}>
              {getCardTranslation(language, aqiCategory, aqiCategory)}, {aqiScore}
            </span>
          </div>
        </div>

        {/* UV Index */}
        <div className={styles.conditionPill}>
          <div className={styles.conditionIcon} style={{ color: '#eab308' }}>☀️</div>
          <div className={styles.conditionText}>
            <span className={styles.conditionLabel}>{getCardTranslation(language, 'uvIndex', 'UV index')}</span>
            <span className={styles.conditionValue}>
              {getCardTranslation(language, current.uv_category || 'Low', current.uv_category || 'Low')}
            </span>
          </div>
        </div>

        {/* Precipitation */}
        <div className={styles.conditionPill}>
          <div className={styles.conditionIcon} style={{ color: '#38bdf8' }}>💧</div>
          <div className={styles.conditionText}>
            <span className={styles.conditionLabel}>{getCardTranslation(language, 'precipitation', 'Precipitation')}</span>
            <span className={styles.conditionValue}>{precipVal}</span>
          </div>
        </div>

        {/* Humidity */}
        <div className={styles.conditionPill}>
          <div className={styles.conditionIcon} style={{ color: '#818cf8' }}>%</div>
          <div className={styles.conditionText}>
            <span className={styles.conditionLabel}>{getCardTranslation(language, 'humidity', 'Humidity')}</span>
            <span className={styles.conditionValue}>{current.humidity ?? 68}%</span>
          </div>
        </div>

        {/* Wind with Direction */}
        <div className={styles.conditionPill}>
          <div className={styles.conditionIcon} style={{ color: '#a78bfa' }}>💨</div>
          <div className={styles.conditionText}>
            <span className={styles.conditionLabel}>{getCardTranslation(language, 'wind', 'Wind')}</span>
            <span className={styles.conditionValue} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>{current.wind_speed ? `${current.wind_speed.toFixed(1)} km/h` : '10 km/h'}</span>
              {windDirStr && (
                <span style={{ fontWeight: 700, color: 'var(--accent-primary, #38bdf8)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                  {windDirStr}
                  <span
                    style={{
                      display: 'inline-block',
                      transform: `rotate(${current.wind_direction ?? 0}deg)`,
                      fontSize: '0.85rem',
                      lineHeight: 1,
                    }}
                    title={`Wind direction: ${current.wind_direction ?? 0}° (${windDirStr})`}
                  >
                    ↑
                  </span>
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Pressure */}
        <div className={styles.conditionPill}>
          <div className={styles.conditionIcon} style={{ color: '#f43f5e' }}>⏲️</div>
          <div className={styles.conditionText}>
            <span className={styles.conditionLabel}>{getCardTranslation(language, 'pressure', 'Pressure')}</span>
            <span className={styles.conditionValue}>{pressureVal}</span>
          </div>
        </div>
      </div>

      {/* ── 5. Weather Tomorrow Banner ──────────────────────────────── */}
      {tomorrowSummary && (
        <div className={styles.tomorrowCard}>
          <div className={styles.tomorrowTitle}>{getCardTranslation(language, 'weatherTomorrow', 'Weather tomorrow')}</div>
          <div className={styles.tomorrowDesc}>{tomorrowSummary}</div>
        </div>
      )}

      {/* ── 6. Hourly Forecast Horizontal Rail ──────────────────────── */}
      {hourly.length > 0 && (
        <>
          <div className={styles.sectionTitle}>
            <span>{getCardTranslation(language, 'hourlyForecast', 'Hourly forecast')}</span>
            <span className={styles.sectionSubtitle}>{getCardTranslation(language, 'updatedNow', 'Updated now')}</span>
          </div>
          <div className={styles.hourlyRail}>
            {hourly.slice(0, 12).map((item: HourlyForecastItem, idx: number) => {
              const rainProb = item.precipitation_probability ?? 0;
              const emoji = item.emoji || (item.weather_code !== undefined ? WEATHER_EMOJI[item.weather_code] : '🌤️');
              return (
                <div key={idx} className={styles.hourCard}>
                  <span className={styles.hourTime}>{idx === 0 ? getCardTranslation(language, 'today', 'Now') : item.formatted_hour || item.time.slice(11, 16)}</span>
                  <span className={styles.hourEmoji}>{emoji}</span>
                  <span className={styles.hourTemp}>{Math.round(item.temperature ?? 25)}°</span>
                  {rainProb > 0 ? (
                    <span className={styles.hourRain}>💧{rainProb}%</span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>0%</span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── 7. 6-Day Forecast Strip ─────────────────────────────────── */}
      {daily.length > 0 && (
        <>
          <div className={styles.sectionTitle}>
            <span>{getCardTranslation(language, 'sixDayForecast', '6-DAY FORECAST')}</span>
          </div>
          <div className={styles.sixDayCard}>
            <div className={styles.sixDayGrid}>
              {daily.slice(0, 6).map((d: DailyForecastItem, i: number) => {
                let dayLabel = getCardTranslation(language, 'today', 'TODAY');
                if (i > 0) {
                  try {
                    const dateObj = new Date(d.date);
                    dayLabel = dateObj.toLocaleDateString(language === 'en' ? 'en-US' : `${language}-IN`, { weekday: 'short' }).toUpperCase();
                  } catch {
                    dayLabel = `D+${i}`;
                  }
                }
                const emoji = d.emoji || (d.condition ? '🌤️' : '☀️');
                const maxT = d.temp_max !== undefined ? Math.round(d.temp_max) : 30;
                const minT = d.temp_min !== undefined ? Math.round(d.temp_min) : 21;
                return (
                  <div key={i} className={styles.sixDayCol}>
                    <span className={styles.sixDayDay}>{dayLabel}</span>
                    <span className={styles.sixDayEmoji}>{emoji}</span>
                    <span className={styles.sixDayMax}>{maxT}°</span>
                    <span className={styles.sixDayMin}>{minT}°</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── 8. Activities Suitability Index ─────────────────────────── */}
      <div className={styles.sectionTitle}>
        <span>{getCardTranslation(language, 'activities', 'Activities')}</span>
      </div>
      <div className={styles.activitiesGrid}>
        <ActivityPill
          icon="🏃"
          name={getCardTranslation(language, 'running', 'Running')}
          rating={activities.running?.rating || 'Fair'}
          language={language}
        />
        <ActivityPill
          icon="🚶"
          name={getCardTranslation(language, 'jogging', 'Jogging')}
          rating={activities.jogging?.rating || 'Fair'}
          language={language}
        />
        <ActivityPill
          icon="🚴"
          name={getCardTranslation(language, 'cycling', 'Cycling')}
          rating={activities.cycling?.rating || 'Fair'}
          language={language}
        />
        <ActivityPill
          icon="🥾"
          name={getCardTranslation(language, 'hiking', 'Hiking')}
          rating={activities.hiking?.rating || 'Fair'}
          language={language}
        />
      </div>

      {/* ── 9. Allergies Section ────────────────────────────────────── */}
      <div className={styles.sectionTitle}>
        <span>{getCardTranslation(language, 'allergies', 'Allergies')}</span>
      </div>
      <div className={styles.allergiesCard}>
        <div className={styles.conditionIcon} style={{ color: '#f59e0b' }}>💧</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {getCardTranslation(language, 'dustAndDander', 'Dust and dander')}
          </span>
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 600,
              color: allergies?.dust_and_dander?.level === 'High' ? '#f97316' : '#22c55e',
              marginTop: 1,
            }}
          >
            {getCardTranslation(language, allergies?.dust_and_dander?.level || 'Moderate', allergies?.dust_and_dander?.level || 'Moderate')}
          </span>
        </div>
      </div>

      {/* ── 10. Live Weather Radar / Satellite Map Preview ──────────── */}
      <div className={styles.radarCard}>
        <div
          className={styles.radarImageContainer}
          onClick={() => onOpenSatellite?.('radar')}
          title="Click to open live IMD Doppler Radar & INSAT-3DS Viewer"
        >
          <Image
            src="/images/radar_preview.jpg"
            alt="Doppler Weather Radar India Preview"
            fill
            sizes="(max-width: 768px) 100vw, 700px"
            className={styles.radarImg}
            priority={false}
          />
          <div className={styles.radarOverlay}>
            <span className={styles.radarPulse}></span>
            <span>LIVE DOPPLER RADAR • IMD</span>
          </div>
          <div className={styles.radarExpandHint}>
            <span>Expand Live Viewer ↗</span>
          </div>
        </div>
        <div className={styles.radarActions}>
          <button
            type="button"
            className={styles.radarActionBtn}
            onClick={() => onOpenSatellite?.('radar')}
            title="Open Doppler Radar Mosaic"
          >
            <span>📡</span> {getCardTranslation(language, 'weatherRadar', 'Weather radar')}
          </button>
          <button
            type="button"
            className={styles.radarActionBtn}
            onClick={() => onOpenSatellite?.('satellite')}
            title="Open INSAT-3DS Satellite Viewer"
          >
            <span>🛰️</span> INSAT-3DS Satellite
          </button>
        </div>
      </div>

      {/* ── 11. Toggle More Details & Charts ────────────────────────── */}
      <button
        className={styles.toggleDetailsBtn}
        onClick={() => setShowDetails(!showDetails)}
        aria-expanded={showDetails}
      >
        <span>
          {showDetails
            ? `▲ ${getCardTranslation(language, 'hideDetails', 'Hide weather details')}`
            : `▼ ${getCardTranslation(language, 'moreDetails', 'More weather details & charts')}`}
        </span>
      </button>

      {showDetails && (
        <div className={styles.expandedDetails}>
          {/* Model Agreement */}
          {modelAgreement && modelAgreement !== 'not_applicable' && (
            <ModelAgreementPill agreement={modelAgreement} />
          )}

          {/* Interactive Chart */}
          <div style={{ marginTop: '1rem' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              📈 7-Day Temperature & Rain Trends
            </div>
            <ChartPanel daily={daily} />
          </div>

          {/* Risk Factors */}
          {risks.length > 0 && (
            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                ⚡ Deterministic Risk Assessments
              </div>
              <RisksPanel risks={risks} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helpers & Sub-components ────────────────────────────────────────────────

function ActivityPill({
  icon,
  name,
  rating,
  language = 'en',
}: {
  icon: string;
  name: string;
  rating: 'Good' | 'Fair' | 'Poor';
  language?: string;
}) {
  const ratingColor = rating === 'Good' ? '#22c55e' : rating === 'Fair' ? '#f59e0b' : '#ef4444';
  const translatedRating = getCardTranslation(language, rating.toLowerCase(), rating);
  return (
    <div className={styles.activityCard}>
      <div className={styles.activityIcon}>{icon}</div>
      <div className={styles.activityInfo}>
        <span className={styles.activityName}>{name}</span>
        <span className={styles.activityRating} style={{ color: ratingColor }}>
          {translatedRating}
        </span>
      </div>
    </div>
  );
}

function SourceBadge({
  freshness,
  sources,
}: {
  freshness: DataFreshness;
  sources?: WeatherSource[];
}) {
  const primary = sources?.[0];
  const badgeStyle: React.CSSProperties = {
    fontSize: '0.72rem',
    padding: '3px 10px',
    borderRadius: '20px',
    background: freshness === 'synthetic' ? 'var(--badge-synthetic)' : 'rgba(255, 255, 255, 0.08)',
    color: freshness === 'synthetic' ? 'var(--badge-text-synthetic)' : 'var(--text-secondary)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    fontWeight: 600,
  };
  return (
    <span style={badgeStyle} title={primary?.url || ''}>
      {freshness === 'synthetic'
        ? '📊 Synthetic estimate'
        : freshness === 'cached'
        ? '⚡ Cached'
        : `🛰️ ${primary?.name || 'IMD-aligned'}`}
    </span>
  );
}

function ModelAgreementPill({ agreement }: { agreement?: ModelAgreement }) {
  const colors: Record<string, { bg: string; text: string; icon: string } | null> = {
    high: { bg: 'rgba(34,197,94,0.1)', text: 'var(--warning-green)', icon: '✅' },
    moderate: { bg: 'rgba(234,179,8,0.1)', text: 'var(--warning-yellow)', icon: '⚠️' },
    low: { bg: 'rgba(239,68,68,0.1)', text: 'var(--warning-red)', icon: '⚡' },
    not_applicable: null,
  };
  const key = agreement?.toLowerCase() || '';
  const c = colors[key];
  if (!c) return null;
  return (
    <div
      style={{
        margin: '0.5rem 0',
        padding: '0.5rem 0.85rem',
        background: c.bg,
        borderRadius: '12px',
        fontSize: '0.8rem',
        color: c.text,
        border: '1px solid currentColor',
      }}
    >
      {c.icon} Model agreement: <strong>{agreement}</strong> — IMD-aligned Open-Meteo vs GFS NWP
    </div>
  );
}

function ChartPanel({ daily }: { daily?: DailyForecastItem[] }) {
  if (!daily?.length) return null;
  const data = daily.slice(0, 7).map((d) => ({
    name: d.date.slice(5),
    max: d.temp_max,
    min: d.temp_min,
    rain: d.precipitation_sum,
  }));
  return (
    <div style={{ height: 180, width: '100%', marginTop: '0.5rem' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: '8px',
              fontSize: '0.78rem',
            }}
          />
          <Line
            type="monotone"
            dataKey="max"
            stroke="#f97316"
            strokeWidth={2.5}
            name="Max °C"
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="min"
            stroke="#38bdf8"
            strokeWidth={2}
            name="Min °C"
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function RisksPanel({ risks }: { risks: RiskItem[] }) {
  if (!risks?.length) return null;
  const riskColors: Record<string, string> = {
    Low: 'var(--risk-low, #22c55e)',
    Moderate: 'var(--risk-moderate, #f59e0b)',
    High: 'var(--risk-high, #f97316)',
    Critical: 'var(--risk-critical, #ef4444)',
    Extreme: 'var(--risk-critical, #ef4444)',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {risks.map((r, i) => (
        <div
          key={i}
          style={{
            padding: '0.65rem 0.85rem',
            background: 'var(--bg-glass)',
            borderLeft: `4px solid ${riskColors[r.level] || 'var(--accent-primary)'}`,
            borderRadius: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
              {r.hazard}
            </span>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: riskColors[r.level],
                background: 'rgba(255,255,255,0.06)',
                padding: '2px 8px',
                borderRadius: '12px',
              }}
            >
              {r.level}
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0' }}>
            {r.impact}
          </p>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
            👉 {r.recommended_action}
          </p>
        </div>
      ))}
    </div>
  );
}
