import React, { useState } from "react";
import { StyleSheet, View, Text, Image, TouchableOpacity, ActivityIndicator, Platform, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import Top3Picker from "@/components/Top3Picker";
import { predictFish, sendFeedback, type TopKItem } from "@/lib/api";
import { getUserId } from "@/lib/user";

export default function AIPlayground() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [topk, setTopk] = useState<TopKItem[]>([]);
  const [sha1, setSha1] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [chosen, setChosen] = useState<TopKItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pickImage = async () => {
    setError(null); setChosen(null); setTopk([]); setSha1(null);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { setError("Permission to access photos was denied."); return; }
    const resp = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 0.9 });
    if (!resp.canceled) setImageUri(resp.assets[0].uri);
  };

  const identify = async () => {
    if (!imageUri) return;
    try {
      setBusy(true);
      const res = await predictFish(imageUri, getMimeType(imageUri));
      setTopk(res.topk); setSha1(res.image_sha1); setPickerOpen(true);
    } catch (e: any) { setError(e?.message ?? "Identify failed"); }
    finally { setBusy(false); }
  };

  const onChoose = async (species_id: string) => {
    setPickerOpen(false);
    const pick = topk.find(t => t.species_id === species_id) ?? topk[0];
    setChosen(pick);
    try {
      await sendFeedback({
        image_sha1: sha1!,
        chosen_species_id: species_id,
        topk,
        user_id: await getUserId().catch(() => null),
      });
    } catch (e: any) {
      Alert.alert("Saved locally", "Couldn’t send feedback to server, but your choice is recorded in UI.");
    }
  };

  return (
    <View style={S.container}>
      <Text style={S.title}>🎣 AI Playground</Text>

      <TouchableOpacity style={S.btn} onPress={pickImage}><Text style={S.btnText}>{imageUri ? "Pick another photo" : "Pick a photo"}</Text></TouchableOpacity>

      {imageUri && <Image source={{ uri: imageUri }} style={S.preview} resizeMode="cover" />}

      <TouchableOpacity style={[S.btn, (!imageUri || busy) && S.btnDisabled]} onPress={identify} disabled={!imageUri || busy}>
        {busy ? <ActivityIndicator /> : <Text style={S.btnText}>Identify (AI)</Text>}
      </TouchableOpacity>

      {error && <Text style={S.error}>Error: {error}</Text>}

      {chosen && (
        <View style={S.card}>
          <Text style={S.cardTitle}>You chose</Text>
          <Text style={S.big}>{chosen.common_name}</Text>
          <Text style={S.sub}>{chosen.scientific_name}</Text>
          <Text style={S.sub}>Confidence: {(chosen.confidence * 100).toFixed(1)}%</Text>
        </View>
      )}

      <Top3Picker visible={pickerOpen} topk={topk} onChoose={onChoose} onCancel={() => setPickerOpen(false)} />
    </View>
  );
}

function getMimeType(path: string) {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg": case "jpeg": return "image/jpeg";
    case "png": return "image/png";
    case "webp": return Platform.OS === "ios" ? "image/jpeg" : "image/webp";
    default: return "application/octet-stream";
  }
}

const S = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12, backgroundColor: "#0b1220" },
  title: { color: "white", fontSize: 22, fontWeight: "800", textAlign: "center", marginTop: 12, marginBottom: 8 },
  btn: { backgroundColor: "#2d6cdf", padding: 14, borderRadius: 12, alignItems: "center" },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "white", fontSize: 16, fontWeight: "600" },
  preview: { width: "100%", height: 240, borderRadius: 12, marginTop: 8, backgroundColor: "#0b1220" },
  error: { color: "#ff6b6b", fontWeight: "600" },
  card: { backgroundColor: "#131c31", padding: 14, borderRadius: 12, gap: 4 },
  cardTitle: { color: "white", fontWeight: "700" },
  big: { color: "white", fontSize: 20, fontWeight: "800" },
  sub: { color: "#9fb4ff" },
});
