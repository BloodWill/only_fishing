# 🎣 Fishing App - Developer Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [File Structure](#file-structure)
3. [Tab Screens](#tab-screens)
4. [Constants & Data](#constants--data)
5. [Libraries & Utilities](#libraries--utilities)
6. [Components](#components)
7. [How to Update](#how-to-update)
8. [API Endpoints](#api-endpoints)

---

## Project Overview

A React Native (Expo) fishing companion app that helps anglers:

- 📷 **Identify fish** using AI/ML image recognition
- 🌤️ **Check fishing conditions** with real-time weather
- 📋 **View regulations** for caught species
- 📍 **Track catches** with GPS location
- 🏆 **Compete** on the species leaderboard
- 📚 **Build a FishDex** collection

---

## File Structure

```
fishing-mobile/
├── app/                          # Expo Router - All screens
│   ├── (tabs)/                   # Bottom tab navigation
│   │   ├── _layout.tsx           # Tab configuration
│   │   ├── index.tsx             # Home screen (main)
│   │   ├── history.tsx           # Catch history
│   │   ├── personal.tsx          # Account/profile
│   │   ├── map.tsx               # Catch map
│   │   ├── rank.tsx              # Leaderboard
│   │   └── dex.tsx               # FishDex (not in nav)
│   ├── catch/                    # Catch detail screens
│   │   ├── [id].tsx              # Remote catch detail
│   │   └── local/[local_id].tsx  # Local catch detail
│   ├── personal/                 # Personal sub-screens
│   │   ├── _layout.tsx           # Stack layout
│   │   ├── index.tsx             # Account home
│   │   └── collection.tsx        # User's collection
│   └── _layout.tsx               # Root layout
│
├── constants/                    # Static data & config
│   ├── index.ts                  # Barrel export + app config
│   ├── fishData.ts               # Fish species & regulations
│   └── weather.ts                # Weather utilities
│
├── lib/                          # Utility libraries
│   ├── api.ts                    # API client
│   ├── storage.ts                # AsyncStorage helpers
│   ├── sync.ts                   # Data synchronization
│   └── user.ts                   # User ID management
│
├── components/                   # Reusable components
│   ├── ui/                       # Basic UI elements
│   ├── HapticTab.tsx             # Tab with haptic feedback
│   └── top3Picker.tsx            # AI prediction picker
│
├── assets/                       # Static assets
│   ├── species/                  # Species data files
│   │   └── species_na.json       # North America species list
│   └── fonts/                    # Custom fonts
│
└── config.ts                     # API base URL configuration
```

---

## Tab Screens

### 1. Home (`app/(tabs)/index.tsx`)

**Purpose:** Main screen with fish identification, weather, and species browsing.

**Features:**
| Feature | Description |
|---------|-------------|
| Search Button | Opens species search modal |
| Capture Button | Take photo or pick from gallery |
| AI Prediction | Shows model's species guess with confidence |
| Species Confirm | User confirms or corrects AI prediction |
| Regulations Modal | Shows size limits, daily limits, season |
| Weather Card | 3-page carousel with fishing conditions |
| In Season Section | 2x2 grid of high-activity fish |
| Common Fish Section | 3x2 grid of all fish |

**Key State:**
```typescript
weather          // Current weather data
location         // User's location
prediction       // AI model prediction
selectedSpecies  // User's confirmed species
confirmOpen      // Species picker modal visibility
regulationsModal // Regulations modal visibility
```

**How to Update:**
- Add new UI sections: Edit JSX in return statement
- Change weather display: Modify `WeatherCard` component
- Modify fish grids: Adjust `FishSection` component
- Update button actions: Edit `pickAndUpload`, `saveLabel` functions

---

### 2. History (`app/(tabs)/history.tsx`)

**Purpose:** View and manage all caught fish (local + remote).

**Features:**
| Feature | Description |
|---------|-------------|
| Catch List | Shows all catches with thumbnails |
| Status Badges | "Local" (orange) or "Online" (green) |
| Pull to Refresh | Syncs pending catches, reloads list |
| Upload Button | Upload local catch to server |
| Delete | Long-press or tap delete button |
| Detail Navigation | Tap to view full catch details |

**Data Flow:**
```
1. Load local catches from AsyncStorage
2. If logged in, fetch remote catches from API
3. Merge & dedupe by composite key (local_id or remote id)
4. Display sorted by date (newest first)
```

**How to Update:**
- Change list item layout: Modify `renderItem` function
- Add new actions: Add buttons in `renderItem`
- Change sort order: Modify `dedupeByKey` or sort logic
- Add filters: Add filter state and apply to `items`

---

### 3. Personal (`app/(tabs)/personal.tsx`)

**Purpose:** Account management and settings.

**Features:**
| Feature | Description |
|---------|-------------|
| Sign In | Enter user ID (email/username) |
| Guest Mode | Generate random guest ID |
| Sign Out | Clear user ID, go to local-only mode |
| Collection Link | Navigate to user's FishDex |

**How to Update:**
- Add new settings: Add state and UI elements
- Change auth flow: Modify `onSave`, `onGuest`, `onSignOut`
- Add profile fields: Extend user data in `lib/user.ts`

---

### 4. Map (`app/(tabs)/map.tsx`)

**Purpose:** Visual map of all catch locations.

**Features:**
| Feature | Description |
|---------|-------------|
| Map View | Google Maps (Android) / Apple Maps (iOS) |
| Markers | Each catch with coordinates |
| Current Location | Blue dot showing user position |
| Auto-fit | Zooms to show all markers |
| Debug Overlay | Shows connection status (dev only) |

**How to Update:**
- Change marker style: Modify `<Marker>` component
- Add marker clustering: Install `react-native-map-clustering`
- Add custom info windows: Use `<Callout>` component
- Remove debug overlay: Delete the debug `<View>` section

---

### 5. Rank (`app/(tabs)/rank.tsx`)

**Purpose:** Leaderboard showing top collectors by unique species.

**Features:**
| Feature | Description |
|---------|-------------|
| User Rankings | Sorted by unique species count |
| Current User Highlight | Blue background, "YOU" badge |
| Auto-scroll | Scrolls to user's position if far down |
| Pull to Refresh | Reload rankings |

**API Endpoint:** `GET /stats/users-unique-species`

**How to Update:**
- Change ranking criteria: Modify API endpoint
- Add more stats: Extend `Row` type and display
- Change highlight style: Modify `isMe` styling

---

### 6. Dex (`app/(tabs)/dex.tsx`)

**Purpose:** Pokédex-style species collection tracker.

**Status:** ⚠️ File exists but NOT in tab navigation.

**Features:**
| Feature | Description |
|---------|-------------|
| Progress Bar | Shows X/Y species found |
| Species Grid | 3-column grid of all NA species |
| Found Status | Green = caught, Gray = not caught |
| Data Source | `species_na.json` master list |

**To Enable:** Add to `app/(tabs)/_layout.tsx`:
```typescript
<Tabs.Screen
  name="dex"
  options={{
    title: 'FishDex',
    tabBarIcon: ({ color }) => (
      <IconSymbol size={28} name="book.fill" color={color} />
    ),
  }}
/>
```

---

## Constants & Data

### `constants/fishData.ts`

**Purpose:** All fish species data and fishing regulations.

**Exports:**
| Export | Type | Description |
|--------|------|-------------|
| `ALL_FISH` | `FishData[]` | Complete list of fish species |
| `IN_SEASON_FISH` | `FishData[]` | Fish with "High" activity |
| `COMMON_FISH` | `FishData[]` | Same as ALL_FISH |
| `FISHING_REGULATIONS` | `Record<string, FishingRegulation>` | Size limits, daily limits |
| `getActivityColor()` | `function` | Returns color for activity level |
| `getFishById()` | `function` | Find fish by ID |
| `getFishByName()` | `function` | Find fish by name |

**FishData Type:**
```typescript
type FishData = {
  id: string;           // Unique identifier
  name: string;         // Display name
  activity: "High" | "Medium" | "Low";
  icon: string;         // Emoji
  description: string;  // About the fish
  habitat: string;      // Where to find
  bestTime: string;     // When to fish
  avgSize: string;      // Typical size range
  bait: string;         // Recommended bait
  waterType?: "freshwater" | "saltwater" | "brackish";
  difficulty?: "beginner" | "intermediate" | "advanced";
};
```

**How to Add a New Fish:**
```typescript
// In ALL_FISH array:
{
  id: "muskie",
  name: "Muskellunge",
  activity: "Low",
  icon: "🐊",
  description: "The fish of 10,000 casts.",
  habitat: "Clear, weedy lakes",
  bestTime: "Fall mornings",
  avgSize: "30-50 inches",
  bait: "Large swimbaits, bucktails",
  waterType: "freshwater",
  difficulty: "advanced",
},

// In FISHING_REGULATIONS:
"Muskellunge": {
  minSize: "36 inches",
  dailyLimit: 1,
  season: "June 1 - Dec 31",
  notes: "Trophy fish - catch and release encouraged",
},
```

---

### `constants/weather.ts`

**Purpose:** Weather utilities and fishing condition calculations.

**Exports:**
| Export | Type | Description |
|--------|------|-------------|
| `getMoonPhase()` | `function` | Current moon phase with icon |
| `getWindDirection()` | `function` | Degrees to compass direction |
| `getAirQualityInfo()` | `function` | AQI to label and color |
| `calculateFishingCondition()` | `function` | Weather factors to rating |
| `getConditionColor()` | `function` | Rating to color |
| `CONDITION_COLORS` | `object` | Color map for ratings |
| `MOON_PHASES` | `array` | All moon phases with fishing ratings |

**How to Modify Fishing Condition Algorithm:**
```typescript
// In calculateFishingCondition():
export const calculateFishingCondition = (factors: ConditionFactors) => {
  let score = 0;
  
  // Adjust temperature scoring
  if (temperature >= 60 && temperature <= 75) score += 3;  // Change range
  
  // Add new factor (e.g., tide)
  if (factors.tidePhase === "incoming") score += 2;
  
  // Adjust thresholds
  if (score >= 10) return "Excellent";  // Raise threshold
  if (score >= 6) return "Good";
  // ...
};
```

---

### `constants/index.ts`

**Purpose:** Barrel export and app-wide configuration.

**Exports:**
| Export | Description |
|--------|-------------|
| `* from './fishData'` | Re-exports all fish data |
| `* from './weather'` | Re-exports all weather utils |
| `APP_CONFIG` | API, image, location settings |
| `COLORS` | Theme color palette |
| `LAYOUT` | Padding, gaps, border radius |
| `FALLBACK_WEATHER` | Default weather when API fails |

**How to Add New Colors:**
```typescript
export const COLORS = {
  // ... existing colors
  
  // Add new colors:
  gold: "#FFD700",
  bronze: "#CD7F32",
  silver: "#C0C0C0",
};
```

---

## Libraries & Utilities

### `lib/storage.ts`

**Purpose:** Local catch storage using AsyncStorage.

**Functions:**
| Function | Description |
|----------|-------------|
| `getLocalCatches()` | Get all catches from device |
| `addLocalCatch(catch)` | Save new catch locally |
| `updateLocalCatch(id, updates)` | Update existing catch |
| `removeLocalCatch(id)` | Delete a local catch |

**LocalCatch Type:**
```typescript
type LocalCatch = {
  local_id: string;           // Unique local identifier
  local_uri: string;          // file:// path to image
  species_label: string;      // Species name
  species_confidence: number; // AI confidence (0-1)
  created_at: string;         // ISO date string
  remote_id?: number;         // Server ID if synced
  synced: boolean;            // Whether uploaded to server
  lat?: number;               // GPS latitude
  lng?: number;               // GPS longitude
};
```

---

### `lib/user.ts`

**Purpose:** User ID management.

**Functions:**
| Function | Description |
|----------|-------------|
| `getUserId()` | Get current user ID (or null) |
| `setUserId(id)` | Save user ID |
| `clearUserId()` | Sign out (remove ID) |

---

### `lib/sync.ts`

**Purpose:** Sync local catches to server.

**Functions:**
| Function | Description |
|----------|-------------|
| `syncPending(userId)` | Upload all unsynced local catches |

---

### `lib/api.ts`

**Purpose:** API client for fish identification.

**Functions:**
| Function | Description |
|----------|-------------|
| `predictFish(imageUri, mimeType)` | Send image to AI model |
| `sendFeedback(data)` | Send user's species correction |

---

## Components

### `components/top3Picker.tsx`

**Purpose:** Modal to choose from AI's top 3 predictions.

**Props:**
```typescript
{
  visible: boolean;
  topk: TopKItem[];        // Top predictions
  onChoose: (id) => void;  // User selection callback
  onCancel: () => void;    // Close modal
}
```

---

## How to Update

### Adding a New Fish Species

1. **Open** `constants/fishData.ts`
2. **Add to ALL_FISH:**
   ```typescript
   {
     id: "unique-id",
     name: "Fish Name",
     activity: "High",  // or "Medium" or "Low"
     icon: "🐟",
     description: "Description here",
     habitat: "Where found",
     bestTime: "When to fish",
     avgSize: "Size range",
     bait: "Recommended bait",
   },
   ```
3. **Add regulation:**
   ```typescript
   "Fish Name": {
     minSize: "12 inches",
     dailyLimit: 5,
     season: "Year-round",
     notes: "Special notes",
   },
   ```
4. **Save** - Fish automatically appears in app!

---

### Changing Weather Thresholds

1. **Open** `constants/weather.ts`
2. **Find** `calculateFishingCondition`
3. **Modify** scoring logic:
   ```typescript
   // Change ideal temperature range
   if (temperature >= 55 && temperature <= 80) score += 3;
   
   // Change rating thresholds
   if (score >= 9) return "Excellent";
   ```

---

### Adding a New Tab Screen

1. **Create** `app/(tabs)/newtab.tsx`:
   ```typescript
   export default function NewTab() {
     return <View><Text>New Tab</Text></View>;
   }
   ```

2. **Register in** `app/(tabs)/_layout.tsx`:
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

---

### Modifying the Home Screen Layout

1. **Open** `app/(tabs)/index.tsx`
2. **Find** the return statement (JSX)
3. **Sections to modify:**
   - Top buttons: `<View style={styles.topButtonsRow}>`
   - Preview: `{previewUri && (...)}`
   - Weather: `<WeatherCard ... />`
   - Fish grids: `<FishSection ... />`

---

### Changing API Endpoints

1. **Open** `config.ts`
2. **Update** `API_BASE`:
   ```typescript
   export const API_BASE = "https://your-api.com";
   ```

---

### Adding New Catch Data Fields

1. **Update** `lib/storage.ts` LocalCatch type
2. **Update** upload in `index.tsx` pickAndUpload()
3. **Update** display in `history.tsx` renderItem()
4. **Update** detail pages in `catch/[id].tsx`

---

## API Endpoints

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

---

## Environment Variables

Create a `.env` file (not committed to git):

```env
# API Configuration
API_BASE=http://your-server:8000

# Google APIs
GOOGLE_WEATHER_API_KEY=your-key-here
GOOGLE_GEOCODING_API_KEY=your-key-here
```

Update `constants/index.ts` or create `config.ts` to read these.

---

## Quick Reference

| Task | File to Edit |
|------|--------------|
| Add new fish | `constants/fishData.ts` |
| Change weather logic | `constants/weather.ts` |
| Modify home screen | `app/(tabs)/index.tsx` |
| Change history display | `app/(tabs)/history.tsx` |
| Update API URL | `config.ts` |
| Add new tab | `app/(tabs)/_layout.tsx` + new file |
| Modify catch storage | `lib/storage.ts` |
| Change colors | `constants/index.ts` → COLORS |

---

## Need Help?

- **Expo Docs:** https://docs.expo.dev
- **React Navigation:** https://reactnavigation.org
- **React Native Maps:** https://github.com/react-native-maps/react-native-maps

---

*Last updated: December 2024*
