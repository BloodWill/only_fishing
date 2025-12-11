// app/(tabs)/map.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ActivityIndicator, Platform, StyleSheet } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import * as Location from "expo-location";
import { API_BASE, bust } from "@/lib/config";
import { getLocalCatches } from "@/lib/storage";
import { getUserId } from "@/lib/user";

type Catch = {
  id?: number;
  local_id?: string;
  species_label: string;
  created_at: string;
  image_path?: string | null;     // remote (e.g. /assets/uploads/xxx.jpg)
  local_uri?: string | null;      // local file path
  lat?: number | null;
  lng?: number | null;
  user_id?: string | null;
};

const FALLBACK_REGION: Region = {
  latitude: 37.7749,      // San Francisco fallback so tiles always show
  longitude: -122.4194,
  latitudeDelta: 0.2,
  longitudeDelta: 0.2,
};

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [ready, setReady] = useState(false);
  const [perm, setPerm] = useState<"unknown" | "granted" | "denied">("unknown");
  const [userId, setUserId] = useState<string | null>(null);
  const [markers, setMarkers] = useState<Catch[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

  // keep user id fresh
  useEffect(() => {
    getUserId().then(setUserId);
  }, []);

  // request location & move camera once
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        setPerm(status === "granted" ? "granted" : "denied");
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({});
          const region: Region = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          };
          mapRef.current?.animateToRegion(region, 600);
        }
      } catch (e: any) {
        setLastError(String(e?.message ?? e));
      }
    })();
  }, []);

  // load markers: remote (if logged in) + local
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setLastError(null);
      try {
        const locals = await getLocalCatches();
        let remotes: Catch[] = [];
        if (userId) {
          try {
            const res = await fetch(`${API_BASE}/catches?user_id=${encodeURIComponent(userId)}`);
            if (res.ok) remotes = await res.json();
          } catch (e) {
            // ignore remote failure; still show locals
          }
        }
        const all: Catch[] = [...remotes, ...locals];
        // only those with coordinates
        const withCoords = all.filter(c => typeof c.lat === "number" && typeof c.lng === "number");
        if (alive) setMarkers(withCoords);
      } catch (e: any) {
        if (alive) setLastError(String(e?.message ?? e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [userId]);

  // fit to markers when ready
  useEffect(() => {
    if (!ready || markers.length === 0) return;
    const ids = markers.map((_, i) => i.toString());
    // small timeout to let layout settle
    setTimeout(() => {
      try {
        mapRef.current?.fitToSuppliedMarkers(ids, { animated: true, edgePadding: { top: 80, bottom: 80, left: 80, right: 80 } });
      } catch {}
    }, 300);
  }, [ready, markers]);

  // choose provider: Google on Android, default on iOS (Apple Maps)
  const provider = Platform.OS === "android" ? PROVIDER_GOOGLE : undefined;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={provider}
        style={styles.map}
        onMapReady={() => setReady(true)}
        initialRegion={FALLBACK_REGION}  // ensures tiles display even before we move camera
        showsUserLocation={perm === "granted"}
        showsMyLocationButton
        toolbarEnabled
      >
        {markers.map((m, idx) => (
          <Marker
            key={(m.id ?? m.local_id ?? idx).toString()}
            identifier={idx.toString()}
            coordinate={{ latitude: m.lat as number, longitude: m.lng as number }}
            title={m.species_label || "Catch"}
            description={new Date(m.created_at).toLocaleString()}
          />
        ))}
      </MapView>

      {/* tiny debug overlay you can toggle off later */}
      <View style={styles.debug}>
        <Text style={styles.debugText}>
          ready:{ready ? "✓" : "…"}  perm:{perm}  user:{userId ?? "—"}  mk:{markers.length}
        </Text>
        {lastError ? <Text style={[styles.debugText, { color: "#ff6b6b" }]}>{lastError}</Text> : null}
        {loading ? <ActivityIndicator /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#eee" },
  map: { flex: 1 },                  // 👈 guarantees the map has size
  debug: {
    position: "absolute",
    left: 8,
    top: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  debugText: { color: "white", fontSize: 12 },
});
