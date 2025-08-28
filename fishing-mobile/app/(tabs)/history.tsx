// app/(tabs)/history.tsx
import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { API_BASE } from "../../config";
import { getLocalCatches, removeLocalCatch } from "@/lib/storage";
import { getUserId } from "@/lib/user";
import { syncPending } from "@/lib/sync";

// simple cache-buster
const bust = (url: string) => (url.includes("?") ? `${url}&t=${Date.now()}` : `${url}?t=${Date.now()}`);

type CatchRead = {
  id: number;                  // server id (remote rows)
  image_path: string;          // remote path or local file:// uri for local rows
  species_label: string;
  species_confidence: number;
  created_at: string;
  user_id?: string | null;

  // local-only flags
  _local?: boolean;
  _local_id?: string;
  _remote_id_hint?: number | null;
};

export default function History() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<CatchRead[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [uploadingLocalId, setUploadingLocalId] = useState<string | null>(null);

  const loadingRef = useRef(false);

  // get login state
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const id = await getUserId();
        if (alive) setUserId(id);
      })();
      return () => {
        alive = false;
      };
    }, [])
  );

  // composite-key dedupe
  const dedupeByKey = (rows: CatchRead[]) => {
    const seen = new Set<string>();
    const out: CatchRead[] = [];
    for (const r of rows) {
      const key = r._local && r._local_id ? `local:${r._local_id}` : `remote:${r.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(r);
      }
    }
    return out;
  };

  // load remote + local rows
  const loadCatches = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      const locals: any[] = await getLocalCatches();

      if (userId) {
        const res = await fetch(`${API_BASE}/catches?limit=200&user_id=${encodeURIComponent(userId)}&t=${Date.now()}`);
        const remoteRaw: any[] = await res.json();

        const remote: CatchRead[] = remoteRaw.map((r) => ({
          id: Number(r.id),
          image_path: String(r.image_path ?? ""),
          species_label: String(r.species_label ?? "Unknown"),
          species_confidence: Number(r.species_confidence ?? 0),
          created_at: String(r.created_at ?? new Date().toISOString()),
          user_id: r.user_id ?? userId,
        }));

        const remoteIds = new Set(remote.map((r) => r.id));

        const unsynced: CatchRead[] = locals
          .filter((l) => {
            if (l.remote_id && remoteIds.has(Number(l.remote_id))) return false;
            if (l.synced) return false;
            return true;
          })
          .map((l, idx) => ({
            id: -100000 - idx,
            image_path: String(l.local_uri),
            species_label: String(l.species_label ?? "Unknown"),
            species_confidence: Number(l.species_confidence ?? 0),
            created_at: String(l.created_at ?? new Date().toISOString()),
            user_id: userId,
            _local: true,
            _local_id: String(l.local_id),
            _remote_id_hint: l.remote_id ? Number(l.remote_id) : null,
          }));

        const merged = [...unsynced, ...remote.sort((a, b) => b.id - a.id)];
        setItems(dedupeByKey(merged));
      } else {
        const rows: CatchRead[] = locals.map((l, idx) => ({
          id: -200000 - idx,
          image_path: String(l.local_uri),
          species_label: String(l.species_label ?? "Unknown"),
          species_confidence: Number(l.species_confidence ?? 0),
          created_at: String(l.created_at ?? new Date().toISOString()),
          user_id: null,
          _local: true,
          _local_id: String(l.local_id),
          _remote_id_hint: l.remote_id ? Number(l.remote_id) : null,
        }));
        setItems(dedupeByKey(rows));
      }
    } catch (e) {
      console.warn("Failed to load catches", e);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [userId]);

  // on focus: try pending sync then load
  useFocusEffect(
    useCallback(() => {
      (async () => {
        if (userId) {
          try { await syncPending(userId); } catch {}
        }
        await loadCatches();
      })();
    }, [userId, loadCatches])
  );

  // pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (userId) await syncPending(userId);
      await loadCatches();
    } finally {
      setRefreshing(false);
    }
  }, [userId, loadCatches]);

  // detail (only for remote)
const openDetail = useCallback(
  (id: number, isLocal?: boolean, localId?: string) => {
    if (isLocal && localId) {
      router.push(`/catch/local/${localId}`); // 👉 new local detail route
      return;
    }
    router.push(`/catch/${id}`);
  },
  [router]
);

  // delete
  const confirmDelete = useCallback(
    (item: CatchRead) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (item._local && item._local_id) {
        Alert.alert("Delete this catch?", "This will remove the local record on this device.", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try { await removeLocalCatch(item._local_id as string); } finally {
                setItems((prev) => prev.filter((c) => !(c._local && c._local_id === item._local_id)));
              }
            },
          },
        ]);
        return;
      }

      Alert.alert("Delete this catch?", "This will remove the photo from history.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setItems((prev) => prev.filter((c) => !(c._local !== true && c.id === item.id)));
            try {
              const resp = await fetch(`${API_BASE}/catches/${item.id}`, {
                method: "DELETE",
                headers: userId ? { "X-User-Id": userId } : undefined,
              });
              if (!resp.ok) {
                setItems((prev) => dedupeByKey([...prev, item]));
                Alert.alert("Delete failed", "Please try again.");
              }
            } catch {
              setItems((prev) => dedupeByKey([...prev, item]));
              Alert.alert("Delete failed", "Check your network.");
            }
          },
        },
      ]);
    },
    [userId]
  );

  // upload local -> server
  const uploadLocal = useCallback(
    async (item: CatchRead) => {
      if (!userId || !item._local || !item._local_id) {
        Alert.alert("Sign in required", "Please sign in to upload local catches.");
        return;
      }
      try {
        setUploadingLocalId(item._local_id);

        const form = new FormData();
        form.append("image", {
          uri: item.image_path, // file://...
          name: `catch-${Date.now()}.jpg`,
          type: "image/jpeg",
        } as unknown as Blob);
        if (item.species_label) form.append("species_label", item.species_label);
        if (typeof item.species_confidence === "number") {
          form.append("species_confidence", String(item.species_confidence));
        }
        form.append("created_at", item.created_at);

        const resp = await fetch(`${API_BASE}/catches`, {
          method: "POST",
          headers: { Accept: "application/json", "X-User-Id": userId },
          body: form,
        });
        if (!resp.ok) {
          const t = await resp.text().catch(() => "");
          throw new Error(`Upload failed (${resp.status}) ${t}`);
        }

        const server = await resp.json();
        const newRemote: CatchRead = {
          id: Number(server.id),
          image_path: String(server.image_path ?? ""),
          species_label: String(server.species_label ?? item.species_label ?? "Unknown"),
          species_confidence: Number(server.species_confidence ?? item.species_confidence ?? 0),
          created_at: String(server.created_at ?? item.created_at),
          user_id: userId,
        };

        try { await removeLocalCatch(item._local_id); } catch {}

        setItems((prev) => {
          const withoutLocal = prev.filter((r) => !(r._local && r._local_id === item._local_id));
          const locals = withoutLocal.filter((r) => r._local);
          const remotes = withoutLocal.filter((r) => !r._local);
          return dedupeByKey([...locals, newRemote, ...remotes]);
        });

        await loadCatches();
      } catch (e: any) {
        Alert.alert("Upload failed", e?.message ?? "Network error.");
      } finally {
        setUploadingLocalId(null);
      }
    },
    [userId, loadCatches]
  );

  // row
  const renderItem = useCallback(
    ({ item }: { item: CatchRead }) => {
      const uri = item.image_path.startsWith("file://") ? item.image_path : bust(`${API_BASE}${item.image_path}`);
      const uploading = Boolean(item._local_id && uploadingLocalId === item._local_id);

      return (
        <View style={{ flexDirection: "row", padding: 12, gap: 12, alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => openDetail(item.id, item._local, item._local_id)}
            onLongPress={() => confirmDelete(item)}
            style={{ flexDirection: "row", flex: 1, gap: 12, alignItems: "center" }}
            activeOpacity={0.9}
          >
            <Image source={{ uri }} style={{ width: 72, height: 72, borderRadius: 8, backgroundColor: "#eee" }} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", columnGap: 8 }}>
                <Text style={{ fontWeight: "600" }}>{item.species_label || "Unknown"}</Text>
                <Text
                  style={{
                    fontSize: 12,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 999,
                    overflow: "hidden",
                    backgroundColor: item._local ? "#FFF5E5" : "#E6FFEE",
                    color: item._local ? "#C76B00" : "#16794D",
                  }}
                >
                  {item._local ? "Local" : "Online"}
                </Text>
              </View>
              <Text style={{ color: "#666", marginTop: 4 }}>{new Date(item.created_at).toLocaleString()}</Text>
              <Text style={{ color: "#888", marginTop: 2 }}>{(item.species_confidence * 100).toFixed(1)}% confidence</Text>
            </View>
          </TouchableOpacity>

          {item._local && userId ? (
            <TouchableOpacity
              onPress={() => uploadLocal(item)}
              disabled={uploading}
              style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: uploading ? "#aac7ff" : "#2d6cdf" }}
            >
              {uploading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>Upload</Text>}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => confirmDelete(item)} style={{ padding: 8 }}>
              <Text style={{ color: "#d00", fontWeight: "700" }}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    },
    [confirmDelete, openDetail, uploadLocal, uploadingLocalId, userId]
  );

  // keys
  const keyExtractor = useCallback((it: CatchRead) => {
    return it._local && it._local_id ? `local:${it._local_id}` : `remote:${it.id}`;
  }, []);

  if (loading && items.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12 }}>Loading your catches…</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: "#eee" }} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={{ paddingVertical: 8 }}
      ListEmptyComponent={
        <View style={{ padding: 24 }}>
          <Text style={{ textAlign: "center", color: "#666" }}>
            No catches yet. Go to Home and identify your first fish!
          </Text>
        </View>
      }
    />
  );
}
