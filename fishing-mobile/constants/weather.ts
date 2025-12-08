// constants/weather.ts
// ===========================================
// WEATHER & FISHING CONDITIONS
// ===========================================

export type WeatherConditionRating = "Excellent" | "Good" | "Fair" | "Poor";

export type FishingConditionFactor = {
  name: string;
  icon: string;
  idealRange: string;
  impact: string;
};

// ===========================================
// FISHING CONDITION FACTORS
// ===========================================
// Educational info about what affects fishing

export const FISHING_CONDITION_FACTORS: FishingConditionFactor[] = [
  {
    name: "Temperature",
    icon: "🌡️",
    idealRange: "60-75°F",
    impact: "Fish are most active in moderate temperatures. Too hot or cold slows metabolism.",
  },
  {
    name: "Barometric Pressure",
    icon: "📊",
    idealRange: "1010-1020 hPa",
    impact: "Falling pressure often triggers feeding. Stable or slowly rising is also good.",
  },
  {
    name: "Wind",
    icon: "💨",
    idealRange: "5-15 mph",
    impact: "Light wind creates ripples that provide cover and push baitfish to shores.",
  },
  {
    name: "Moon Phase",
    icon: "🌙",
    idealRange: "New/Full Moon",
    impact: "Major feeding periods occur around new and full moons due to tidal influence.",
  },
  {
    name: "Cloud Cover",
    icon: "☁️",
    idealRange: "Overcast",
    impact: "Cloudy days reduce light penetration, making fish less wary and more active.",
  },
  {
    name: "Time of Day",
    icon: "🕐",
    idealRange: "Dawn/Dusk",
    impact: "Low light periods are prime feeding times for most game fish.",
  },
];

// ===========================================
// CONDITION RATING COLORS
// ===========================================

export const CONDITION_COLORS: Record<WeatherConditionRating, string> = {
  Excellent: "#22c55e",
  Good: "#4ade80",
  Fair: "#eab308",
  Poor: "#ef4444",
};

export const getConditionColor = (condition: WeatherConditionRating | string): string => {
  return CONDITION_COLORS[condition as WeatherConditionRating] || "#6b7280";
};

// ===========================================
// AIR QUALITY
// ===========================================

export type AirQualityLevel = "Good" | "Moderate" | "Unhealthy (Sensitive)" | "Unhealthy" | "Very Unhealthy" | "Hazardous";

export const AIR_QUALITY_THRESHOLDS: { max: number; label: AirQualityLevel; color: string }[] = [
  { max: 50, label: "Good", color: "#22c55e" },
  { max: 100, label: "Moderate", color: "#eab308" },
  { max: 150, label: "Unhealthy (Sensitive)", color: "#f97316" },
  { max: 200, label: "Unhealthy", color: "#ef4444" },
  { max: 300, label: "Very Unhealthy", color: "#7c3aed" },
  { max: 500, label: "Hazardous", color: "#991b1b" },
];

export const getAirQualityInfo = (aqi: number): { label: AirQualityLevel; color: string } => {
  for (const threshold of AIR_QUALITY_THRESHOLDS) {
    if (aqi <= threshold.max) {
      return { label: threshold.label, color: threshold.color };
    }
  }
  return { label: "Hazardous", color: "#991b1b" };
};

// ===========================================
// MOON PHASES
// ===========================================

export type MoonPhase = {
  name: string;
  icon: string;
  fishingRating: "excellent" | "good" | "fair";
  description: string;
};

export const MOON_PHASES: MoonPhase[] = [
  { name: "New Moon", icon: "🌑", fishingRating: "excellent", description: "Major feeding period" },
  { name: "Waxing Crescent", icon: "🌒", fishingRating: "good", description: "Increasing activity" },
  { name: "First Quarter", icon: "🌓", fishingRating: "fair", description: "Moderate activity" },
  { name: "Waxing Gibbous", icon: "🌔", fishingRating: "good", description: "Building to full moon" },
  { name: "Full Moon", icon: "🌕", fishingRating: "excellent", description: "Major feeding period" },
  { name: "Waning Gibbous", icon: "🌖", fishingRating: "good", description: "Still active" },
  { name: "Last Quarter", icon: "🌗", fishingRating: "fair", description: "Moderate activity" },
  { name: "Waning Crescent", icon: "🌘", fishingRating: "good", description: "Building to new moon" },
];

export const getMoonPhase = (): { name: string; icon: string } => {
  const d = new Date();
  const c = Math.floor(365.25 * d.getFullYear()) + Math.floor(30.6 * (d.getMonth() + 1)) + d.getDate() - 694039.09;
  const p = (c / 29.53) % 1;
  
  if (p < 0.0625) return { name: "New Moon", icon: "🌑" };
  if (p < 0.1875) return { name: "Waxing Crescent", icon: "🌒" };
  if (p < 0.3125) return { name: "First Quarter", icon: "🌓" };
  if (p < 0.4375) return { name: "Waxing Gibbous", icon: "🌔" };
  if (p < 0.5625) return { name: "Full Moon", icon: "🌕" };
  if (p < 0.6875) return { name: "Waning Gibbous", icon: "🌖" };
  if (p < 0.8125) return { name: "Last Quarter", icon: "🌗" };
  if (p < 0.9375) return { name: "Waning Crescent", icon: "🌘" };
  return { name: "New Moon", icon: "🌑" };
};

// ===========================================
// WIND DIRECTION
// ===========================================

export const WIND_DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
export type WindDirection = typeof WIND_DIRECTIONS[number];

export const getWindDirection = (degrees: number): WindDirection => {
  const index = Math.round(degrees / 45) % 8;
  return WIND_DIRECTIONS[index];
};

// ===========================================
// FISHING CONDITION CALCULATOR
// ===========================================

export interface ConditionFactors {
  temperature: number;      // °F
  humidity: number;         // %
  windSpeed: number;        // mph
  condition: string;        // weather description
  pressure: number;         // hPa
  moonPhase?: string;       // optional moon phase name
}

export const calculateFishingCondition = (factors: ConditionFactors): WeatherConditionRating => {
  let score = 0;
  const { temperature, humidity, windSpeed, condition, pressure } = factors;

  // Temperature scoring (60-75°F is ideal)
  if (temperature >= 60 && temperature <= 75) score += 3;
  else if (temperature >= 50 && temperature <= 85) score += 2;
  else if (temperature >= 40 && temperature <= 95) score += 1;

  // Wind scoring (5-15 mph is ideal)
  if (windSpeed >= 5 && windSpeed <= 15) score += 2;
  else if (windSpeed < 5) score += 1;
  else if (windSpeed > 20) score -= 1;

  // Humidity scoring
  if (humidity >= 50 && humidity <= 70) score += 1;

  // Pressure scoring (stable/rising is good)
  if (pressure >= 1010 && pressure <= 1020) score += 2;
  else if (pressure >= 1005) score += 1;

  // Weather condition scoring
  const lowerCondition = condition.toLowerCase();
  if (lowerCondition.includes("cloud") || lowerCondition.includes("overcast")) score += 2;
  else if (lowerCondition.includes("partly")) score += 1;
  else if (lowerCondition.includes("rain") || lowerCondition.includes("storm")) score -= 2;

  // Moon phase bonus
  if (factors.moonPhase) {
    const moon = factors.moonPhase.toLowerCase();
    if (moon.includes("new") || moon.includes("full")) score += 1;
  }

  // Convert score to rating
  if (score >= 8) return "Excellent";
  if (score >= 5) return "Good";
  if (score >= 3) return "Fair";
  return "Poor";
};
