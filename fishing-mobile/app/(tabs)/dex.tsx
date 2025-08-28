import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { useFocusEffect } from "expo-router";
import { API_BASE } from "../../config";
import speciesNA from "../../assets/species/species_na.json";
import { getUserId } from "@/lib/user";
import { getLocalCatches, LocalCatch } from "@/lib/storage";

// ---- helpers ----
type CatalogSpecies = { slug: string; common: string; scientific?: string; icon?: string | null };
type RemoteCatch = { id: number; species_label?: string | null };
type DexRow = CatalogSpecies & { found: boolean };

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function Dex() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [foundSet, setFoundSet] = useState<Set<string>>(new Set());

  // Load login state
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

  // Load catches (remote if signed in; otherwise include locals)
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const found = new Set<string>();

        // 1) remote catches
        if (userId) {
          const res = await fetch(`${API_BASE}/catches?limit=1000&user_id=${encodeURIComponent(userId)}&t=${Date.now()}`);
          const rows = (await res.json()) as RemoteCatch[];
          for (const r of rows) {
            if (!r?.species_label) continue;
            found.add(slugify(r.species_label));
          }
        }

        // 2) also consider local (device) catches so users see progress before upload
        const locals: LocalCatch[] = await getLocalCatches().catch(() => []);
        for (const l of locals) {
          if (!l?.species_label) continue;
          found.add(slugify(l.species_label));
        }

        if (alive) setFoundSet(found);
      } catch {
        if (alive) setFoundSet(new Set());
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [userId]);

  // Build the Dex view using the NA catalog as the denominator
  const catalog = speciesNA as CatalogSpecies[];
  const rows: DexRow[] = useMemo(
    () => catalog.map((sp) => ({ ...sp, found: foundSet.has(sp.slug) })),
    [catalog, foundSet]
  );
  const foundCount = rows.filter((r) => r.found).length;
  const totalCount = rows.length;
  const progress = totalCount > 0 ? Math.min(1, foundCount / totalCount) : 0;

  const renderItem = ({ item }: { item: DexRow }) => {
    const tint = item.found ? "#16794D" : "#999";
    const bg = item.found ? "#E6FFEE" : "#f0f0f0";
    return (
      <View style={{ width: "33.333%", padding: 8 }}>
        <View style={{ backgroundColor: bg, borderRadius: 12, padding: 12, alignItems: "center" }}>
          {item.icon ? (
            <Image source={{ uri: item.icon }} style={{ width: 56, height: 56, borderRadius: 8 }} />
          ) : (
            <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: "#ddd", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#777" }}>{item.found ? "✓" : "—"}</Text>
            </View>
          )}
          <Text style={{ marginTop: 8, fontWeight: "600", textAlign: "center", color: "#222" }}>{item.common}</Text>
          {!!item.scientific && (
            <Text style={{ marginTop: 2, fontSize: 11, color: "#666", textAlign: "center" }}>
              {item.scientific}
            </Text>
          )}
          <Text style={{ marginTop: 6, fontSize: 12, color: tint }}>{item.found ? "Found" : "Not found"}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12 }}>Building your FishDex…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      {/* Header with progress */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
        <Text style={{ fontWeight: "800", fontSize: 18 }}>
          North America FishDex: {foundCount} / {totalCount} species
        </Text>
        <View style={{ height: 8, backgroundColor: "#eee", borderRadius: 999, marginTop: 8, overflow: "hidden" }}>
          <View style={{ width: `${progress * 100}%`, backgroundColor: "#2d6cdf", height: "100%" }} />
        </View>
        <Text style={{ marginTop: 6, color: "#666" }}>
          Counting unique species across your online {userId ? "and local " : ""}catches.
        </Text>
      </View>

      {/* Grid */}
      <FlatList
        data={rows}
        keyExtractor={(it) => it.slug}
        numColumns={3}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 8 }}
      />
    </View>
  );
}
