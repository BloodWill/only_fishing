// app/(tabs)/index.tsx
// ===========================================
// HOME SCREEN - FULLY UPDATED WITH FIXES
// ===========================================
// Changes applied:
// 1. ✅ Removed hardcoded API keys
// 2. ✅ Import keys from centralized config
// 3. ✅ Proper error handling with fallbacks
// 4. ✅ Better console logging for debugging

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  TextInput,
  ScrollView,
  StyleSheet,
  Dimensions,
  StatusBar,
  Keyboard,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as Location from "expo-location";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ===========================================
// ✅ FIXED: Import from centralized config
// ===========================================
import {
  API_BASE,
  GOOGLE_WEATHER_KEY,
  GOOGLE_GEOCODING_KEY,
  bust,
} from "@/lib/config";

import { addLocalCatch, updateLocalCatch, LocalCatch } from "@/lib/storage";
import { getUserId } from "@/lib/user";

// Import constants from centralized location
import {
  ALL_FISH,
  IN_SEASON_FISH,
  COMMON_AREA_FISH,
  FISHING_REGULATIONS,
  getActivityColor,
  getFishByName,
  type FishData,
  type FishingRegulation,
} from "@/constants/fishData";
import {
  getMoonPhase,
  getWindDirection,
  getAirQualityInfo,
  calculateFishingCondition,
  getConditionColor,
} from "@/constants/weather";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PADDING = 16;
const GAP = 8;
const WEATHER_ITEM_WIDTH = (SCREEN_WIDTH - PADDING * 2 - 20 - GAP) / 2;

// ===========================================
// ✅ REMOVED: Hardcoded API keys
// ===========================================
// OLD CODE (DELETED):
// const GOOGLE_WEATHER_API_KEY = "";
// const GOOGLE_GEOCODING_API_KEY = "";
//
// Keys now come from config.ts via environment variables

// Types
type IdentifyResponse = {
  saved_path: string | null;
  prediction: { label?: string; confidence?: number } | null;
  catch_id?: number | null;
};

type SpeciesItem = { id: number; common_name: string; icon_path?: string | null };

type WeatherData = {
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

type LocationData = {
  lat: number | null;
  lng: number | null;
  city: string | null;
  region: string | null;
  formattedAddress: string | null;
  isLoading: boolean;
  isCurrentLocation: boolean;
};

type PlacePrediction = {
  place_id: string;
  description: string;
  structured_formatting: { main_text: string; secondary_text: string };
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

// Fallback species list for the picker
const FALLBACK_SPECIES: SpeciesItem[] = ALL_FISH.map((f, i) => ({ id: -(i + 1), common_name: f.name }));

// ===========================================
// HELPER FUNCTIONS
// ===========================================
function dedupeMerge(server: SpeciesItem[], fallback: SpeciesItem[]): SpeciesItem[] {
  const seen = new Set<string>();
  const out: SpeciesItem[] = [];
  server.forEach((s) => { const k = s.common_name.trim().toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(s); } });
  fallback.forEach((s) => { const k = s.common_name.trim().toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(s); } });
  return out.sort((a, b) => a.common_name.localeCompare(b.common_name));
}

async function copyToPersistent(uri: string) {
  const dir = FileSystem.documentDirectory + "catches/";
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
  const dest = dir + (uri.split("/").pop() || `photo_${Date.now()}.jpg`);
  try { await FileSystem.copyAsync({ from: uri, to: dest }); return dest; } catch { return uri; }
}

async function getCurrentLatLng(): Promise<{ lat: number | null; lng: number | null }> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    console.log("Location permission status:", status);
    if (status !== "granted") {
      console.log("Location permission denied");
      return { lat: null, lng: null };
    }
    
    const loc = await Location.getCurrentPositionAsync({});
    console.log("Got location:", loc.coords.latitude, loc.coords.longitude);
    return { lat: loc.coords.latitude, lng: loc.coords.longitude };
  } catch (e) {
    console.error("Location error:", e);
    return { lat: null, lng: null };
  }
}

// ===========================================
// ✅ FIXED: GEOCODING FUNCTIONS - Use config keys
// ===========================================
async function reverseGeocodeGoogle(lat: number, lng: number): Promise<Partial<LocationData>> {
  // ✅ Use centralized API key from config
  const apiKey = GOOGLE_GEOCODING_KEY || GOOGLE_WEATHER_KEY;
  
  // Always try Expo's built-in geocoding first (no API key needed)
  try {
    console.log("Trying Expo reverse geocode for:", lat, lng);
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (results && results.length > 0) {
      const place = results[0];
      console.log("Expo geocode result:", place);
      return {
        city: place.city || place.subregion || place.district || null,
        region: place.region || null,
        formattedAddress: [place.city || place.subregion, place.region].filter(Boolean).join(", ") || null,
      };
    }
  } catch (e) {
    console.error("Expo geocode error:", e);
  }

  // Fallback to Google if Expo fails and we have an API key
  if (apiKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === "OK" && data.results?.length > 0) {
        let city = null, region = null;
        for (const c of data.results[0].address_components || []) {
          if (c.types.includes("locality")) city = c.long_name;
          else if (c.types.includes("administrative_area_level_1")) region = c.short_name;
        }
        return { city, region, formattedAddress: [city, region].filter(Boolean).join(", ") };
      }
    } catch (e) {
      console.error("Google geocode error:", e);
    }
  }

  return { city: null, region: null, formattedAddress: null };
}

async function searchPlaces(query: string): Promise<PlacePrediction[]> {
  // ✅ Use centralized API key from config
  const apiKey = GOOGLE_GEOCODING_KEY || GOOGLE_WEATHER_KEY;
  if (!apiKey || query.trim().length < 2) return [];
  try {
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=(cities)&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === "OK") return data.predictions.map((p: any) => ({ place_id: p.place_id, description: p.description, structured_formatting: p.structured_formatting || { main_text: p.description, secondary_text: "" } }));
  } catch {}
  return [];
}

async function getPlaceDetails(placeId: string): Promise<{ lat: number; lng: number } | null> {
  // ✅ Use centralized API key from config
  const apiKey = GOOGLE_GEOCODING_KEY || GOOGLE_WEATHER_KEY;
  if (!apiKey) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === "OK") return { lat: data.result.geometry.location.lat, lng: data.result.geometry.location.lng };
  } catch {}
  return null;
}

