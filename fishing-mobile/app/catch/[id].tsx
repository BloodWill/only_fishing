// app/catches/[id].tsx   (or app/catch/[id].tsx if you're using singular)
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Share,
  TouchableOpacity,
  Alert,
  Linking,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { useLocalSearchParams, useRouter } from "expo-router";

const API_BASE = "http://192.168.1.161:8000"; // your backend

type CatchRead = {
  id: number;
  image_path: string;           // e.g. "/assets/uploads/xxx.jpg"
  species_label: string;
  species_confidence: number;   // 0..1 preferred
  created_at: string;
  user_id?: string | null;
  lat?: number | null;          // optional coordinates
  lng?: number | null;
};

// same cache-buster you had
const bust = (url: string, salt: number | string) =>
  url.includes("?") ? `${url}&t=${salt}` : `${url}?t=${salt}`;

export default function CatchDetail() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();

  const catchId = useMemo(() => {
    const n = Number(id);
    return Number.isFinite(n) ? n : null;
  }, [id]);

  const [data, setData] = useState<CatchRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [imgSalt, setImgSalt] = useState<number>(() => Date.now()); // for cache-busting
  const [imgError, setImgError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (catchId == null) {
        setErr("Invalid catch id");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setErr(null);
        setImgError(null);
        const resp = await fetch(`${API_BASE}/catches/${catchId}`);
        if (!resp.ok) throw new Error(`Failed to load catch #${catchId} (HTTP ${resp.status})`);
        const json = (await resp.json()) as CatchRead;
        if (!cancelled) {
          setData(json);
          setImgSalt(Date.now()); // new salt per load
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [catchId]);

  const onShare = async () => {
    if (!data) return;
    try {
      await Share.share({
        message: `I caught a ${data.species_label} on ${new Date(data.created_at).toLocaleString()}`,
      });
    } catch {}
  };

  const confirmDelete = () => {
    Alert.alert("Delete Catch", "This will permanently remove this catch. Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: handleDelete },
    ]);
  };

  const handleDelete = async () => {
    if (catchId == null) return;
    try {
      setDeleting(true);
      const resp = await fetch(`${API_BASE}/catches/${catchId}`, { method: "DELETE" });
      if (!resp.ok && resp.status !== 204) throw new Error(`Delete failed (HTTP ${resp.status})`);
      router.replace(`/history?refresh=1&ts=${Date.now()}`);
    } catch (e: any) {
      Alert.alert("Delete failed", e?.message ?? "Unknown error");
      setDeleting(false);
    }
  };

  const openInMaps = (lat: number, lng: number, label: string) => {
    const title = encodeURIComponent(label || "Catch");
    const url =
      Platform.OS === "ios"
        ? `http://maps.apple.com/?ll=${lat},${lng}&q=${title}`
        : `geo:${lat},${lng}?q=${lat},${lng}(${title})`;
    Linking.openURL(url).catch(() => {});
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  if (err) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Error: {err}</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Catch not found.</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const confidencePct =
    data.species_confidence <= 1
      ? (data.species_confidence * 100).toFixed(1)
      : String(Math.round(data.species_confidence));

  const imageUri = bust(`${API_BASE}${data.image_path}`, imgSalt);

  const hasCoords = typeof data.lat === "number" && typeof data.lng === "number";
  const region: Region | undefined = hasCoords
    ? {
        latitude: data.lat as number,
        longitude: data.lng as number,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : undefined;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {!!data.image_path && (
        <>
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="cover"
            onError={() => {
              if (!imgError) {
                setImgSalt(Date.now() + 1); // retry once
                setImgError("Image failed to load — retrying…");
              } else {
                setImgError("Image failed to load");
              }
            }}
            onLoadEnd={() => imgError && setImgError(null)}
          />
          {imgError && <Text style={styles.errorSmall}>{imgError}</Text>}
        </>
      )}

      <View style={styles.card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={styles.title}>{data.species_label || "Unknown"}</Text>
          {/* Detail page is for server items → show explicit Online badge */}
          <Text
            style={{
              fontSize: 12,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 999,
              overflow: "hidden",
              color: "#16794D",
              backgroundColor: "#E6FFEE",
            }}
          >
            Online
          </Text>
        </View>

        <Text style={styles.subtle}>Confidence: {confidencePct}%</Text>
        <Text style={styles.subtle}>Caught at: {new Date(data.created_at).toLocaleString()}</Text>
      </View>

      {/* 🌍 Location (only if we have lat/lng) */}
      <View style={styles.card}>
        <Text style={[styles.title, { fontSize: 18 }]}>Location</Text>
        {hasCoords && region ? (
          <>
            <MapView
              provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
              style={styles.map}
              initialRegion={region}
              scrollEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              zoomEnabled={false}
              pointerEvents="none"
            >
              <Marker
                coordinate={{ latitude: region.latitude, longitude: region.longitude }}
                title={data.species_label}
                description={new Date(data.created_at).toLocaleString()}
              />
            </MapView>

            <View style={styles.rowBetween}>
              <Text style={styles.subtle}>
                {data.lat?.toFixed(5)}, {data.lng?.toFixed(5)}
              </Text>
              <TouchableOpacity
                style={[styles.button, styles.secondary]}
                onPress={() => openInMaps(region.latitude, region.longitude, data.species_label)}
              >
                <Text style={styles.buttonText}>Open in Maps</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <Text style={styles.subtle}>No location recorded for this catch.</Text>
        )}
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={[styles.button, styles.secondary]} onPress={onShare} disabled={deleting}>
          <Text style={styles.buttonText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.danger, deleting && styles.disabled]}
          onPress={confirmDelete}
          disabled={deleting}
        >
          {deleting ? <ActivityIndicator /> : <Text style={styles.buttonText}>Delete</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16, backgroundColor: "#0b1220" },
  image: { width: "100%", height: 300, borderRadius: 14, backgroundColor: "#0b1220" },
  card: {
    backgroundColor: "#131c31",
    padding: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
    gap: 10,
  },
  map: { width: "100%", height: 180, borderRadius: 10, overflow: "hidden" },
  title: { color: "white", fontSize: 22, fontWeight: "700", marginBottom: 6 },
  subtle: { color: "#9fb4ff", marginTop: 2 },
  row: { flexDirection: "row", gap: 12, justifyContent: "flex-end" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  button: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, backgroundColor: "#2d6cdf" },
  secondary: { backgroundColor: "#2d6cdf" },
  danger: { backgroundColor: "#d9534f" },
  disabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12, backgroundColor: "#0b1220" },
  muted: { color: "#94a3b8" },
  error: { color: "#ff6b6b", fontWeight: "600" },
  errorSmall: { color: "#ff6b6b", marginTop: 6 },
});
