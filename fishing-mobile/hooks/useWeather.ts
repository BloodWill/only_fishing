import { useState, useCallback } from "react";
import { 
  getMoonPhase, 
  getWindDirection, 
  getAirQualityInfo, 
  calculateFishingCondition 
} from "@/constants/weather";
import { GOOGLE_WEATHER_KEY } from "@/lib/config";

// ============================================
// TYPES
// ============================================
export type WeatherData = {
  temperature: number;
  feelsLike: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  fishingCondition: string;
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
};

// 初始状态
const INITIAL_WEATHER: WeatherData = {
  temperature: 0, feelsLike: 0, condition: "Loading...", humidity: 0, windSpeed: 0, windDirection: "N",
  fishingCondition: "Loading...", uvIndex: 0, visibility: 10, pressure: 1013, dewPoint: 0, cloudCover: 0,
  sunrise: "6:45 AM", sunset: "5:30 PM", moonPhase: "", airQuality: "Good", airQualityIndex: 35, waterTemp: 55,
  isLoading: true, error: null,
};

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData>(() => {
    const mp = getMoonPhase();
    return { ...INITIAL_WEATHER, moonPhase: `${mp.icon} ${mp.name}` };
  });
  
  const [forecast, setForecast] = useState<WeatherData[]>([]);

  // ============================================
  // 生成 7 天预报逻辑 (从 index.tsx 迁移)
  // ============================================
  const generate7DayForecast = useCallback((todayWeather: WeatherData): WeatherData[] => {
    const conditions = ["Sunny", "Partly Cloudy", "Cloudy", "Light Rain", "Overcast", "Clear", "Scattered Clouds"];
    const forecasts: WeatherData[] = [todayWeather];
    
    for (let i = 1; i < 7; i++) {
      const tempVariation = Math.floor(Math.random() * 16) - 8;
      const humidityVariation = Math.floor(Math.random() * 20) - 10;
      const windVariation = Math.floor(Math.random() * 10) - 5;
      const condition = conditions[Math.floor(Math.random() * conditions.length)];
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + i);
      
      // Calculate Moon Phase for future date
      const c = Math.floor(365.25 * futureDate.getFullYear()) + Math.floor(30.6 * (futureDate.getMonth() + 1)) + futureDate.getDate() - 694039.09;
      const p = (c / 29.53) % 1;
      let moonPhase = "🌑 New";
      if (p >= 0.0625 && p < 0.1875) moonPhase = "🌒 Waxing Crescent";
      else if (p >= 0.1875 && p < 0.3125) moonPhase = "🌓 First Quarter";
      else if (p >= 0.3125 && p < 0.4375) moonPhase = "🌔 Waxing Gibbous";
      else if (p >= 0.4375 && p < 0.5625) moonPhase = "🌕 Full";
      else if (p >= 0.5625 && p < 0.6875) moonPhase = "🌖 Waning Gibbous";
      else if (p >= 0.6875 && p < 0.8125) moonPhase = "🌗 Last Quarter";
      else if (p >= 0.8125 && p < 0.9375) moonPhase = "🌘 Waning Crescent";
      
      const temp = Math.max(20, Math.min(100, todayWeather.temperature + tempVariation));
      const humidity = Math.max(20, Math.min(95, todayWeather.humidity + humidityVariation));
      const windSpeed = Math.max(0, todayWeather.windSpeed + windVariation);
      const pressure = todayWeather.pressure + Math.floor(Math.random() * 10) - 5;
      
      // Calculate Fishing Score for forecast
      let score = 0;
      if (temp >= 60 && temp <= 75) score += 3;
      else if (temp >= 50 && temp <= 85) score += 2;
      else if (temp >= 40 && temp <= 95) score += 1;
      if (windSpeed >= 5 && windSpeed <= 15) score += 2;
      else if (windSpeed < 5) score += 1;
      else if (windSpeed > 20) score -= 1;
      if (humidity >= 50 && humidity <= 70) score += 1;
      if (pressure >= 1010 && pressure <= 1020) score += 2;
      const lc = condition.toLowerCase();
      if (lc.includes("cloud") || lc.includes("overcast")) score += 2;
      else if (lc.includes("partly")) score += 1;
      else if (lc.includes("rain") || lc.includes("storm")) score -= 2;
      
      let fishingCondition = "Poor";
      if (score >= 8) fishingCondition = "Excellent";
      else if (score >= 5) fishingCondition = "Good";
      else if (score >= 3) fishingCondition = "Fair";
      
      const sunriseHour = 6 + Math.floor(Math.random() * 2);
      const sunriseMin = Math.floor(Math.random() * 60);
      const sunsetHour = 17 + Math.floor(Math.random() * 2);
      const sunsetMin = Math.floor(Math.random() * 60);
      
      forecasts.push({
        temperature: temp,
        feelsLike: temp + Math.floor(Math.random() * 6) - 3,
        condition,
        humidity,
        windSpeed,
        windDirection: ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.floor(Math.random() * 8)],
        fishingCondition,
        uvIndex: Math.max(0, Math.min(11, todayWeather.uvIndex + Math.floor(Math.random() * 4) - 2)),
        visibility: Math.max(1, Math.min(15, todayWeather.visibility + Math.floor(Math.random() * 4) - 2)),
        pressure,
        dewPoint: temp - 15 + Math.floor(Math.random() * 10),
        cloudCover: condition.includes("Cloud") || condition.includes("Overcast") ? 50 + Math.floor(Math.random() * 50) : Math.floor(Math.random() * 40),
        sunrise: `${sunriseHour}:${sunriseMin.toString().padStart(2, "0")} AM`,
        sunset: `${sunsetHour - 12}:${sunsetMin.toString().padStart(2, "0")} PM`,
        moonPhase,
        airQuality: ["Good", "Good", "Moderate", "Good"][Math.floor(Math.random() * 4)],
        airQualityIndex: 20 + Math.floor(Math.random() * 60),
        waterTemp: temp - 12 + Math.floor(Math.random() * 8),
        isLoading: false,
        error: null,
      });
    }
    
    return forecasts;
  }, []);

  // ============================================
  // Fetch Weather Logic
  // ============================================
  const fetchWeather = useCallback(async (lat: number, lng: number) => {
    setWeather(prev => ({ ...prev, isLoading: true, error: null }));
    
    // Check for API Key
    if (!GOOGLE_WEATHER_KEY) {
      console.log("No weather API key configured");
      setWeather(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: "Set EXPO_PUBLIC_GOOGLE_WEATHER_KEY in .env for live weather" 
      }));
      return;
    }

    try {
      console.log("Fetching weather for:", lat, lng);
      const url = `https://weather.googleapis.com/v1/currentConditions:lookup?key=${GOOGLE_WEATHER_KEY}&location.latitude=${lat}&location.longitude=${lng}&unitsSystem=IMPERIAL`;
      const res = await fetch(url);
      
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API error: ${res.status}`);
      }

      const data: GoogleWeatherResponse = await res.json();
      const current = data.currentConditions || data; // Handle potential response variations

      if (!current?.temperature?.degrees) throw new Error("Invalid weather data format");

      // Parse Data
      const temperature = Math.round(current.temperature.degrees);
      const feelsLike = Math.round(current.feelsLike?.degrees ?? temperature);
      const humidity = Math.round(current.relativeHumidity ?? current.humidity?.percent ?? 0);
      const windSpeed = Math.round(current.wind?.speed?.value ?? 0);
      const windDirection = getWindDirection(current.wind?.direction?.degrees ?? 0);
      const condition = current.weatherCondition?.description?.text ?? "Unknown";
      const uvIndex = current.uvIndex ?? 0;
      const visibility = Math.round((current.visibility?.distance ?? 16000) / 1609);
      const pressure = Math.round(current.pressure?.value ?? 1013);
      const dewPoint = Math.round(current.dewPoint?.degrees ?? 0);
      const cloudCover = current.cloudCover ?? 0;
      
      // Derived / Mocked Data
      const waterTemp = temperature - 12 + Math.floor(Math.random() * 8);
      const airQualityIndex = 30 + Math.floor(Math.random() * 40);
      const airQualityInfo = getAirQualityInfo(airQualityIndex);
      const moonPhaseInfo = getMoonPhase();
      const moonPhase = `${moonPhaseInfo.icon} ${moonPhaseInfo.name}`;

      // Calculate Fishing Condition
      const fishingCondition = calculateFishingCondition({ 
        temperature, 
        humidity, 
        windSpeed, 
        condition, 
        pressure, 
        moonPhase: moonPhaseInfo.name 
      });

      const newWeather: WeatherData = {
        temperature, feelsLike, condition, humidity, windSpeed, windDirection,
        fishingCondition, uvIndex, visibility, pressure, dewPoint, cloudCover,
        sunrise: "6:45 AM", sunset: "5:30 PM", moonPhase,
        airQuality: airQualityInfo.label, airQualityIndex, waterTemp,
        isLoading: false, error: null,
      };

      setWeather(newWeather);
      
      // Generate Forecast based on this new data
      const weekForecast = generate7DayForecast(newWeather);
      setForecast(weekForecast);

    } catch (e: any) {
      console.error("Weather fetch error:", e);
      setWeather(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: e.message || "Weather fetch failed" 
      }));
    }
  }, [generate7DayForecast]);

  return {
    weather,
    forecast,
    fetchWeather,
    setWeather // Exposed in case we need to reset or manually set state
  };
}