// ===========================================
// ✅ FIXED: WEATHER API FETCH - Use config key
// ===========================================
async function fetchGoogleWeather(lat: number, lng: number): Promise<WeatherData> {
  const moonPhaseInfo = getMoonPhase();
  const moonPhase = `${moonPhaseInfo.icon} ${moonPhaseInfo.name}`;
  const base: WeatherData = {
    temperature: 72, feelsLike: 70, condition: "Partly Cloudy", humidity: 65, windSpeed: 8, windDirection: "SW",
    fishingCondition: "Good", uvIndex: 4, visibility: 10, pressure: 1015, dewPoint: 55, cloudCover: 40,
    sunrise: "6:45 AM", sunset: "5:30 PM", moonPhase, airQuality: "Good", airQualityIndex: 35, waterTemp: 58,
    isLoading: false, error: null,
  };

  // ✅ Use centralized API key from config
  if (!GOOGLE_WEATHER_KEY) {
    console.log("No weather API key configured, using demo data");
    console.log("To enable live weather, set EXPO_PUBLIC_GOOGLE_WEATHER_KEY in your .env file");
    return { ...base, error: "Set EXPO_PUBLIC_GOOGLE_WEATHER_KEY in .env for live weather" };
  }

  try {
    // ✅ Use centralized API key from config
    const url = `https://weather.googleapis.com/v1/currentConditions:lookup?key=${GOOGLE_WEATHER_KEY}&location.latitude=${lat}&location.longitude=${lng}&unitsSystem=IMPERIAL`;
    console.log("Fetching weather...");
    const res = await fetch(url);
    
    if (!res.ok) {
      const errText = await res.text();
      console.error("Weather API error:", res.status, errText);
      throw new Error(`API error: ${res.status}`);
    }

    const data: GoogleWeatherResponse = await res.json();
    console.log("Weather data received");
    
    const current = data.currentConditions || data;
    if (!current?.temperature?.degrees) throw new Error("Invalid response");

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
    const waterTemp = temperature - 12 + Math.floor(Math.random() * 8);
    const airQualityIndex = 30 + Math.floor(Math.random() * 40);
    const airQualityInfo = getAirQualityInfo(airQualityIndex);

    return {
      temperature, feelsLike, condition, humidity, windSpeed, windDirection,
      fishingCondition: calculateFishingCondition({ temperature, humidity, windSpeed, condition, pressure, moonPhase: moonPhaseInfo.name }),
      uvIndex, visibility, pressure, dewPoint, cloudCover,
      sunrise: "6:45 AM", sunset: "5:30 PM", moonPhase,
      airQuality: airQualityInfo.label, airQualityIndex, waterTemp,
      isLoading: false, error: null,
    };
  } catch (e: any) {
    console.error("Weather fetch error:", e);
    return { ...base, error: e.message || "Weather fetch failed" };
  }
}

// ===========================================
// CAROUSEL INDICATOR
// ===========================================
function CarouselIndicator({ total, current }: { total: number; current: number }) {
  return (
    <View style={styles.indicatorContainer}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.indicator, i === current && styles.indicatorActive]} />
      ))}
    </View>
  );
}

