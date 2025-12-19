// app/(tabs)/map.tsx
// Updated with JWT authentication
import React, { useEffect, useRef, useState } from "react";
import { View, Text, Platform, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, UrlTile, Callout } from "react-native-maps";
import * as Location from "expo-location";
import { useRouter } from "expo-router"; 
import { Ionicons } from "@expo/vector-icons"; 
import { API_BASE } from "@/lib/config";
import { getLocalCatches } from "@/lib/storage";
// ✅ NEW: Import auth hook and API helper
import { useAuth } from "@/contexts/AuthContext";
import { getCatches } from "@/lib/api";

// ==========================================
// CONFIG
// ==========================================

// 📍 Default region: Boston Harbor
const BOSTON_REGION = {
  latitude: 42.33,
  longitude: -70.95,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

// 🌊 ArcGIS World Navigation Charts
const TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/Specialty/World_Navigation_Charts/MapServer/tile/{z}/{y}/{x}";

type Catch = {
  id?: number;
  local_id?: string;
  species_label: string;
  created_at: string;
  image_path?: string | null;
  lat?: number | null;
  lng?: number | null;
  user_id?: string | null;
};

export default function MapScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  
  // ✅ NEW: Use auth context instead of getUserId
  const { user } = useAuth();
  const userId = user?.id || null;
  
  const [markers, setMarkers] = useState<Catch[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showLayer, setShowLayer] = useState(true);
  const [legendOpen, setLegendOpen] = useState(true);

  // Get current location and animate to it
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
           const loc = await Location.getCurrentPositionAsync({});
           setTimeout(() => {
             mapRef.current?.animateToRegion({
               latitude: loc.coords.latitude,
               longitude: loc.coords.longitude,
               latitudeDelta: 0.2, longitudeDelta: 0.2,
             }, 1000);
           }, 500);
        }
      } catch (e) {
        console.warn(e);
      }
    })();
  }, []);

  // Load catches with JWT auth
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const locals = await getLocalCatches();
        let remotes: Catch[] = [];
        
        if (userId) {
          try {
            // ✅ NEW: Use authenticated API helper
            remotes = await getCatches(500);
          } catch (e) {
            console.warn("Failed to fetch catches for map", e);
          }
        }
        
        const all: Catch[] = [...remotes, ...locals];
        const validMarkers = all
          .map(c => ({...c, lat: Number(c.lat), lng: Number(c.lng)}))
          .filter(c => !isNaN(c.lat) && !isNaN(c.lng) && c.lat !== 0 && c.lng !== 0);

        if (alive) setMarkers(validMarkers);
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [userId]);

  const handleCalloutPress = (m: Catch) => {
    if (m.local_id) router.push(`/catch/local/${m.local_id}`);
    else if (m.id) router.push(`/catch/${m.id}`);
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        style={styles.map}
        initialRegion={BOSTON_REGION}
        showsUserLocation
        showsMyLocationButton={false}
        mapType="standard" 
      >
        {/* Nautical Chart Layer */}
        {showLayer && (
          <UrlTile
            urlTemplate={TILE_URL}
            maximumZ={16}
            zIndex={100}   
            opacity={0.8}
            tileSize={256}
          />
        )}

        {markers.map((m, idx) => (
          <Marker
            key={(m.id ?? m.local_id ?? idx).toString()}
            coordinate={{ latitude: m.lat!, longitude: m.lng! }}
            pinColor={m.local_id ? "#f59e0b" : "#0891b2"}
            zIndex={101}
          >
             <Callout onPress={() => handleCalloutPress(m)}>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{m.species_label}</Text>
                  <Text style={styles.calloutHint}>Tap for details</Text>
                </View>
              </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.btn, { backgroundColor: "#f59e0b" }]}
          onPress={() => {
            mapRef.current?.animateToRegion(BOSTON_REGION, 2000);
            setShowLayer(true);
          }}
        >
          <Ionicons name="airplane" size={18} color="white" />
          <Text style={[styles.btnText, { color: "white" }]}>Go to Boston</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.btn, showLayer ? styles.btnActive : {}]}
          onPress={() => setShowLayer(!showLayer)}
        >
          <Ionicons name="map" size={18} color={showLayer ? "white" : "#374151"} />
          <Text style={[styles.btnText, showLayer ? {color:'white'} : {}]}>
            {showLayer ? "Chart: ON" : "Chart: OFF"}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.iconBtn}
          onPress={async () => {
             const loc = await Location.getCurrentPositionAsync({});
             mapRef.current?.animateToRegion({
               latitude: loc.coords.latitude,
               longitude: loc.coords.longitude,
               latitudeDelta: 0.2, longitudeDelta: 0.2,
             }, 500);
          }}
        >
          <Ionicons name="locate" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Legend */}
      {showLayer && (
        <View style={styles.legendContainer}>
          <TouchableOpacity 
            style={styles.legendHeader} 
            onPress={() => setLegendOpen(!legendOpen)}
            activeOpacity={0.8}
          >
            <Text style={styles.legendTitle}>⚓ Nautical Chart</Text>
            <Ionicons name={legendOpen ? "chevron-down" : "chevron-up"} size={16} color="#4b5563" />
          </TouchableOpacity>
          
          {legendOpen && (
            <View style={styles.legendBody}>
              <View style={styles.legendRow}>
                <View style={[styles.lineBox, { borderColor: "#ef4444" }]} />
                <View style={styles.legendTextCol}>
                  <Text style={styles.legendLabel}>Contour Lines (等深线)</Text>
                  <Text style={styles.legendDesc}>Red/Black lines connecting equal depth.</Text>
                </View>
              </View>

              <View style={styles.legendRow}>
                <Text style={styles.legendIcon}>🔢</Text>
                <View style={styles.legendTextCol}>
                  <Text style={styles.legendLabel}>Soundings</Text>
                  <Text style={styles.legendDesc}>Numbers = Depth in Feet/Fathoms.</Text>
                </View>
              </View>

              <View style={styles.legendRow}>
                <View style={[styles.colorBox, { backgroundColor: "#fef08a", borderColor: "#fde047" }]} />
                <View style={styles.legendTextCol}>
                  <Text style={styles.legendLabel}>Land (Yellow)</Text>
                  <Text style={styles.legendDesc}>Islands or Mainland.</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {loading && (
        <View style={styles.loadingPill}>
          <ActivityIndicator size="small" color="#0891b2" />
          <Text style={styles.loadingText}>Loading chart...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  map: { flex: 1 },
  
  controls: { position: "absolute", top: 60, right: 16, alignItems: 'flex-end', gap: 10 },
  btn: {
    flexDirection: "row", backgroundColor: "white", paddingHorizontal: 14, paddingVertical: 10, 
    borderRadius: 25, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.25, elevation: 5, minWidth: 120, alignItems: 'center', justifyContent: "center", gap: 6,
  },
  btnActive: { backgroundColor: "#0891b2" },
  btnText: { fontWeight: "bold", fontSize: 13, color: "#374151" },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: "white",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, elevation: 4,
  },

  legendContainer: {
    position: "absolute", bottom: 40, left: 16, width: 220,
    backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, elevation: 4,
    overflow: "hidden", borderWidth: 1, borderColor: "#e5e7eb"
  },
  legendHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 12, backgroundColor: "#f9fafb", borderBottomWidth: 1, borderBottomColor: "#e5e7eb"
  },
  legendTitle: { fontSize: 13, fontWeight: "800", color: "#1f2937", textTransform: "uppercase" },
  legendBody: { padding: 12, gap: 10 },
  legendRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  legendIcon: { fontSize: 16, width: 20, textAlign: "center" },
  colorBox: { width: 16, height: 16, borderRadius: 4, borderWidth: 1, marginTop: 2 },
  lineBox: { width: 16, height: 0, borderTopWidth: 2, borderStyle: "solid", marginTop: 8 },
  legendTextCol: { flex: 1 },
  legendLabel: { fontSize: 12, fontWeight: "700", color: "#111827" },
  legendDesc: { fontSize: 10, color: "#6b7280", lineHeight: 14, marginTop: 1 },

  loadingPill: {
    position: "absolute", top: 60, alignSelf: "center", backgroundColor: "rgba(255,255,255,0.9)", 
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, flexDirection: "row", gap: 8, elevation: 4,
  },
  loadingText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  callout: { padding: 6, minWidth: 120, alignItems: "center" },
  calloutTitle: { fontWeight: "700", fontSize: 14, color: "#1f2937" },
  calloutHint: { fontSize: 10, color: "#0891b2", fontWeight: "600" },
});
