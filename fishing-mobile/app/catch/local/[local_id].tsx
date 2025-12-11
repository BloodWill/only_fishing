import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, Image, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { API_BASE, bust } from "@/lib/config"; // adjust if your config path differs
import { getLocalCatches, removeLocalCatch } from "@/lib/storage";
import { getUserId } from "@/lib/user";
import { Platform } from "react-native";


// small helper
const pct = (x?: number | null) => (typeof x === "number" ? `${(x * 100).toFixed(1)}%` : "–");

export default function LocalCatchDetail() {
  const { local_id } = useLocalSearchParams<{ local_id?: string }>();
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const uid = await getUserId();
        if (alive) setUserId(uid);

        const locals = await getLocalCatches();
        const found = locals.find((r) => String(r.local_id) === String(local_id));
        if (alive) setItem(found ?? null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [local_id]);

  const upload = useCallback(async () => {
    if (!item) return;
    if (!userId) {
      Alert.alert("Sign in required", "Please sign in to upload local catches.");
      return;
    }
    try {
      setUploading(true);
      const form = new FormData();
      form.append("image", { uri: item.local_uri, name: `catch-${Date.now()}.jpg`, type: "image/jpeg" } as any);
      if (item.species_label) form.append("species_label", item.species_label);
      if (typeof item.species_confidence === "number") form.append("species_confidence", String(item.species_confidence));
      form.append("created_at", item.created_at);

      const resp = await fetch(`${API_BASE}/catches`, { method: "POST", headers: { Accept: "application/json", "X-User-Id": userId }, body: form });
      if (!resp.ok) {
        const t = await resp.text().catch(() => "");
        throw new Error(`Upload failed (${resp.status}) ${t}`);
      }
      const server = await resp.json();
      // remove local + jump to the new remote detail
      await removeLocalCatch(item.local_id);
      router.replace(`/catch/${server.id}`);
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message ?? "Network error.");
    } finally {
      setUploading(false);
    }
  }, [item, userId, router]);

  const confirmDelete = useCallback(() => {
    if (!item) return;
    Alert.alert("Delete Local Catch", "This will remove the local record on this device.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            setDeleting(true);
            await removeLocalCatch(item.local_id);
            router.replace("/history");
          } finally {
            setDeleting(false);
          }
        }
      }
    ]);
  }, [item, router]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator /><Text style={styles.muted}>Loading…</Text></View>;
  }
  if (!item) {
    return <View style={styles.center}><Text style={styles.err}>Local catch not found.</Text></View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={{ uri: item.local_uri }} style={styles.image} />
      <View style={styles.card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={styles.title}>{item.species_label || "Unknown"}</Text>
          <Text style={styles.badgeLocal}>Local</Text>
        </View>
        <Text style={styles.subtle}>Confidence: {pct(item.species_confidence)}</Text>
        <Text style={styles.subtle}>Caught at: {new Date(item.created_at).toLocaleString()}</Text>
      </View>

      <View style={{ flexDirection: "row", gap: 12, justifyContent: "flex-end" }}>
        <TouchableOpacity style={[styles.button, styles.secondary]} onPress={upload} disabled={uploading || !userId}>
          <Text style={styles.buttonText}>{uploading ? "Uploading…" : userId ? "Upload" : "Sign in to Upload"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.danger]} onPress={confirmDelete} disabled={deleting}>
          <Text style={styles.buttonText}>{deleting ? "Deleting…" : "Delete"}</Text>
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
    // platform shadows
    ...(Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8 }, android: { elevation: 2 } }) as any),
    gap: 10,
  },
  title: { color: "white", fontSize: 22, fontWeight: "700", marginBottom: 6 },
  subtle: { color: "#9fb4ff", marginTop: 2 },
  badgeLocal: { fontSize: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: "hidden", color: "#C76B00", backgroundColor: "#FFF5E5" },
  button: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, backgroundColor: "#2d6cdf" },
  secondary: { backgroundColor: "#2d6cdf" },
  danger: { backgroundColor: "#d9534f" },
  buttonText: { color: "#fff", fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12, backgroundColor: "#0b1220" },
  muted: { color: "#94a3b8" },
  err: { color: "#ff6b6b", fontWeight: "600" },
});