// ===========================================
// LOCATION PICKER MODAL
// ===========================================
function LocationPickerModal({ visible, onClose, onSelect, onUseCurrent, currentName }: {
  visible: boolean; onClose: () => void; onSelect: (id: string, desc: string) => void; onUseCurrent: () => void; currentName: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const timeout = useRef<NodeJS.Timeout | null>(null);

  const search = (text: string) => {
    setQuery(text);
    if (timeout.current) clearTimeout(timeout.current);
    if (text.length < 2) { setResults([]); return; }
    setLoading(true);
    timeout.current = setTimeout(async () => { setResults(await searchPlaces(text)); setLoading(false); }, 300);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: "75%" }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>📍 Choose Location</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeX}><Text style={styles.closeXText}>✕</Text></TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.currentLocBtn} onPress={() => { onUseCurrent(); setQuery(""); setResults([]); }}>
            <Text style={{ fontSize: 20, marginRight: 10 }}>📱</Text>
            <View style={{ flex: 1 }}><Text style={styles.currentLocLabel}>Use Current Location</Text><Text style={styles.currentLocValue}>{currentName || "Detecting..."}</Text></View>
            <Text style={{ fontSize: 16, color: "#10b981" }}>→</Text>
          </TouchableOpacity>
          <View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>or search</Text><View style={styles.dividerLine} /></View>
          <View style={styles.searchBox}>
            <Text style={{ marginRight: 8 }}>🔍</Text>
            <TextInput style={styles.searchInput} placeholder="Search city..." value={query} onChangeText={search} />
            {loading && <ActivityIndicator size="small" color="#0891b2" />}
          </View>
          <FlatList data={results} keyExtractor={(i) => i.place_id} keyboardShouldPersistTaps="handled" style={{ maxHeight: 200 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.resultItem} onPress={() => { Keyboard.dismiss(); onSelect(item.place_id, item.description); setQuery(""); setResults([]); }}>
                <Text style={{ marginRight: 8, opacity: 0.5 }}>📍</Text>
                <View><Text style={styles.resultMain}>{item.structured_formatting.main_text}</Text><Text style={styles.resultSub}>{item.structured_formatting.secondary_text}</Text></View>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

// ===========================================
// DATE TAB SELECTOR FOR WEATHER
// ===========================================
function DateTabSelector({ selectedDate, onSelectDate }: { selectedDate: Date; onSelectDate: (date: Date) => void }) {
  const dates = useMemo(() => {
    const result: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      result.push(d);
    }
    return result;
  }, []);

  const formatDay = (date: Date, index: number) => {
    if (index === 0) return "Today";
    if (index === 1) return "Tomorrow";
    return date.toLocaleDateString("en-US", { weekday: "short" });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateTabContainer} contentContainerStyle={styles.dateTabContent}>
      {dates.map((date, index) => (
        <TouchableOpacity
          key={date.toISOString()}
          style={[styles.dateTab, isSelected(date) && styles.dateTabActive]}
          onPress={() => onSelectDate(date)}
        >
          <Text style={[styles.dateTabDay, isSelected(date) && styles.dateTabDayActive]}>{formatDay(date, index)}</Text>
          <Text style={[styles.dateTabDate, isSelected(date) && styles.dateTabDateActive]}>{formatDate(date)}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ===========================================
// WEATHER CARD WITH CAROUSEL
// ===========================================
function WeatherCard({ weather, location, onLocationPress, selectedDate, onSelectDate }: { 
  weather: WeatherData; 
  location: LocationData; 
  onLocationPress: () => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}) {
  const [page, setPage] = useState(0);
  const cardWidth = SCREEN_WIDTH - PADDING * 2;

  const getCondColor = (c: string) => c === "Excellent" ? "#22c55e" : c === "Good" ? "#4ade80" : c === "Fair" ? "#eab308" : "#ef4444";
  const getAQIColor = (a: number) => a <= 50 ? "#22c55e" : a <= 100 ? "#eab308" : "#ef4444";
  const locDisplay = location.isLoading ? "Loading..." : location.city && location.region ? `${location.city}, ${location.region}` : location.city || "Select Location";
  
  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const dayName = selectedDate.toLocaleDateString("en-US", { weekday: "long" });
  const title = isToday ? "Today's Conditions" : `${dayName}'s Forecast`;

  if (weather.isLoading) {
    return <View style={styles.weatherCard}><View style={styles.weatherHeader}><Text style={styles.weatherHeaderIcon}>☁️</Text><Text style={styles.weatherTitle}>Loading...</Text></View><ActivityIndicator size="large" color="#0891b2" style={{ padding: 40 }} /></View>;
  }

  return (
    <View style={styles.weatherCard}>
      <View style={styles.weatherHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <Text style={styles.weatherHeaderIcon}>☁️</Text>
          <Text style={styles.weatherTitle}>{title}</Text>
          {!isToday && <View style={styles.forecastBadge}><Text style={styles.forecastBadgeText}>Forecast</Text></View>}
        </View>
        <TouchableOpacity style={styles.locBadge} onPress={onLocationPress}><Text style={{ fontSize: 10 }}>📍</Text><Text style={styles.locText} numberOfLines={1}>{locDisplay}</Text><Text style={{ fontSize: 8, color: "#0369a1" }}>▼</Text></TouchableOpacity>
      </View>
      
      {/* Date Tab Selector */}
      <DateTabSelector selectedDate={selectedDate} onSelectDate={onSelectDate} />
      
      {weather.error && <View style={styles.errorBanner}><Text style={styles.errorText}>⚠️ {weather.error}</Text></View>}
      
      {/* Forecast note for future dates */}
      {!isToday && (
        <View style={styles.forecastNote}>
          <Text style={styles.forecastNoteText}>📅 Predicted conditions for {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</Text>
        </View>
      )}
      
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / cardWidth))} scrollEventThrottle={16}>
        {/* Page 1 */}
        <View style={[styles.weatherPage, { width: cardWidth }]}>
          <View style={styles.weatherRow}>
            <View style={[styles.weatherItem, { borderColor: "#fed7aa" }]}><Text style={styles.wIcon}>🌡️</Text><View><Text style={styles.wLabel}>Temperature</Text><Text style={[styles.wValue, { color: "#ea580c" }]}>{weather.temperature}°F</Text></View></View>
            <View style={[styles.weatherItem, { borderColor: "#bfdbfe" }]}><Text style={styles.wIcon}>💧</Text><View><Text style={styles.wLabel}>Humidity</Text><Text style={[styles.wValue, { color: "#2563eb" }]}>{weather.humidity}%</Text></View></View>
          </View>
          <View style={styles.weatherRow}>
            <View style={[styles.weatherItem, { borderColor: "#99f6e4" }]}><Text style={styles.wIcon}>💨</Text><View><Text style={styles.wLabel}>Wind</Text><Text style={[styles.wValue, { color: "#0d9488" }]}>{weather.windSpeed} mph {weather.windDirection}</Text></View></View>
            <View style={[styles.weatherItem, { borderColor: getCondColor(weather.fishingCondition) }]}><Text style={styles.wIcon}>⭐</Text><View><Text style={styles.wLabel}>Fishing</Text><Text style={[styles.wValue, { color: getCondColor(weather.fishingCondition) }]}>{weather.fishingCondition}</Text></View></View>
          </View>
          <View style={styles.condRow}><Text style={styles.condLabel}>Weather:</Text><Text style={styles.condValue}>{weather.condition}</Text></View>
        </View>
        {/* Page 2 */}
        <View style={[styles.weatherPage, { width: cardWidth }]}>
          <View style={styles.weatherRow}>
            <View style={[styles.weatherItem, { borderColor: "#d8b4fe" }]}><Text style={styles.wIcon}>🌡️</Text><View><Text style={styles.wLabel}>Feels Like</Text><Text style={[styles.wValue, { color: "#9333ea" }]}>{weather.feelsLike}°F</Text></View></View>
            <View style={[styles.weatherItem, { borderColor: "#fde047" }]}><Text style={styles.wIcon}>☀️</Text><View><Text style={styles.wLabel}>UV Index</Text><Text style={[styles.wValue, { color: "#ca8a04" }]}>{weather.uvIndex}</Text></View></View>
          </View>
          <View style={styles.weatherRow}>
            <View style={[styles.weatherItem, { borderColor: "#d1d5db" }]}><Text style={styles.wIcon}>👁️</Text><View><Text style={styles.wLabel}>Visibility</Text><Text style={[styles.wValue, { color: "#4b5563" }]}>{weather.visibility} mi</Text></View></View>
            <View style={[styles.weatherItem, { borderColor: "#bfdbfe" }]}><Text style={styles.wIcon}>📊</Text><View><Text style={styles.wLabel}>Pressure</Text><Text style={[styles.wValue, { color: "#2563eb" }]}>{weather.pressure} hPa</Text></View></View>
          </View>
          <View style={styles.condRow}><Text style={styles.condLabel}>Dew Point:</Text><Text style={styles.condValue}>{weather.dewPoint}°F</Text></View>
        </View>
        {/* Page 3 */}
        <View style={[styles.weatherPage, { width: cardWidth }]}>
          <View style={styles.weatherRow}>
            <View style={[styles.weatherItem, { borderColor: getAQIColor(weather.airQualityIndex) }]}><Text style={styles.wIcon}>🌬️</Text><View><Text style={styles.wLabel}>Air Quality</Text><Text style={[styles.wValue, { color: getAQIColor(weather.airQualityIndex) }]}>{weather.airQuality}</Text></View></View>
            <View style={[styles.weatherItem, { borderColor: "#99f6e4" }]}><Text style={styles.wIcon}>🌊</Text><View><Text style={styles.wLabel}>Water Temp</Text><Text style={[styles.wValue, { color: "#0d9488" }]}>~{weather.waterTemp}°F</Text></View></View>
          </View>
          <View style={styles.weatherRow}>
            <View style={[styles.weatherItem, { borderColor: "#d8b4fe" }]}><Text style={styles.wIcon}>🌙</Text><View><Text style={styles.wLabel}>Moon</Text><Text style={[styles.wValue, { color: "#9333ea" }]} numberOfLines={1}>{weather.moonPhase?.split(" ")[1] || "Unknown"}</Text></View></View>
            <View style={[styles.weatherItem, { borderColor: "#fed7aa" }]}><Text style={styles.wIcon}>☁️</Text><View><Text style={styles.wLabel}>Clouds</Text><Text style={[styles.wValue, { color: "#ea580c" }]}>{weather.cloudCover}%</Text></View></View>
          </View>
          <View style={styles.condRow}><Text style={styles.condLabel}>☀️ {weather.sunrise}</Text><Text style={styles.condValue}>🌙 {weather.sunset}</Text></View>
        </View>
      </ScrollView>
      <CarouselIndicator total={3} current={page} />
    </View>
  );
}

// ===========================================
// FISH CARD (SMALL FOR 3 COLUMNS)
// ===========================================
function FishCard({ fish, onPress, width }: { fish: FishData; onPress: () => void; width: number }) {
  return (
    <TouchableOpacity style={[styles.fishCard, { width }]} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.fishIcon}>{fish.icon}</Text>
      <Text style={styles.fishName} numberOfLines={2}>{fish.name}</Text>
      <View style={[styles.activityBadge, { backgroundColor: getActivityColor(fish.activity) }]}><Text style={styles.activityText}>{fish.activity}</Text></View>
    </TouchableOpacity>
  );
}

// ===========================================
// FISH SECTION WITH 3-COLUMN GRID CAROUSEL
// ===========================================
function FishSection({ title, icon, colors, fish, onFishPress, columns = 3 }: { title: string; icon: string; colors: [string, string]; fish: FishData[]; onFishPress: (f: FishData) => void; columns?: number }) {
  const [page, setPage] = useState(0);
  const contentWidth = SCREEN_WIDTH - PADDING * 2;
  const gridPadding = 10;
  const cardGap = 8;
  const cardWidth = Math.floor((contentWidth - gridPadding * 2 - cardGap * (columns - 1)) / columns);
  const fishPerPage = columns * 2; // 2 rows
  const pages: FishData[][] = [];
  for (let i = 0; i < fish.length; i += fishPerPage) pages.push(fish.slice(i, i + fishPerPage));

  return (
    <View style={styles.sectionCard}>
      <LinearGradient colors={colors} style={styles.sectionHeader}><Text style={styles.sectionIcon}>{icon}</Text><Text style={styles.sectionTitle}>{title}</Text></LinearGradient>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / contentWidth))} scrollEventThrottle={16}>
        {pages.map((pageFish, pi) => (
          <View key={pi} style={{ width: contentWidth, padding: gridPadding }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: cardGap }}>
              {pageFish.map((f) => <FishCard key={f.id} fish={f} onPress={() => onFishPress(f)} width={cardWidth} />)}
            </View>
          </View>
        ))}
      </ScrollView>
      {pages.length > 1 && <CarouselIndicator total={pages.length} current={page} />}
    </View>
  );
}

