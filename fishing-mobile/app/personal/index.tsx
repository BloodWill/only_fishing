import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { Link } from "expo-router";
import { getUserId, setUserId, clearUserId } from "@/lib/user";
import { syncPending } from "@/lib/sync";

export default function PersonalHome() {
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [input, setInput] = useState("");

  useEffect(() => {
    getUserId().then((id) => {
      setCurrentId(id);
      setInput(id ?? "");
    });
  }, []);

  const onSave = async () => {
    const id = input.trim();
    if (!id) return Alert.alert("Enter an ID", "Use any unique username or email.");
    await setUserId(id);
    setCurrentId(id);
    Alert.alert("Signed in", `Using ID: ${id}`);
    syncPending(id);
  };

  const onGuest = async () => {
    const id = `guest-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    setInput(id);
    await setUserId(id);
    setCurrentId(id);
    Alert.alert("Guest mode", `Using ID: ${id}`);
    syncPending(id);
  };

  const onSignOut = async () => {
    await clearUserId();
    setCurrentId(null);
    setInput("");
    Alert.alert("Signed out", "You are now in local-only mode.");
  };

  const mode = currentId ? "Online + Local" : "Local only";

  return (
    <View style={{ flex: 1, padding: 16, gap: 16 }}>
      <Text style={{ fontWeight: "800", fontSize: 20 }}>Personal</Text>
      <Text style={{ color: "#666" }}>
        Mode: <Text style={{ fontWeight: "700" }}>{mode}</Text>
      </Text>

      <TextInput
        placeholder="Enter user ID (email/username is fine)"
        value={input}
        onChangeText={setInput}
        autoCapitalize="none"
        autoCorrect={false}
        style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }}
      />

      <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
        <TouchableOpacity onPress={onSave} style={{ backgroundColor: "#1e90ff", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 }}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>{currentId ? "Update ID" : "Sign in"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onGuest} style={{ backgroundColor: "#2d6cdf", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 }}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>Use Guest ID</Text>
        </TouchableOpacity>
        {currentId && (
          <TouchableOpacity onPress={onSignOut} style={{ backgroundColor: "#d9534f", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 }}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>Sign out</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={{ marginTop: 8 }}>
        <Link href="/personal/collection" style={{ color: "#2d6cdf", fontWeight: "600" }}>
          → My Collection
        </Link>
      </View>
    </View>
  );
}

