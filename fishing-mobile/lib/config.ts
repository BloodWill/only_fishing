// config.ts
// ===========================================
// CENTRALIZED APP CONFIGURATION
// ===========================================
// All configuration values accessed from environment variables
// with sensible fallbacks for development

import Constants from 'expo-constants';

// ===========================================
// TYPE DEFINITIONS
// ===========================================

interface AppConfig {
  apiUrl: string;
  googleWeatherKey: string;
  googleGeocodingKey: string;
  enableCrashReporting: boolean;
  enableAnalytics: boolean;
}

// ===========================================
// CONFIGURATION VALUES
// ===========================================

// Get extra config from app.config.js
const extra = Constants.expoConfig?.extra as Partial<AppConfig> | undefined;

/**
 * Backend API base URL
 * - Development: Uses EXPO_PUBLIC_API_URL or defaults to localhost
 * - Production: Must be set in environment variables
 */
export const API_BASE: string = (() => {
  // First priority: Environment variable via extra config
  if (extra?.apiUrl) {
    return extra.apiUrl;
  }

  // Second priority: Direct env access (works in some setups)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Fallback for development
  if (__DEV__) {
    // Common development URLs - adjust to your setup
    // You can also hardcode your local IP here temporarily
    return 'http://localhost:8000';
  }

  // Production should always have this configured
  console.error('⚠️ API_BASE not configured for production!');
  return 'https://api.example.com'; // Replace with your production URL
})();

/**
 * Google Weather API Key
 * Used for fetching real-time fishing conditions
 */
export const GOOGLE_WEATHER_KEY: string = extra?.googleWeatherKey || '';

/**
 * Google Geocoding API Key
 * Used for location search and reverse geocoding
 */
export const GOOGLE_GEOCODING_KEY: string = extra?.googleGeocodingKey || '';

/**
 * Feature flags
 */
export const ENABLE_CRASH_REPORTING: boolean = extra?.enableCrashReporting ?? false;
export const ENABLE_ANALYTICS: boolean = extra?.enableAnalytics ?? false;

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Cache-busting helper for image URLs
 * Appends timestamp to force fresh fetch
 */
export const bust = (url: string): string => {
  const timestamp = Date.now();
  return url.includes('?') ? `${url}&t=${timestamp}` : `${url}?t=${timestamp}`;
};

/**
 * Build full API URL from path
 * @example apiUrl('/catches') => 'http://localhost:8000/catches'
 */
export const apiUrl = (path: string): string => {
  const base = API_BASE.replace(/\/+$/, ''); // Remove trailing slashes
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

/**
 * Check if required API keys are configured
 */
export const checkApiKeys = (): { valid: boolean; missing: string[] } => {
  const missing: string[] = [];

  if (!GOOGLE_WEATHER_KEY) {
    missing.push('GOOGLE_WEATHER_KEY');
  }
  if (!GOOGLE_GEOCODING_KEY) {
    missing.push('GOOGLE_GEOCODING_KEY');
  }

  return {
    valid: missing.length === 0,
    missing,
  };
};

// ===========================================
// DEVELOPMENT LOGGING
// ===========================================

if (__DEV__) {
  console.log('📱 App Configuration:');
  console.log(`   API_BASE: ${API_BASE}`);
  console.log(`   Weather API: ${GOOGLE_WEATHER_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   Geocoding API: ${GOOGLE_GEOCODING_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   Crash Reporting: ${ENABLE_CRASH_REPORTING ? '✅ Enabled' : '⚪ Disabled'}`);
  console.log(`   Analytics: ${ENABLE_ANALYTICS ? '✅ Enabled' : '⚪ Disabled'}`);
}

// ===========================================
// DEFAULT EXPORT
// ===========================================

export default {
  API_BASE,
  GOOGLE_WEATHER_KEY,
  GOOGLE_GEOCODING_KEY,
  ENABLE_CRASH_REPORTING,
  ENABLE_ANALYTICS,
  bust,
  apiUrl,
  checkApiKeys,
};
