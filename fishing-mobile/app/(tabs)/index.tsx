import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View, Text, Image, TouchableOpacity, ActivityIndicator, Alert, Modal,
  FlatList, TextInput,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { useFocusEffect } from "expo-router";
import { API_BASE, bust } from "../../config";
import { addLocalCatch, updateLocalCatch, LocalCatch } from "@/lib/storage";
import { getUserId } from "@/lib/user";
import * as Location from "expo-location";              // ✅ use it

type IdentifyResponse = {
  saved_path: string | null;
  prediction: { label?: string; confidence?: number } | null;
  catch_id?: number | null;
  lat?: number | null;                                   // optional from server
  lng?: number | null;
  weather?: any | null;
};

type SpeciesItem = { id: number; common_name: string; icon_path?: string | null };

const FALLBACK_SPECIES: SpeciesItem[] = [
  { id: -1, common_name: "Largemouth Bass" },
  { id: -2, common_name: "Smallmouth Bass" },
  { id: -3, common_name: "Spotted Bass" },
  { id: -4, common_name: "Striped Bass" },
  { id: -5, common_name: "White Bass" },
  { id: -6, common_name: "Bluegill" },
  { id: -7, common_name: "Pumpkinseed" },
  { id: -8, common_name: "Redear Sunfish" },
  { id: -9, common_name: "Green Sunfish" },
  { id: -10, common_name: "Black Crappie" },
  { id: -11, common_name: "White Crappie" },
  { id: -12, common_name: "Yellow Perch" },
  { id: -13, common_name: "Walleye" },
  { id: -14, common_name: "Sauger" },
  { id: -15, common_name: "Northern Pike" },
  { id: -16, common_name: "Muskellunge" },
  { id: -17, common_name: "Chain Pickerel" },
  { id: -18, common_name: "Rainbow Trout" },
  { id: -19, common_name: "Brown Trout" },
  { id: -20, common_name: "Brook Trout" },
  { id: -21, common_name: "Lake Trout" },
  { id: -22, common_name: "Cutthroat Trout" },
  { id: -23, common_name: "Chinook Salmon" },
  { id: -24, common_name: "Coho Salmon" },
  { id: -25, common_name: "Sockeye Salmon" },
  { id: -26, common_name: "Channel Catfish" },
  { id: -27, common_name: "Blue Catfish" },
  { id: -28, common_name: "Flathead Catfish" },
  { id: -29, common_name: "Common Carp" },
  { id: -30, common_name: "Longnose Gar" },
];

function dedupeMerge(server: SpeciesItem[], fallback: SpeciesItem[]): SpeciesItem[] {
  const seen = new Set<string>();
  const out: SpeciesItem[] = [];
  const push = (s: SpeciesItem) => {
    const key = s.common_name.trim().toLowerCase();
    if (!seen.has(key)) { seen.add(key); out.push(s); }
  };
  server.forEach(push);
  fallback.forEach(push);
  return out.sort((a, b) => a.common_name.localeCompare(b.common_name));
}

async function copyToPersistent(uri: string) {
  const dir = FileSystem.documentDirectory + "catches/";
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
  const name = uri.split("/").pop() || `photo_${Date.now()}.jpg`;
  const dest = dir + name;
  try { await FileSystem.copyAsync({ from: uri, to: dest }); return dest; } catch { return uri; }
}