// ===========================================
// FISH DETAIL MODAL
// ===========================================
function FishDetailModal({ fish, visible, onClose }: { fish: FishData | null; visible: boolean; onClose: () => void }) {
  if (!fish) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}><Text style={{ fontSize: 24, marginRight: 8 }}>{fish.icon}</Text><Text style={styles.modalTitle}>{fish.name}</Text></View>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ color: "#666", marginRight: 6 }}>Activity:</Text>
            <View style={[styles.activityBadge, { backgroundColor: getActivityColor(fish.activity) }]}><Text style={styles.activityText}>{fish.activity}</Text></View>
          </View>
          <ScrollView style={{ maxHeight: 260 }}>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>ℹ️ Description</Text><Text style={styles.infoText}>{fish.description}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>📍 Habitat</Text><Text style={styles.infoText}>{fish.habitat}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>🕐 Best Time</Text><Text style={styles.infoText}>{fish.bestTime}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>📏 Size</Text><Text style={styles.infoText}>{fish.avgSize}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>🪱 Bait</Text><Text style={styles.infoText}>{fish.bait}</Text></View>
          </ScrollView>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}><Text style={styles.closeBtnText}>Close</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ===========================================
// MAIN COMPONENT
// ===========================================
export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFish, setSelectedFish] = useState<FishData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [species, setSpecies] = useState<SpeciesItem[]>([]);
  const [speciesLoading, setSpeciesLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);

  const [serverImagePath, setServerImagePath] = useState<string | null>(null);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<{ label?: string; confidence?: number } | null>(null);
  const [lastLocalId, setLastLocalId] = useState<string | null>(null);
  const [lastRemoteId, setLastRemoteId] = useState<number | null>(null);

  const [weather, setWeather] = useState<WeatherData>(() => {
    const moonPhaseInfo = getMoonPhase();
    return {
      temperature: 0, feelsLike: 0, condition: "Loading...", humidity: 0, windSpeed: 0, windDirection: "N",
      fishingCondition: "Loading...", uvIndex: 0, visibility: 10, pressure: 1013, dewPoint: 0, cloudCover: 0,
      sunrise: "6:45 AM", sunset: "5:30 PM", moonPhase: `${moonPhaseInfo.icon} ${moonPhaseInfo.name}`, airQuality: "Good", airQualityIndex: 35, waterTemp: 55,
      isLoading: true, error: null,
    };
  });
  
  // Store 7-day forecast
  const [forecast, setForecast] = useState<WeatherData[]>([]);

  const [location, setLocation] = useState<LocationData>({ lat: null, lng: null, city: null, region: null, formattedAddress: null, isLoading: true, isCurrentLocation: true });
  const [deviceLoc, setDeviceLoc] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [deviceLocName, setDeviceLocName] = useState("");
  const [locPickerOpen, setLocPickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [defaultLocation, setDefaultLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [setDefaultPromptOpen, setSetDefaultPromptOpen] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);

  // Load default location from storage
  useEffect(() => {
    AsyncStorage.getItem("defaultLocation").then((stored) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setDefaultLocation(parsed);
        } catch {}
      }
    });
  }, []);

  const saveDefaultLocation = async (loc: { lat: number; lng: number; name: string }) => {
    setDefaultLocation(loc);
    await AsyncStorage.setItem("defaultLocation", JSON.stringify(loc));
  };

  // Generate 7-day forecast based on today's weather
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

  const handleDateChange = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(date);
    selected.setHours(0, 0, 0, 0);
    const dayIndex = Math.round((selected.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    setSelectedDate(date);
    setSelectedDayIndex(dayIndex);
    
    if (forecast.length > dayIndex && dayIndex >= 0) {
      setWeather(forecast[dayIndex]);
    }
  };

  const loadWeatherFor = useCallback(async (lat: number, lng: number, isCurrent: boolean) => {
    console.log("Loading weather for:", lat, lng, "isCurrent:", isCurrent);
    setWeather((p) => ({ ...p, isLoading: true }));
    setLocation((p) => ({ ...p, isLoading: true }));
    const [w, g] = await Promise.all([fetchGoogleWeather(lat, lng), reverseGeocodeGoogle(lat, lng)]);
    console.log("Weather result:", w.temperature, w.condition);
    console.log("Geocode result:", g.city, g.region);
    
    const weekForecast = generate7DayForecast(w);
    setForecast(weekForecast);
    
    setSelectedDate(new Date());
    setSelectedDayIndex(0);
    setWeather(w);
    
    setLocation({ lat, lng, city: g.city || null, region: g.region || null, formattedAddress: g.formattedAddress || null, isLoading: false, isCurrentLocation: isCurrent });
  }, [generate7DayForecast]);

  const loadCurrentLoc = useCallback(async () => {
    console.log("Loading current location...");
    setWeather((p) => ({ ...p, isLoading: true }));
    setLocation((p) => ({ ...p, isLoading: true }));
    
    try {
      const storedDefault = await AsyncStorage.getItem("defaultLocation");
      if (storedDefault) {
        const parsed = JSON.parse(storedDefault);
        if (parsed.lat && parsed.lng) {
          console.log("Using default location:", parsed.name);
          setDefaultLocation(parsed);
          await loadWeatherFor(parsed.lat, parsed.lng, false);
          return;
        }
      }
    } catch {}
    
    const { lat, lng } = await getCurrentLatLng();
    setDeviceLoc({ lat, lng });
    if (lat && lng) {
      const g = await reverseGeocodeGoogle(lat, lng);
      setDeviceLocName(g.city && g.region ? `${g.city}, ${g.region}` : g.formattedAddress || "Current Location");
      await loadWeatherFor(lat, lng, true);
    } else {
      console.log("No location available, using defaults");
      const moonPhaseInfo = getMoonPhase();
      setWeather({
        temperature: 72, feelsLike: 70, condition: "Partly Cloudy", humidity: 65, windSpeed: 8, windDirection: "SW",
        fishingCondition: "Good", uvIndex: 4, visibility: 10, pressure: 1015, dewPoint: 55, cloudCover: 40,
        sunrise: "6:45 AM", sunset: "5:30 PM", moonPhase: `${moonPhaseInfo.icon} ${moonPhaseInfo.name}`, airQuality: "Good", airQualityIndex: 35, waterTemp: 58,
        isLoading: false, error: "Location unavailable",
      });
      setLocation({ lat: null, lng: null, city: null, region: null, formattedAddress: null, isLoading: false, isCurrentLocation: false });
      setDeviceLocName("Location unavailable");
    }
  }, [loadWeatherFor]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (location.lat && location.lng) await loadWeatherFor(location.lat, location.lng, location.isCurrentLocation);
    else await loadCurrentLoc();
    setRefreshing(false);
  }, [location, loadWeatherFor, loadCurrentLoc]);

  useEffect(() => { loadCurrentLoc(); }, [loadCurrentLoc]);
  useEffect(() => { getUserId().then(setUserId); }, []);
  useFocusEffect(useCallback(() => { getUserId().then(setUserId); }, []));

  useEffect(() => {
    let alive = true;
    (async () => {
      setSpeciesLoading(true);
      try { 
        const r = await fetch(`${API_BASE}/species`); 
        if (r.ok && alive) setSpecies(dedupeMerge(await r.json(), FALLBACK_SPECIES)); 
      }
      catch { if (alive) setSpecies(FALLBACK_SPECIES); }
      finally { if (alive) setSpeciesLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const filteredSpecies = species.filter((s) => s.common_name.toLowerCase().startsWith(query.toLowerCase()));

  const handleSelectLoc = async (id: string, desc: string) => {
    setLocPickerOpen(false);
    setLocation((p) => ({ ...p, isLoading: true, formattedAddress: desc }));
    const coords = await getPlaceDetails(id);
    if (coords) {
      await loadWeatherFor(coords.lat, coords.lng, false);
      const locationName = desc.split(",")[0];
      setPendingLocation({ lat: coords.lat, lng: coords.lng, name: locationName });
      setSetDefaultPromptOpen(true);
    }
  };

  const handleUseCurrent = async () => {
    setLocPickerOpen(false);
    console.log("User requested current GPS location...");
    setWeather((p) => ({ ...p, isLoading: true }));
    setLocation((p) => ({ ...p, isLoading: true }));
    
    const { lat, lng } = await getCurrentLatLng();
    if (lat && lng) {
      setDeviceLoc({ lat, lng });
      const g = await reverseGeocodeGoogle(lat, lng);
      const locName = g.city && g.region ? `${g.city}, ${g.region}` : g.formattedAddress || "Current Location";
      setDeviceLocName(locName);
      console.log("Got GPS location:", locName);
      await loadWeatherFor(lat, lng, true);
    } else {
      console.log("GPS location unavailable");
      Alert.alert(
        "GPS Unavailable", 
        "Could not get your current location.\n\n" +
        "If using an emulator:\n" +
        "• Click (...) on emulator toolbar\n" +
        "• Go to Location tab\n" +
        "• Set coordinates and click 'Set Location'\n\n" +
        "If on a real device:\n" +
        "• Enable Location Services in Settings\n" +
        "• Try going outside or near a window",
        [
          { text: "OK", style: "cancel" },
          { text: "Use Search Instead", onPress: () => setLocPickerOpen(true) }
        ]
      );
      setWeather((p) => ({ ...p, isLoading: false }));
      setLocation((p) => ({ ...p, isLoading: false }));
    }
  };

  const handleSetDefaultConfirm = async () => {
    if (pendingLocation) {
      await saveDefaultLocation(pendingLocation);
      Alert.alert("Default Set", `${pendingLocation.name} is now your default location.`);
    }
    setSetDefaultPromptOpen(false);
    setPendingLocation(null);
  };

  const handleSetDefaultCancel = () => {
    setSetDefaultPromptOpen(false);
    setPendingLocation(null);
  };

  const pickAndUpload = async (useCamera: boolean) => {
    setPrediction(null); setServerImagePath(null); setLocalImageUri(null); setLastLocalId(null); setLastRemoteId(null); setSelectedSpecies(null); setQuery("");
    
    let res;
    if (useCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Camera permission is required to take photos");
        return;
      }
      res = await ImagePicker.launchCameraAsync({ base64: false, quality: 0.9 });
    } else {
      res = await ImagePicker.launchImageLibraryAsync({ base64: false, quality: 0.9 });
    }
    
    if (res.canceled || !res.assets?.length) return;
    let lat = deviceLoc.lat, lng = deviceLoc.lng;
    if (!lat || !lng) { const l = await getCurrentLatLng(); lat = l.lat; lng = l.lng; }
    const asset = res.assets[0];
    const uri = await copyToPersistent(asset.uri);
    setLocalImageUri(uri);
    const form = new FormData();
    form.append("file", { uri, name: uri.split("/").pop() || "photo.jpg", type: asset.mimeType || "image/jpeg" } as any);
    form.append("persist", String(!!userId));
    if (userId) form.append("user_id", userId);
    if (lat && lng) { form.append("latitude", String(lat)); form.append("longitude", String(lng)); }
    setUploading(true);
    try {
      const r = await fetch(`${API_BASE}/fish/identify`, { method: "POST", body: form, headers: { Accept: "application/json" } });
      if (!r.ok) throw new Error(`${r.status}`);
      const j: IdentifyResponse = await r.json();
      setServerImagePath(j.saved_path ?? null);
      setPrediction(j.prediction || null);
      setLastRemoteId(j.catch_id ?? null);
      const pred = (j.prediction?.label || "").trim();
      setSelectedSpecies(species.some((s) => s.common_name.toLowerCase() === pred.toLowerCase()) ? pred : null);
      const lc: LocalCatch = { local_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, local_uri: uri, species_label: pred || "Unknown", species_confidence: Number(j.prediction?.confidence ?? 0), created_at: new Date().toISOString(), remote_id: j.catch_id ?? undefined, synced: !!userId && !!j.catch_id } as LocalCatch;
      await addLocalCatch(lc);
      setLastLocalId(lc.local_id);
      setConfirmOpen(true);
    } catch (e: any) { Alert.alert("Error", e?.message || "Upload failed"); }
    finally { setUploading(false); }
  };

  const saveLabel = async () => {
    if (!lastLocalId || !selectedSpecies) { setConfirmOpen(false); return; }
    await updateLocalCatch(lastLocalId, { species_label: selectedSpecies });
    if (userId && lastRemoteId) { try { await fetch(`${API_BASE}/catches/${lastRemoteId}`, { method: "PATCH", headers: { "Content-Type": "application/json", "X-User-Id": userId }, body: JSON.stringify({ species_label: selectedSpecies }) }); } catch {} }
    setConfirmOpen(false);
    
    const savedSpecies = selectedSpecies;
    setLocalImageUri(null);
    setServerImagePath(null);
    setPrediction(null);
    setSelectedSpecies(null);
    setLastLocalId(null);
    setLastRemoteId(null);
    
    showRegulations(savedSpecies);
  };

  const previewUri = userId && serverImagePath ? bust(`${API_BASE}${serverImagePath}`) : localImageUri || undefined;

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [captureMenuOpen, setCaptureMenuOpen] = useState(false);
  const [regulationsModal, setRegulationsModal] = useState<{ species: string; visible: boolean }>({ species: "", visible: false });

  const showRegulations = (speciesName: string) => {
    setRegulationsModal({ species: speciesName, visible: true });
  };

  const pickFromGallery = async () => {
    setCaptureMenuOpen(false);
    await pickAndUpload(false);
  };

  const takePhoto = async () => {
    setCaptureMenuOpen(false);
    await pickAndUpload(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ecfeff" />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0891b2" />}>
        <View style={styles.topButtonsRow}>
          <TouchableOpacity onPress={() => setSearchModalOpen(true)} style={styles.searchBtn} activeOpacity={0.9}>
            <Text style={{ fontSize: 15 }}>🔍</Text>
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCaptureMenuOpen(true)} disabled={uploading} style={styles.captureBtn} activeOpacity={0.9}>
            {uploading ? <><ActivityIndicator color="white" size="small" style={{ marginRight: 6 }} /><Text style={styles.captureText}>Scanning...</Text></> : <><Text style={{ fontSize: 15, marginRight: 6 }}>📷</Text><Text style={styles.captureText}>Capture Your Catch</Text></>}
          </TouchableOpacity>
        </View>

        {previewUri && (
          <View style={styles.preview}>
            <Image source={{ uri: previewUri }} style={styles.previewImg} />
            {prediction && <View style={{ marginTop: 8, alignItems: "center" }}><Text style={{ fontSize: 16, fontWeight: "700", color: "#0e7490" }}>{selectedSpecies || prediction.label || "Unknown"}</Text><Text style={{ fontSize: 12, color: "#666" }}>{(Number(prediction.confidence ?? 0) * 100).toFixed(1)}%</Text></View>}
          </View>
        )}

        <WeatherCard weather={weather} location={location} onLocationPress={() => setLocPickerOpen(true)} selectedDate={selectedDate} onSelectDate={handleDateChange} />
        <FishSection title="In Season Now" icon="✨" colors={["#10b981", "#14b8a6"]} fish={IN_SEASON_FISH} onFishPress={setSelectedFish} columns={2} />
        <FishSection title="Common Fish in Your Area" icon="🌊" colors={["#06b6d4", "#3b82f6"]} fish={COMMON_AREA_FISH} onFishPress={setSelectedFish} columns={3} />

        <FishDetailModal fish={selectedFish} visible={!!selectedFish} onClose={() => setSelectedFish(null)} />
        <LocationPickerModal visible={locPickerOpen} onClose={() => setLocPickerOpen(false)} onSelect={handleSelectLoc} onUseCurrent={handleUseCurrent} currentName={deviceLocName} />

        {/* Set Default Location Prompt */}
        <Modal visible={setDefaultPromptOpen} transparent animationType="fade" onRequestClose={handleSetDefaultCancel}>
          <View style={styles.modalOverlay}>
            <View style={styles.defaultLocPrompt}>
              <Text style={styles.defaultLocIcon}>📍</Text>
              <Text style={styles.defaultLocTitle}>Set as Default Location?</Text>
              <Text style={styles.defaultLocDesc}>
                Would you like to set {pendingLocation?.name || "this location"} as your default fishing location?
              </Text>
              <Text style={styles.defaultLocSubtext}>
                The app will automatically load weather for this location when you open it.
              </Text>
              <View style={styles.defaultLocButtons}>
                <TouchableOpacity style={styles.defaultLocBtnNo} onPress={handleSetDefaultCancel}>
                  <Text style={styles.defaultLocBtnNoText}>No, thanks</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.defaultLocBtnYes} onPress={handleSetDefaultConfirm}>
                  <Text style={styles.defaultLocBtnYesText}>Yes, set default</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={confirmOpen} transparent animationType="slide" onRequestClose={() => setConfirmOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: "85%" }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Confirm Species</Text>
                <TouchableOpacity onPress={() => setConfirmOpen(false)} style={styles.closeX}><Text style={styles.closeXText}>✕</Text></TouchableOpacity>
              </View>
              
              {prediction && (
                <View style={styles.predictionSection}>
                  <Text style={styles.predictionHeader}>🤖 AI Prediction</Text>
                  <TouchableOpacity 
                    style={[styles.predictionOption, selectedSpecies === prediction.label && styles.predictionOptionSelected]}
                    onPress={() => setSelectedSpecies(prediction.label || null)}
                  >
                    <View style={styles.predictionContent}>
                      <Text style={styles.predictionLabel}>{prediction.label || "Unknown"}</Text>
                      <Text style={styles.predictionConfidence}>{(Number(prediction.confidence ?? 0) * 100).toFixed(1)}% confidence</Text>
                    </View>
                    {selectedSpecies === prediction.label && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.manualSection}>
                <Text style={styles.manualHeader}>🔍 Or select manually</Text>
                <TextInput placeholder="Search species..." value={query} onChangeText={setQuery} style={styles.speciesInput} />
              </View>
              
              {speciesLoading ? <ActivityIndicator style={{ padding: 20 }} /> : (
                <FlatList data={filteredSpecies} keyExtractor={(i) => String(i.id)} keyboardShouldPersistTaps="handled" style={{ maxHeight: 200 }}
                  renderItem={({ item }) => {
                    const active = selectedSpecies?.toLowerCase() === item.common_name.toLowerCase();
                    const isPredicted = prediction?.label?.toLowerCase() === item.common_name.toLowerCase();
                    return (
                      <TouchableOpacity onPress={() => setSelectedSpecies(item.common_name)} style={[styles.speciesItem, active && styles.speciesItemActive]}>
                        <Text style={[styles.speciesText, active && styles.speciesTextActive]}>{item.common_name}</Text>
                        {isPredicted && <View style={styles.aiTag}><Text style={styles.aiTagText}>AI</Text></View>}
                        {active && <Text style={styles.checkmark}>✓</Text>}
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={<Text style={{ textAlign: "center", padding: 20, color: "#999" }}>No match</Text>}
                />
              )}
              <View style={styles.modalBtns}>
                <TouchableOpacity onPress={() => setConfirmOpen(false)} style={styles.cancelBtn}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity onPress={saveLabel} disabled={!selectedSpecies} style={[styles.saveBtn, !selectedSpecies && { backgroundColor: "#ccc" }]}><Text style={styles.saveText}>Confirm & Save</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Capture Method Modal */}
        <Modal visible={captureMenuOpen} transparent animationType="fade" onRequestClose={() => setCaptureMenuOpen(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCaptureMenuOpen(false)}>
            <View style={styles.captureMenuContent}>
              <Text style={styles.captureMenuTitle}>📷 Capture Your Catch</Text>
              <TouchableOpacity style={styles.captureMenuItem} onPress={takePhoto}>
                <Text style={styles.captureMenuIcon}>📸</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.captureMenuItemTitle}>Take Photo</Text>
                  <Text style={styles.captureMenuItemDesc}>Use camera to capture your fish</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.captureMenuItem} onPress={pickFromGallery}>
                <Text style={styles.captureMenuIcon}>🖼️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.captureMenuItemTitle}>Choose from Gallery</Text>
                  <Text style={styles.captureMenuItemDesc}>Select an existing photo</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.captureMenuCancel} onPress={() => setCaptureMenuOpen(false)}>
                <Text style={styles.captureMenuCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Fishing Regulations Modal */}
        <Modal visible={regulationsModal.visible} transparent animationType="slide" onRequestClose={() => setRegulationsModal({ species: "", visible: false })}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.regulationsHeader}>
                <Text style={styles.regulationsIcon}>📋</Text>
                <Text style={styles.regulationsTitle}>Fishing Regulations</Text>
              </View>
              <View style={styles.regulationsSpecies}>
                <Text style={styles.regulationsSpeciesName}>{regulationsModal.species}</Text>
                <Text style={styles.savedBadge}>✓ Saved</Text>
              </View>
              
              {FISHING_REGULATIONS[regulationsModal.species] ? (
                <View style={styles.regulationsGrid}>
                  <View style={styles.regulationItem}>
                    <Text style={styles.regulationIcon}>📏</Text>
                    <Text style={styles.regulationLabel}>Minimum Size</Text>
                    <Text style={styles.regulationValue}>{FISHING_REGULATIONS[regulationsModal.species].minSize}</Text>
                  </View>
                  <View style={styles.regulationItem}>
                    <Text style={styles.regulationIcon}>🎣</Text>
                    <Text style={styles.regulationLabel}>Daily Limit</Text>
                    <Text style={styles.regulationValue}>{FISHING_REGULATIONS[regulationsModal.species].dailyLimit}</Text>
                  </View>
                  <View style={styles.regulationItem}>
                    <Text style={styles.regulationIcon}>📅</Text>
                    <Text style={styles.regulationLabel}>Season</Text>
                    <Text style={styles.regulationValue}>{FISHING_REGULATIONS[regulationsModal.species].season}</Text>
                  </View>
                  <View style={[styles.regulationItem, styles.regulationNotes]}>
                    <Text style={styles.regulationIcon}>ℹ️</Text>
                    <Text style={styles.regulationLabel}>Notes</Text>
                    <Text style={styles.regulationNotesText}>{FISHING_REGULATIONS[regulationsModal.species].notes}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.noRegulations}>
                  <Text style={styles.noRegulationsText}>No specific regulations found for this species.</Text>
                  <Text style={styles.noRegulationsSubtext}>Please check your local fishing regulations.</Text>
                </View>
              )}
              
              <View style={styles.regulationsFooter}>
                <Text style={styles.regulationsDisclaimer}>⚠️ Regulations vary by location. Always verify with local authorities.</Text>
              </View>
              
              <TouchableOpacity style={styles.closeBtn} onPress={() => setRegulationsModal({ species: "", visible: false })}>
                <Text style={styles.closeBtnText}>Got it!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Fish Species Search Modal */}
        <Modal visible={searchModalOpen} transparent animationType="slide" onRequestClose={() => setSearchModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: "85%" }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>🔍 Search Fish Species</Text>
                <TouchableOpacity onPress={() => setSearchModalOpen(false)} style={styles.closeX}><Text style={styles.closeXText}>✕</Text></TouchableOpacity>
              </View>
              <TextInput placeholder="Type fish name..." value={query} onChangeText={setQuery} style={styles.speciesInput} autoFocus />
              {speciesLoading ? <ActivityIndicator style={{ padding: 20 }} /> : (
                <FlatList 
                  data={species.filter((s) => s.common_name.toLowerCase().includes(query.toLowerCase()))} 
                  keyExtractor={(i) => String(i.id)} 
                  keyboardShouldPersistTaps="handled" 
                  style={{ maxHeight: 400 }}
                  renderItem={({ item }) => {
                    const fishData = ALL_FISH.find(f => f.name.toLowerCase() === item.common_name.toLowerCase());
                    return (
                      <TouchableOpacity 
                        onPress={() => { 
                          if (fishData) {
                            setSelectedFish(fishData);
                            setSearchModalOpen(false);
                            setQuery("");
                          }
                        }} 
                        style={styles.searchResultItem}
                      >
                        <Text style={styles.searchResultIcon}>{fishData?.icon || "🐟"}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.searchResultName}>{item.common_name}</Text>
                          {fishData && <Text style={styles.searchResultInfo}>{fishData.habitat} • {fishData.avgSize}</Text>}
                        </View>
                        {fishData && (
                          <View style={[styles.activityBadge, { backgroundColor: getActivityColor(fishData.activity) }]}>
                            <Text style={styles.activityText}>{fishData.activity}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={<Text style={{ textAlign: "center", padding: 20, color: "#999" }}>No fish found</Text>}
                />
              )}
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

// ===========================================
// STYLES
// ===========================================
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#ecfeff" },
  container: { flex: 1, backgroundColor: "#ecfeff" },
  content: { padding: PADDING, paddingBottom: 100 },

  topButtonsRow: { flexDirection: "row", marginBottom: 10, gap: 8 },
  searchBtn: { backgroundColor: "white", borderRadius: 22, height: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 14, borderWidth: 2, borderColor: "#0891b2" },
  searchBtnText: { color: "#0891b2", fontSize: 14, fontWeight: "600", marginLeft: 6 },
  captureBtn: { flex: 1, backgroundColor: "#0891b2", borderRadius: 22, height: 42, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  captureText: { color: "white", fontSize: 14, fontWeight: "600" },

  preview: { alignItems: "center", backgroundColor: "white", borderRadius: 12, padding: 12, marginBottom: 10 },
  previewImg: { width: SCREEN_WIDTH - 56, height: 160, borderRadius: 10, backgroundColor: "#eee" },

  weatherCard: { backgroundColor: "white", borderRadius: 14, marginBottom: 10, overflow: "hidden", borderWidth: 1, borderColor: "#e5e7eb" },
  weatherHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, backgroundColor: "#f0fdff", borderBottomWidth: 1, borderBottomColor: "#e0f2fe" },
  weatherHeaderIcon: { fontSize: 18, marginRight: 6 },
  weatherTitle: { fontSize: 13, fontWeight: "700", color: "#0e7490" },
  locBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#e0f2fe", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16, maxWidth: 130 },
  locText: { fontSize: 10, fontWeight: "600", color: "#0369a1", marginHorizontal: 3, flexShrink: 1 },
  
  dateTabContainer: { maxHeight: 56, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  dateTabContent: { paddingHorizontal: 8, paddingVertical: 8, gap: 6 },
  dateTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: "#f3f4f6", alignItems: "center", marginRight: 6 },
  dateTabActive: { backgroundColor: "#0891b2" },
  dateTabDay: { fontSize: 11, fontWeight: "600", color: "#6b7280" },
  dateTabDayActive: { color: "white" },
  dateTabDate: { fontSize: 9, color: "#9ca3af", marginTop: 1 },
  dateTabDateActive: { color: "#e0f2fe" },
  
  forecastBadge: { backgroundColor: "#dbeafe", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginLeft: 6 },
  forecastBadgeText: { fontSize: 9, fontWeight: "600", color: "#2563eb" },
  forecastNote: { backgroundColor: "#f0f9ff", paddingHorizontal: 12, paddingVertical: 6, marginHorizontal: 10, marginTop: 6, borderRadius: 8, borderWidth: 1, borderColor: "#bae6fd" },
  forecastNoteText: { fontSize: 11, color: "#0369a1", textAlign: "center" },
  
  errorBanner: { backgroundColor: "#fef3c7", paddingHorizontal: 10, paddingVertical: 4, marginHorizontal: 10, marginTop: 6, borderRadius: 6 },
  errorText: { fontSize: 10, color: "#92400e", textAlign: "center" },
  weatherPage: { padding: 10 },
  weatherRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: GAP },
  weatherItem: { width: WEATHER_ITEM_WIDTH, flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 10, backgroundColor: "#f9fafb", borderWidth: 1.5 },
  wIcon: { fontSize: 22, marginRight: 8 },
  wLabel: { fontSize: 9, color: "#6b7280", marginBottom: 1 },
  wValue: { fontSize: 15, fontWeight: "700" },
  condRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingTop: 4 },
  condLabel: { fontSize: 11, color: "#6b7280", marginRight: 4 },
  condValue: { fontSize: 11, color: "#0e7490", fontWeight: "600" },

  indicatorContainer: { flexDirection: "row", justifyContent: "center", paddingVertical: 8 },
  indicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#d1d5db", marginHorizontal: 3 },
  indicatorActive: { backgroundColor: "#0891b2", width: 18 },

  defaultLocPrompt: { backgroundColor: "white", marginHorizontal: 24, borderRadius: 20, padding: 24, alignItems: "center", marginTop: "auto", marginBottom: "auto" },
  defaultLocIcon: { fontSize: 48, marginBottom: 12 },
  defaultLocTitle: { fontSize: 20, fontWeight: "700", color: "#1f2937", marginBottom: 8, textAlign: "center" },
  defaultLocDesc: { fontSize: 15, color: "#4b5563", textAlign: "center", marginBottom: 8 },
  defaultLocSubtext: { fontSize: 12, color: "#9ca3af", textAlign: "center", marginBottom: 20 },
  defaultLocButtons: { flexDirection: "row", gap: 12, width: "100%" },
  defaultLocBtnNo: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: "#f3f4f6", alignItems: "center" },
  defaultLocBtnNoText: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  defaultLocBtnYes: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: "#0891b2", alignItems: "center" },
  defaultLocBtnYesText: { fontSize: 14, fontWeight: "600", color: "white" },

  sectionCard: { backgroundColor: "white", borderRadius: 14, marginBottom: 10, overflow: "hidden", borderWidth: 1, borderColor: "#e5e7eb" },
  sectionHeader: { flexDirection: "row", alignItems: "center", padding: 10 },
  sectionIcon: { fontSize: 16, marginRight: 6 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "white" },

  fishCard: { backgroundColor: "#f9fafb", borderRadius: 8, padding: 6, alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb", marginBottom: 6 },
  fishIcon: { fontSize: 24, marginBottom: 2 },
  fishName: { textAlign: "center", fontSize: 9, fontWeight: "600", color: "#1f2937", marginBottom: 3, height: 22 },
  activityBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  activityText: { fontSize: 8, color: "white", fontWeight: "700" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "white", padding: PADDING, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1f2937", flex: 1 },
  closeX: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  closeXText: { fontSize: 14, color: "#6b7280", fontWeight: "600" },

  currentLocBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#ecfdf5", borderWidth: 1, borderColor: "#a7f3d0", borderRadius: 10, padding: 10, marginBottom: 12 },
  currentLocLabel: { fontSize: 13, fontWeight: "600", color: "#065f46" },
  currentLocValue: { fontSize: 11, color: "#047857" },
  divider: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e5e7eb" },
  dividerText: { paddingHorizontal: 10, fontSize: 11, color: "#9ca3af" },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, paddingHorizontal: 10, marginBottom: 10 },
  searchInput: { flex: 1, height: 40, fontSize: 14 },
  resultItem: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  resultMain: { fontSize: 14, fontWeight: "600", color: "#1f2937" },
  resultSub: { fontSize: 11, color: "#6b7280" },

  infoRow: { marginBottom: 10 },
  infoLabel: { fontSize: 13, fontWeight: "600", color: "#0e7490", marginBottom: 2 },
  infoText: { fontSize: 13, color: "#374151" },
  closeBtn: { backgroundColor: "#06b6d4", padding: 10, borderRadius: 10, marginTop: 12, alignItems: "center" },
  closeBtnText: { color: "white", fontSize: 15, fontWeight: "700" },

  speciesInput: { height: 38, borderColor: "#ddd", borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, marginBottom: 10 },
  speciesItem: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  speciesItemActive: { backgroundColor: "#e0f7fa" },
  speciesText: { fontSize: 15, color: "#1f2937", flex: 1 },
  speciesTextActive: { fontWeight: "700", color: "#0e7490" },
  checkmark: { fontSize: 18, color: "#0891b2", fontWeight: "700" },
  aiTag: { backgroundColor: "#dbeafe", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
  aiTagText: { fontSize: 10, color: "#2563eb", fontWeight: "700" },
  
  predictionSection: { backgroundColor: "#f0fdf4", padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: "#bbf7d0" },
  predictionHeader: { fontSize: 13, fontWeight: "600", color: "#166534", marginBottom: 8 },
  predictionOption: { flexDirection: "row", alignItems: "center", backgroundColor: "white", padding: 12, borderRadius: 8, borderWidth: 2, borderColor: "#e5e7eb" },
  predictionOptionSelected: { borderColor: "#22c55e", backgroundColor: "#f0fdf4" },
  predictionContent: { flex: 1 },
  predictionLabel: { fontSize: 16, fontWeight: "700", color: "#1f2937" },
  predictionConfidence: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  
  manualSection: { marginBottom: 8 },
  manualHeader: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 },
  
  captureMenuContent: { backgroundColor: "white", marginHorizontal: 20, borderRadius: 16, padding: 20, marginTop: "auto", marginBottom: 40 },
  captureMenuTitle: { fontSize: 18, fontWeight: "700", color: "#1f2937", textAlign: "center", marginBottom: 16 },
  captureMenuItem: { flexDirection: "row", alignItems: "center", padding: 14, backgroundColor: "#f9fafb", borderRadius: 12, marginBottom: 10 },
  captureMenuIcon: { fontSize: 28, marginRight: 14 },
  captureMenuItemTitle: { fontSize: 15, fontWeight: "600", color: "#1f2937" },
  captureMenuItemDesc: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  captureMenuCancel: { padding: 14, alignItems: "center", marginTop: 4 },
  captureMenuCancelText: { fontSize: 15, fontWeight: "600", color: "#6b7280" },
  
  regulationsHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  regulationsIcon: { fontSize: 28, marginRight: 10 },
  regulationsTitle: { fontSize: 20, fontWeight: "700", color: "#1f2937" },
  regulationsSpecies: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#f0fdf4", padding: 12, borderRadius: 10, marginBottom: 16 },
  regulationsSpeciesName: { fontSize: 16, fontWeight: "700", color: "#166534" },
  savedBadge: { fontSize: 12, fontWeight: "600", color: "#22c55e", backgroundColor: "#dcfce7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  regulationsGrid: { gap: 10 },
  regulationItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#f9fafb", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb" },
  regulationIcon: { fontSize: 20, marginRight: 10 },
  regulationLabel: { fontSize: 12, color: "#6b7280", width: 80 },
  regulationValue: { fontSize: 15, fontWeight: "700", color: "#1f2937", flex: 1, textAlign: "right" },
  regulationNotes: { flexDirection: "column", alignItems: "flex-start" },
  regulationNotesText: { fontSize: 13, color: "#374151", marginTop: 4 },
  noRegulations: { backgroundColor: "#fef3c7", padding: 16, borderRadius: 10, alignItems: "center" },
  noRegulationsText: { fontSize: 14, fontWeight: "600", color: "#92400e" },
  noRegulationsSubtext: { fontSize: 12, color: "#a16207", marginTop: 4 },
  regulationsFooter: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#e5e7eb" },
  regulationsDisclaimer: { fontSize: 11, color: "#6b7280", textAlign: "center" },

  searchResultItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  searchResultIcon: { fontSize: 28, marginRight: 12 },
  searchResultName: { fontSize: 15, fontWeight: "600", color: "#1f2937" },
  searchResultInfo: { fontSize: 11, color: "#6b7280", marginTop: 2 },
  modalBtns: { flexDirection: "row", marginTop: 16 },
  cancelBtn: { backgroundColor: "#e5e7eb", padding: 10, borderRadius: 10, flex: 1, marginRight: 6, alignItems: "center" },
  cancelText: { color: "#374151", fontSize: 15, fontWeight: "700" },
  saveBtn: { backgroundColor: "#06b6d4", padding: 10, borderRadius: 10, flex: 1, marginLeft: 6, alignItems: "center" },
  saveText: { color: "white", fontSize: 15, fontWeight: "700" },
});
