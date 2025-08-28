import React, { useState } from "react";
import { StyleSheet, View, Text, Image, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import "expo-router/entry";

// TODO: set this to your PC's LAN IP running Uvicorn
const API_BASE = "http://192.168.1.161:8000";

export default function App() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const pickImage = async () => {
    setError(null);
    setResult(null);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setError("Permission to access photos was denied.");
      return;
    }

    const resp = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9,
    });

    if (!resp.canceled) {
      setImageUri(resp.assets[0].uri);
    }
  };

  const upload = async () => {
    if (!imageUri) return;
    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const fileName = imageUri.split("/").pop() || "upload.jpg";
      // Expo returns a local file URI; we can pass it directly in FormData
      const form = new FormData();
      form.append("file", {
        uri: imageUri,
        name: fileName,
        type: getMimeType(fileName),
      } as any);

      const r = await fetch(`${API_BASE}/fish/identify`, {
        method: "POST",
        headers: {
          // Do NOT set Content-Type manually; let fetch set multipart boundary
        },
        body: form,
      });

      if (!r.ok) {
        const text = await r.text();
        throw new Error(`${r.status} ${r.statusText} - ${text}`);
      }

      const json = await r.json();
      setResult(json);
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎣 Fish Identifier</Text>

      <TouchableOpacity style={styles.btn} onPress={pickImage}>
        <Text style={styles.btnText}>{imageUri ? "Pick another photo" : "Pick a photo"}</Text>
      </TouchableOpacity>

      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
      )}

      <TouchableOpacity style={[styles.btn, !imageUri && styles.btnDisabled]} onPress={upload} disabled={!imageUri || uploading}>
        {uploading ? <ActivityIndicator /> : <Text style={styles.btnText}>Identify</Text>}
      </TouchableOpacity>

      {error && <Text style={styles.error}>Error: {error}</Text>}

      {result && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Prediction</Text>
          <Text style={styles.mono}>
            {JSON.stringify(result.prediction, null, 2)}
          </Text>
          {result.saved_path && (
            <>
              <Text style={styles.cardTitle}>Saved Image</Text>
              {/* Show server copy (use API_BASE + saved_path) */}
              <Image
                source={{ uri: `${API_BASE}${result.saved_path}` }}
                style={styles.serverImage}
              />
            </>
          )}
        </View>
      )}

      <Text style={styles.footer}>
        API: {API_BASE}
      </Text>
    </View>
  );
}

function getMimeType(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return Platform.OS === "ios" ? "image/jpeg" : "image/webp";
    default:
      return "application/octet-stream";
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12, backgroundColor: "#0b1220" },
  title: { color: "white", fontSize: 24, fontWeight: "700", marginTop: 20, textAlign: "center" },
  btn: { backgroundColor: "#2d6cdf", padding: 14, borderRadius: 12, alignItems: "center" },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "white", fontSize: 16, fontWeight: "600" },
  preview: { width: "100%", height: 240, borderRadius: 12, marginTop: 8 },
  error: { color: "#ff6b6b", fontWeight: "600" },
  card: { backgroundColor: "#131c31", padding: 14, borderRadius: 12 },
  cardTitle: { color: "white", fontWeight: "700", marginBottom: 6 },
  mono: { color: "#cbd5e1", fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }) },
  serverImage: { width: "100%", height: 200, borderRadius: 12, marginTop: 8, backgroundColor: "#0b1220" },
  footer: { color: "#94a3b8", textAlign: "center", marginTop: "auto" },
});
