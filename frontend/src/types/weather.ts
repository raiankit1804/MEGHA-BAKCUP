export type DataFreshness = 'live' | 'cached' | 'synthetic';
export type ModelAgreement = 'high' | 'moderate' | 'low' | 'not_applicable' | string;
export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical' | 'Extreme';
export type WarningSeverity = 'red' | 'orange' | 'yellow' | 'green' | 'none';

export interface CurrentWeather {
  weather_code?: number;
  temperature?: number;
  condition?: string;
  emoji?: string;
  feels_like?: number;
  humidity?: number;
  wind_speed?: number;
  wind_direction?: number;
  precipitation?: number;
  surface_pressure?: number;
  uv_index?: number;
  uv_category?: string;
  visibility?: number;
  cloud_cover?: number;
}

export interface HourlyForecastItem {
  time: string;
  formatted_hour?: string;
  temperature?: number;
  precipitation?: number;
  precipitation_probability?: number;
  wind_speed?: number;
  weather_code?: number;
  condition?: string;
  emoji?: string;
}

export interface DailyForecastItem {
  date: string;
  emoji?: string;
  condition?: string;
  temp_min?: number;
  temp_max?: number;
  precipitation_sum?: number;
  precipitation_probability?: number;
  wind_speed_max?: number;
  wind_gusts?: number;
  sunrise?: string;
  sunset?: string;
  uv_index_max?: number;
}

export interface AirQualityData {
  us_aqi?: number;
  category?: string;
  pm2_5?: number;
  pm10?: number;
  ozone?: number;
  nitrogen_dioxide?: number;
  sulphur_dioxide?: number;
}

export interface ActivityItem {
  rating: 'Good' | 'Fair' | 'Poor';
  summary?: string;
}

export interface ActivitiesData {
  running?: ActivityItem;
  jogging?: ActivityItem;
  cycling?: ActivityItem;
  hiking?: ActivityItem;
}

export interface AllergiesData {
  dust_and_dander?: {
    level: 'Low' | 'Moderate' | 'High';
    pm10?: number;
    pm2_5?: number;
  };
}

export interface LocationInfo {
  name?: string;
  admin1?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  source?: string;
}

export interface IMDWarning {
  hazard?: string;
  description?: string;
  severity?: WarningSeverity;
  district?: string;
  hazard_type?: string;
  advisory_text?: string;
  action_instructions?: string;
}

export interface RiskItem {
  hazard: string;
  level: RiskLevel;
  impact: string;
  factors?: string[];
  recommended_action: string;
}

export interface WeatherSource {
  name: string;
  url?: string;
}

export interface WeatherData {
  current_weather?: CurrentWeather;
  daily_forecast?: DailyForecastItem[];
  hourly_forecast?: HourlyForecastItem[];
  air_quality?: AirQualityData;
  activities?: ActivitiesData;
  allergies?: AllergiesData;
  tomorrow_summary?: string;
  location_info?: LocationInfo;
}

