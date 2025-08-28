import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, Image, ActivityIndicator } from "react-native";
import { useFocusEffect } from "expo-router";
import { API_BASE, bust } from "../../config";
import { getLocalCatches } from "@/lib/storage";
import { getUserId } from "@/lib/user";
import { syncPending } from "@/lib/sync";

type Entry = {
  id: number;
  common_name: string;
  sci_name?: string | null;
  icon_path?: string | null;
  caught: boolean;
  first_catch_at?: string | null;
};

type UserCollectionRead = {
  user_id: string;
  total: number;
  caught: number;
  species: Entry[];
};

export default function Collection() {
  const [userId, setUserId] = useState<string | null>(null);
  const [data, setData] = useState<UserCollectionRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false); // ✅ optional: reflect sync progress

  // Refresh login state whenever this tab is focused
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const id = await getUserId();
        if (alive) setUserId(id);
      })();
      return () => { alive = false; };
    }, [])
  );

  const load = useCallback(async () => {
    try {
      if (userId) {
        const res = await fetch(`${API_BASE}/species/users/${userId}/collection`);
        const json = await res.json();
        setData(json);
      } else {
        const locals = await getLocalCatches();
        const map = new Map<string, string>(); // label -> first date
        for (const c of locals) {
          if (!map.has(c.species_label)) map.set(c.species_label, c.created_at);
        }
        const species = Array.from(map.entries()).map(([label, first]) => ({
          id: Math.abs(label.split("").reduce((a, ch) => a + ch.charCodeAt(0), 0)),
          common_name: label,
          caught: true,
          first_catch_at: first,
          icon_path: null,
        }));
        setData({
          user_id: "local",
          total: species.length,
          caught: species.length,
          species,
        });
      }
    } catch (e) {
      console.warn("collection load failed", e);
      setData(null);
    }
  }, [userId]);

  // On focus: if logged in, sync pending locals first, then load collection
  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        if (userId) {
          setSyncing(true);
          await syncPending(userId);
          setSyncing(false);
        }
        await load();
        setLoading(false);
      })();
    }, [userId, load])
  );

  // ✅ Also run sync immediately when userId flips from null -> value (e.g., right after sign-in)
  useEffect(() => {
    (async () => {
      if (userId) {
        setLoading(true);
        setSyncing(true);
        await syncPending(userId);   // << make sure pending locals are on the server
        setSyncing(false);
        await load();                // << now fetch fresh remote FishDex
        setLoading(false);
      }
    })();
  }, [userId, load]);

  if (loading && !data) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12 }}>
          {syncing ? "Syncing your catches…" : "Loading collection…"}
        </Text>
      </View>
    );
  }

  const progressText = data ? `${data.caught} / ${data.total} species` : "—";

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <Text style={{ fontWeight: "700", marginBottom: 8 }}>
        {userId ? "Online FishDex" : "Local FishDex"} · {progressText}
      </Text>
      <FlatList
        numColumns={3}
        data={data?.species ?? []}
        keyExtractor={(it) => String(it.id)}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ gap: 12 }}
        renderItem={({ item }) => {
          const uri = item.icon_path ? bust(`${API_BASE}${item.icon_path}`) : undefined;
          return (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                padding: 10,
                borderRadius: 10,
                backgroundColor: "#f2f2f2",
              }}
            >
              {uri ? (
                <Image source={{ uri }} style={{ width: 72, height: 72, borderRadius: 8, backgroundColor: "#fff" }} />
              ) : (
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 8,
                    backgroundColor: "#ddd",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text>—</Text>
                </View>
              )}
              <Text style={{ marginTop: 8, fontWeight: "600", textAlign: "center" }}>
                {item.common_name}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}