// ✅ helper to get foreground location permission + position
async function getCurrentLatLng() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return { lat: null, lng: null };
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return { lat: null, lng: null };
  }
}

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => { getUserId().then(setUserId); }, []);
  useFocusEffect(useCallback(() => { getUserId().then(setUserId); }, []));

  // species list
  const [species, setSpecies] = useState<SpeciesItem[]>([]);
  const [speciesLoading, setSpeciesLoading] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setSpeciesLoading(true);
      try {
        const res = await fetch(`${API_BASE}/species`);
        if (!res.ok) throw new Error("species fetch");
        const server = (await res.json()) as SpeciesItem[];
        if (alive) setSpecies(dedupeMerge(server, FALLBACK_SPECIES));
      } catch {
        if (alive) setSpecies(dedupeMerge([], FALLBACK_SPECIES));
      } finally {
        if (alive) setSpeciesLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const filteredSpecies = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return species;
    return species.filter(s => s.common_name.toLowerCase().startsWith(q));
  }, [query, species]);

  // identify flow
  const [uploading, setUploading] = useState(false);
  const [serverImagePath, setServerImagePath] = useState<string | null>(null);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<{ label?: string; confidence?: number } | null>(null);

  const [lastLocalId, setLastLocalId] = useState<string | null>(null);
  const [lastRemoteId, setLastRemoteId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);

  const pickAndUpload = async () => {
    setPrediction(null);
    setServerImagePath(null);
    setLocalImageUri(null);
    setLastLocalId(null);
    setLastRemoteId(null);
    setSelectedSpecies(null);
    setQuery("");

    const res = await ImagePicker.launchImageLibraryAsync({ base64: false, quality: 0.9 });
    if (res.canceled || !res.assets?.length) return;

    // 🆕 grab location up front
    const { lat, lng } = await getCurrentLatLng();

    const asset = res.assets[0];
    const persistedUri = await copyToPersistent(asset.uri);
    setLocalImageUri(persistedUri);

    const filename = persistedUri.split("/").pop() || "photo.jpg";
    const type =
      asset.mimeType ||
      (filename.toLowerCase().endsWith(".png") ? "image/png" :
       filename.toLowerCase().endsWith(".webp") ? "image/webp" : "image/jpeg");

    const form = new FormData();
    form.append("file", { uri: persistedUri, name: filename, type } as any);
    const willPersistOnline = !!userId;
    form.append("persist", String(willPersistOnline));
    if (userId) form.append("user_id", userId);
    if (lat != null && lng != null) {                    // ✅ send geo
      form.append("latitude", String(lat));
      form.append("longitude", String(lng));
    }

    setUploading(true);
    try {
      const resp = await fetch(`${API_BASE}/fish/identify`, {
        method: "POST",
        body: form,
        headers: { Accept: "application/json" },
      });
      if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
      const json: IdentifyResponse = await resp.json();

      setServerImagePath(json.saved_path ?? null);
      setPrediction(json.prediction || null);
      setLastRemoteId(json.catch_id ?? null);

      const predicted = (json.prediction?.label || "").trim();
      const exists = species.some(s => s.common_name.toLowerCase() === predicted.toLowerCase());
      setSelectedSpecies(exists ? predicted : null);

      const now = new Date().toISOString();
      const local_id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const lc: LocalCatch = {
        local_id,
        local_uri: persistedUri,
        species_label: predicted || "Unknown",
        species_confidence: Number(json.prediction?.confidence ?? 0),
        created_at: now,
        remote_id: json.catch_id ?? undefined,
        synced: willPersistOnline && !!json.catch_id,
        // If your LocalCatch supports these, you can include them:
        // lat: lat ?? undefined,
        // lng: lng ?? undefined,
      } as LocalCatch;
      await addLocalCatch(lc);
      setLastLocalId(local_id);

      setConfirmOpen(true);
    } catch (e: any) {
      console.warn(e);
      Alert.alert("Upload failed", e?.message ?? "Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const saveConfirmedLabel = async () => {
    if (!lastLocalId || !selectedSpecies) { setConfirmOpen(false); return; }
    await updateLocalCatch(lastLocalId, { species_label: selectedSpecies });

    if (userId && lastRemoteId) {
      const body = JSON.stringify({ species_label: selectedSpecies });
      try {
        let resp = await fetch(`${API_BASE}/catches/${lastRemoteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "X-User-Id": userId },
          body,
        });
        if (resp.status === 405) {
          resp = await fetch(`${API_BASE}/catches/${lastRemoteId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "X-User-Id": userId },
            body,
          });
        }
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      } catch (e: any) {
        Alert.alert("Online save failed", e?.message ?? "Saved locally.");
      }
    }

    setConfirmOpen(false);
    Alert.alert("Saved", userId ? "Updated locally & online." : "Saved locally.");
  };

  const previewUri = userId && serverImagePath
    ? bust(`${API_BASE}${serverImagePath}`)
    : localImageUri || undefined;

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <TouchableOpacity
        onPress={pickAndUpload}
        style={{ backgroundColor: "#1e90ff", paddingVertical: 14, borderRadius: 10, alignItems: "center", marginBottom: 16 }}
      >
        <Text style={{ color: "white", fontWeight: "700" }}>
          Choose Photo & Identify {userId ? "(online+local)" : "(local only)"}
        </Text>
      </TouchableOpacity>

      {uploading && (
        <View style={{ alignItems: "center", marginTop: 24 }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8 }}>Identifying…</Text>
        </View>
      )}

      {previewUri && (
        <View style={{ alignItems: "center", marginTop: 16 }}>
          <Image source={{ uri: previewUri }} style={{ width: 280, height: 280, borderRadius: 12, backgroundColor: "#eee" }} />
          {prediction && (
            <View style={{ marginTop: 12, alignItems: "center" }}>
              <Text style={{ fontWeight: "700" }}>{selectedSpecies || prediction.label || "Unknown"}</Text>
              <Text style={{ color: "#666" }}>
                {(Number(prediction.confidence ?? 0) * 100).toFixed(1)}% confidence (model)
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Confirm: searchable, scrollable list */}
      <Modal visible={confirmOpen} transparent animationType="slide" onRequestClose={() => setConfirmOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View
            style={{
              backgroundColor: "white",
              padding: 16,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: "80%",
            }}
          >
            <Text style={{ fontWeight: "700", fontSize: 16, marginBottom: 8 }}>Select species</Text>

            <TextInput
              placeholder="Search species..."
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                borderWidth: 1, borderColor: "#ccc", borderRadius: 8,
                paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
              }}
            />

            {speciesLoading ? (
              <View style={{ paddingVertical: 12 }}><ActivityIndicator /></View>
            ) : (
              <FlatList
                data={filteredSpecies}
                keyExtractor={(it) => String(it.id)}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={20}
                windowSize={10}
                style={{ maxHeight: 420 }}
                showsVerticalScrollIndicator
                contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
                renderItem={({ item }) => {
                  const isActive = selectedSpecies?.toLowerCase() === item.common_name.toLowerCase();
                  return (
                    <TouchableOpacity
                      onPress={() => setSelectedSpecies(item.common_name)}
                      style={{
                        padding: 12,
                        borderRadius: 8,
                        backgroundColor: isActive ? "#1e90ff" : "#f2f2f2",
                      }}
                    >
                      <Text style={{ color: isActive ? "white" : "#111", fontWeight: "600" }}>
                        {item.common_name}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <Text style={{ textAlign: "center", color: "#666" }}>No species match</Text>
                }
              />
            )}

            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 12 }}>
              <TouchableOpacity onPress={() => setConfirmOpen(false)} style={{ padding: 12 }}>
                <Text style={{ color: "#666", fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveConfirmedLabel}
                disabled={!selectedSpecies}
                style={{
                  backgroundColor: selectedSpecies ? "#1e90ff" : "#9dbff5",
                  padding: 12, borderRadius: 8,
                }}
              >
                <Text style={{ color: "white", fontWeight: "700" }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
