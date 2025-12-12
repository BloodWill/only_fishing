// app.config.js
// Expo configuration with environment variables for sensitive data
// 
// USAGE:
// 1. Create a .env file in project root (see .env.example)
// 2. Add your API keys to .env
// 3. Access via Constants.expoConfig.extra in your code
//
// IMPORTANT: Never commit .env to git!

import 'dotenv/config';

// Environment variables with fallbacks
const ANDROID_MAPS_KEY = process.env.EXPO_PUBLIC_ANDROID_MAPS_KEY ?? '';
const IOS_MAPS_KEY = process.env.EXPO_PUBLIC_IOS_MAPS_KEY ?? '';
const GOOGLE_WEATHER_KEY = process.env.EXPO_PUBLIC_GOOGLE_WEATHER_KEY ?? '';
const GOOGLE_GEOCODING_KEY = process.env.EXPO_PUBLIC_GOOGLE_GEOCODING_KEY ?? '';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

const ANDROID_PACKAGE = process.env.ANDROID_PACKAGE ?? 'com.anonymous.fishingmobile';
const IOS_BUNDLE_ID = process.env.IOS_BUNDLE_ID ?? 'com.anonymous.fishingmobile';

// Warn if keys are missing (during build)
if (!GOOGLE_WEATHER_KEY) {
  console.warn('⚠️ EXPO_PUBLIC_GOOGLE_WEATHER_KEY not set - weather features will use demo data');
}
if (!ANDROID_MAPS_KEY && !IOS_MAPS_KEY) {
  console.warn('⚠️ Google Maps API keys not set - map features may not work');
}

export default {
  expo: {
    name: 'FishDex',
    slug: 'fishing-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'fishingmobile',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,

    // Extra configuration accessible via Constants.expoConfig.extra
    extra: {
      // API Configuration
      apiUrl: API_URL,
      
      // Google API Keys (accessed securely at runtime)
      googleWeatherKey: GOOGLE_WEATHER_KEY,
      googleGeocodingKey: GOOGLE_GEOCODING_KEY,
      
      // Feature flags
      enableCrashReporting: process.env.EXPO_PUBLIC_ENABLE_CRASH_REPORTING === 'true',
      enableAnalytics: process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === 'true',
      
      //sentry
      sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
      enableCrashReporting: process.env.EXPO_PUBLIC_ENABLE_CRASH_REPORTING === 'true',
      // EAS configuration
      eas: {
        projectId: process.env.EAS_PROJECT_ID ?? '',
      },
    },


    ios: {
      bundleIdentifier: IOS_BUNDLE_ID,
      supportsTablet: true,
      infoPlist: {
        NSPhotoLibraryUsageDescription:
          'FishDex needs access to your photos to identify fish species from your catches.',
        NSCameraUsageDescription:
          'FishDex needs camera access to photograph and identify your fish catches.',
        NSLocationWhenInUseUsageDescription:
          'FishDex uses your location to tag catches on the map and show local fishing conditions.',
      },
      config: {
        googleMapsApiKey: IOS_MAPS_KEY,
      },
    },

    android: {
      package: ANDROID_PACKAGE,
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      permissions: [
        'android.permission.CAMERA',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
      ],
      config: {
        googleMaps: {
          apiKey: ANDROID_MAPS_KEY,
        },
      },
    },

    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },

    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
        },
      ],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'FishDex uses your location to tag catches and show local conditions.',
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission:
            'FishDex needs access to your photos to identify fish species.',
          cameraPermission:
            'FishDex needs camera access to photograph your catches.',
        },
      ],
    ],

    experiments: {
      typedRoutes: true,
    },
  },
};
