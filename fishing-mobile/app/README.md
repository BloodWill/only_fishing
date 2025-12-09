# 🎣 FishDex - AI-Powered Fishing Companion App

A React Native (Expo) mobile application that helps anglers identify fish species using AI, track their catches, view local fishing regulations, and compete on leaderboards.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Getting Started](#getting-started)
6. [Architecture](#architecture)
7. [Code Maintenance Guide](#code-maintenance-guide)
8. [API Reference](#api-reference)
9. [Configuration](#configuration)
10. [Troubleshooting](#troubleshooting)

---

## Overview

FishDex is a "Pokédex for fishing" that combines AI-powered fish identification with catch tracking, weather conditions, and gamification features. Users can photograph their catches, get instant species identification, view regulations, and compete with other anglers.

### Core Capabilities

| Feature | Description |
|---------|-------------|
| 📷 **AI Fish ID** | Upload or capture photos for instant species identification |
| 🌤️ **Weather** | Real-time fishing conditions with 7-day forecast |
| 📋 **Regulations** | Species-specific size limits, daily limits, and seasons |
| 📍 **GPS Tracking** | Location-tagged catches with map visualization |
| 🏆 **Leaderboard** | Compete by unique species caught |
| 📚 **Collection** | FishDex tracking caught vs. uncaught species |
| 🔄 **Offline-First** | Works without internet, syncs when connected |

---

## Features

### Home Screen
- **Capture Button**: Take photo or select from gallery
- **AI Prediction**: Model identifies species with confidence score
- **Species Confirmation**: User confirms or corrects prediction
- **Regulations Modal**: Shows fishing rules after saving
- **Weather Card**: 3-page carousel with fishing conditions
- **Fish Sections**: "In Season" and "Common Fish" grids

### Fish Index (Collection)
- **Collection Tab**: Grid of all 30 species with caught/uncaught status
- **History Tab**: All catches (local + synced) with upload/delete actions
- **Badges Tab**: Achievement system with progress tracking
- **Rarity System**: Common → Uncommon → Rare → Epic → Legendary

### Rankings
- Global leaderboard by unique species count
- Location filtering (state, city)
- User profile cards with stats

### Account
- Simple user ID authentication
- Guest mode with random ID
- Profile settings
- Subscription placeholder

---

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React Native | Cross-platform mobile framework |
| Expo (SDK 52+) | Development tooling & native APIs |
| Expo Router | File-based navigation |
| TypeScript | Type safety |
| AsyncStorage | Local data persistence |

### Backend (Separate Repository)
| Technology | Purpose |
|------------|---------|
| FastAPI | Python REST API |
| SQLite | Database |
| PyTorch/ONNX | ML model inference |
| Open-Meteo | Weather data |

### Key Libraries
```json
{
  "expo-image-picker": "Camera & gallery access",
  "expo-location": "GPS coordinates",
  "expo-linear-gradient": "UI gradients",
  "react-native-maps": "Map visualization",
  "@react-native-async-storage/async-storage": "Local storage"
}
```

---

## Project Structure

```
fishing-mobile/
├── app/                              # Expo Router - All screens
│   ├── (tabs)/                       # Bottom tab navigation
│   │   ├── _layout.tsx               # Tab configuration (4 visible tabs)
│   │   ├── index.tsx                 # 🏠 Home screen (main)
│   │   ├── fishindex.tsx             # 📚 Collection/History/Badges
│   │   ├── rank.tsx                  # 🏆 Leaderboard
│   │   ├── personal.tsx              # 👤 Account settings
│   │   ├── map.tsx                   # 🗺️ Catch map (hidden tab)
│   │   ├── history.tsx               # 📅 (merged into fishindex)
│   │   └── dex.tsx                   # (merged into fishindex)
│   │
│   ├── catch/                        # Catch detail screens
│   │   ├── [id].tsx                  # Remote catch detail
│   │   └── local/
│   │       └── [local_id].tsx        # Local catch detail
│   │
│   ├── personal/                     # Personal sub-screens
│   │   ├── _layout.tsx               # Stack layout
│   │   ├── index.tsx                 # Account home
│   │   └── collection.tsx            # User's FishDex
│   │
│   ├── tools/
│   │   └── ai-playground.tsx         # AI testing screen
│   │
│   ├── _layout.tsx                   # Root layout
│   ├── +not-found.tsx                # 404 screen
│   ├── README.md                     # Developer docs
│   └── APP_MAINTENANCE_GUIDE.md      # Maintenance best practices
│
├── constants/                        # 📦 Static data & config
│   ├── index.ts                      # Barrel export + app config
│   ├── fishData.ts                   # Fish species (30) & regulations
│   ├── weather.ts                    # Weather utilities & calculations
│   └── Colors.ts                     # Theme colors
│
├── lib/                              # 🔧 Utility libraries
│   ├── api.ts                        # API client (/predict, /feedback)
│   ├── storage.ts                    # AsyncStorage helpers (LocalCatch)
│   ├── sync.ts                       # Offline-to-server sync
│   ├── user.ts                       # User ID management
│   ├── auth.ts                       # Auth context (placeholder)
│   ├── config.ts                     # API base URL
│   └── upload.ts                     # Upload catch to server
│
├── components/                       # 🧱 Reusable components
│   ├── ui/                           # Basic UI elements
│   │   ├── IconSymbol.tsx            # SF Symbols / Material Icons
│   │   ├── IconSymbol.ios.tsx        # iOS-specific icons
│   │   ├── TabBarBackground.tsx      # Tab bar styling
│   │   └── TabBarBackground.ios.tsx  # iOS blur effect
│   ├── top3Picker.tsx                # AI prediction picker modal
│   ├── CatchCard.tsx                 # Catch list item
│   ├── HapticTab.tsx                 # Tab with haptic feedback
│   ├── ThemedText.tsx                # Theme-aware text
│   ├── ThemedView.tsx                # Theme-aware view
│   ├── Collapsible.tsx               # Expandable section
│   ├── HelloWave.tsx                 # Animated wave emoji
│   ├── ParallaxScrollView.tsx        # Parallax header scroll
│   └── ExternalLink.tsx              # In-app browser link
│
├── hooks/                            # 🪝 Custom React hooks
│   ├── useColorScheme.ts             # System color scheme
│   ├── useColorScheme.web.ts         # Web-specific
│   └── useThemeColor.ts              # Theme color utility
│
├── types/                            # 📝 TypeScript types
│   └── catch.ts                      # CatchItem type
│
├── assets/                           # 📁 Static assets
│   ├── fonts/                        # Custom fonts
│   ├── images/                       # App icons, splash
│   └── species/                      # Species data files
│       └── species_na.json           # North America species
│
├── config.ts                         # API_BASE configuration
├── app.config.js                     # Expo configuration
├── package.json                      # Dependencies
├── tsconfig.json                     # TypeScript config
└── babel.config.js                   # Babel config
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Android Studio (for Android emulator) or Xcode (for iOS)
- Backend server running (see backend repo)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd fishing-mobile

# Install dependencies
npm install

# Configure API endpoint
# Edit config.ts and set API_BASE to your backend URL
```

### Running the App

```bash
# Start Expo development server
npx expo start

# Run on Android
npx expo start --android

# Run on iOS
npx expo start --ios

# Run in web browser
npx expo start --web
```

### Environment Setup

Create a `.env` file (optional, for API keys):

```env
# Google APIs (optional - used for weather and geocoding)
EXPO_PUBLIC_GOOGLE_WEATHER_API_KEY=your-key-here
EXPO_PUBLIC_GOOGLE_GEOCODING_API_KEY=your-key-here

# Google Maps (required for map view)
EXPO_PUBLIC_ANDROID_MAPS_KEY=your-android-key
EXPO_PUBLIC_IOS_MAPS_KEY=your-ios-key
```

---

## Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                        │
│  Home │ Fish Index │ Rankings │ Account │ Map │ Detail      │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                         STATE LAYER                          │
│  React useState/useEffect │ AsyncStorage │ Context          │
└────────────────────────────┬────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
┌────────────────┐  ┌───────────────┐  ┌──────────────┐
│  LOCAL STORAGE │  │   SYNC LAYER  │  │   CONSTANTS  │
│  lib/storage   │  │   lib/sync    │  │  constants/  │
│  AsyncStorage  │◄─┤   lib/api     │  │  fishData    │
│  LocalCatch[]  │  │   lib/upload  │  │  weather     │
└────────────────┘  └───────┬───────┘  └──────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │  FASTAPI BACKEND │
                   │  /fish/identify  │
                   │  /catches        │
                   │  /species        │
                   │  /stats          │
                   └─────────────────┘
```

### Offline-First Strategy

1. **Capture**: Photo saved locally with `LocalCatch` record
2. **Identify**: ML prediction returned (may fail offline)
3. **Store**: Catch saved to AsyncStorage immediately
4. **Sync**: When user is signed in + online, upload pending catches
5. **Merge**: Remote and local catches deduplicated for display

### Key Types

```typescript
// Local catch storage (lib/storage.ts)
type LocalCatch = {
  local_id: string;           // Unique device ID
  local_uri: string;          // file:// path to image
  species_label: string;      // Species name
  species_confidence: number; // 0-1 confidence
  created_at: string;         // ISO timestamp
  remote_id?: number;         // Server ID when synced
  synced?: boolean;           // Upload status
};

// Fish species data (constants/fishData.ts)
type FishData = {
  id: string;
  name: string;
  activity: "High" | "Medium" | "Low";
  rarity: "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";
  points: number;
  icon: string;
  description: string;
  habitat: string;
  bestTime: string;
  avgSize: string;
  bait: string;
};
```

---

## Code Maintenance Guide

### 🐟 Adding a New Fish Species

**Single file edit:** `constants/fishData.ts`

1. Add to `ALL_FISH` array:
```typescript
{
  id: "new-fish-id",
  name: "New Fish Name",
  activity: "Medium",
  rarity: "Uncommon",
  points: 25,
  icon: "🐟",
  description: "Description here",
  habitat: "Where found",
  bestTime: "When to fish",
  avgSize: "Size range",
  bait: "Recommended bait",
},
```

2. Add regulation to `FISHING_REGULATIONS`:
```typescript
"New Fish Name": {
  minSize: "12 inches",
  dailyLimit: 5,
  season: "Year-round",
  notes: "Special notes",
},
```

3. **Done!** Fish automatically appears in:
   - In Season section (if High activity)
   - Common Fish section
   - Collection grid
   - Species picker
   - Regulations modal

### 🌤️ Modifying Weather Logic

**File:** `constants/weather.ts`

Change fishing condition algorithm:
```typescript
// In calculateFishingCondition():
export const calculateFishingCondition = (factors: ConditionFactors) => {
  let score = 0;
  
  // Adjust ideal temperature range
  if (temperature >= 55 && temperature <= 80) score += 3;
  
  // Change rating thresholds
  if (score >= 9) return "Excellent";
  if (score >= 6) return "Good";
  // ...
};
```

### 📱 Adding a New Tab Screen

1. Create file: `app/(tabs)/newtab.tsx`
```typescript
export default function NewTab() {
  return <View><Text>New Tab</Text></View>;
}
```

2. Register in `app/(tabs)/_layout.tsx`:
```typescript
<Tabs.Screen
  name="newtab"
  options={{
    title: 'New Tab',
    tabBarIcon: ({ color }) => (
      <IconSymbol size={28} name="star.fill" color={color} />
    ),
  }}
/>
```

### 🔗 Changing API Endpoints

**File:** `config.ts`

```typescript
export const API_BASE = "https://your-production-api.com";
```

### 📊 Quick Reference

| Task | File to Edit |
|------|--------------|
| Add fish species | `constants/fishData.ts` |
| Change weather logic | `constants/weather.ts` |
| Modify home screen | `app/(tabs)/index.tsx` |
| Update collection | `app/(tabs)/fishindex.tsx` |
| Change API URL | `config.ts` |
| Add new tab | `app/(tabs)/_layout.tsx` + new file |
| Modify catch storage | `lib/storage.ts` |
| Change theme colors | `constants/index.ts` → COLORS |

---

## API Reference

### Backend Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/fish/identify` | POST | Upload image for AI identification |
| `/catches` | GET | Get user's catches |
| `/catches` | POST | Create new catch |
| `/catches/:id` | GET | Get catch details |
| `/catches/:id` | PATCH | Update catch |
| `/catches/:id` | DELETE | Delete catch |
| `/species` | GET | Get all species list |
| `/species/users/:id/collection` | GET | Get user's FishDex |
| `/stats/users-unique-species` | GET | Get leaderboard |
| `/predict` | POST | AI prediction only |
| `/feedback` | POST | User correction feedback |

### Request/Response Examples

**Identify Fish:**
```bash
POST /fish/identify
Content-Type: multipart/form-data

file: <image>
user_id: "user123"
persist: "true"
latitude: 42.3601
longitude: -71.0589
```

**Response:**
```json
{
  "saved_path": "/assets/uploads/abc123.jpg",
  "prediction": {
    "label": "Largemouth Bass",
    "confidence": 0.92
  },
  "catch_id": 42,
  "lat": 42.3601,
  "lng": -71.0589,
  "weather": { ... }
}
```

---

## Configuration

### `config.ts`
```typescript
export const API_BASE = "http://192.168.1.161:8000";
```

### `app.config.js`
Key settings:
- `expo.ios.bundleIdentifier`: iOS app ID
- `expo.android.package`: Android package name
- `expo.ios.config.googleMapsApiKey`: iOS Maps key
- `expo.android.config.googleMaps.apiKey`: Android Maps key

### `constants/index.ts`
App-wide configuration:
```typescript
export const APP_CONFIG = {
  api: { timeout: 10000, retryAttempts: 3 },
  image: { quality: 0.9 },
  location: { timeout: 15000 },
};

export const COLORS = {
  primary: "#0891b2",
  success: "#22c55e",
  // ...
};
```

---

## Troubleshooting

### Common Issues

**GPS not working on emulator:**
1. Open Extended Controls (...) in emulator
2. Go to Location tab
3. Set coordinates and click "Set Location"
4. Or cold boot the emulator

**Map not showing:**
- Verify Google Maps API key in `app.config.js`
- Check API key has Maps SDK enabled in Google Cloud Console
- Run `npx expo prebuild` after changing config

**Images not loading from server:**
- Check `API_BASE` in `config.ts` matches your backend
- Verify backend is running and accessible
- Check CORS settings on backend

**Sync not working:**
- User must be signed in (check `getUserId()`)
- Check network connectivity
- Look at console logs for specific errors

### Debug Tips

```typescript
// Enable verbose logging in sync.ts
console.log("sync: uploading", localCatch.local_id);

// Check AsyncStorage contents
import AsyncStorage from "@react-native-async-storage/async-storage";
const data = await AsyncStorage.getItem("@fish/catches:v1");
console.log(JSON.parse(data));
```

---

## Contributing

1. Follow the existing code style
2. Keep components under 300 lines
3. Add new fish to `constants/fishData.ts` only
4. Test offline functionality
5. Update README for significant changes

---

## License

Proprietary - All rights reserved

---

*Last updated: December 2024*
