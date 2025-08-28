// app.config.js
import 'dotenv/config';

const ANDROID_MAPS_KEY = process.env.EXPO_PUBLIC_ANDROID_MAPS_KEY ?? '';
const IOS_MAPS_KEY = process.env.EXPO_PUBLIC_IOS_MAPS_KEY ?? '';

const ANDROID_PACKAGE = process.env.ANDROID_PACKAGE ?? 'com.anonymous.fishingmobile';
const IOS_BUNDLE_ID = process.env.IOS_BUNDLE_ID ?? 'com.anonymous.fishingmobile';

export default {
  expo: {
    name: 'fishing-mobile',
    slug: 'fishing-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'fishingmobile',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,

    ios: {
      bundleIdentifier: IOS_BUNDLE_ID, // ✅ required by prebuild
      supportsTablet: true,
      infoPlist: {
        NSPhotoLibraryUsageDescription:
          'We need access to your photos to identify fish species.',
        NSLocationWhenInUseUsageDescription:
          'We use your location to tag your catches on the map.',
      },
      config: { googleMapsApiKey: IOS_MAPS_KEY }, // ✅ iOS Maps key
    },

    android: {
      package: ANDROID_PACKAGE, // ✅ required by prebuild
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      config: {
        googleMaps: { apiKey: ANDROID_MAPS_KEY }, // ✅ Android Maps key
      },
    },

    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },

    // No react-native-maps plugin (your version lacks a config plugin)
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
    ],

    experiments: {
      typedRoutes: true,
    },
  },
};
