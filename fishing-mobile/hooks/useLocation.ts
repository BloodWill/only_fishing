import { useState, useCallback, useEffect } from "react";
import * as Location from "expo-location";
import { GOOGLE_GEOCODING_KEY } from "@/lib/config"; // 确保你在 config 中导出了这个 key
// 或者如果你直接用 process.env，请保持原样

// 定义类型
export type LocationData = {
  lat: number | null;
  lng: number | null;
  city: string | null;
  region: string | null;
  formattedAddress: string | null;
  isLoading: boolean;
  isCurrentLocation: boolean;
};

export function useLocation() {
  const [location, setLocation] = useState<LocationData>({
    lat: null,
    lng: null,
    city: null,
    region: null,
    formattedAddress: null,
    isLoading: true,
    isCurrentLocation: true,
  });

  const [deviceLoc, setDeviceLoc] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });

  // 获取当前 GPS
  const getCurrentLatLng = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return { lat: null, lng: null };
      
      const loc = await Location.getCurrentPositionAsync({});
      return { lat: loc.coords.latitude, lng: loc.coords.longitude };
    } catch (e) {
      console.error("Location error:", e);
      return { lat: null, lng: null };
    }
  }, []);

  // 反向地理编码
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    // 1. 尝试 Expo 自带的
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (results && results.length > 0) {
        const place = results[0];
        return {
          city: place.city || place.subregion || place.district || null,
          region: place.region || null,
          formattedAddress: [place.city || place.subregion, place.region].filter(Boolean).join(", ") || null,
        };
      }
    } catch (e) {
      console.warn("Expo geocode failed, trying Google...");
    }

    // 2. 回退到 Google API (如果有 Key)
    // 注意：这里假设你从 config 或 env 获取 key
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_WEATHER_KEY || ""; 
    if (apiKey) {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();
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
  }, []);

  return {
    location,
    setLocation,
    deviceLoc,
    setDeviceLoc,
    getCurrentLatLng,
    reverseGeocode,
  };
}