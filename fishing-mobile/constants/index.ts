// constants/index.ts
// ===========================================
// CONSTANTS BARREL EXPORT
// ===========================================
// Import everything from here for convenience:
// import { ALL_FISH, FISHING_REGULATIONS, getMoonPhase } from '@/constants';

export * from './fishData';
export * from './weather';

// ===========================================
// APP CONFIGURATION
// ===========================================

export const APP_CONFIG = {
  // API Configuration
  api: {
    timeout: 10000,           // 10 seconds
    retryAttempts: 3,
    retryDelay: 1000,         // 1 second
  },
  
  // Image Configuration
  image: {
    quality: 0.9,
    maxWidth: 1920,
    maxHeight: 1080,
  },
  
  // Location Configuration
  location: {
    accuracy: 'balanced',     // 'low' | 'balanced' | 'high'
    timeout: 15000,           // 15 seconds
    maximumAge: 60000,        // 1 minute cache
  },
  
  // UI Configuration
  ui: {
    debounceDelay: 300,       // Search debounce
    animationDuration: 300,
    toastDuration: 3000,
  },
};

// ===========================================
// THEME COLORS
// ===========================================

export const COLORS = {
  // Primary
  primary: "#0891b2",
  primaryLight: "#22d3ee",
  primaryDark: "#0e7490",
  
  // Background
  background: "#ecfeff",
  surface: "#ffffff",
  surfaceAlt: "#f9fafb",
  
  // Text
  textPrimary: "#1f2937",
  textSecondary: "#6b7280",
  textMuted: "#9ca3af",
  
  // Status
  success: "#22c55e",
  successLight: "#dcfce7",
  warning: "#eab308",
  warningLight: "#fef3c7",
  error: "#ef4444",
  errorLight: "#fee2e2",
  info: "#3b82f6",
  infoLight: "#dbeafe",
  
  // Borders
  border: "#e5e7eb",
  borderLight: "#f3f4f6",
  
  // Special
  online: "#16794D",
  onlineBg: "#E6FFEE",
  local: "#C76B00",
  localBg: "#FFF5E5",
};

// ===========================================
// LAYOUT CONSTANTS
// ===========================================

export const LAYOUT = {
  padding: 16,
  gap: 8,
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 999,
  },
};

// ===========================================
// FALLBACK DATA
// ===========================================
// Used when API is unavailable

export const FALLBACK_WEATHER = {
  temperature: 72,
  feelsLike: 70,
  condition: "Partly Cloudy",
  humidity: 65,
  windSpeed: 8,
  windDirection: "SW",
  fishingCondition: "Good",
  uvIndex: 4,
  visibility: 10,
  pressure: 1015,
  dewPoint: 55,
  cloudCover: 40,
  sunrise: "6:45 AM",
  sunset: "5:30 PM",
  airQuality: "Good",
  airQualityIndex: 35,
  waterTemp: 58,
};
