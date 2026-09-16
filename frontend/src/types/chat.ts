import { WeatherData, IMDWarning, RiskItem, WeatherSource, DataFreshness, ModelAgreement, LocationInfo } from './weather';

export type DomainModeId = 'normal' | 'agriculture' | 'aviation' | 'marine' | 'research';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  timestamp: string;
  turn_type?: 'establishing' | 'followup' | string;
  // User specific
  query?: string;
  text_en?: string;
  // Assistant specific
  response_text?: string;
  response_text_english?: string;
  variants?: Record<string, string>;
  weather_data?: WeatherData;
  warnings?: IMDWarning[];
  risks?: RiskItem[];
  followup_chips_native?: string[];
  followup_chips_english?: string[];
  resolved_location?: string;
  domain_filter?: DomainModeId | string;
  intent_category?: string;
  data_freshness?: DataFreshness;
  model_agreement?: ModelAgreement;
  sources?: WeatherSource[];
  latency_ms?: number;
  requires_chart?: boolean;
}

export interface SessionLocation extends LocationInfo {
  name: string;
  state?: string;
}

export interface SessionState {
  session_id: string;
  language: string;
  domainFilter: DomainModeId | string;
  sessionLocation: SessionLocation | null;
}

export interface SavedSession {
  id: string;
  title: string;
  preview: string;
  date: string;
  messages: ChatMessage[];
}

export interface UserProfile {
  id?: string;
  email?: string;
  name?: string;
  avatar_url?: string;
  default_language?: string;
  history_opt_in?: boolean;
  interface_style?: string;
  color_scheme?: string;
}

export interface DomainMode {
  id: DomainModeId;
  icon: string;
  nameKey: string;
  label?: string;
  desc: string;
}

export interface LanguageInfo {
  code: string;
  name: string;
  native: string;
  script?: string;
}
