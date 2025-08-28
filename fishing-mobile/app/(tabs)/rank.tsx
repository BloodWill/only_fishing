// app/(tabs)/rank.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ListRenderItemInfo,
} from "react-native";
import { API_BASE } from "../../config";
import { getUserId } from "@/lib/user";

type Row = { user_id: string; uniq_species_count: number; username?: string | null };

export default function Rank() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [me, setMe] = useState<string | null>(null);

  const listRef = useRef<FlatList<Row>>(null);

  // Who am I?
  useEffect(() => {
    let alive = true;
    (async () => {
      const id = await getUserId().catch(() => null);
      if (alive) setMe(id ?? null);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Fetch leaderboard (tries both with and without /api)
  const fetchRanks = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const base = API_BASE.replace(/\/+$/, "");
      const candidates = [
        `${base}/stats/users-unique-species`,
        `${base}/api/stats/users-unique-species`,
      ];

      let data: Row[] | null = null;
      let lastMsg = "404";

      for (const u of candidates) {
        try {
          const r = await fetch(`${u}?t=${Date.now()}`);
          if (!r.ok) {
            lastMsg = String(r.status);
            continue;
          }
          data = (await r.json()) as Row[];
          console.log("Rank endpoint:", u); // which URL worked
          break;
        } catch (e: any) {
          lastMsg = e?.message || lastMsg;
        }
      }

      if (!data) throw new Error(lastMsg);
      setRows(
        (data || []).sort(
          (a, b) => (b.uniq_species_count || 0) - (a.uniq_species_count || 0)
        )
      );
    } catch (e: any) {
      setErr(`Failed to load ranks (${e?.message ?? "error"})`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRanks();
  }, [fetchRanks]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchRanks();
    } finally {
      setRefreshing(false);
    }
  }, [fetchRanks]);

  // Find my position
  const myIndex = useMemo(
    () => (me ? rows.findIndex((r) => r.user_id === me) : -1),
    [me, rows]
  );

  // Auto-scroll to me (if I'm far down)
  useEffect(() => {
    if (myIndex > 10) {
      setTimeout(() => {
        listRef.current?.scrollToIndex({ index: myIndex, animated: true });
      }, 300);
    }
  }, [myIndex]);

  const keyExtractor = useCallback((r: Row) => r.user_id, []);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Row>) => {
      const isMe = me && String(item.user_id) === String(me);
      return (
        <View
          style={[
            {
              paddingHorizontal: 16,
              paddingVertical: 10,
              flexDirection: "row",
              alignItems: "center",
            },
            isMe && { backgroundColor: "#eef2ff", borderRadius: 12 },
          ]}
        >
          <Text
            style={{
              width: 36,
              textAlign: "right",
              marginRight: 8,
              fontVariant: ["tabular-nums"],
            }}
          >
            {index + 1}.
          </Text>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={{
                  fontWeight: "600",
                  color: isMe ? "#1d4ed8" : "#111827",
                }}
              >
                {item.username || item.user_id}
              </Text>
              {isMe ? (
                <View style={{
                    marginLeft: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 999,
                    backgroundColor: "#1d4ed8",
                }}>
                    <Text style={{
                    color: "white",
                    fontWeight: "700",
                    fontSize: 10,
                    letterSpacing: 0.5,
                    }}>
                    YOU
                    </Text>
                </View>
                ) : null}

            </View>

            <Text style={{ color: "#6b7280", fontSize: 12 }}>
              {item.uniq_species_count}{" "}
              {item.uniq_species_count === 1 ? "species" : "species"}
            </Text>
          </View>
        </View>
      );
    },
    [me]
  );

  if (loading) {
    return (
      <View style={S.center}>
        <ActivityIndicator />
        <Text style={S.muted}>Loading user ranks…</Text>
      </View>
    );
  }
  if (err) {
    return (
      <View style={S.center}>
        <Text style={S.err}>{err}</Text>
      </View>
    );
  }
  if (!rows.length) {
    return (
      <View style={S.center}>
        <Text style={S.muted}>No rank data yet.</Text>
      </View>
    );
  }

  return (
    <FlatList
      ref={listRef}
      data={rows}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListHeaderComponent={
        <View style={{ padding: 16 }}>
          <Text style={{ fontWeight: "800", fontSize: 18 }}>
            Top collectors (unique species)
          </Text>
          {myIndex >= 0 && (
            <View
              style={{
                marginTop: 6,
                padding: 8,
                backgroundColor: "#e0ecff",
                borderRadius: 10,
              }}
            >
              <Text style={{ fontWeight: "600", color: "#1d4ed8" }}>
                You’re currently #{myIndex + 1}
                {" • "}
                {rows[myIndex]?.uniq_species_count ?? 0} species
              </Text>
            </View>
          )}
        </View>
      }
      ItemSeparatorComponent={() => (
        <View style={{ height: 1, backgroundColor: "#eee" }} />
      )}
      contentContainerStyle={{ paddingBottom: 24 }}
      onScrollToIndexFailed={(info) => {
        // Fallback if the list can't jump immediately
        setTimeout(() => {
          listRef.current?.scrollToIndex({
            index: info.index,
            animated: true,
          });
        }, 300);
      }}
    />
  );
}

const S = {
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  } as const,
  muted: { color: "#6b7280" } as const,
  err: { color: "#dc2626", fontWeight: "600" } as const,
};
