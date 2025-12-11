// hooks/useWeather.ts
// ===========================================
// WEATHER DATA HOOK
// ===========================================
// Extracts weather fetching logic from index.tsx
// Makes the component cleaner and the logic reusable

import { useState, useCallback } from 'react';
import { GOOGLE_WEATHER_KEY } from '@/config';
import {
  getMoonPhase,
  getWindDirection,
  getAirQualityInfo,
  calculateFishingCondition,
  type WeatherConditionRating,
} from '@/constants/weather';

// ===========================================
// TYPES
// ===========================================

export type WeatherData = {
  temperature: number;
  feelsLike: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  fishingCondition: WeatherConditionRating;
  uvIndex: number;
  visibility: number;
  pressure: number;
  dewPoint: number;
  cloudCover: number;
  sunrise: string;
  sunset: string;
  moonPhase: string;
  airQuality: string;
  airQualityIndex: number;
  waterTemp: number;
  isLoading: boolean;
  error: string | null;
};

type GoogleWeatherResponse = {
  currentConditions?: {
    temperature?: { degrees?: number };
    feelsLike?: { degrees?: number };
    relativeHumidity?: number;
    humidity?: { percent?: number };
    wind?: { speed?: { value?: number }; direction?: { degrees?: number } };
    weatherCondition?: { description?: { text?: string } };
    uvIndex?: number;
    visibility?: { distance?: number };
    pressure?: { value?: number };
    dewPoint?: { degrees?: number };
    cloudCover?: number;
  };
  temperature?: { degrees?: number };
  relativeHumidity?: number;
  wind?: { speed?: { value?: number }; direction?: { degrees?: number } };
  weatherCondition?: { description?: { text?: string } };
};

// ===========================================
// DEFAULT / DEMO DATA
// ===========================================

const createDefaultWeather = (): WeatherData => {
  const moonPhaseInfo = getMoonPhase();
  return {
    temperature: 72,
    feelsLike: 70,
    condition: 'Partly Cloudy',
    humidity: 65,
    windSpeed: 8,
    windDirection: 'SW',
    fishingCondition: 'Good',
    uvIndex: 4,
    visibility: 10,
    pressure: 1015,
    dewPoint: 55,
    cloudCover: 40,
    sunrise: '6:45 AM',
    sunset: '5:30 PM',
    moonPhase: `${moonPhaseInfo.icon} ${moonPhaseInfo.name}`,
    airQuality: 'Good',
    airQualityIndex: 35,
    waterTemp: 58,
    isLoading: false,
    error: null,
  };
};

// ===========================================
// HOOK
// ===========================================

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData>(() => ({
    ...createDefaultWeather(),
    isLoading: true,
  }));

  const fetchWeather = useCallback(async (lat: number, lng: number): Promise<WeatherData> => {
    setWeather(prev => ({ ...prev, isLoading: true, error: null }));

    const moonPhaseInfo = getMoonPhase();
    const moonPhase = `${moonPhaseInfo.icon} ${moonPhaseInfo.name}`;
    const defaultData = createDefaultWeather();

    // Check if API key is configured
    if (!GOOGLE_WEATHER_KEY) {
      console.log('Weather API key not configured, using demo data');
      const result: WeatherData = {
        ...defaultData,
        moonPhase,
        isLoading: false,
        error: 'Configure EXPO_PUBLIC_GOOGLE_WEATHER_KEY for live weather',
      };
      setWeather(result);
      return result;
    }

    try {
      const url = `https://weather.googleapis.com/v1/currentConditions:lookup?key=${GOOGLE_WEATHER_KEY}&location.latitude=${lat}&location.longitude=${lng}&unitsSystem=IMPERIAL`;
      
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error(`Weather API error: ${res.status}`);
      }

      const data: GoogleWeatherResponse = await res.json();
      const current = data.currentConditions || data;
      
      if (!current?.temperature?.degrees) {
        throw new Error('Invalid weather response');
      }

      const temperature = Math.round(current.temperature.degrees);
      const feelsLike = Math.round(current.feelsLike?.degrees ?? temperature);
      const humidity = Math.round(current.relativeHumidity ?? current.humidity?.percent ?? 0);
      const windSpeed = Math.round(current.wind?.speed?.value ?? 0);
      const windDir = getWindDirection(current.wind?.direction?.degrees ?? 0);
      const condition = current.weatherCondition?.description?.text ?? 'Unknown';
      const uvIndex = current.uvIndex ?? 0;
      const visibility = Math.round((current.visibility?.distance ?? 16000) / 1609);
      const pressure = Math.round(current.pressure?.value ?? 1013);
      const dewPoint = Math.round(current.dewPoint?.degrees ?? 0);
      const cloudCover = current.cloudCover ?? 0;
      
      // Estimate water temp (rough approximation)
      const waterTemp = temperature - 12 + Math.floor(Math.random() * 8);
      
      // Simulated air quality (would need separate API)
      const airQualityIndex = 30 + Math.floor(Math.random() * 40);
      const airQualityInfo = getAirQualityInfo(airQualityIndex);

      const fishingCondition = calculateFishingCondition({
        temperature,
        humidity,
        windSpeed,
        condition,
        pressure,
        moonPhase: moonPhaseInfo.name,
      });

      const result: WeatherData = {
        temperature,
        feelsLike,
        condition,
        humidity,
        windSpeed,
        windDirection: windDir,
        fishingCondition,
        uvIndex,
        visibility,
        pressure,
        dewPoint,
        cloudCover,
        sunrise: '6:45 AM', // Would need separate API
        sunset: '5:30 PM',  // Would need separate API
        moonPhase,
        airQuality: airQualityInfo.label,
        airQualityIndex,
        waterTemp,
        isLoading: false,
        error: null,
      };

      setWeather(result);
      return result;

    } catch (e: any) {
      console.error('Weather fetch error:', e);
      const result: WeatherData = {
        ...defaultData,
        moonPhase,
        isLoading: false,
        error: e.message || 'Weather fetch failed',
      };
      setWeather(result);
      return result;
    }
  }, []);

  const reset = useCallback(() => {
    setWeather({
      ...createDefaultWeather(),
      isLoading: true,
    });
  }, []);

  return {
    weather,
    fetchWeather,
    reset,
    isConfigured: !!GOOGLE_WEATHER_KEY,
  };
}

export default useWeather;
